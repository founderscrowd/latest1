/*
  # Fix profile insert policy for authenticated users

  1. Security Changes
    - Drop existing public INSERT policy
    - Create new INSERT policy for authenticated users
    - Ensure authenticated users can create their own profile during signup

  This fixes the "Database error saving new user" issue by allowing
  authenticated users (newly signed up users) to insert their profile.
*/

-- Drop the existing public insert policy
DROP POLICY IF EXISTS "profiles insert own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

-- Create a new INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also ensure the SELECT policy works for authenticated users
DROP POLICY IF EXISTS "profiles select own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

CREATE POLICY "Authenticated users can select own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);