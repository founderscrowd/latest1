-- Fix: gen_random_bytes is installed in the "extensions" schema by pgcrypto,
-- but create_group_file_record has SET search_path TO 'public', so the
-- unqualified call fails with "function gen_random_bytes(integer) does not exist".
-- Qualify the call as extensions.gen_random_bytes(16) so it resolves regardless
-- of search_path. No other changes to signature, security, validation, or logic.

CREATE OR REPLACE FUNCTION public.create_group_file_record(
  p_group_id uuid,
  p_original_filename text,
  p_mime_type text,
  p_file_size bigint,
  p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    "xlsx": "application/vnd.openxmlformats.spreadsheetml.sheet",
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
  v_storage_path := p_group_id::text || '/' || v_file_id::text || '/' || encode(extensions.gen_random_bytes(16), 'hex');

  -- 10. Insert the record
  INSERT INTO public.group_files (id, group_id, uploader_user_id, original_filename, storage_path, file_size, mime_type, description)
  VALUES (v_file_id, p_group_id, auth.uid(), p_original_filename, v_storage_path, p_file_size, p_mime_type, p_description);

  -- 11. Return the file ID and storage path for the client to upload to
  RETURN jsonb_build_object(
    'file_id', v_file_id,
    'storage_path', v_storage_path
  );
END;
$function$;