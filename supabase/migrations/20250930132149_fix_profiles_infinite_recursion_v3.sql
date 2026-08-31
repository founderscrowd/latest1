/*
  # Fix Infinite Recursion in Profiles RLS Policies
  
  1. Changes
    - Drop all problematic policies first
    - Drop and recreate security definer function to check admin status
    - Create new policies using the function
    - Prevents infinite recursion when checking admin status
  
  2. Security
    - Maintains all existing security constraints
    - Uses SECURITY DEFINER to bypass RLS for admin checks only
    - Still requires proper authentication
*/

-- Create a schema for private functions if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- Drop all existing problematic policies FIRST
DROP POLICY IF EXISTS "Users can update own profile (except admin status)" ON profiles;
DROP POLICY IF EXISTS "Site admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Site admins can modify admin status" ON profiles;

-- Now drop the function
DROP FUNCTION IF EXISTS private.is_site_admin(uuid) CASCADE;

-- Create a secure function to check if a user is a site admin
-- This bypasses RLS to prevent infinite recursion
CREATE FUNCTION private.is_site_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_site_admin FROM public.profiles WHERE id = user_id LIMIT 1),
    false
  );
$$;

-- Recreate policies using the secure function

-- Allow users to update their own profile (but not admin status unless they're already admin)
CREATE POLICY "Users can update own profile (except admin status)"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND (
      -- Either not changing admin status, or user is already admin
      NOT (is_site_admin IS DISTINCT FROM private.is_site_admin(auth.uid()))
      OR private.is_site_admin(auth.uid()) = true
    )
  );

-- Allow site admins to read all profiles
CREATE POLICY "Site admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    private.is_site_admin(auth.uid()) = true
    OR auth.uid() = id
  );

-- Allow site admins to update any profile's admin status
CREATE POLICY "Site admins can modify admin status"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    private.is_site_admin(auth.uid()) = true
  )
  WITH CHECK (
    private.is_site_admin(auth.uid()) = true
  );