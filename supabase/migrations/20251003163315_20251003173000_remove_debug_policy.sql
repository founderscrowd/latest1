/*
  # Remove Temporary Debug Policy

  1. Changes
    - Remove the temporary debug policy that allowed all authenticated users to read all profiles
    - The original restrictive policy (auth.uid() = id) is sufficient now that the client is working correctly
  
  2. Security
    - Restores proper security where users can only read their own profile
*/

-- Remove the temporary debug policy
DROP POLICY IF EXISTS "TEMP DEBUG: Allow authenticated users to read profiles" ON profiles;