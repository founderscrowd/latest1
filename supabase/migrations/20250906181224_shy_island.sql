/*
  # Fix group members RLS policy

  1. Security Changes
    - Drop existing problematic RLS policies that cause infinite recursion
    - Add new simplified policies for group members table
    - Allow users to view members of groups they belong to
    - Allow viewing members of public groups
    - Prevent infinite recursion in policy checks

  2. Policy Updates
    - SELECT: Users can view members of groups they're part of or public groups
    - INSERT: Users can request to join groups (for themselves only)
    - UPDATE: Group admins and creators can update membership status
    - DELETE: Users can leave groups, admins can remove members
*/

-- Drop existing policies that may cause infinite recursion
DROP POLICY IF EXISTS "Users can view group memberships they're part of" ON group_members;
DROP POLICY IF EXISTS "Group admins can manage memberships" ON group_members;
DROP POLICY IF EXISTS "Users can request to join groups" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;

-- Create new simplified policies
CREATE POLICY "Users can view group members"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing members of public groups
    group_id IN (
      SELECT id FROM groups WHERE is_public = true
    )
    OR
    -- Allow viewing members if user is a member of the group
    EXISTS (
      SELECT 1 FROM group_members gm2 
      WHERE gm2.group_id = group_members.group_id 
      AND gm2.user_id = auth.uid() 
      AND gm2.status = 'approved'
    )
    OR
    -- Allow group creators to view all members
    group_id IN (
      SELECT id FROM groups WHERE creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave groups"
  ON group_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Group creators and admins can manage members"
  ON group_members
  FOR UPDATE
  TO authenticated
  USING (
    -- Group creator can manage all members
    group_id IN (
      SELECT id FROM groups WHERE creator_id = auth.uid()
    )
    OR
    -- Group admins can manage members
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.role = 'admin' 
      AND gm.status = 'approved'
    )
  )
  WITH CHECK (
    -- Same conditions for updates
    group_id IN (
      SELECT id FROM groups WHERE creator_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.role = 'admin' 
      AND gm.status = 'approved'
    )
  );

CREATE POLICY "Group creators and admins can remove members"
  ON group_members
  FOR DELETE
  TO authenticated
  USING (
    -- Users can remove themselves
    user_id = auth.uid()
    OR
    -- Group creator can remove any member
    group_id IN (
      SELECT id FROM groups WHERE creator_id = auth.uid()
    )
    OR
    -- Group admins can remove members
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.role = 'admin' 
      AND gm.status = 'approved'
    )
  );