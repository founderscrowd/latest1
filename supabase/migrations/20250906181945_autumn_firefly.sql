/*
  # Fix group_members RLS policies to resolve 500 errors

  1. Security Changes
    - Drop all existing problematic RLS policies on group_members table
    - Create new simplified policies that avoid infinite recursion
    - Allow SELECT operations for counting and viewing members
    - Ensure proper permissions for authenticated users

  2. Policy Structure
    - Simple policy for viewing group members without complex joins
    - Separate policies for different operations (SELECT, INSERT, UPDATE, DELETE)
    - Avoid self-referential queries that cause infinite loops
*/

-- Drop all existing policies on group_members to start fresh
DROP POLICY IF EXISTS "Allow viewing group members for group creators" ON group_members;
DROP POLICY IF EXISTS "Allow viewing group members for group members" ON group_members;
DROP POLICY IF EXISTS "Allow viewing group members for public groups" ON group_members;
DROP POLICY IF EXISTS "Group creators can manage all members" ON group_members;
DROP POLICY IF EXISTS "Users can manage their own membership" ON group_members;
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Users can manage own membership" ON group_members;

-- Create simple, non-recursive policies
CREATE POLICY "Enable read access for authenticated users" ON group_members
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users" ON group_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for own membership" ON group_members
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for own membership" ON group_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Allow group creators to manage members (using direct group table lookup)
CREATE POLICY "Group creators can manage members" ON group_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = group_members.group_id 
      AND groups.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = group_members.group_id 
      AND groups.creator_id = auth.uid()
    )
  );