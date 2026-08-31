/*
  # Create username availability check function

  1. New Functions
    - `check_username_availability(input_username text)` returns boolean
      - Returns true if username is available (case-insensitive)
      - Returns false if username is taken
      - Uses the existing unique index on lower(username)

  2. Security
    - Function is accessible to authenticated and anonymous users
    - Uses SECURITY DEFINER to ensure consistent access
*/

-- Create function to check username availability (case-insensitive)
CREATE OR REPLACE FUNCTION check_username_availability(input_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  username_exists boolean;
BEGIN
  -- Check if username exists (case-insensitive)
  -- This uses the existing unique index: profiles_username_lower_idx on lower(username)
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE lower(username) = lower(input_username)
  ) INTO username_exists;
  
  -- Return true if available (not exists), false if taken (exists)
  RETURN NOT username_exists;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION check_username_availability(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_username_availability(text) TO anon;