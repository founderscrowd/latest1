/*
# Fix group_files UPDATE policy for cofounder description editing

## Purpose
Stage 1's UPDATE policy allowed any authorised participant (starter, admin, cofounder)
to edit the description of any file in the group. The Stage 2 requirement is:
- Starter and Admin can edit descriptions of any group file
- Cofounders can edit descriptions of their own files only

## Security Changes
- Replaces the `group_files_update_description` UPDATE policy with a version that
  checks the caller's role via `get_group_file_role()` and, for cofounders, also
  verifies that `uploader_user_id = auth.uid()`. Starter and Admin retain full
  description editing access.
- No other tables, policies, or functions are modified.
*/

DROP POLICY IF EXISTS "group_files_update_description" ON public.group_files;

CREATE POLICY "group_files_update_description"
ON public.group_files FOR UPDATE
TO authenticated
USING (
  public.get_group_file_role(group_id) IN ('starter', 'admin')
  OR (
    public.get_group_file_role(group_id) = 'cofounder'
    AND uploader_user_id = auth.uid()
  )
)
WITH CHECK (
  public.get_group_file_role(group_id) IN ('starter', 'admin')
  OR (
    public.get_group_file_role(group_id) = 'cofounder'
    AND uploader_user_id = auth.uid()
  )
);
