-- ============================================================================
-- DIAGNOSE AUTHENTICATION ISSUE - "No rows returned" from Query 1
-- ============================================================================

-- This script helps diagnose why "SELECT is_site_admin FROM profiles WHERE id = auth.uid();"
-- returns no rows

-- ============================================================================
-- DIAGNOSTIC 1: Check if you're authenticated
-- ============================================================================
-- Run this first
SELECT auth.uid() as current_user_id;

-- If this returns NULL: You are NOT logged in
-- If this returns a UUID: You ARE logged in (proceed to Diagnostic 2)

-- ============================================================================
-- DIAGNOSTIC 2: Check if your profile exists
-- ============================================================================
-- Replace <YOUR_UUID> with the UUID from Diagnostic 1
-- Example: SELECT * FROM profiles WHERE id = 'a1b2c3d4-e5f6-4g7h-i8j9-k0l1m2n3o4p5';

SELECT * FROM profiles WHERE id = auth.uid();

-- If this returns no rows: Your profile doesn't exist (go to SOLUTION 1)
-- If this returns 1 row: Your profile exists (go to Diagnostic 3)

-- ============================================================================
-- DIAGNOSTIC 3: Check the is_site_admin value
-- ============================================================================
-- Run this if Diagnostic 2 returned a row

SELECT id, username, is_site_admin FROM profiles WHERE id = auth.uid();

-- Expected: 1 row with is_site_admin = true or false
-- If false: Run SOLUTION 2 below

-- ============================================================================
-- DIAGNOSTIC 4: How many profiles exist total?
-- ============================================================================
-- Check if there are ANY profiles

SELECT COUNT(*) as total_profiles FROM profiles;

-- If 0: No profiles created yet
-- If > 0: Profiles exist but maybe not yours

-- ============================================================================
-- DIAGNOSTIC 5: List all profiles
-- ============================================================================
-- See all users in the system

SELECT id, username, is_site_admin, created_at FROM profiles LIMIT 10;

-- ============================================================================
-- DIAGNOSTIC 6: Check all auth.users
-- ============================================================================
-- See all authenticated users

SELECT id, email, created_at FROM auth.users LIMIT 10;

-- ============================================================================
-- SOLUTIONS
-- ============================================================================

-- SOLUTION 1: If your profile doesn't exist
-- You need to create one. Run this:
INSERT INTO profiles (id, username, is_site_admin, created_at, updated_at)
VALUES (
  auth.uid(),
  COALESCE((SELECT email FROM auth.users WHERE id = auth.uid()), 'admin'),
  true,
  NOW(),
  NOW()
);

-- Then verify with: SELECT is_site_admin FROM profiles WHERE id = auth.uid();

-- ============================================================================

-- SOLUTION 2: If your profile exists but is_site_admin = false
-- Make yourself admin. Run this:
UPDATE profiles SET is_site_admin = true WHERE id = auth.uid();

-- Then verify with: SELECT is_site_admin FROM profiles WHERE id = auth.uid();

-- ============================================================================

-- SOLUTION 3: If auth.uid() returns NULL
-- You are not logged in in Supabase SQL Editor
-- This is normal! In Supabase SQL Editor, you are the service role (superuser)
-- For testing, use this instead:

-- Find the first user's ID:
SELECT id, email FROM auth.users LIMIT 1;

-- Then check their profile:
SELECT is_site_admin FROM profiles WHERE id = '<USER_ID_FROM_ABOVE>';

-- Or just list all profiles with admin status:
SELECT id, username, email, is_site_admin
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY created_at;

-- ============================================================================
-- QUICK FIX: Make first user admin
-- ============================================================================
-- If no admins exist, make the first user admin:

UPDATE profiles
SET is_site_admin = true
WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);

-- Verify:
SELECT id, username, is_site_admin FROM profiles WHERE is_site_admin = true LIMIT 1;
