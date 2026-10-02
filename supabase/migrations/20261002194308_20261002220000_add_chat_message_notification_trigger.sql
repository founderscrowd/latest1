/*
# Chat Message Notification Trigger

## Purpose
When a user sends a chat message, all other participants in the conversation
should receive a notification. This migration creates a trigger on the `messages`
table that fires after each insert.

## Changes
1. Create function `notify_conversation_participants()` that:
   - Finds all participants in the conversation (from conversation_participants)
   - Excludes the sender
   - Excludes participants who have muted the conversation (is_muted = true)
   - Looks up the sender's username from profiles
   - Inserts a `new_message` notification for each eligible participant
2. Attach it as an AFTER INSERT trigger on `messages`

## Notification Format
- type: 'new_message'
- title: 'New Message' or sender's username
- message: '{sender_username} sent you a message' or content preview
- recipient_id: the participant's user_id
- data: { "conversation_id": "...", "sender_id": "...", "sender_username": "...", "group_id": "...", "message_preview": "..." }

## Security
- Function is SECURITY DEFINER so it can insert into notifications
- Excludes system messages (event IS NOT NULL) and deleted messages
*/

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
  has_muted_column boolean;
BEGIN
  -- Skip system messages and deleted messages
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Skip system messages (event column is not null for system messages)
  IF NEW.event IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get sender info
  SELECT username, avatar_url INTO sender_username, sender_avatar
  FROM profiles
  WHERE id = NEW.sender_id;

  IF sender_username IS NULL THEN
    sender_username := 'Someone';
  END IF;

  -- Get conversation info
  SELECT type, group_id, name INTO conv_type, conv_group_id, conv_name
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Build message preview (truncated to 100 chars)
  message_preview := LEFT(NEW.content, 100);

  -- Insert notifications for all other participants (excluding muted ones)
  INSERT INTO notifications (user_id, recipient_id, type, title, message, data, "read", related_entity_id)
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

-- Drop existing trigger if previously created
DROP TRIGGER IF EXISTS on_message_insert_notify_participants ON messages;

-- Create the trigger
CREATE TRIGGER on_message_insert_notify_participants
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_conversation_participants();
