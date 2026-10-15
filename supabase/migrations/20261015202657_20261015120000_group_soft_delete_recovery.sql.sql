/*
# 30-Day Group Soft-Deletion and Recovery System

## Summary
Converts hard-delete of groups into a two-phase soft-delete:
1. Creator soft-deletes: sets `deleted_at` timestamp, group hidden from all non-creator access
2. After 30 full days, a scheduled pg_cron job permanently hard-deletes the group and cascades

## New Columns
- `groups.deleted_at` (timestamptz, nullable) — when set, group is soft-deleted and hidden from non-creators

## New Functions (all SECURITY DEFINER, ownership-validated)
- `soft_delete_group(p_group_id uuid)` — sets deleted_at = now() if caller is creator
- `restore_group(p_group_id uuid)` — clears deleted_at if caller is creator
- `permanently_delete_expired_groups()` — hard-deletes groups where deleted_at < now() - 30 days, cleans orphaned notifications

## RLS Policy Changes on `groups`
- SELECT (anon): now excludes deleted groups (`is_public = true AND deleted_at IS NULL`)
- SELECT (authenticated): active groups visible as before; deleted groups only visible to creator
- DELETE: removed — direct hard-delete via API is blocked; all deletions go through `soft_delete_group` RPC
- UPDATE: unchanged (creator only)

## Child Table RLS Policy Changes
- group_members SELECT: updated to exclude rows belonging to soft-deleted groups (except for creator)
- conversations SELECT: updated to exclude conversations of soft-deleted groups (except for creator)
- forum_topics SELECT: updated to exclude topics of soft-deleted groups (except for creator)

## Scheduled Job
- pg_cron enabled, job scheduled daily at 03:00 UTC to run `permanently_delete_expired_groups()`
- The job runs with elevated privileges via SECURITY DEFINER, cannot be called by anon/authenticated

## Security
- Only the group creator can soft-delete or restore (enforced in SECURITY DEFINER functions)
- Soft-deleted groups are invisible to all non-creator users via RLS
- The permanent deletion function cannot be executed by ordinary users (no EXECUTE grant)
- Notifications referencing permanently deleted groups are cleaned up

## Notes
1. All existing group data (members, messages, forum posts, equity allocations) is preserved during the 30-day recovery window
2. Restoring a group simply clears `deleted_at` — no data reconstruction needed
3. The pg_cron job runs server-side, independent of website traffic
*/

-- ============================================================================
-- 1. Add deleted_at column to groups
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE groups ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Index for efficient filtering of active vs deleted groups
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups (deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- 2. Create SECURITY DEFINER functions for soft-delete and restore
-- ============================================================================

-- soft_delete_group: sets deleted_at, only callable by group creator
CREATE OR REPLACE FUNCTION public.soft_delete_group(p_group_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
  v_deleted_at timestamptz;
BEGIN
  SELECT creator_id INTO v_creator_id FROM groups WHERE id = p_group_id;
  
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
  
  IF v_creator_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: only the group creator can delete this group';
  END IF;
  
  v_deleted_at := now();
  
  UPDATE groups SET deleted_at = v_deleted_at WHERE id = p_group_id;
  
  RETURN v_deleted_at;
END;
$$;

-- restore_group: clears deleted_at, only callable by group creator
CREATE OR REPLACE FUNCTION public.restore_group(p_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id uuid;
BEGIN
  SELECT creator_id INTO v_creator_id FROM groups WHERE id = p_group_id;
  
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
  
  IF v_creator_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: only the group creator can restore this group';
  END IF;
  
  UPDATE groups SET deleted_at = NULL WHERE id = p_group_id;
  
  RETURN true;
END;
$$;

-- permanently_delete_expired_groups: hard-deletes groups soft-deleted >30 days ago
-- No EXECUTE grant to anon/authenticated — only callable by postgres role and pg_cron
CREATE OR REPLACE FUNCTION public.permanently_delete_expired_groups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_expired_ids uuid[];
BEGIN
  -- Collect IDs of groups that have been soft-deleted for more than 30 full days
  SELECT array_agg(id) INTO v_expired_ids
  FROM groups
  WHERE deleted_at IS NOT NULL
    AND deleted_at <= now() - INTERVAL '30 days';
  
  IF v_expired_ids IS NULL OR array_length(v_expired_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Clean up notifications referencing these groups
  -- Notifications store group references in related_entity_id or in the data jsonb
  DELETE FROM notifications
  WHERE related_entity_id = ANY(v_expired_ids)
     OR data->>'group_id' = ANY(SELECT id::text FROM unnest(v_expired_ids) AS id);
  
  -- Hard-delete the groups — cascade handles group_members, conversations,
  -- messages, conversation_participants, forum_topics, forum_posts, equity_allocations
  DELETE FROM groups WHERE id = ANY(v_expired_ids);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$;

-- Revoke execute from anon and authenticated — only postgres and pg_cron can call this
REVOKE EXECUTE ON FUNCTION public.permanently_delete_expired_groups() FROM anon, authenticated;

-- Grant execute on soft_delete and restore to authenticated users
GRANT EXECUTE ON FUNCTION public.soft_delete_group(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_group(uuid) TO authenticated;

-- ============================================================================
-- 3. Update RLS policies on groups table
-- ============================================================================

-- Replace anon SELECT policy to exclude deleted groups
DROP POLICY IF EXISTS "Anonymous users can view public groups" ON groups;
CREATE POLICY "Anonymous users can view public groups"
ON groups FOR SELECT
TO anon
USING (is_public = true AND deleted_at IS NULL);

-- Replace authenticated SELECT policy: active groups visible as before,
-- deleted groups only visible to the creator
DROP POLICY IF EXISTS "Groups are viewable by authenticated users" ON groups;
CREATE POLICY "Groups are viewable by authenticated users"
ON groups FOR SELECT
TO authenticated
USING (
  (deleted_at IS NULL AND (
    is_public = true
    OR creator_id = auth.uid()
    OR id IN (
      SELECT group_members.group_id
      FROM group_members
      WHERE group_members.user_id = auth.uid()
        AND group_members.status = 'approved'
    )
  ))
  OR
  (deleted_at IS NOT NULL AND creator_id = auth.uid())
);

-- Remove the DELETE policy — hard-delete via API is no longer allowed
-- All deletions must go through soft_delete_group RPC
DROP POLICY IF EXISTS "Users can delete own groups" ON groups;

-- ============================================================================
-- 4. Update child table RLS policies to exclude soft-deleted groups
-- ============================================================================

-- group_members: replace SELECT policy to exclude members of soft-deleted groups
-- except for the group creator who can still see their deleted group's members
DROP POLICY IF EXISTS "Allow anon read group_members" ON group_members;
DROP POLICY IF EXISTS "Allow authenticated read" ON group_members;

CREATE POLICY "Members and creator can view group_members"
ON group_members FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_members.group_id
      AND (
        (g.deleted_at IS NULL AND (
          g.is_public = true
          OR g.creator_id = auth.uid()
          OR group_members.user_id = auth.uid()
          OR (
            auth.uid() IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM group_members gm2
              WHERE gm2.group_id = group_members.group_id
                AND gm2.user_id = auth.uid()
                AND gm2.status = 'approved'
            )
          )
        ))
        OR
        (g.deleted_at IS NOT NULL AND g.creator_id = auth.uid())
      )
  )
);

-- conversations: replace SELECT policy to exclude conversations of soft-deleted groups
-- except for the group creator
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;

CREATE POLICY "Users can view conversations they participate in"
ON conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = conversations.group_id
      AND (
        g.deleted_at IS NULL
        OR g.creator_id = auth.uid()
      )
  )
  AND (
    created_by = auth.uid()
    OR id IN (
      SELECT conversation_participants.conversation_id
      FROM conversation_participants
      WHERE conversation_participants.user_id = auth.uid()
        AND conversation_participants.left_at IS NULL
    )
  )
);

-- forum_topics: replace SELECT policy to exclude topics of soft-deleted groups
-- except for the group creator
DROP POLICY IF EXISTS "Group members can view topics" ON forum_topics;

CREATE POLICY "Group members can view topics"
ON forum_topics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = forum_topics.group_id
      AND (
        g.deleted_at IS NULL
        OR g.creator_id = auth.uid()
      )
  )
  AND (
    group_id IN (
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.status = 'approved'
    )
    OR group_id IN (
      SELECT g.id FROM groups g WHERE g.creator_id = auth.uid()
    )
  )
);

-- ============================================================================
-- 5. Enable pg_cron and schedule the daily cleanup job
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Schedule the job to run daily at 03:00 UTC
-- Uses the SECURITY DEFINER function which runs with elevated privileges
SELECT cron.schedule(
  'permanently-delete-expired-groups',
  '0 3 * * *',
  $$SELECT public.permanently_delete_expired_groups();$$
);
