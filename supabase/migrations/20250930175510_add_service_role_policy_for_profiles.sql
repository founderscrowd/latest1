/*
  # Add Service Role Policy for Profile Creation
  
  1. Changes
    - Add policy to allow service_role (used by triggers) to insert profiles
    - This enables the handle_new_user trigger to create profiles automatically
    
  2. Security
    - Only service_role can use this policy
    - Users still cannot bypass their own restrictions
*/

-- Allow service role to insert profiles (for trigger function)
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);