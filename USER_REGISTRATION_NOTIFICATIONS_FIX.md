# User Registration Notifications - Fix Guide

## Problem

You created a new user account but didn't receive a notification in the admin Notifications panel.

## Root Cause

**You are not marked as a site admin.**

The notification system only sends notifications to users where `is_site_admin = true` in the profiles table.

### How Admin Status Works

- **First user ever**: Automatically marked as admin ✅
- **Users created after**: NOT marked as admin ❌ (must be manually set)

### Why You're Not Seeing Notifications

1. You created a profile (not first user)
2. You were NOT marked as site admin
3. When a new user registers, trigger fires
4. Trigger queries: "Get all admin users"
5. Returns: Empty (no admins except maybe the first user)
6. Result: No notifications created ❌

---

## Solution (5 minutes)

### Step 1: Make Yourself a Site Admin

Open Supabase SQL Editor and run:

```sql
UPDATE profiles
SET is_site_admin = true
WHERE id = auth.uid();
```

This makes YOUR user account a site admin.

### Step 2: Verify It Worked

```sql
SELECT id, email, username, is_site_admin
FROM profiles
WHERE id = auth.uid();
```

**Expected Result**: `is_site_admin` should be `true` ✅

### Step 3: Test Notifications (Optional)

Create a test notification to verify the system works:

```sql
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE is_site_admin = true LIMIT 1;

  INSERT INTO notifications (type, title, message, data, recipient_id)
  VALUES (
    'user_registered',
    'Test Notification',
    'This is a test - the system is working!',
    jsonb_build_object('test', true),
    admin_id
  );
END $$;
```

### Step 4: Refresh Your Browser

- Go to your Profile page
- Click the Notifications tab
- Refresh the page (Cmd+Shift+R or Ctrl+Shift+R)
- You should see the test notification

---

## What Happens Now

Once you're a site admin:

1. ✅ You'll receive notifications when new users register
2. ✅ You'll receive notifications when users subscribe
3. ✅ All notifications appear in Profile > Notifications
4. ✅ Green bell icon shows unread count
5. ✅ Real-time updates (no refresh needed)

---

## How User Registration Notifications Work

```
New User Registers
         ↓
Trigger: on_auth_user_created fires
         ↓
Function: handle_new_user()
    ├─ Creates profile
    └─ Gets all admin users
         ↓
For Each Admin:
    └─ INSERT notification
         ↓
Admins See Notification
    └─ In Profile > Notifications tab
```

---

## RLS Permissions

**Admin Can See**:
- ✅ All notifications
- ✅ Mark as read
- ✅ View details

**Non-Admin Can See**:
- ❌ No notifications (blocked by RLS)
- ❌ Cannot view
- ❌ Cannot update

---

## Quick Reference

### Make Someone a Site Admin
```sql
UPDATE profiles
SET is_site_admin = true
WHERE id = '<user_uuid>';
```

### Check if User is Admin
```sql
SELECT id, email, is_site_admin
FROM profiles
WHERE email = 'user@example.com';
```

### Remove Admin Status (Reverse if Needed)
```sql
UPDATE profiles
SET is_site_admin = false
WHERE id = '<user_uuid>';
```

### Get All Admins
```sql
SELECT id, email, username
FROM profiles
WHERE is_site_admin = true;
```

---

## Troubleshooting

### "I ran the SQL but still no notifications"

**Check 1**: Are you actually an admin now?
```sql
SELECT is_site_admin FROM profiles WHERE id = auth.uid();
```
Should return `true`.

**Check 2**: Did you refresh the page?
- Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Hard refresh clears cache

**Check 3**: Create a manual test notification
- See "Step 3" above

---

## Manual Script

If you prefer, run the complete script from: `FIX_ADMIN_NOTIFICATIONS.sql`

This script:
1. Checks if you're an admin
2. Makes you an admin if needed
3. Creates a test notification
4. Verifies everything works

---

## Two-Tier Notification System

Your app has TWO notification systems:

### 1. User Registration Notifications
- Trigger: New user signs up
- Recipient: All site admins
- Icon: User icon 👤
- Uses: `handle_new_user()` trigger function

### 2. Subscription Notifications
- Trigger: User completes subscription payment
- Recipient: All site admins
- Icon: Credit card icon 💳
- Uses: `notify_admins_of_new_subscription()` trigger function

**Both require**: User to be marked as `is_site_admin = true`

---

## Next Steps

1. **Run SQL**: Make yourself admin (Step 1)
2. **Verify**: Check you're admin (Step 2)
3. **Test**: Create test notification (Step 3)
4. **Refresh**: Hard refresh browser (Step 4)
5. **Done**: Notifications should now work!

---

## Production Setup

For production, you'll want:

1. **At least one admin user** ✅
2. **Admin clearly marked** ✅ (`is_site_admin = true`)
3. **Admins can be assigned** ✅ (via Supabase SQL or app UI)

Currently: Manual SQL assignment (Step 1 above)

Optional: Create UI to manage admin roles

---

## Questions?

**Why no admin by default?**
- First user is auto-admin (safe for new apps)
- Subsequent users need explicit admin assignment (secure)
- Prevents accidental admin access

**Can multiple users be admins?**
- Yes! Set `is_site_admin = true` for each admin
- All admins get all notifications

**How do I revoke admin status?**
- Set `is_site_admin = false`
- User immediately loses notification access (RLS blocks)

---

## Timeline

- **Immediately**: Run Step 1 SQL (make yourself admin)
- **Within 30 seconds**: You'll be admin
- **After page refresh**: Notifications will show
- **Test**: Create test notification (optional)
- **Production**: All set!

---

**Remember**: Admin status is required for notifications. Make sure the right people are marked as admins!

See also:
- `SUBSCRIPTION_NOTIFICATIONS_README.md` - For subscription notifications
- `USER_REGISTRATION_NOTIFICATIONS.md` - For user registration details
