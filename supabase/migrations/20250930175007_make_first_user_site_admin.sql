/*
  # Make First User Site Admin
  
  1. Changes
    - Creates a function to automatically make the first user a site admin
    - Updates existing first user to be site admin if they exist
    
  2. Security
    - Only applies to the very first user in the system
    - Subsequent users will not be admins by default
*/

-- Function to check if this is the first user and make them admin
CREATE OR REPLACE FUNCTION make_first_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first profile being created
  IF (SELECT COUNT(*) FROM profiles) = 0 THEN
    NEW.is_site_admin := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before insert on profiles
DROP TRIGGER IF EXISTS make_first_user_admin_trigger ON profiles;
CREATE TRIGGER make_first_user_admin_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION make_first_user_admin();

-- If there's already one user, make them admin
UPDATE profiles 
SET is_site_admin = true 
WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);