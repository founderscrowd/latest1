/*
  # Add is_public column to groups table

  1. New Columns
    - `is_public` (boolean, default true, not null)
      - Controls whether the group is publicly visible or private
      - Defaults to true for backward compatibility

  2. Changes
    - Add is_public column to groups table with proper default value
    - Use IF NOT EXISTS pattern to prevent errors on re-run
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE groups ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;