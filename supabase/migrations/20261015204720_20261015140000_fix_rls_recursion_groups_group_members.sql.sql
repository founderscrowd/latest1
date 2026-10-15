/*
# Fix RLS recursion between groups and group_members SELECT policies

## Problem
The groups SELECT policy references group_members in a subquery to check membership.
The new group_members SELECT policy references groups to check deleted_at.
This creates mutual recursion: groups → group_members → groups → ...
Additionally, the group_members policy self-references group_members (gm2 subquery),
causing further recursion.

## Fix
1. Create a SECURITY DEFINER function `is_group_member(p_group_id uuid)` that
   checks if the current user is an approved member of a group. This bypasses RLS,
   breaking the groups → group_members recursion.
2. Replace the group_members subquery in the groups SELECT policy with this function.
3. Simplify the group_members SELECT policy to:
   - Not self-reference group_members (remove gm2 subquery)
   - Only reference groups for the deleted_at check (one-directional, no cycle)
   - Use group_members.user_id = auth.uid() for "user is looking at their own row"

## Security
- The SECURITY DEFINER function only returns boolean, leaks no data
- RLS remains enabled on all tables
- The 30-day recovery system (deleted_at filtering) is preserved
*/

-- ============================================================================
-- 1. Create SECURITY DEFINER helper to break recursion
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id
      AND user_id = auth.uid()
      AND status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO authenticated;

-- ============================================================================
-- 2. Fix groups SELECT (authenticated) policy — replace group_members subquery
-- ============================================================================
DROP POLICY IF EXISTS "Groups are viewable by authenticated users" ON groups;

CREATE POLICY "Groups are viewable by authenticated users"
ON groups FOR SELECT
TO authenticated
USING (
  (deleted_at IS NULL AND (
    is_public = true
    OR creator_id = auth.uid()
    OR is_group_member(id)
  ))
  OR
  (deleted_at IS NOT NULL AND creator_id = auth.uid())
);

-- ============================================================================
-- 3. Fix group_members SELECT policy — remove self-reference and simplify
-- ============================================================================
DROP POLICY IF EXISTS "Members and creator can view group_members" ON group_members;

CREATE POLICY "Members and creator can view group_members"
ON group_members FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_members.group_id
      AND (
        -- Active group: visible if public, or user is the creator, or user is this member
        (g.deleted_at IS NULL AND (
          g.is_public = true
          OR g.creator_id = auth.uid()
          OR group_members.user_id = auth.uid()
        ))
        OR
        -- Deleted group: only creator can see
        (g.deleted_at IS NOT NULL AND g.creator_id = auth.uid())
      )
  )
);
