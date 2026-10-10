/*
# Fix group chat access function variable naming

1. Purpose
- Correct the group chat access function so it can find or create the conversation without a SQL ambiguity error.

2. Database changes
- Replace `ensure_group_conversation_access(uuid)` with the same behavior using uniquely named internal variables.
- Approved group members and the group creator continue to be enrolled in the group conversation.
- Existing participants who previously left continue to be reactivated.

3. Security
- Preserve `SECURITY DEFINER` with a fixed `search_path`.
- Preserve authorization through the authenticated session and approved group membership.
- Preserve execution access for authenticated users only.

4. Important notes
- This is a corrective, additive update and does not delete or alter message data.
*/

CREATE OR REPLACE FUNCTION public.ensure_group_conversation_access(group_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_group_name text;
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
  INTO v_conversation_id
  FROM conversations c
  WHERE c.group_id = group_id_param
    AND c.type = 'group'
  ORDER BY c.created_at ASC
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    SELECT g.name
    INTO v_group_name
    FROM groups g
    WHERE g.id = group_id_param;

    INSERT INTO conversations (type, group_id, name, created_by)
    VALUES ('group', group_id_param, COALESCE(v_group_name, 'Group Chat'), auth.uid())
    RETURNING id INTO v_conversation_id;
  END IF;

  INSERT INTO conversation_participants (conversation_id, user_id, role, left_at)
  SELECT
    v_conversation_id,
    gm.user_id,
    CASE WHEN gm.role IN ('admin', 'starter') THEN 'admin' ELSE 'member' END,
    NULL
  FROM group_members gm
  WHERE gm.group_id = group_id_param
    AND gm.status = 'approved'
  ON CONFLICT (conversation_id, user_id) DO UPDATE
    SET left_at = NULL;

  INSERT INTO conversation_participants (conversation_id, user_id, role, left_at)
  SELECT v_conversation_id, g.creator_id, 'admin', NULL
  FROM groups g
  WHERE g.id = group_id_param
  ON CONFLICT (conversation_id, user_id) DO UPDATE
    SET left_at = NULL;

  RETURN v_conversation_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_group_conversation_access(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.ensure_group_conversation_access(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_group_conversation_access(uuid) TO authenticated;