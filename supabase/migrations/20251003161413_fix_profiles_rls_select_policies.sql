/*
  # Fix Profiles RLS SELECT Policies

  1. Changes
    - Remove the broad "Enable read access for all authenticated users" policy
    - Keep the specific policies that properly check ownership and admin status
    - This resolves conflicts between multiple SELECT policies

  2. Security
    - Users can still read their own profile
    - Site admins can still read all profiles
    - No loss of functionality, just cleaner policy structure
*/

-- Drop the broad policy that might be causing conflicts
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON profiles;

-- Ensure the specific policies exist (these should already be there)
-- Users can read their own profile
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can read their own profile'
  ) THEN
    CREATE POLICY "Users can read their own profile"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Site admins can read all profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Site admins can read all profiles'
  ) THEN
    CREATE POLICY "Site admins can read all profiles"
      ON profiles
      FOR SELECT
      TO authenticated
      USING ((private.is_site_admin(auth.uid()) = true) OR (auth.uid() = id));
  END IF;
END $$;