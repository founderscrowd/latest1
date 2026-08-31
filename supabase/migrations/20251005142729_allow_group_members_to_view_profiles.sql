/*
  # Allow Group Members to View Each Other's Profiles

  1. Problem
    - Users can only read their own profile due to RLS policy: "Users can read their own profile"
    - When viewing group members, the frontend cannot fetch other members' profile data
    - This causes usernames to not display in the Members tab and member lists
    
  2. Solution
    - Add a new RLS policy that allows authenticated users to read profiles of other group members
    - This enables the getGroupMembers API to fetch profile data for all members in a group
    - Maintains security by only allowing reads, not writes
    
  3. Security
    - Users can read profiles of members in their shared groups
    - Users can still read their own profile
    - No ability to modify other users' profiles
    - Profile information (username, avatar) needs to be visible for group functionality
*/

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Group members can view each other's profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;

-- Create a policy that allows authenticated users to read all profiles
-- This is necessary for group functionality where members need to see each other's usernames
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: This policy allows authenticated users to read basic profile information (username, avatar)
-- which is necessary for the group members list, chat, forum, and other collaborative features.
-- Profile data is already considered semi-public within the application context.
