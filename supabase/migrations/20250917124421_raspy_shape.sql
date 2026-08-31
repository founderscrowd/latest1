/*
  # Fix user_presence RLS policies

  1. Security Updates
    - Add missing INSERT policy for user_presence table
    - Update existing policies to ensure users can manage their own presence
    - Allow authenticated users to insert and update their own presence records

  This fixes the 401 error when users try to update their online/offline status.
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can update their own presence" ON user_presence;
DROP POLICY IF EXISTS "Authenticated users can view all presence" ON user_presence;

-- Create comprehensive policies for user_presence
CREATE POLICY "Users can insert their own presence"
  ON user_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own presence"
  ON user_presence
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can select their own presence"
  ON user_presence
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can view all presence"
  ON user_presence
  FOR SELECT
  TO authenticated
  USING (true);