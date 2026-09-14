/*
# Add legal structure and organisation type to groups

1. Purpose
- Add two new optional fields to the existing `groups` table so startup groups can record their current or planned legal structure and whether they are for-profit or non-profit.
- Both fields are nullable text columns with a default of 'not_yet_decided' so existing groups without this information display "Not yet decided" instead of a blank field.

2. New Columns
- `legal_structure` (text, nullable, default 'not_yet_decided') — stores the group's current or planned legal structure (e.g., "Not yet formed", "Private Company / Ltd", "LLC", etc.)
- `organisation_type` (text, nullable, default 'not_yet_decided') — stores whether the group is for-profit, non-profit, or not yet decided

3. Security
- No changes to existing RLS policies. The new columns are covered by the existing group-level policies already in place.
- No new tables created.

4. Data Safety
- Does not drop, rename, or alter any existing columns or rows.
- Existing groups automatically receive the default value 'not_yet_decided' for both columns.
- The migration is idempotent: uses IF NOT EXISTS checks for each column.

5. Important Notes
- These fields are suitable for future filtering by legal structure or organisation type.
- No changes to equity, subscription, payment, or Stripe functionality.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'groups' AND column_name = 'legal_structure'
  ) THEN
    ALTER TABLE groups ADD COLUMN legal_structure text DEFAULT 'not_yet_decided';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'groups' AND column_name = 'organisation_type'
  ) THEN
    ALTER TABLE groups ADD COLUMN organisation_type text DEFAULT 'not_yet_decided';
  END IF;
END $$;