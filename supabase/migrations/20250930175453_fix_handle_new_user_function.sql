/*
  # Fix handle_new_user Function
  
  1. Changes
    - Update handle_new_user function to match actual profiles table schema
    - Remove reference to non-existent email column
    - Set username from email prefix
    - Integrate with make_first_user_admin logic
    
  2. Security
    - Maintains SECURITY DEFINER for proper permissions
    - First user becomes admin automatically
*/

-- Update the handle_new_user function to match the actual schema
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  should_be_admin BOOLEAN := false;
BEGIN
  -- Check if this will be the first user
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  IF user_count = 0 THEN
    should_be_admin := true;
  END IF;

  -- Insert profile with correct columns
  INSERT INTO public.profiles (id, username, created_at, updated_at, is_site_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, 'user_' || NEW.id::text),
    NOW(),
    NOW(),
    should_be_admin
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();