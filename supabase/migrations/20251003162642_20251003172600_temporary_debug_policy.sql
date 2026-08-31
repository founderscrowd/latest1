/*
  # Temporary Debug Policy for Profiles

  This is a TEMPORARY policy to help diagnose the RLS issue.
  
  1. Changes
    - Add a temporary policy that allows authenticated users to read all profiles
    - This will help us determine if the issue is with the auth.uid() check
  
  2. Security
    - This policy should be REMOVED after debugging
    - It's too permissive for production use
*/

-- Add temporary debug policy
CREATE POLICY "TEMP DEBUG: Allow authenticated users to read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Log this for visibility
DO $$
BEGIN
  RAISE NOTICE 'TEMPORARY DEBUG POLICY ADDED - MUST BE REMOVED AFTER TESTING';
END $$;