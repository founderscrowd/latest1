/*
  # Fix Profile Creation RLS Policies

  1. Policy Updates
    - Update INSERT policy to allow authenticated users to create their own profiles
    - Ensure proper WITH CHECK condition for profile creation
    - Fix any policy conflicts that prevent signup

  2. Security
    - Maintain security while allowing legitimate profile creation
    - Ensure users can only create profiles for their own user ID
    - Prevent unauthorized profile creation

  3. Signup Flow
    - Enable seamless profile creation during user registration
    - Support both email/password and social auth flows
    - Maintain data integrity and security
*/

-- First, let's check and fix the profiles table RLS policies
-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile (except admin status)" ON profiles;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new, properly configured policies

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile (but not admin status unless they're already admin)
CREATE POLICY "Users can update own profile (except admin status)"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND (
      -- Either the is_site_admin field is not being changed
      is_site_admin = (SELECT is_site_admin FROM profiles WHERE id = auth.uid())
      OR
      -- Or the user is already a site admin (can modify their own admin status)
      (SELECT is_site_admin FROM profiles WHERE id = auth.uid()) = true
    )
  );

-- Allow site admins to read all profiles
CREATE POLICY "Site admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT is_site_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Allow site admins to update any profile's admin status
CREATE POLICY "Site admins can modify admin status"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_site_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    (SELECT is_site_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Create a function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at, is_site_admin)
  VALUES (
    new.id,
    new.email,
    now(),
    now(),
    false  -- Always set to false for security
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();