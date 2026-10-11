/*
# Fix private conversation creation

1. Purpose
- Repair the private messaging entry point used when a member clicks Message beside another group member.
- Ensure the database function cannot be called anonymously or resolve objects through a caller-controlled search path.

2. Function behavior
- `create_private_conversation(target_user_id)` now requires an authenticated caller.
- The caller cannot start a conversation with themselves.
- The target must be an existing profile.
- Existing active two-person conversations are reused.
- New conversations receive both participants in one database operation.

3. Security changes
- Set the function search path to `public`.
- Revoke function execution from `anon`.
- Grant function execution only to `authenticated`.
- Authorization is derived from `auth.uid()` and is never accepted as a client parameter.

4. Data safety
- No existing rows, columns, or tables are deleted or changed.
- Existing conversations remain available and continue to be reused.
*/

CREATE OR REPLACE FUNCTION public.create_private_conversation(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF target_user_id IS NULL OR target_user_id = current_user_id THEN
    RAISE EXCEPTION 'Invalid conversation participant';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = target_user_id
  ) THEN
    RAISE EXCEPTION 'Conversation participant not found';
  END IF;

  SELECT c.id
  INTO conversation_id
  FROM conversations c
  JOIN conversation_participants cp1
    ON cp1.conversation_id = c.id
   AND cp1.user_id = current_user_id
   AND cp1.left_at IS NULL
  JOIN conversation_participants cp2
    ON cp2.conversation_id = c.id
   AND cp2.user_id = target_user_id
   AND cp2.left_at IS NULL
  WHERE c.type = 'private'
    AND (
      SELECT count(*)
      FROM conversation_participants active_cp
      WHERE active_cp.conversation_id = c.id
        AND active_cp.left_at IS NULL
    ) = 2
  ORDER BY c.created_at ASC
  LIMIT 1;

  IF conversation_id IS NOT NULL THEN
    RETURN conversation_id;
  END IF;

  INSERT INTO conversations (type, created_by)
  VALUES ('private', current_user_id)
  RETURNING id INTO conversation_id;

  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES
    (conversation_id, current_user_id, 'member'),
    (conversation_id, target_user_id, 'member');

  RETURN conversation_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_private_conversation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_private_conversation(uuid) TO authenticated;