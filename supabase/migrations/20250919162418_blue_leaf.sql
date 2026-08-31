/*
  # Fix User Presence RLS Policies

  1. Security Updates
    - Drop existing restrictive policies on user_presence table
    - Add comprehensive policies for authenticated users to manage their own presence
    - Ensure users can insert, update, and select their own presence records
    - Allow public read access to all presence data for real-time features

  2. Changes
    - DROP existing policies that may be too restrictive
    - CREATE new policies for INSERT, UPDATE, SELECT operations
    - Ensure upsert operations work correctly for presence updates
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert their own presence" ON user_presence;
DROP POLICY IF EXISTS "Users can select their own presence" ON user_presence;
DROP POLICY IF EXISTS "Users can update their own presence" ON user_presence;
DROP POLICY IF EXISTS "Authenticated users can view all presence" ON user_presence;

-- Create comprehensive policies for user presence management

-- Allow authenticated users to view all presence data (needed for real-time features)
CREATE POLICY "Authenticated users can view all presence"
  ON user_presence
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own presence
CREATE POLICY "Users can insert their own presence"
  ON user_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to update their own presence
CREATE POLICY "Users can update their own presence"
  ON user_presence
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to delete their own presence (optional, for cleanup)
CREATE POLICY "Users can delete their own presence"
  ON user_presence
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());