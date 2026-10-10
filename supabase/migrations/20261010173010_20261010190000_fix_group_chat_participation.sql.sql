/*
# Repair group chat participation before sending messages

1. Purpose
- Ensure an approved group member can always access the group conversation connected to their group.
- Repair older conversations that were created before later members joined.

2. Database changes
- Add `ensure_group_conversation_access(uuid)` returning the group conversation ID.
- The function finds the existing group conversation or creates one when the group has none.
- The function adds all approved group members and the group creator as conversation participants.
- Existing participants who previously left are reactivated.

3. Security
- The function runs with `SECURITY DEFINER` and a fixed `search_path`.
- The caller must be the group creator or an approved group member.
- Execution is revoked from `public` and granted only to `authenticated` users.
- No table policies are widened; message sending remains restricted to active participants.

4. Important notes
- This migration is additive and does not remove or alter existing user data.
- The function performs authorization using the authenticated session identity, never a caller-supplied user ID.
*/

CREATE OR REPLACE FUNCTION public.ensure_group_conversation_access(group_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id uuid;
  group_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM groups g
    WHERE g.id = group_id_param
      AND (
        g.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM group_members gm
          WHERE gm.group_id = g.id
            AND gm.user_id = auth.uid()
            AND gm.status = 'approved'
        )
      )
  ) THEN
    RAISE EXCEPTION 'Not authorized to access this group conversation';
  END IF;

  SELECT c.id
  INTO conversation_id
  FROM conversations c
  WHERE c.group_id = group_id_param
    AND c.type = 'group'
  ORDER BY c.created_at ASC
  LIMIT 1;

  IF conversation_id IS NULL THEN
    SELECT g.name
    INTO group_name
    FROM groups g
    WHERE g.id = group_id_param;

    INSERT INTO conversations (type, group_id, name, created_by)
    VALUES ('group', group_id_param, COALESCE(group_name, 'Group Chat'), auth.uid())
    RETURNING id INTO conversation_id;
  END IF;

  INSERT INTO conversation_participants (conversation_id, user_id, role, left_at)
  SELECT
    conversation_id,
    gm.user_id,
    CASE WHEN gm.role IN ('admin', 'starter') THEN 'admin' ELSE 'member' END,
    NULL
  FROM group_members gm
  WHERE gm.group_id = group_id_param
    AND gm.status = 'approved'
  ON CONFLICT (conversation_id, user_id) DO UPDATE
    SET left_at = NULL;

  INSERT INTO conversation_participants (conversation_id, user_id, role, left_at)
  SELECT conversation_id, g.creator_id, 'admin', NULL
  FROM groups g
  WHERE g.id = group_id_param
  ON CONFLICT (conversation_id, user_id) DO UPDATE
    SET left_at = NULL;

  RETURN conversation_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_group_conversation_access(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.ensure_group_conversation_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_group_conversation_access(uuid) TO authenticated;