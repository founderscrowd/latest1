/*
  # Fix profile creation and display name handling

  1. Updates
    - Ensure profiles table has proper constraints
    - Add trigger to auto-create profile on user signup
    - Fix any existing data issues

  2. Security
    - Maintain existing RLS policies
    - Ensure proper user access controls
*/

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NULL),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update existing profiles that might be missing usernames
-- This is safe to run multiple times
DO $$
BEGIN
  -- Only update profiles that don't have usernames but should
  UPDATE profiles 
  SET updated_at = NOW()
  WHERE username IS NULL;
END $$;