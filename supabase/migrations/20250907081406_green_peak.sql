/*
  # Add Cofounder Role to Group Members

  1. Changes
    - Update the role check constraint to include 'cofounder' as a valid role
    - This allows members who claim equity to be designated as cofounders

  2. Security
    - Maintains existing RLS policies
    - No changes to authentication or authorization
*/

-- Update the role check constraint to include 'cofounder'
DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_members_role_check' 
    AND table_name = 'group_members'
  ) THEN
    ALTER TABLE group_members DROP CONSTRAINT group_members_role_check;
  END IF;
  
  -- Add the new constraint with 'cofounder' included
  ALTER TABLE group_members ADD CONSTRAINT group_members_role_check 
    CHECK (role = ANY (ARRAY['admin'::text, 'member'::text, 'cofounder'::text, 'pending'::text]));
END $$;