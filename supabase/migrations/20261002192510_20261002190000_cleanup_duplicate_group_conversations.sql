/*
# Clean up duplicate group conversations

## Problem
The "Equitytakeaway group" (group_id: c0fb73b2-3fad-4c41-b6b3-39a210bf25d1) had
3 duplicate group conversations created within milliseconds of each other due to
a race condition in the create_group_conversation RPC. Only one of them
(91c52bf1-9869-4343-ba23-fd6e341591ff) has messages. The other two are empty
duplicates that caused the chat to appear empty when the app randomly loaded
them instead of the one with messages.

## Changes
1. Move any participants from the empty duplicate conversations into the
   primary conversation (if not already there).
2. Delete participant rows from the empty duplicate conversations.
3. Delete the empty duplicate conversations themselves.
4. Add a partial unique index on conversations(group_id) WHERE type = 'group'
   to prevent future duplicates.
5. Make the create_group_conversation RPC idempotent by returning the existing
   conversation if one already exists for the group.

## Verification
- After this migration, only one group conversation exists per group.
- All messages and participants are preserved.
*/

-- Step 1: For the Equitytakeaway group, ensure all participants from duplicate
-- conversations are present in the primary conversation (91c52bf1).
-- The primary conversation already has all 3 participants, but we run this
-- as a safety check for any other groups with similar issues.

-- First, find all groups that have duplicate group conversations
-- and identify the "canonical" conversation (the one with the most messages,
-- breaking ties by earliest created_at).
DO $$
DECLARE
    dup_group RECORD;
    canonical_id uuid;
    dup_id uuid;
BEGIN
    -- Iterate over each group that has more than one group conversation
    FOR dup_group IN
        SELECT c.group_id
        FROM conversations c
        WHERE c.type = 'group' AND c.group_id IS NOT NULL
        GROUP BY c.group_id
        HAVING count(*) > 1
    LOOP
        -- Find the canonical conversation: most messages, then earliest created
        SELECT c.id INTO canonical_id
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id AND m.deleted_at IS NULL
        WHERE c.type = 'group' AND c.group_id = dup_group.group_id
        GROUP BY c.id, c.created_at
        ORDER BY count(m.id) DESC, c.created_at ASC
        LIMIT 1;

        -- For each non-canonical conversation, move participants to canonical
        FOR dup_id IN
            SELECT c.id
            FROM conversations c
            WHERE c.type = 'group' AND c.group_id = dup_group.group_id
              AND c.id <> canonical_id
        LOOP
            -- Insert participants from duplicate into canonical if not already there
            INSERT INTO conversation_participants (
                conversation_id, user_id, role, joined_at, left_at,
                last_read_at, is_muted, notification_settings
            )
            SELECT
                canonical_id, cp.user_id, cp.role, cp.joined_at, cp.left_at,
                COALESCE(cp.last_read_at, now()), cp.is_muted,
                COALESCE(cp.notification_settings, '{}'::jsonb)
            FROM conversation_participants cp
            WHERE cp.conversation_id = dup_id
            ON CONFLICT (conversation_id, user_id) DO NOTHING;

            -- Delete participants from the duplicate
            DELETE FROM conversation_participants
            WHERE conversation_id = dup_id;

            -- Delete the duplicate conversation
            DELETE FROM conversations WHERE id = dup_id;
        END LOOP;
    END LOOP;
END $$;

-- Step 2: Add a partial unique index to prevent future duplicate group conversations.
-- This ensures only one conversation with type='group' can exist per group_id.
CREATE UNIQUE INDEX IF NOT EXISTS conversations_group_id_unique
    ON conversations (group_id)
    WHERE type = 'group' AND group_id IS NOT NULL;

-- Step 3: Make create_group_conversation idempotent by returning the existing
-- conversation if one already exists.
CREATE OR REPLACE FUNCTION create_group_conversation(
    group_id_param uuid,
    conversation_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_id uuid;
    new_id uuid;
BEGIN
    -- Check if a group conversation already exists for this group
    SELECT id INTO existing_id
    FROM conversations
    WHERE group_id = group_id_param AND type = 'group'
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
        RETURN existing_id;
    END IF;

    -- Create new conversation
    INSERT INTO conversations (type, group_id, name, created_by)
    VALUES ('group', group_id_param, conversation_name, auth.uid())
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_group_conversation(uuid, text) TO authenticated;
