/*
# Stage 3: Pin, Unpin, and Reorder Group Files

## Purpose
Adds server-side functions to pin, unpin, and reorder important documents
in the group file library. Only Starter and Admin roles can manage pinned
documents. A maximum of 3 pinned files per group is enforced server-side
with an advisory lock to prevent concurrent bypass.

## New Functions
- `pin_group_file(p_file_id uuid)` — SECURITY DEFINER, pins a file:
  validates caller is starter/admin of the file's group, enforces 3-file
  max with advisory lock, sets is_pinned=true, pinned_at=now(), and
  assigns display_order = max+1.
- `unpin_group_file(p_file_id uuid)` — SECURITY DEFINER, unpins a file:
  validates caller is starter/admin, sets is_pinned=false, clears
  pinned_at and display_order, then renumbers remaining pinned files
  to be contiguous (1, 2, 3).
- `reorder_pinned_files(p_group_id uuid, p_ordered_ids uuid[])` —
  SECURITY DEFINER, validates caller is starter/admin, accepts an
  array of up to 3 file IDs in the desired display order, verifies
  all IDs belong to the group and are currently pinned, then updates
  display_order for each.

## Security
- All three functions run as SECURITY DEFINER with search_path='public'.
- EXECUTE revoked from PUBLIC and anon; granted only to authenticated.
- Each function checks get_group_file_role() for 'starter' or 'admin'.
- The 3-file limit uses pg_advisory_xact_lock on the group_id hash to
  prevent concurrent pin requests from bypassing the limit.
- No changes to existing RLS policies, column grants, or storage policies.
- No changes to existing functions or tables (only new functions added).
*/

-- ============================================================================
-- 1. pin_group_file
-- ============================================================================

CREATE OR REPLACE FUNCTION public.pin_group_file(p_file_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_id uuid;
  v_role text;
  v_pinned_count integer;
  v_max_order integer;
BEGIN
  -- 1. Look up the file's group
  SELECT group_id INTO v_group_id FROM public.group_files WHERE id = p_file_id;
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'File not found.';
  END IF;

  -- 2. Validate caller's role (starter or admin only)
  v_role := public.get_group_file_role(v_group_id);
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group.';
  END IF;
  IF v_role NOT IN ('starter', 'admin') THEN
    RAISE EXCEPTION 'You do not have permission to pin files.';
  END IF;

  -- 3. Lock the group to prevent concurrent pin bypass
  PERFORM pg_advisory_xact_lock(hashtext(v_group_id::text));

  -- 4. Check current pinned count (excluding this file if already pinned)
  SELECT count(*) INTO v_pinned_count
  FROM public.group_files
  WHERE group_id = v_group_id AND is_pinned = true AND id != p_file_id;

  IF v_pinned_count >= 3 THEN
    RAISE EXCEPTION 'This group already has 3 pinned documents. Unpin one before pinning another.';
  END IF;

  -- 5. Determine the next display_order
  SELECT COALESCE(max(display_order), 0) INTO v_max_order
  FROM public.group_files
  WHERE group_id = v_group_id AND is_pinned = true;

  -- 6. Pin the file
  UPDATE public.group_files
  SET is_pinned = true,
      pinned_at = now(),
      display_order = v_max_order + 1
  WHERE id = p_file_id AND is_pinned = false;

  IF NOT FOUND THEN
    -- File was already pinned — no-op, not an error
    RETURN;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.pin_group_file(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pin_group_file(uuid) TO authenticated;

-- ============================================================================
-- 2. unpin_group_file
-- ============================================================================

CREATE OR REPLACE FUNCTION public.unpin_group_file(p_file_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_id uuid;
  v_role text;
BEGIN
  -- 1. Look up the file's group
  SELECT group_id INTO v_group_id FROM public.group_files WHERE id = p_file_id;
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'File not found.';
  END IF;

  -- 2. Validate caller's role (starter or admin only)
  v_role := public.get_group_file_role(v_group_id);
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group.';
  END IF;
  IF v_role NOT IN ('starter', 'admin') THEN
    RAISE EXCEPTION 'You do not have permission to unpin files.';
  END IF;

  -- 3. Lock the group for consistent reordering
  PERFORM pg_advisory_xact_lock(hashtext(v_group_id::text));

  -- 4. Unpin the file
  UPDATE public.group_files
  SET is_pinned = false,
      pinned_at = NULL,
      display_order = 0
  WHERE id = p_file_id AND is_pinned = true;

  IF NOT FOUND THEN
    -- File was not pinned — no-op
    RETURN;
  END IF;

  -- 5. Renumber remaining pinned files to be contiguous (1, 2, 3...)
  WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY display_order) AS new_order
    FROM public.group_files
    WHERE group_id = v_group_id AND is_pinned = true
  )
  UPDATE public.group_files gf
  SET display_order = ranked.new_order
  FROM ranked
  WHERE gf.id = ranked.id AND gf.display_order != ranked.new_order;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.unpin_group_file(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unpin_group_file(uuid) TO authenticated;

-- ============================================================================
-- 3. reorder_pinned_files
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reorder_pinned_files(
  p_group_id uuid,
  p_ordered_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_id uuid;
  v_count integer;
  v_idx integer;
BEGIN
  -- 1. Validate caller's role (starter or admin only)
  v_role := public.get_group_file_role(p_group_id);
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'You are not a member of this group.';
  END IF;
  IF v_role NOT IN ('starter', 'admin') THEN
    RAISE EXCEPTION 'You do not have permission to reorder pinned files.';
  END IF;

  -- 2. Validate array is not empty and has at most 3 entries
  v_count := array_length(p_ordered_ids, 1);
  IF v_count IS NULL OR v_count = 0 THEN
    RAISE EXCEPTION 'No file IDs provided.';
  END IF;
  IF v_count > 3 THEN
    RAISE EXCEPTION 'Cannot reorder more than 3 pinned documents.';
  END IF;

  -- 3. Lock the group
  PERFORM pg_advisory_xact_lock(hashtext(p_group_id::text));

  -- 4. Verify all IDs belong to this group and are currently pinned
  FOR v_idx IN 1..v_count LOOP
    v_id := p_ordered_ids[v_idx];
    IF NOT EXISTS (
      SELECT 1 FROM public.group_files
      WHERE id = v_id AND group_id = p_group_id AND is_pinned = true
    ) THEN
      RAISE EXCEPTION 'One or more files are not pinned or do not belong to this group.';
    END IF;
  END LOOP;

  -- 5. Verify no duplicate IDs
  IF v_count != (SELECT count(DISTINCT id) FROM unnest(p_ordered_ids) AS id) THEN
    RAISE EXCEPTION 'Duplicate file IDs provided.';
  END IF;

  -- 6. Update display_order for each file
  FOR v_idx IN 1..v_count LOOP
    v_id := p_ordered_ids[v_idx];
    UPDATE public.group_files
    SET display_order = v_idx
    WHERE id = v_id AND group_id = p_group_id;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reorder_pinned_files(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_pinned_files(uuid, uuid[]) TO authenticated;