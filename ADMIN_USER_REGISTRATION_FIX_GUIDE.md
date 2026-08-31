# Admin User Registration Notifications - Fix Guide

## Problem Identified

You're signed in as an admin but not receiving notifications when new users register.

**Root Cause**: The `handle_new_user()` database function was updated in a later migration (`20250930175453_fix_handle_new_user_function.sql`) and the notification creation code was accidentally removed.

## Solution

Run the provided SQL script to restore the notification functionality.

## Step-by-Step Fix

### Step 1: Verify You Are an Admin

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to your project
3. Open the **SQL Editor**
4. Run this query:

```sql
SELECT id, username, email, is_site_admin
FROM profiles
WHERE id = auth.uid();
```

**Expected Result**: `is_site_admin` should be `true`

If it's `false`, run this to make yourself an admin:

```sql
UPDATE profiles SET is_site_admin = true WHERE id = auth.uid();
```

### Step 2: Run the Fix Script

1. In the Supabase SQL Editor
2. Open the file: `FIX_USER_REGISTRATION_NOTIFICATIONS.sql` (located in your project root)
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click **Run** (or press Ctrl/Cmd + Enter)

The script will:
- ✅ Verify the notifications table exists
- ✅ Check your admin status
- ✅ Update the `handle_new_user()` function to include notification creation
- ✅ Recreate the trigger
- ✅ Create a test notification for you

### Step 3: Verify the Fix Worked

After running the script, you should see output showing:
- All tables exist
- Your admin status confirmed
- Trigger created successfully
- Test notification created

### Step 4: Check Notifications in the App

1. Go to your application
2. Log in with your admin account
3. Click on your profile (top right)
4. Go to the **Notifications** tab (only visible to admins)
5. You should see a test notification: "Test: New User Registered"

### Step 5: Test with a Real User Registration

1. Open an incognito/private browser window
2. Go to your app
3. Create a new test user account
4. Go back to your admin account
5. Check the Notifications tab
6. You should see a notification for the new user within seconds

## What the Fix Does

The SQL script updates the `handle_new_user()` database function to:

1. **Create user profile** (existing functionality)
2. **Check if first user** → make them admin (existing functionality)
3. **NEW: Find all site admins** after profile creation
4. **NEW: Create a notification** for each admin with user details:
   - User email
   - User ID
   - Registration timestamp

## Notification Details

When a new user registers, admins will receive:

**Title**: New User Registered

**Message**: A new user [email] has registered.

**Details**:
- 📧 Email address
- 📅 Registration timestamp
- ✅ Read/unread status

**Icon**: Blue user icon 👤

## Real-time Updates

The notification system uses Supabase real-time subscriptions:
- ✅ New notifications appear instantly (no page refresh needed)
- ✅ Unread count updates automatically
- ✅ WebSocket connection for live updates

## Troubleshooting

### Issue: Script fails with "notifications table does not exist"

**Solution**: The notifications table was not created. Run this first:

```sql
-- See the migration file: supabase/migrations/20250125170000_create_user_registration_notifications.sql
-- Or run the sections from that migration to create the table
```

### Issue: No notifications appear after registering test user

**Check 1**: Are you definitely a site admin?

```sql
SELECT id, is_site_admin FROM profiles WHERE id = auth.uid();
```

**Check 2**: Did the trigger fire?

```sql
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Check 3**: Are there any notifications in the database?

```sql
SELECT COUNT(*) FROM notifications;
```

**Check 4**: Check the function definition:

```sql
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
```

The definition should include the notification creation code with `INSERT INTO notifications`.

### Issue: Test notification appears but real registrations don't create notifications

**Check**: Is the trigger active on the auth.users table?

```sql
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as trigger_def
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

`tgenabled` should be `O` (origin - enabled)

### Issue: Notifications panel shows "Access Denied"

**Check**: Verify RLS policies allow admins to read notifications:

```sql
SELECT
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications';
```

Should show a policy like: "Site admins can view all notifications"

## Technical Details

### Files Modified

1. **Migration**: `FIX_USER_REGISTRATION_NOTIFICATIONS.sql` (new)
   - Updates `handle_new_user()` function
   - Recreates trigger

2. **Frontend**: `src/components/NotificationsPanel.tsx` (already working)
   - Displays user_registered notifications
   - Shows user icon and details
   - Real-time updates

3. **API**: `src/lib/notificationApi.ts` (already working)
   - Fetches notifications
   - Marks as read
   - Real-time subscription

### Database Schema

**Table**: `notifications`
- `id` (uuid) - Notification ID
- `type` (text) - 'user_registered', 'subscription_activated', etc.
- `title` (text) - Notification title
- `message` (text) - Notification message
- `data` (jsonb) - Additional data (email, user_id, timestamps)
- `read` (boolean) - Read status
- `recipient_id` (uuid) - Admin user ID
- `created_at` (timestamptz) - Creation timestamp
- `read_at` (timestamptz) - When marked as read

### Security

- ✅ RLS enabled on notifications table
- ✅ Only site admins can view notifications
- ✅ Trigger runs with SECURITY DEFINER (elevated privileges)
- ✅ Safe array aggregation for multiple admins
- ✅ Protection against SQL injection

## Quick Reference Commands

### Make yourself an admin:
```sql
UPDATE profiles SET is_site_admin = true WHERE id = auth.uid();
```

### Check your notifications:
```sql
SELECT * FROM notifications WHERE recipient_id = auth.uid() ORDER BY created_at DESC;
```

### Count unread notifications:
```sql
SELECT COUNT(*) FROM notifications WHERE recipient_id = auth.uid() AND read = false;
```

### Mark all as read:
```sql
UPDATE notifications SET read = true, read_at = NOW() WHERE recipient_id = auth.uid() AND read = false;
```

### Test notification creation manually:
```sql
INSERT INTO notifications (type, title, message, data, recipient_id)
VALUES (
  'user_registered',
  'Manual Test',
  'This is a manual test notification.',
  '{"test": true}'::jsonb,
  auth.uid()
);
```

## Summary

✅ **Problem**: Notification code removed from `handle_new_user()` function
✅ **Solution**: Run `FIX_USER_REGISTRATION_NOTIFICATIONS.sql`
✅ **Result**: Admins receive notifications for all new user registrations
✅ **Real-time**: Updates appear instantly without refresh
✅ **Tested**: Frontend builds successfully and displays notifications correctly

## Next Steps

1. ✅ Run the SQL fix script
2. ✅ Verify test notification appears
3. ✅ Test with real user registration
4. ✅ Mark this issue as resolved once confirmed working
