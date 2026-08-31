/*
  # Add status column to groups table

  1. New Columns
    - `status` (text) - Group status with values 'active', 'inactive', or 'pending'
      - Default: 'active' for new groups
      - NOT NULL constraint to ensure all groups have a status

  2. Constraints
    - Check constraint to ensure only valid status values are allowed

  This migration adds the missing status column that the application expects
  when creating and querying groups.
*/

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'status'
  ) THEN
    ALTER TABLE groups ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'groups_status_check'
  ) THEN
    ALTER TABLE groups ADD CONSTRAINT groups_status_check 
    CHECK (status IN ('active', 'inactive', 'pending'));
  END IF;
END $$;