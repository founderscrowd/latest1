/*
  # Add require_approval column to groups table

  1. Schema Changes
    - Add `require_approval` column to `groups` table
    - Set default value to `false` for existing groups
    - Column allows group admins to control whether new members need approval

  2. Notes
    - This column controls whether new group members are automatically approved or need admin approval
    - Default value is `false` to maintain current behavior for existing groups
*/

-- Add require_approval column to groups table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'require_approval'
  ) THEN
    ALTER TABLE groups ADD COLUMN require_approval BOOLEAN DEFAULT false;
  END IF;
END $$;