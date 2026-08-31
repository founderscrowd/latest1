/*
  # Create automatic profile creation trigger

  1. Function
    - Creates a function that automatically creates a profile when a user confirms their email
    - Handles the profile creation after email confirmation

  2. Trigger
    - Triggers on auth.users table when email is confirmed
    - Automatically creates profile record with proper permissions
*/

-- Create function to handle profile creation after email confirmation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if email is confirmed and profile doesn't exist
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Update RLS policies to allow the trigger function to work
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow the trigger function to insert profiles
DROP POLICY IF EXISTS "System can create profiles" ON profiles;
CREATE POLICY "System can create profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);