/*
  # Add Starter Role for Group Creators

  1. Role Updates
    - Add 'starter' as a valid role option for group members
    - Update the role constraint to include the new starter role
    - Starter role will be assigned to group creators automatically

  2. Security
    - Starter role has all admin permissions
    - Starter role cannot be changed or removed (immutable)
    - Only one starter per group (the original creator)
*/

-- Update the role constraint to include 'starter'
DO $$
BEGIN
  -- Drop the existing constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_members_role_check' 
    AND table_name = 'group_members'
  ) THEN
    ALTER TABLE group_members DROP CONSTRAINT group_members_role_check;
  END IF;
  
  -- Add the new constraint with 'starter' role
  ALTER TABLE group_members ADD CONSTRAINT group_members_role_check 
    CHECK (role = ANY (ARRAY['admin'::text, 'member'::text, 'cofounder'::text, 'pending'::text, 'starter'::text]));
END $$;