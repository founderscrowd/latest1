/*
  # Add site admin functionality to profiles

  1. New Columns
    - `is_site_admin` (boolean, default false) - Designates users as site administrators
  
  2. Security
    - Only site admins can modify the is_site_admin field
    - Add RLS policy to protect admin status changes
*/

-- Add is_site_admin column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_site_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_site_admin boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create policy to prevent non-admins from modifying admin status
CREATE POLICY "Only admins can modify admin status"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if user is updating their own profile but not changing admin status
    (auth.uid() = id AND is_site_admin = (SELECT is_site_admin FROM profiles WHERE id = auth.uid()))
    OR
    -- Allow if user is a site admin
    (SELECT is_site_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    -- Same conditions for the check
    (auth.uid() = id AND is_site_admin = (SELECT is_site_admin FROM profiles WHERE id = auth.uid()))
    OR
    (SELECT is_site_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Add comment for documentation
COMMENT ON COLUMN profiles.is_site_admin IS 'Designates whether the user has site administrator privileges';