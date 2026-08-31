/*
  # Fix Infinite Recursion and Foreign Key Issues

  1. Database Schema Fixes
    - Fix infinite recursion in RLS policies for conversation_participants
    - Add missing foreign key relationship between messages and profiles
    - Simplify RLS policies to prevent circular dependencies

  2. Policy Updates
    - Replace complex policies with simple auth.uid() checks
    - Remove circular references between tables
*/

-- First, drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Conversation admins can manage participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;

-- Add the missing foreign key constraint between messages and profiles
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE public.messages
ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create simple, non-recursive policies for conversation_participants
CREATE POLICY "Users can view their own participation"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own participation"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation"
  ON conversation_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own participation"
  ON conversation_participants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Simplify conversations policies to avoid recursion
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;

CREATE POLICY "Users can view conversations they participate in"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

-- Ensure messages policies are simple
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;

CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

-- Fix message reactions policies
DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON message_reactions;

CREATE POLICY "Users can view reactions in their conversations"
  ON message_reactions
  FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id 
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid() AND cp.left_at IS NULL
    )
  );

-- Fix message attachments policies
DROP POLICY IF EXISTS "Users can view attachments in their conversations" ON message_attachments;

CREATE POLICY "Users can view attachments in their conversations"
  ON message_attachments
  FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id 
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid() AND cp.left_at IS NULL
    )
  );

-- Fix message read status policies
DROP POLICY IF EXISTS "Users can view read status in their conversations" ON message_read_status;

CREATE POLICY "Users can view read status in their conversations"
  ON message_read_status
  FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id 
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid() AND cp.left_at IS NULL
    )
  );

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';