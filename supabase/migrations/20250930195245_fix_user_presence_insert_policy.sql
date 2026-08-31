/*
  # Fix user_presence RLS policies

  This migration fixes the Row Level Security policies for the user_presence table
  to allow authenticated users to insert and update their own presence records.

  ## Changes
  1. Drop existing policies that are too restrictive
  2. Create new policies that allow:
     - Users to insert their own presence records
     - Users to update their own presence records
     - Users to view all presence records (for seeing who's online)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read all presence" ON user_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON user_presence;

-- Allow users to view all presence records (to see who's online)
CREATE POLICY "Users can view all presence records"
  ON user_presence
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert their own presence records
CREATE POLICY "Users can insert own presence"
  ON user_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own presence records
CREATE POLICY "Users can update own presence"
  ON user_presence
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own presence records
CREATE POLICY "Users can delete own presence"
  ON user_presence
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
