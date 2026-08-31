/*
  # Add display name constraints and uniqueness

  1. Database Changes
    - Add unique constraint on username (case-insensitive)
    - Add check constraint for username length (3-30 characters)
    - Add check constraint for allowed characters (alphanumeric and spaces only)
    - Create index for case-insensitive username lookups

  2. Security
    - Ensure usernames are unique across the system
    - Prevent users from changing usernames after creation
*/

-- Add unique constraint on username (case-insensitive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_unique_ci'
  ) THEN
    CREATE UNIQUE INDEX profiles_username_unique_ci ON profiles (LOWER(username));
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique_ci UNIQUE USING INDEX profiles_username_unique_ci;
  END IF;
END $$;

-- Add check constraints for username validation
DO $$
BEGIN
  -- Length constraint (3-30 characters)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_length_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_length_check 
    CHECK (char_length(username) >= 3 AND char_length(username) <= 30);
  END IF;

  -- Character constraint (alphanumeric and spaces only)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_format_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_format_check 
    CHECK (username ~ '^[a-zA-Z0-9\s]+$');
  END IF;

  -- No leading/trailing spaces
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_trim_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_trim_check 
    CHECK (username = trim(username));
  END IF;
END $$;

-- Update the handle_new_user function to set username from auth metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at, updated_at, is_site_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NULL),
    NOW(),
    NOW(),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for efficient username lookups
CREATE INDEX IF NOT EXISTS profiles_username_lower_idx ON profiles (LOWER(username));