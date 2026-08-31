/*
  # Fix Groups RLS Policies

  1. Security Changes
    - Update existing policy for authenticated users to allow viewing public groups and owned/member groups
    - Add new policy for anonymous users to view public groups
    
  2. Changes
    - Modify "Groups are viewable by authenticated users" policy
    - Add "Anonymous users can view public groups" policy
*/

-- First, drop the existing policy to recreate it with proper conditions
DROP POLICY IF EXISTS "Groups are viewable by authenticated users" ON public.groups;

-- Create updated policy for authenticated users
CREATE POLICY "Groups are viewable by authenticated users"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    is_public = true OR
    creator_id = auth.uid() OR
    id IN (
      SELECT group_id 
      FROM public.group_members 
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

-- Create policy for anonymous users to view public groups
CREATE POLICY "Anonymous users can view public groups"
  ON public.groups
  FOR SELECT
  TO anon
  USING (is_public = true);