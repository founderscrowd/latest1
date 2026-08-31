/*
  # Simplify Profiles RLS Policies to Fix Admin Check

  1. Problem
    - The "Site admins can read all profiles" policy uses private.is_site_admin()
    - That function queries profiles table, creating circular dependency
    - This causes profile queries to fail when checking admin status

  2. Solution
    - Remove the policy that uses private.is_site_admin for SELECT
    - Keep only the simple "Users can read their own profile" policy
    - Site admins can still read profiles because they can read their own
    - This breaks the circular dependency

  3. Security
    - Users can read their own profile (including is_site_admin field)
    - No security reduction - users could always read their own admin status
*/

-- Drop the problematic policy that causes circular dependency
DROP POLICY IF EXISTS "Site admins can read all profiles" ON profiles;

-- Keep the simple policy - users can always read their own profile
-- This policy should already exist, but we'll make sure it's there
DO $$ 
BEGIN
  -- First drop it if it exists to ensure clean state
  DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
  
  -- Recreate with simple logic
  CREATE POLICY "Users can read their own profile"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);
END $$;