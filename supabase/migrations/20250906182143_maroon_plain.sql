/*
  # Simplify profiles RLS policies to fix member count issues

  1. Problem
    - Complex RLS policies on profiles table are causing relationship inference errors
    - HTTP 500 errors when joining group_members with profiles
    - Member count queries failing due to policy complexity

  2. Solution
    - Remove complex SELECT policies that use subqueries and joins
    - Add simple policy allowing authenticated users to read all profiles
    - This will fix the relationship cache issues and allow proper joins

  3. Security Note
    - This makes profiles more permissive for debugging
    - Can be refined later with simpler (non-subquery) restrictions if needed
*/

-- Remove existing complex SELECT policies on profiles that are causing issues
DROP POLICY IF EXISTS "Users can view profiles of group members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Add a simpler SELECT policy for authenticated users to view all profiles
-- This resolves the relationship inference error and allows proper joins
CREATE POLICY "Enable read access for all authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);