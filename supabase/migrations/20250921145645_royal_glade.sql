/*
  # Fix conversation_participants RLS policies

  This migration fixes the Row-Level Security policies for the conversation_participants table
  to allow proper INSERT and UPDATE operations for group chat functionality.

  ## Changes Made

  1. **Updated INSERT policy**: Allows users to add themselves as participants, and allows 
     group admins/starters to add other participants to group conversations
  
  2. **Updated UPDATE policy**: Allows users to update their own participation records, and 
     allows group admins/starters to update other participants' records

  ## Security

  - Users can only insert/update their own participation records
  - Group admins and starters can manage participants for their group conversations
  - All policies maintain proper access control based on group membership and roles
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON conversation_participants;

-- Create new INSERT policy that allows:
-- 1. Users to add themselves as participants
-- 2. Group admins/starters to add participants to their group conversations
CREATE POLICY "Allow conversation participation management" 
ON conversation_participants FOR INSERT 
TO authenticated 
WITH CHECK (
  -- User can add themselves
  auth.uid() = user_id 
  OR 
  -- Group admins/starters can add participants to group conversations
  EXISTS (
    SELECT 1 
    FROM group_members gm 
    JOIN conversations c ON gm.group_id = c.group_id 
    WHERE c.id = conversation_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('admin', 'starter') 
    AND gm.status = 'approved'
  )
);

-- Create new UPDATE policy that allows:
-- 1. Users to update their own participation records
-- 2. Group admins/starters to update participants in their group conversations
CREATE POLICY "Allow conversation participation updates" 
ON conversation_participants FOR UPDATE 
TO authenticated 
USING (
  -- User can update their own participation
  auth.uid() = user_id 
  OR 
  -- Group admins/starters can update participants in group conversations
  EXISTS (
    SELECT 1 
    FROM group_members gm 
    JOIN conversations c ON gm.group_id = c.group_id 
    WHERE c.id = conversation_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('admin', 'starter') 
    AND gm.status = 'approved'
  )
)
WITH CHECK (
  -- Same conditions for the updated data
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 
    FROM group_members gm 
    JOIN conversations c ON gm.group_id = c.group_id 
    WHERE c.id = conversation_id 
    AND gm.user_id = auth.uid() 
    AND gm.role IN ('admin', 'starter') 
    AND gm.status = 'approved'
  )
);