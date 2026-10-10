/*
# Fix chat message trigger and participant visibility

1. Purpose
- Fix the message notification trigger that referenced a column which does not exist on `messages`.
- Restore active conversation participation for all approved group members and creators.
- Allow members to see the active participants in conversations they belong to.

2. Data changes
- Backfill every existing group conversation with every approved group member.
- Backfill every existing group conversation with its group creator.
- Reactivate existing participant rows by clearing `left_at` without deleting message or membership data.

3. Security changes
- Add `is_active_conversation_participant(uuid)` as a protected membership check for row-level security.
- Replace the participant self-only read rule with a rule that lets active participants view active participants in their own conversations.
- Keep message sending restricted to active participants through the existing send policy and `send_chat_message` function.
- Preserve authenticated-only function access.

4. Trigger correction
- Recreate `notify_conversation_participants()` without checking `NEW.event`, because `messages` has no `event` column.
- Keep notification creation for valid inserted messages.

5. Important notes
- This migration is additive and does not delete messages, memberships, conversations, or profiles.
- Existing participant roles are preserved when a row already exists.
*/

CREATE OR REPLACE FUNCTION public.is_active_conversation_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_conversation_participant(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_active_conversation_participant(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_active_conversation_participant(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view their own participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
CREATE POLICY "Users can view participants in their conversations"
ON conversation_participants
FOR SELECT
TO authenticated
USING (public.is_active_conversation_participant(conversation_id) AND left_at IS NULL);

INSERT INTO conversation_participants (
  conversation_id,
  user_id,
  role,
  joined_at,
  last_read_at,
  left_at,
  is_muted,
  notification_settings
)
SELECT
  c.id,
  gm.user_id,
  CASE WHEN gm.role IN ('admin', 'starter') THEN 'admin' ELSE 'member' END,
  COALESCE(gm.joined_at, now()),
  COALESCE(gm.joined_at, now()),
  NULL,
  false,
  jsonb_build_object('mentions', true, 'all_messages', true)
FROM conversations c
JOIN group_members gm ON gm.group_id = c.group_id
WHERE c.type = 'group'
  AND gm.status = 'approved'
ON CONFLICT (conversation_id, user_id) DO UPDATE
SET left_at = NULL;

INSERT INTO conversation_participants (
  conversation_id,
  user_id,
  role,
  joined_at,
  last_read_at,
  left_at,
  is_muted,
  notification_settings
)
SELECT
  c.id,
  g.creator_id,
  'starter',
  COALESCE(g.created_at, now()),
  COALESCE(g.created_at, now()),
  NULL,
  false,
  jsonb_build_object('mentions', true, 'all_messages', true)
FROM conversations c
JOIN groups g ON g.id = c.group_id
WHERE c.type = 'group'
ON CONFLICT (conversation_id, user_id) DO UPDATE
SET left_at = NULL;

CREATE OR REPLACE FUNCTION public.notify_conversation_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_username text;
  sender_avatar text;
  conv_group_id uuid;
  conv_name text;
  conv_type text;
  message_preview text;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT username, avatar_url
  INTO sender_username, sender_avatar
  FROM profiles
  WHERE id = NEW.sender_id;

  IF sender_username IS NULL THEN
    sender_username := 'Someone';
  END IF;

  SELECT type, group_id, name
  INTO conv_type, conv_group_id, conv_name
  FROM conversations
  WHERE id = NEW.conversation_id;

  message_preview := LEFT(NEW.content, 100);

  INSERT INTO notifications (
    user_id,
    recipient_id,
    type,
    title,
    message,
    data,
    "read",
    related_entity_id
  )
  SELECT
    cp.user_id,
    cp.user_id,
    'new_message',
    COALESCE(sender_username, 'New Message'),
    CASE
      WHEN conv_type = 'group' AND conv_name IS NOT NULL THEN
        sender_username || ' sent a message in ' || conv_name
      ELSE
        sender_username || ' sent you a message'
    END,
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'sender_username', sender_username,
      'sender_avatar', sender_avatar,
      'group_id', conv_group_id,
      'conversation_name', conv_name,
      'conversation_type', conv_type,
      'message_preview', message_preview
    ),
    false,
    NEW.id
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id != NEW.sender_id
    AND cp.left_at IS NULL
    AND (cp.is_muted IS NULL OR cp.is_muted = false);

  RETURN NEW;
END;
$$;