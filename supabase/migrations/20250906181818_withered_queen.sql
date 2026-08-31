/*
  # Fix group_members and profiles relationship

  1. Database Schema Updates
    - Ensure proper foreign key relationship between group_members.user_id and profiles.id
    - Update RLS policies to allow proper joins
    - Fix any constraint issues

  2. Security
    - Update RLS policies to allow SELECT operations for joins
    - Ensure policies don't cause infinite recursion
*/

-- First, let's ensure the foreign key relationship exists properly
-- Drop existing constraint if it exists and recreate it
DO $$
BEGIN
  -- Check if the foreign key constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_members_user_id_fkey' 
    AND table_name = 'group_members'
  ) THEN
    ALTER TABLE group_members DROP CONSTRAINT group_members_user_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint to ensure proper relationship
ALTER TABLE group_members 
ADD CONSTRAINT group_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Also ensure we have a relationship to profiles table
-- First check if profiles table has the right structure
DO $$
BEGIN
  -- Add foreign key to profiles if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update RLS policies for group_members to allow proper joins
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
DROP POLICY IF EXISTS "Group creators and admins can manage members" ON group_members;
DROP POLICY IF EXISTS "Group creators and admins can remove members" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;

-- Create new simplified policies that avoid recursion
CREATE POLICY "Allow viewing group members for public groups"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups 
      WHERE groups.id = group_members.group_id 
      AND groups.is_public = true
    )
  );

CREATE POLICY "Allow viewing group members for group members"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT gm.user_id FROM group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.status = 'approved'
    )
  );

CREATE POLICY "Allow viewing group members for group creators"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT g.creator_id FROM groups g 
      WHERE g.id = group_members.group_id
    )
  );

CREATE POLICY "Users can manage their own membership"
  ON group_members
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group creators can manage all members"
  ON group_members
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT g.creator_id FROM groups g 
      WHERE g.id = group_members.group_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT g.creator_id FROM groups g 
      WHERE g.id = group_members.group_id
    )
  );

-- Update profiles RLS policies to allow reading for group member joins
DROP POLICY IF EXISTS "Users can select their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile (except admin status)" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Only site admins can modify admin status" ON profiles;

-- Create new profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view profiles of group members"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT gm.user_id FROM group_members gm
      JOIN groups g ON g.id = gm.group_id
      WHERE (
        g.is_public = true OR
        auth.uid() = g.creator_id OR
        auth.uid() IN (
          SELECT gm2.user_id FROM group_members gm2 
          WHERE gm2.group_id = g.id AND gm2.status = 'approved'
        )
      )
    )
  );

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile (except admin status)"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND (
      is_site_admin = (SELECT is_site_admin FROM profiles WHERE id = auth.uid()) OR
      (SELECT is_site_admin FROM profiles WHERE id = auth.uid()) = true
    )
  );

CREATE POLICY "Only site admins can modify admin status"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_site_admin FROM profiles WHERE id = auth.uid()) = true)
  WITH CHECK ((SELECT is_site_admin FROM profiles WHERE id = auth.uid()) = true);