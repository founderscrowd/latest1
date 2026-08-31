/*
  # Fix profiles table RLS policy for user signup

  1. Security Updates
    - Ensure proper RLS policies for profile creation during signup
    - Allow authenticated users to insert their own profile data
    - Fix any policy conflicts that prevent profile creation

  2. Changes
    - Drop and recreate the insert policy with proper conditions
    - Ensure the policy works with the auth.uid() function during signup
*/

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create a new insert policy that allows users to create their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled on the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Also ensure we have a proper select policy for users to read their own data
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;

CREATE POLICY "Users can read their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);