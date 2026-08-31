/*
  # Fix groups table RLS policy for image updates

  1. Security Policy Updates
    - Drop existing restrictive update policy if it exists
    - Create new policy allowing group creators to update all group fields including images
    - Ensure authenticated users can update groups they created

  2. Changes
    - Allow updates to logo_url and cover_image fields
    - Maintain security by restricting updates to group creators only
*/

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update own groups" ON groups;

-- Create comprehensive update policy for group creators
CREATE POLICY "Group creators can update their groups"
  ON groups
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);