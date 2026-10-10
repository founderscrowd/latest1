/*
# Reconcile stale group chat participants

1. Purpose
- Ensure active group conversation access matches the group creator and approved group members.

2. Data changes
- Set `left_at` for active participants in group conversations who are neither the group creator nor an approved group member.
- Preserve all participant rows and all messages; this only closes stale access.

3. Security
- No policies are widened.
- Future message access remains restricted to active conversation participants.

4. Important notes
- Private conversations are not changed.
- This update is reversible by the existing membership repair function if a user becomes approved again.
*/

UPDATE conversation_participants cp
SET left_at = now()
FROM conversations c
JOIN groups g ON g.id = c.group_id
WHERE cp.conversation_id = c.id
  AND c.type = 'group'
  AND cp.left_at IS NULL
  AND cp.user_id <> g.creator_id
  AND NOT EXISTS (
    SELECT 1
    FROM group_members gm
    WHERE gm.group_id = g.id
      AND gm.user_id = cp.user_id
      AND gm.status = 'approved'
  );