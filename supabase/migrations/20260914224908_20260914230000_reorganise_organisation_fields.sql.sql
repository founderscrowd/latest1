/*
# Reorganise organisation fields on groups

1. Purpose
- Reorganise the existing `legal_structure` and `organisation_type` columns to support
  a clearer two-level selection model: "Profit or Non-Profit" + "Organisation Structure".
- The `organisation_type` column already stores `for_profit`, `non_profit`, or `not_yet_decided`
  and maps directly to the new "Profit or Non-Profit" field — no rename or data change needed.
- The `legal_structure` column already stores structure values and is reused as-is for the
  "Organisation Structure" field. New structure values (foundation, association, social_enterprise)
  are now valid options but do not require schema changes — the column is already a free-text
  text column with a default of 'not_yet_decided'.

2. Data Migration
- Any group whose `legal_structure` is `not_yet_formed` (a value no longer offered in the UI)
  is updated to `not_yet_decided` so it is not orphaned.
- All other existing values remain valid in the new option lists.
- No rows are deleted. No columns are dropped, renamed, or type-changed.

3. Security
- No changes to existing RLS policies. The existing group-level policies already cover these columns.
- No new tables created.

4. Idempotency
- The UPDATE is guarded by a WHERE clause so re-running it is safe.
- No column additions are needed — both columns already exist from a prior migration.
*/

UPDATE groups
SET legal_structure = 'not_yet_decided'
WHERE legal_structure = 'not_yet_formed';