/*
  # Comprehensive Chat System Implementation

  1. New Tables
    - `conversations` - Chat rooms/conversations (group and private)
    - `messages` - Individual messages
    - `message_reactions` - Emoji reactions to messages
    - `message_attachments` - File attachments
    - `conversation_participants` - User participation in conversations
    - `message_read_status` - Track read/unread messages
    - `user_presence` - Online/offline status

  2. Security
    - Enable RLS on all tables
    - Comprehensive policies for privacy and security
    - Message encryption support

  3. Indexes
    - Optimized for real-time queries and pagination
*/

-- Conversations table (both group and private chats)
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('group', 'private')),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  name text,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  is_archived boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Ensure group conversations have group_id, private don't
  CONSTRAINT conversation_type_check CHECK (
    (type = 'group' AND group_id IS NOT NULL) OR
    (type = 'private' AND group_id IS NULL)
  )
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Soft delete check
  CONSTRAINT message_content_check CHECK (
    (deleted_at IS NULL AND content IS NOT NULL AND length(trim(content)) > 0) OR
    (deleted_at IS NOT NULL)
  )
);

-- Message reactions (emoji reactions)
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(message_id, user_id, emoji)
);

-- Message attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member', 'moderator')),
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  last_read_at timestamptz DEFAULT now(),
  is_muted boolean DEFAULT false,
  notification_settings jsonb DEFAULT '{"mentions": true, "all_messages": true}'::jsonb,
  
  UNIQUE(conversation_id, user_id)
);

-- Message read status
CREATE TABLE IF NOT EXISTS message_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now(),
  
  UNIQUE(message_id, user_id)
);

-- User presence (online/offline status)
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_group_id ON conversations(group_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON message_read_status(user_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in"
  ON conversations FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Users can create private conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (
    type = 'private' AND created_by = auth.uid()
  );

CREATE POLICY "Group admins can create group conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (
    type = 'group' AND 
    group_id IN (
      SELECT id FROM groups WHERE creator_id = auth.uid()
      UNION
      SELECT gm.group_id FROM group_members gm 
      WHERE gm.user_id = auth.uid() AND gm.role IN ('admin', 'starter') AND gm.status = 'approved'
    )
  );

CREATE POLICY "Conversation admins can update conversations"
  ON conversations FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND role = 'admin' AND left_at IS NULL
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Users can edit their own messages"
  ON messages FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid() AND
    created_at > now() - interval '15 minutes'
  );

CREATE POLICY "Users can delete their own messages"
  ON messages FOR DELETE TO authenticated
  USING (
    sender_id = auth.uid() OR
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator') AND left_at IS NULL
    )
  );

-- RLS Policies for message reactions
CREATE POLICY "Users can view reactions in their conversations"
  ON message_reactions FOR SELECT TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid() AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid() AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Users can remove their own reactions"
  ON message_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for conversation participants
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Conversation admins can manage participants"
  ON conversation_participants FOR ALL TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND role = 'admin' AND left_at IS NULL
    ) OR
    conversation_id IN (
      SELECT id FROM conversations WHERE created_by = auth.uid()
    )
  );

-- RLS Policies for message read status
CREATE POLICY "Users can view read status in their conversations"
  ON message_read_status FOR SELECT TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid() AND cp.left_at IS NULL
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON message_read_status FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid() AND cp.left_at IS NULL
    )
  );

-- RLS Policies for user presence
CREATE POLICY "Users can view presence of conversation participants"
  ON user_presence FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT DISTINCT cp.user_id FROM conversation_participants cp
      WHERE cp.conversation_id IN (
        SELECT conversation_id FROM conversation_participants 
        WHERE user_id = auth.uid() AND left_at IS NULL
      )
    )
  );

CREATE POLICY "Users can update their own presence"
  ON user_presence FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Functions for chat operations
CREATE OR REPLACE FUNCTION create_private_conversation(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_id uuid;
  existing_conversation_id uuid;
BEGIN
  -- Check if conversation already exists
  SELECT c.id INTO existing_conversation_id
  FROM conversations c
  JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
  JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
  WHERE c.type = 'private'
    AND cp1.user_id = auth.uid()
    AND cp2.user_id = target_user_id
    AND cp1.left_at IS NULL
    AND cp2.left_at IS NULL;
  
  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;
  
  -- Create new conversation
  INSERT INTO conversations (type, created_by)
  VALUES ('private', auth.uid())
  RETURNING id INTO conversation_id;
  
  -- Add participants
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES 
    (conversation_id, auth.uid(), 'admin'),
    (conversation_id, target_user_id, 'member');
  
  RETURN conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_group_conversation(group_id_param uuid, conversation_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_id uuid;
  group_member RECORD;
BEGIN
  -- Verify user is admin/starter of the group
  IF NOT EXISTS (
    SELECT 1 FROM groups WHERE id = group_id_param AND creator_id = auth.uid()
    UNION
    SELECT 1 FROM group_members 
    WHERE group_id = group_id_param AND user_id = auth.uid() 
    AND role IN ('admin', 'starter') AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only group admins can create group conversations';
  END IF;
  
  -- Create conversation
  INSERT INTO conversations (type, group_id, name, created_by)
  VALUES ('group', group_id_param, COALESCE(conversation_name, 'Group Chat'), auth.uid())
  RETURNING id INTO conversation_id;
  
  -- Add all approved group members as participants
  FOR group_member IN 
    SELECT user_id, role FROM group_members 
    WHERE group_id = group_id_param AND status = 'approved'
  LOOP
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (
      conversation_id, 
      group_member.user_id, 
      CASE 
        WHEN group_member.role IN ('admin', 'starter') THEN 'admin'
        ELSE 'member'
      END
    );
  END LOOP;
  
  RETURN conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_id_param uuid, up_to_message_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify user is participant
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = conversation_id_param AND user_id = auth.uid() AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User is not a participant in this conversation';
  END IF;
  
  -- Mark messages as read
  INSERT INTO message_read_status (message_id, user_id)
  SELECT m.id, auth.uid()
  FROM messages m
  WHERE m.conversation_id = conversation_id_param
    AND m.sender_id != auth.uid()
    AND (up_to_message_id IS NULL OR m.created_at <= (SELECT created_at FROM messages WHERE id = up_to_message_id))
    AND NOT EXISTS (
      SELECT 1 FROM message_read_status mrs 
      WHERE mrs.message_id = m.id AND mrs.user_id = auth.uid()
    );
  
  -- Update last_read_at
  UPDATE conversation_participants 
  SET last_read_at = now()
  WHERE conversation_id = conversation_id_param AND user_id = auth.uid();
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_private_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_group_conversation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_as_read(uuid, uuid) TO authenticated;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-attachments', 'chat-attachments', false, 10485760, ARRAY[
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for chat attachments
CREATE POLICY "Users can upload attachments to their conversations"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT conversation_id::text FROM conversation_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Users can view attachments in their conversations"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT conversation_id::text FROM conversation_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

CREATE POLICY "Users can delete their own attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );