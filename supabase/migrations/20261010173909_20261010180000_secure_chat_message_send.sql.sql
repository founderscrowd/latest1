/*
# Make chat message creation server-enforced

1. Purpose
- Make group and private chat message creation reliable when direct browser inserts are rejected or return an incomplete response.

2. Database changes
- Add `send_chat_message(uuid, text, text, uuid)` returning the new message ID.
- The function validates the conversation, the authenticated sender, the message type, and any reply target.
- The function writes the sender from the authenticated session instead of trusting a browser-supplied sender ID.

3. Security
- The function runs with `SECURITY DEFINER` and a fixed `search_path`.
- Only an active conversation participant may send a message.
- The function is executable by authenticated users only.
- No message table policies are widened.

4. Important notes
- This is additive and preserves existing messages.
- The frontend still reads the created message through the normal conversation access rules.
*/

CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id uuid,
  p_content text,
  p_message_type text DEFAULT 'text',
  p_reply_to_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Message content is required';
  END IF;

  IF p_message_type NOT IN ('text', 'image', 'file', 'system') THEN
    RAISE EXCEPTION 'Invalid message type';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Not authorized to send messages in this conversation';
  END IF;

  IF p_reply_to_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM messages m
    WHERE m.id = p_reply_to_id
      AND m.conversation_id = p_conversation_id
  ) THEN
    RAISE EXCEPTION 'Invalid reply target';
  END IF;

  INSERT INTO messages (conversation_id, sender_id, content, message_type, reply_to_id)
  VALUES (p_conversation_id, auth.uid(), p_content, p_message_type, p_reply_to_id)
  RETURNING id INTO v_message_id;

  UPDATE conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = p_conversation_id;

  RETURN v_message_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_chat_message(uuid, text, text, uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.send_chat_message(uuid, text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_chat_message(uuid, text, text, uuid) TO authenticated;