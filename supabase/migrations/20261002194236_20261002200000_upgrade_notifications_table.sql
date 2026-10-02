/*
# Upgrade Notifications Table for User Notifications

## Purpose
The notifications table currently only supports admin notifications (user_id points to the admin).
We need to add columns the frontend already expects (title, data, read, read_at, recipient_id)
so we can support per-user notifications for chat messages and forum activity.

## Changes
1. Add `title` (text) - notification title shown in the panel
2. Add `data` (jsonb) - structured context (sender name, group name, links, etc.)
3. Add `read` (boolean, default false) - alias for is_read, used by the frontend
4. Add `read_at` (timestamptz) - when the notification was read
5. Add `recipient_id` (uuid) - the user who should receive this notification (for user notifications)
   The existing `user_id` column is kept for backward compatibility (admin notifications)
6. Backfill `read` from `is_read` for existing rows

## RLS Policies
- Replace existing policies with:
  - SELECT: users can view notifications where they are the recipient OR where they are a site admin
  - UPDATE: users can mark their own notifications as read
- Keep INSERT/DELETE restricted to service role (triggers use SECURITY DEFINER)

## Notes
- `user_id` remains for backward compatibility with admin notifications
- `recipient_id` is used for new user-facing notifications (chat, forum)
- Both columns are checked in RLS so admins see everything, users see only their own
*/

-- Add missing columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "read" boolean DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_id uuid;

-- Backfill read from is_read for existing rows
UPDATE notifications SET "read" = is_read WHERE "read" IS NULL;

-- Add index for recipient queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, "read") WHERE recipient_id IS NOT NULL AND "read" = false;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- SELECT: users see their own notifications (by recipient_id or user_id) + admins see all
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  recipient_id = auth.uid()
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_site_admin = true)
);

-- UPDATE: users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (
  recipient_id = auth.uid()
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_site_admin = true)
)
WITH CHECK (
  recipient_id = auth.uid()
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_site_admin = true)
);

-- INSERT: only service role (triggers run as SECURITY DEFINER)
CREATE POLICY "Service role can insert notifications"
ON notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- DELETE: only service role
CREATE POLICY "Service role can delete notifications"
ON notifications FOR DELETE
TO service_role
USING (true);
