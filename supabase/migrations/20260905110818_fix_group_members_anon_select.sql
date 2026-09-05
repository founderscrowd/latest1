/*
# Fix: Allow anon (logged-out) users to read group_members

## Problem
The homepage group cards query `group_members` to count approved members per group.
The `group_members` table has RLS enabled with a SELECT policy only for the
`authenticated` role. Logged-out visitors browse the homepage using the anon key,
so the SELECT returns zero rows — every card shows "0 co-founders" even though
members exist. Logged-in users see the correct count because the authenticated
SELECT policy (`USING: true`) returns all rows.

## Fix
Add a SELECT policy for the `anon` role on `group_members` so logged-out visitors
can read approved member rows. This mirrors the existing authenticated SELECT policy.
The app has a sign-in screen, but group cards on the public homepage must be visible
to unauthenticated visitors, so `anon` needs read access to this table.

## Security
- Only adds a SELECT (read) policy for anon. No insert/update/delete changes.
- The existing authenticated policies remain unchanged.
- This is the same pattern already used on the `groups` table (public groups are
  browsable without logging in).
*/

DROP POLICY IF EXISTS "Allow anon read group_members" ON group_members;

CREATE POLICY "Allow anon read group_members"
ON group_members FOR SELECT
TO anon
USING (true);
