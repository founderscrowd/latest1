# Subscription Notifications - Complete Test & Verification

## Overview
This document provides step-by-step verification that the subscription notification system is working end-to-end.

## Architecture
1. **Webhook** (Stripe) → Updates `stripe_subscriptions` table
2. **Database Trigger** → Fires when status becomes 'active'/'trialing'
3. **Trigger Function** → Creates notifications for all admin users
4. **Frontend** → Displays notifications in real-time

## Critical Bug Fixed
The trigger had a bug on line 46 of the migration:
- **Before**: `LEFT JOIN auth.users au ON sc.id = au.id` ❌ (sc.id is bigint, au.id is uuid - always NULL)
- **After**: `LEFT JOIN auth.users au ON sc.user_id = au.id` ✅ (correct uuid join)

## Test Steps

### Step 1: Verify Trigger Function Exists and Works
```sql
-- Check if function exists
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'notify_admins_of_new_subscription';

-- Check if trigger exists
SELECT trigger_name, event_object_table, event_manipulation, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_subscription_activated';
```

**Expected Result**: Both should exist

---

### Step 2: Verify Admin User Exists
```sql
-- List all site admins
SELECT id, username, email, is_site_admin, created_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.is_site_admin = true;
```

**Expected Result**: At least one user with `is_site_admin = true`

If not, make yourself an admin:
```sql
UPDATE profiles SET is_site_admin = true WHERE id = auth.uid();
```

---

### Step 3: Verify Existing Subscriptions
```sql
-- Check all active/trialing subscriptions
SELECT
    au.email as user_email,
    sc.customer_id,
    ss.subscription_id,
    ss.status,
    ss.price_id,
    ss.created_at,
    ss.updated_at
FROM auth.users au
JOIN stripe_customers sc ON au.id = sc.user_id
JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE ss.status IN ('active', 'trialing')
ORDER BY ss.updated_at DESC;
```

**Expected Result**: Shows active subscriptions (e.g., lanka926@btinternet.com)

---

### Step 4: Check for Existing Notifications
```sql
-- Count all subscription notifications
SELECT COUNT(*) as total_subscription_notifications
FROM notifications
WHERE type = 'subscription_activated';

-- Show recent subscription notifications
SELECT
    n.id,
    n.type,
    n.title,
    n.data->>'user_email' as user_email,
    n.data->>'status' as subscription_status,
    n.read,
    p.username as admin_username,
    n.created_at
FROM notifications n
JOIN profiles p ON n.recipient_id = p.id
WHERE n.type = 'subscription_activated'
ORDER BY n.created_at DESC
LIMIT 10;
```

**Expected Result**:
- If empty: Notifications haven't been created yet (trigger issue or subscription was before trigger)
- If populated: Notifications are working

---

### Step 5: Manual Notification Test (Create Notification)

If Step 4 was empty, manually create a notification for testing:

```sql
DO $$
DECLARE
  admin_id uuid;
  user_id_var uuid;
  user_email_var text;
  customer_id_var text;
  subscription_id_var text;
BEGIN
  -- Get first admin
  SELECT id INTO admin_id FROM profiles WHERE is_site_admin = true LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin users found';
  END IF;

  -- Get first active subscription
  SELECT
    au.id,
    au.email,
    sc.customer_id,
    ss.subscription_id
  INTO user_id_var, user_email_var, customer_id_var, subscription_id_var
  FROM auth.users au
  JOIN stripe_customers sc ON au.id = sc.user_id
  JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
  WHERE ss.status IN ('active', 'trialing')
  LIMIT 1;

  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'No active subscriptions found';
  END IF;

  -- Create test notification
  INSERT INTO notifications (type, title, message, data, recipient_id)
  VALUES (
    'subscription_activated',
    'New Subscription (Manual Test)',
    'User ' || user_email_var || ' has subscribed to a paid plan.',
    jsonb_build_object(
      'user_id', user_id_var,
      'user_email', user_email_var,
      'customer_id', customer_id_var,
      'subscription_id', subscription_id_var,
      'status', 'active',
      'activated_at', NOW(),
      'test', true
    ),
    admin_id
  );

  RAISE NOTICE 'Created test notification for admin: %', admin_id;
END $$;
```

**Expected Result**:
- NOTICE: `Created test notification for admin: <UUID>`
- No error

---

### Step 6: View Notification in UI

1. Log into your admin account
2. Go to **Profile** page
3. Click **Notifications** tab
4. You should see:
   - Green credit card icon (subscription notification)
   - Title: "New Subscription" or "New Subscription (Manual Test)"
   - Message with user email
   - Details showing: email, subscription ID, status

---

### Step 7: Test Real-time Updates

1. Keep Notifications panel open
2. Open new browser tab
3. Run this SQL in Supabase to create another test notification:

```sql
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE is_site_admin = true LIMIT 1;

  INSERT INTO notifications (type, title, message, data, recipient_id)
  VALUES (
    'subscription_activated',
    'Real-time Test',
    'Testing real-time notification delivery',
    jsonb_build_object(
      'test', true,
      'timestamp', NOW()
    ),
    admin_id
  );
END $$;
```

3. **Without refreshing** the Notifications tab, you should see the new notification appear
4. If it doesn't appear after 5 seconds, refresh the page

**Expected Result**: Notification appears in real-time without page refresh

---

## Troubleshooting

### Problem: No notifications appear after subscription

**Check 1: Is admin user set correctly?**
```sql
SELECT is_site_admin FROM profiles WHERE id = auth.uid();
```
If false, run:
```sql
UPDATE profiles SET is_site_admin = true WHERE id = auth.uid();
```

**Check 2: Does the subscription exist?**
```sql
SELECT COUNT(*) FROM stripe_subscriptions WHERE status IN ('active', 'trialing');
```
If 0, no subscriptions to notify about.

**Check 3: Is the trigger firing?**
Check Supabase logs for the trigger function warnings:
- Look for: `NOTICE: Created subscription notifications`
- Look for: `WARNING: No user found for customer_id`
- Look for: `WARNING: No site admins found`

**Check 4: Did you verify the trigger function is deployed?**
Run Step 1 queries to confirm trigger exists.

**Check 5: Check RLS Policies**
```sql
-- Verify admin can see notifications
SELECT COUNT(*) FROM notifications;

-- If it shows 0 but notifications exist, RLS is blocking
```

### Problem: Notification appears but details are wrong

**Check the trigger function join**:
```sql
-- Get user for a customer
SELECT sc.user_id, au.email, au.id as auth_id
FROM stripe_customers sc
LEFT JOIN auth.users au ON sc.user_id = au.id
WHERE sc.customer_id = 'cus_<YOUR_CUSTOMER_ID>';
```

Should show email (not NULL). If NULL, the join is broken.

---

## Full Database State Check

Run all these to get complete diagnostic info:

```sql
-- 1. Verify trigger function
SELECT 'Trigger Function' as check_type, COUNT(*) as count
FROM information_schema.routines
WHERE routine_name = 'notify_admins_of_new_subscription'
UNION ALL
-- 2. Verify trigger
SELECT 'Trigger', COUNT(*)
FROM information_schema.triggers
WHERE trigger_name = 'on_subscription_activated'
UNION ALL
-- 3. Count admins
SELECT 'Site Admins', COUNT(*)
FROM profiles WHERE is_site_admin = true
UNION ALL
-- 4. Count active subscriptions
SELECT 'Active Subscriptions', COUNT(*)
FROM stripe_subscriptions WHERE status IN ('active', 'trialing')
UNION ALL
-- 5. Count subscription notifications
SELECT 'Subscription Notifications', COUNT(*)
FROM notifications WHERE type = 'subscription_activated'
UNION ALL
-- 6. Count all notifications
SELECT 'Total Notifications', COUNT(*)
FROM notifications;
```

---

## How New Subscriptions Will Work

**Once the trigger is confirmed working:**

1. User subscribes through Stripe checkout
2. Stripe sends webhook to your app
3. Webhook logs: "Successfully synced subscription for customer: cus_..."
4. Webhook logs: "Subscription status is active - notification trigger should fire"
5. Database trigger fires automatically
6. PostgreSQL logs (Supabase Logs): "NOTICE: Created subscription notifications for X admins"
7. Admin sees notification in real-time within 1-5 seconds

**Zero manual intervention needed after this point.**

---

## Verification Checklist

- [ ] Trigger function exists (`notify_admins_of_new_subscription`)
- [ ] Trigger exists (`on_subscription_activated`)
- [ ] I am marked as site admin (`is_site_admin = true`)
- [ ] At least one active subscription exists in database
- [ ] Manual test notification created successfully
- [ ] I can see manual test notification in UI
- [ ] Notification shows correct user email
- [ ] Notification shows green credit card icon
- [ ] Unread count badge shows "1"
- [ ] Can click to mark as read
- [ ] Real-time test: new notification appears without refresh (optional)

---

## Next Steps

### If All Checks Pass ✅
The system is working correctly. Next subscription will auto-notify.

### If Some Checks Fail ❌
1. Run diagnostic queries from "Full Database State Check" above
2. Check Supabase logs for errors
3. Verify trigger function migration was applied
4. Confirm bug fix (line 46: `sc.user_id` not `sc.id`)

### After Real Subscription Event
1. Monitor webhook logs for: "Subscription status is active"
2. Check notifications table for new row
3. Verify admin sees notification in UI within 5 seconds
4. Check admin can mark notification as read
