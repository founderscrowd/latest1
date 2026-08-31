/*
  # Fix profiles table schema and policies

  1. Schema Updates
    - Add foreign key constraint to link profiles.id to auth.users(id)
    - Ensure proper CASCADE deletion
    
  2. Security Updates  
    - Fix RLS policies to work with authenticated users
    - Allow users to insert and select their own profiles
    
  3. Trigger Function
    - Add trigger to automatically create profile when user signs up
*/

-- First, ensure the profiles table has the correct foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can select their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can select own profile" ON profiles;

-- Create correct RLS policies for authenticated users
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can select their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create trigger function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at, updated_at)
  VALUES (new.id, now(), now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();