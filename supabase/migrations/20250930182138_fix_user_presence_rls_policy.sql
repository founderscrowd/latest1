/*
  # Fix user_presence RLS policies for upsert operations
  
  1. Changes
    - Drop existing INSERT policy that might be too restrictive
    - Create new INSERT policy that allows authenticated users to insert their own presence
    - Keep existing UPDATE, SELECT, and DELETE policies unchanged
  
  2. Security
    - Maintains strict access control
    - Users can only insert/update their own presence records
    - All users can view presence (for online status display)
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own presence" ON user_presence;

-- Create a new INSERT policy that's more permissive for upserts
-- This allows the upsert operation to work correctly
CREATE POLICY "Users can insert their own presence"
  ON user_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());