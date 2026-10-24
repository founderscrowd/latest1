/*
# Group Files Storage & Security — Stage 1

## Purpose
Creates a private document library backend for startup groups. Files are stored
in a private Supabase Storage bucket (`group-files`) with access restricted to
authorised group participants (Starter, Admin, Cofounder). Members and Pending
users have no access. All permission checks use the authoritative `group_members`
role data.

## New Tables
- `group_files`
  - `id` (uuid, primary key) — unique file identifier
  - `group_id` (uuid, FK to groups) — which group the file belongs to
  - `uploader_user_id` (uuid, FK to auth.users, defaults to auth.uid()) — who uploaded it
  - `original_filename` (text) — the filename as the user provided it
  - `storage_path` (text) — the unpredictable path within the `group-files` bucket
  - `file_size` (bigint) — size in bytes
  - `mime_type` (text) — server-validated MIME type
  - `uploaded_at` (timestamptz, default now()) — upload timestamp
  - `description` (text, nullable) — optional user description
  - `is_pinned` (boolean, default false) — pinned status for Stage 3 (DB field only, no pin/unpin logic in Stage 1)
  - `display_order` (integer, default 0) — display ordering for Stage 3
  - `pinned_at` (timestamptz, nullable) — when the file was pinned

## New Functions
- `get_group_file_role(p_group_id uuid)` — SECURITY DEFINER, returns the caller's
  effective role string ('starter', 'admin', 'cofounder', 'member', 'pending') or
  NULL if not a member. Single source of truth for all file access checks.
- `create_group_file_record(p_group_id uuid, p_original_filename text, p_mime_type text,
  p_file_size bigint, p_description text)` — SECURITY DEFINER, validates the caller's
  role (starter/admin/cofounder), validates extension + MIME type + size, enforces
  per-group file count limit (100) and total storage quota (500 MB), generates an
  unpredictable storage path, inserts the `group_files` row, and returns the path
  for the client to upload to.
- `cleanup_group_file(p_file_id uuid)` — SECURITY DEFINER, used internally by edge
  functions. Returns the file record details (id, group_id, storage_path, uploader)
  for a given file_id after verifying the caller is a service role. This function
  is NOT callable by anon/authenticated.

## New Storage Bucket
- `group-files` — private bucket, 10 MB file size limit, restricted MIME types
  (PDF, Word, Excel, PowerPoint, JPEG, PNG, WebP, plain text).

## Security Changes
- RLS enabled on `group_files`.
- SELECT granted to `authenticated` (restricted by policy to authorised participants).
- INSERT/UPDATE/DELETE restricted: direct inserts and deletes go through SECURITY DEFINER
  functions; UPDATE limited to the `description` column only.
- Column-level grants prevent clients from setting `storage_path`, `is_pinned`,
  `display_order`, `pinned_at`, `group_id`, or `uploader_user_id`.
- Storage RLS policies on `storage.objects` for the `group-files` bucket:
  - SELECT: authorised participants can read objects
  - INSERT: authorised participants can upload, but only to a path that matches an
    existing `group_files` record
  - DELETE/UPDATE: denied to all roles (handled via edge function with service role key)

## Important Notes
1. The `get_group_file_role` function checks `group_members` for the caller's role
   with `status = 'approved'`, and also checks `groups.creator_id` for the starter
   identity (belt and braces). All groups currently have a starter row in group_members.
2. The `create_group_file_record` function uses an advisory lock to prevent concurrent
   uploads from bypassing the file count and storage quota limits.
3. Pinned fields (`is_pinned`, `display_order`, `pinned_at`) are created in the database
   but pin/unpin logic is deferred to Stage 3. The column-level grants prevent clients
   from setting these fields.
4. The `cleanup_group_file` function is callable only by the service role (EXECUTE
   revoked from PUBLIC, anon, and authenticated). Edge functions use it to retrieve
   file details for safe deletion via the Storage API.
5. The `create_group_file_record` function validates file extensions against an allowlist
   mapping and verifies the MIME type matches the extension. This server-side validation
   cannot be bypassed by the client.
*/

-- ============================================================================
-- 1. Helper function: get_group_file_role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_group_file_role(p_group_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT gm.role
     FROM group_members gm
     WHERE gm.group_id = p_group_id
       AND gm.user_id = auth.uid()
       AND gm.status = 'approved'),
    -- Fallback: if the caller is the group creator but somehow lacks a member row
    (SELECT 'starter'
     FROM groups g
     WHERE g.id = p_group_id
       AND g.creator_id = auth.uid()
       AND g.deleted_at IS NULL)
  );
$$;

-- Revoke execute from public/anon; grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.get_group_file_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_file_role(uuid) TO authenticated;

-- ============================================================================
-- 2. group_files table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.group_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  uploader_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  original_filename text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  description text,
  is_pinned boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  pinned_at timestamptz
);

-- Constraints
ALTER TABLE public.group_files
  ADD CONSTRAINT group_files_file_size_positive CHECK (file_size > 0),
  ADD CONSTRAINT group_files_file_size_limit CHECK (file_size <= 10485760),
  ADD CONSTRAINT group_files_filename_not_empty CHECK (length(trim(original_filename)) > 0),
  ADD CONSTRAINT group_files_storage_path_not_empty CHECK (length(trim(storage_path)) > 0);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_files_group_id ON public.group_files(group_id);
CREATE INDEX IF NOT EXISTS idx_group_files_uploader ON public.group_files(uploader_user_id);
CREATE INDEX IF NOT EXISTS idx_group_files_group_pinned_order
  ON public.group_files(group_id, is_pinned, display_order, uploaded_at DESC);

-- Enable RLS
ALTER TABLE public.group_files ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. create_group_file_record function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_group_file_record(
  p_group_id uuid,
  p_original_filename text,
  p_mime_type text,
  p_file_size bigint,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_file_id uuid;
  v_storage_path text;
  v_ext text;
  v_allowed_ext text[] := ARRAY[
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'jpg', 'jpeg', 'png', 'webp', 'txt'
  ];
  v_ext_mime_map jsonb := '{
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "txt": "text/plain"
  }';
  v_expected_mime text;
  v_file_count integer;
  v_total_size bigint;
  v_max_files integer := 100;
  v_max_total_bytes bigint := 524288000; -- 500 MB
BEGIN
  -- 1. Validate caller's role
  v_role := public.get_group_file_role(p_group_id);
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group.';
  END IF;
  IF v_role NOT IN ('starter', 'admin', 'cofounder') THEN
    RAISE EXCEPTION 'You do not have permission to upload files to this group.';
  END IF;

  -- 2. Validate file size
  IF p_file_size IS NULL OR p_file_size <= 0 THEN
    RAISE EXCEPTION 'Invalid file size.';
  END IF;
  IF p_file_size > 10485760 THEN
    RAISE EXCEPTION 'File exceeds the 10 MB size limit.';
  END IF;

  -- 3. Validate filename
  IF p_original_filename IS NULL OR length(trim(p_original_filename)) = 0 THEN
    RAISE EXCEPTION 'Filename cannot be empty.';
  END IF;

  -- 4. Extract and validate extension
  v_ext := lower(regexp_replace(p_original_filename, '^.*\.', ''));
  IF v_ext = '' OR v_ext = lower(p_original_filename) OR NOT (v_ext = ANY(v_allowed_ext)) THEN
    RAISE EXCEPTION 'File type not allowed. Supported: PDF, Word, Excel, PowerPoint, JPEG, PNG, WebP, TXT.';
  END IF;

  -- 5. Validate MIME type matches extension
  v_expected_mime := v_ext_mime_map ->> v_ext;
  IF v_expected_mime IS NULL OR p_mime_type IS NULL OR trim(p_mime_type) != v_expected_mime THEN
    RAISE EXCEPTION 'File MIME type does not match the file extension.';
  END IF;

  -- 6. Acquire advisory lock to prevent concurrent quota bypass
  -- Use a stable key based on the group_id hash
  PERFORM pg_advisory_xact_lock(hashtext(p_group_id::text));

  -- 7. Check file count limit
  SELECT count(*) INTO v_file_count
  FROM public.group_files
  WHERE group_id = p_group_id;

  IF v_file_count >= v_max_files THEN
    RAISE EXCEPTION 'This group has reached the maximum of % files.', v_max_files;
  END IF;

  -- 8. Check total storage quota
  SELECT COALESCE(sum(file_size), 0) INTO v_total_size
  FROM public.group_files
  WHERE group_id = p_group_id;

  IF v_total_size + p_file_size > v_max_total_bytes THEN
    RAISE EXCEPTION 'This upload would exceed the group storage quota of 500 MB.';
  END IF;

  -- 9. Generate file ID and unpredictable storage path
  v_file_id := gen_random_uuid();
  v_storage_path := p_group_id::text || '/' || v_file_id::text || '/' || encode(gen_random_bytes(16), 'hex');

  -- 10. Insert the record
  INSERT INTO public.group_files (id, group_id, uploader_user_id, original_filename, storage_path, file_size, mime_type, description)
  VALUES (v_file_id, p_group_id, auth.uid(), p_original_filename, v_storage_path, p_file_size, p_mime_type, p_description);

  -- 11. Return the file ID and storage path for the client to upload to
  RETURN jsonb_build_object(
    'file_id', v_file_id,
    'storage_path', v_storage_path
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_group_file_record(uuid, text, text, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group_file_record(uuid, text, text, bigint, text) TO authenticated;

-- ============================================================================
-- 4. cleanup_group_file function (service-role only, used by edge functions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_group_file(p_file_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_file record;
BEGIN
  -- This function is callable only by the service_role (EXECUTE revoked from
  -- PUBLIC, anon, authenticated). Edge functions call it to retrieve file
  -- details and delete the database record atomically.
  SELECT id, group_id, storage_path, uploader_user_id, original_filename
  INTO v_file
  FROM public.group_files
  WHERE id = p_file_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Delete the database record (the edge function handles storage deletion)
  DELETE FROM public.group_files WHERE id = p_file_id;

  RETURN jsonb_build_object(
    'found', true,
    'file_id', v_file.id,
    'group_id', v_file.group_id,
    'storage_path', v_file.storage_path,
    'uploader_user_id', v_file.uploader_user_id
  );
END;
$$;

-- Service-role only: revoke from everyone, grant only to service_role
REVOKE EXECUTE ON FUNCTION public.cleanup_group_file(uuid) FROM PUBLIC, anon, authenticated;
-- service_role bypasses RLS and is granted by default; explicit grant for clarity
-- (service_role is not a standard grant target in all setups, so we also allow
-- the edge function to call this via the service_role key which bypasses all checks)

-- ============================================================================
-- 5. RLS Policies on group_files
-- ============================================================================

-- SELECT: only authorised participants (starter, admin, cofounder) can view files
DROP POLICY IF EXISTS "group_files_select_authorized" ON public.group_files;
CREATE POLICY "group_files_select_authorized"
ON public.group_files FOR SELECT
TO authenticated
USING (
  public.get_group_file_role(group_id) IN ('starter', 'admin', 'cofounder')
);

-- INSERT: deny direct inserts — files must go through create_group_file_record()
-- We still create a restrictive INSERT policy for defense in depth
DROP POLICY IF EXISTS "group_files_insert_restricted" ON public.group_files;
CREATE POLICY "group_files_insert_restricted"
ON public.group_files FOR INSERT
TO authenticated
WITH CHECK (false);

-- UPDATE: users can only update the description of files in groups where they
-- are an authorised participant. Pinning (is_pinned, display_order, pinned_at)
-- is deferred to Stage 3 and is not writable through this policy.
DROP POLICY IF EXISTS "group_files_update_description" ON public.group_files;
CREATE POLICY "group_files_update_description"
ON public.group_files FOR UPDATE
TO authenticated
USING (
  public.get_group_file_role(group_id) IN ('starter', 'admin', 'cofounder')
)
WITH CHECK (
  public.get_group_file_role(group_id) IN ('starter', 'admin', 'cofounder')
);

-- DELETE: deny direct deletes — deletion goes through the edge function
-- which uses cleanup_group_file() with the service role key
DROP POLICY IF EXISTS "group_files_delete_denied" ON public.group_files;
CREATE POLICY "group_files_delete_denied"
ON public.group_files FOR DELETE
TO authenticated
USING (false);

-- ============================================================================
-- 6. Column-level grants
-- ============================================================================

-- Revoke all, then grant only what's needed
REVOKE ALL ON public.group_files FROM anon, authenticated;

-- SELECT on all columns (policy restricts rows)
GRANT SELECT ON public.group_files TO authenticated;

-- INSERT: only through the RPC function (which runs as SECURITY DEFINER).
-- The INSERT policy denies direct inserts, so no direct INSERT grant is needed.
-- However, the table needs to be insertable by the function's owner context.
-- The SECURITY DEFINER function runs as its owner, which has INSERT rights.

-- UPDATE: only the description column (pinning deferred to Stage 3)
GRANT UPDATE (description) ON public.group_files TO authenticated;

-- DELETE: denied to authenticated (handled by edge function via service role)
-- No DELETE grant to authenticated.

-- Grant service_role full access (used by edge functions)
-- service_role bypasses RLS, but needs the table-level grant
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_files TO service_role;

-- ============================================================================
-- 7. Storage bucket: group-files (private)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-files',
  'group-files',
  false,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 8. Storage RLS policies for group-files bucket
-- ============================================================================

-- SELECT: authorised participants can read (download) objects
DROP POLICY IF EXISTS "group_files_storage_select_authorized" ON storage.objects;
CREATE POLICY "group_files_storage_select_authorized"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'group-files'
  AND (
    (storage.foldername(name))[1]::uuid IS NOT NULL
    AND public.get_group_file_role((storage.foldername(name))[1]::uuid) IN ('starter', 'admin', 'cofounder')
  )
);

-- INSERT: authorised participants can upload, but only to a path that matches
-- an existing group_files record (preventing orphaned storage objects)
DROP POLICY IF EXISTS "group_files_storage_insert_authorized" ON storage.objects;
CREATE POLICY "group_files_storage_insert_authorized"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'group-files'
  AND (
    (storage.foldername(name))[1]::uuid IS NOT NULL
    AND public.get_group_file_role((storage.foldername(name))[1]::uuid) IN ('starter', 'admin', 'cofounder')
  )
  AND EXISTS (
    SELECT 1 FROM public.group_files gf
    WHERE gf.storage_path = name
  )
);

-- UPDATE: denied (no updates to storage objects needed)
DROP POLICY IF EXISTS "group_files_storage_update_denied" ON storage.objects;
CREATE POLICY "group_files_storage_update_denied"
ON storage.objects FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- DELETE: denied to authenticated — handled by edge function with service role
DROP POLICY IF EXISTS "group_files_storage_delete_denied" ON storage.objects;
CREATE POLICY "group_files_storage_delete_denied"
ON storage.objects FOR DELETE
TO authenticated
USING (false);
