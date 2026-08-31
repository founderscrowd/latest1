/*
  # Fix Admin Privilege Escalation Vulnerability

  1. Security Fix
    - Change default value of `is_site_admin` from `true` to `false`
    - Ensure new users are created as regular users, not admins
    - Update existing non-admin users if needed

  2. Database Changes
    - Alter the `profiles` table to set proper default for `is_site_admin`
    - Add additional constraints for security
*/

-- Fix the critical security vulnerability: new users should NOT be admins by default
ALTER TABLE profiles ALTER COLUMN is_site_admin SET DEFAULT false;

-- Update any existing users who shouldn't be admins (optional - be careful with this)
-- Uncomment the next line only if you want to revoke admin privileges from all users
-- UPDATE profiles SET is_site_admin = false WHERE is_site_admin = true;

-- Add a comment to document the security fix
COMMENT ON COLUMN profiles.is_site_admin IS 'Designates whether the user has site administrator privileges. Default: false for security.';

-- Ensure the constraint is properly enforced
ALTER TABLE profiles ALTER COLUMN is_site_admin SET NOT NULL;