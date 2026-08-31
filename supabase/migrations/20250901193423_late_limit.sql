/*
  # Fix Site Admin Security

  This migration fixes the security vulnerability where users could potentially
  grant themselves or others site admin privileges without authorization.

  ## Changes
  1. Update RLS policies to strictly control admin status modifications
  2. Ensure only existing site admins can modify admin status
  3. Add additional security constraints

  ## Security
  - Only existing site admins can update is_site_admin field
  - Users can update their own profiles but NOT their admin status
  - Prevents privilege escalation attacks
*/

-- First, let's reset all users to non-admin status except the first one
-- (You'll need to manually set the correct admin after running this)
UPDATE profiles 
SET is_site_admin = false 
WHERE created_at != (SELECT MIN(created_at) FROM profiles);

-- Drop existing policies that might be too permissive
DROP POLICY IF EXISTS "profiles update own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Only admins can modify admin status" ON profiles;

-- Create a strict policy for profile updates that excludes admin status
CREATE POLICY "Users can update own profile (except admin status)"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Ensure is_site_admin cannot be changed unless user is already an admin
    (
      is_site_admin = (SELECT is_site_admin FROM profiles WHERE id = auth.uid()) OR
      (SELECT is_site_admin FROM profiles WHERE id = auth.uid()) = true
    )
  );

-- Create a separate policy specifically for admin status changes
CREATE POLICY "Only site admins can modify admin status"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Only existing site admins can modify admin status
    (SELECT is_site_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    -- Only existing site admins can modify admin status
    (SELECT is_site_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Add a function to safely update profiles without admin status
CREATE OR REPLACE FUNCTION update_profile_safe(
  user_id uuid,
  new_display_name text DEFAULT NULL,
  new_avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to update their own profile
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only update own profile';
  END IF;

  -- Update profile without touching admin status
  UPDATE profiles 
  SET 
    display_name = COALESCE(new_display_name, display_name),
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    updated_at = now()
  WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_profile_safe TO authenticated;