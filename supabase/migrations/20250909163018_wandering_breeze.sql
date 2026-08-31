/*
  # Fix Chat System Schema Errors

  This migration fixes several issues with the chat system database schema:
  
  1. Missing foreign key relationships between tables and profiles
  2. Invalid role constraint in conversation_participants table
  3. Missing foreign key constraints for proper Supabase joins

  ## Changes Made
  - Add foreign key from conversation_participants.user_id to profiles.id
  - Add foreign key from messages.sender_id to profiles.id  
  - Update conversation_participants role constraint to include 'starter'
  - Ensure proper relationships for Supabase PostgREST joins
*/

-- Add missing foreign key from conversation_participants to profiles
ALTER TABLE public.conversation_participants 
ADD CONSTRAINT fk_conversation_participants_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add missing foreign key from messages to profiles
ALTER TABLE public.messages 
ADD CONSTRAINT fk_messages_sender_id 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update the role constraint to include 'starter' role
ALTER TABLE public.conversation_participants 
DROP CONSTRAINT IF EXISTS conversation_participants_role_check;

ALTER TABLE public.conversation_participants 
ADD CONSTRAINT conversation_participants_role_check 
CHECK (role IN ('admin', 'member', 'moderator', 'starter'));

-- Update the create_group_conversation function to handle starter role properly
CREATE OR REPLACE FUNCTION create_group_conversation(group_id_param uuid, conversation_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    conversation_id uuid;
    current_user_id uuid := auth.uid();
    group_creator_id uuid;
BEGIN
    -- Check if a group conversation already exists for this group
    SELECT id INTO conversation_id
    FROM public.conversations
    WHERE type = 'group' AND group_id = group_id_param;

    IF conversation_id IS NULL THEN
        -- Get group creator ID
        SELECT creator_id INTO group_creator_id FROM public.groups WHERE id = group_id_param;

        -- Create new group conversation
        INSERT INTO public.conversations (type, group_id, name, created_by)
        VALUES ('group', group_id_param, COALESCE(conversation_name, (SELECT name FROM public.groups WHERE id = group_id_param)), group_creator_id)
        RETURNING id INTO conversation_id;

        -- Add all existing approved group members as conversation participants
        -- Map group member roles to conversation participant roles
        INSERT INTO public.conversation_participants (conversation_id, user_id, role)
        SELECT 
            conversation_id, 
            user_id, 
            CASE 
                WHEN role = 'starter' THEN 'admin'::text
                WHEN role = 'admin' THEN 'admin'::text
                WHEN role = 'cofounder' THEN 'member'::text
                ELSE 'member'::text
            END as mapped_role
        FROM public.group_members
        WHERE group_id = group_id_param AND status = 'approved';
    END IF;

    RETURN conversation_id;
END;
$$;