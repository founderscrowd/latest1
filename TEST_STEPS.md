# Admin Subscription Notifications - Complete Testing Steps

## Test Overview

This guide walks you through testing the complete notification pipeline end-to-end, from subscription payment through admin notification delivery.

---

## STEP 1: Pre-Test Verification (5 minutes)

### 1.1 Verify You're a Site Admin

Run this in **Supabase SQL Editor**:

```sql
SELECT is_site_admin FROM profiles WHERE id = auth.uid();
```

**Expected Result**: `is_site_admin = true`

**If false** - Make yourself admin:
```sql
UPDATE profiles SET is_site_admin = true WHERE id = auth.uid();
```

---

### 1.2 Verify All System Components Exist

Run this in **Supabase SQL Editor**:

```sql
-- Check trigger function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'notify_admins_of_new_subscription'
LIMIT 1;

-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'on_subscription_activated'
LIMIT 1;

-- Check notifications table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'notifications' AND table_schema = 'public'
LIMIT 1;

-- Check stripe_subscriptions table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'stripe_subscriptions' AND table_schema = 'public'
LIMIT 1;
```

**Expected Result**: All 4 queries return 1 row each

**If any fail** - Run the migration files in `/supabase/migrations/`:
- `20250125170000_create_user_registration_notifications.sql`
- `20250125180000_add_subscription_notifications.sql`

---

### 1.3 Verify Data Exists

Run this in **Supabase SQL Editor**:

```sql
-- Check if active subscriptions exist
SELECT COUNT(*) as active_subscriptions
FROM stripe_subscriptions
WHERE status IN ('active', 'trialing');

-- Check if stripe_customers records exist
SELECT COUNT(*) as customer_records
FROM stripe_customers
WHERE user_id IS NOT NULL;
```

**Expected Result**:
- `active_subscriptions >= 1`
- `customer_records >= 1`

**If subscriptions count is 0** - You need to process a Stripe subscription first. See Step 3.

---

## STEP 2: Quick Manual Test (1 minute)

This creates a manual test notification to verify the system works.

### 2.1 Create Manual Test Notification

Run this entire block in **Supabase SQL Editor**:

```sql
DO $$
DECLARE
  admin_id uuid;
  user_id_var uuid;
  user_email_var text;
  customer_id_var text;
  subscription_id_var text;
  price_id_var text;
  status_var text;
BEGIN
  -- Step 1: Get first admin
  SELECT id INTO admin_id FROM profiles WHERE is_site_admin = true LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'ERROR: No admin users found. Run Step 1.1';
  END IF;
  RAISE NOTICE 'Step 1: Found admin user: %', admin_id;

  -- Step 2: Get first active subscription user
  SELECT
    au.id,
    au.email,
    sc.customer_id,
    ss.subscription_id,
    ss.price_id,
    ss.status
  INTO user_id_var, user_email_var, customer_id_var, subscription_id_var, price_id_var, status_var
  FROM auth.users au
  JOIN stripe_customers sc ON au.id = sc.user_id
  JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
  WHERE ss.status IN ('active', 'trialing')
  LIMIT 1;

  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'ERROR: No active subscriptions found. Process a subscription first in Step 3';
  END IF;
  RAISE NOTICE 'Step 2: Found subscription - email: %, subscription_id: %',
    user_email_var, subscription_id_var;

  -- Step 3: Create test notification
  INSERT INTO notifications (type, title, message, data, recipient_id)
  VALUES (
    'subscription_activated',
    'New Subscription (MANUAL TEST)',
    'User ' || user_email_var || ' has subscribed to a paid plan (MANUAL TEST).',
    jsonb_build_object(
      'user_id', user_id_var,
      'user_email', user_email_var,
      'customer_id', customer_id_var,
      'subscription_id', subscription_id_var,
      'price_id', price_id_var,
      'status', status_var,
      'activated_at', NOW(),
      'test', true
    ),
    admin_id
  );

  RAISE NOTICE 'SUCCESS: Manual test notification created!';
  RAISE NOTICE 'Check Notifications panel in the UI immediately...';
  RAISE NOTICE 'You should see the notification appear within 1-5 seconds (real-time)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR: %', SQLERRM;
END $$;
```

**Expected Output**:
```
NOTICE: Step 1: Found admin user: <UUID>
NOTICE: Step 2: Found subscription - email: user@example.com, subscription_id: sub_XXX
NOTICE: SUCCESS: Manual test notification created!
```

**If error occurs** - Check the error message and refer to Troubleshooting section

---

### 2.2 Verify Notification in UI (Immediately after 2.1)

1. Open your app in browser (same session as admin account)
2. Go to **Profile** (top right menu)
3. Click **Notifications** tab
4. **Expected**: You should see a notification with:
   - Green credit card icon (left side)
   - Title: "New Subscription (MANUAL TEST)"
   - Message: "User <email> has subscribed..."
   - Details showing: subscriber email, subscription ID, price ID
   - Timestamp: "Just now"

**Timing**: Should appear within 1-5 seconds (typically 300-800ms)

**If not visible after 5 seconds**:
- Refresh the page (F5)
- If still not there, proceed to Troubleshooting section

---

### 2.3 Verify Notification Properties

Click the notification to expand it and verify:
- [ ] Shows subscriber's email address
- [ ] Shows subscription ID (starts with `sub_`)
- [ ] Shows status: "active" or "trialing"
- [ ] Shows price_id
- [ ] Shows subscription date/time

Click the checkmark icon to mark as read:
- [ ] Icon changes
- [ ] Background color changes (no longer highlighted)
- [ ] Refresh page - notification still shows as read

---

## STEP 3: Real Subscription Test (requires payment)

This tests with an actual Stripe payment to verify end-to-end.

### 3.1 Monitor Before Payment

1. **Open Notifications panel** in a tab and leave it visible
2. **Keep Supabase Function Logs open** in another tab:
   - Go to Supabase Dashboard
   - Click **Functions**
   - Click **stripe-webhook**
   - Click **Logs** tab
   - Leave this tab open

---

### 3.2 Process Test Payment

1. **In your app**, go to pricing or subscription page
2. **Click to subscribe** to a plan
3. **Complete Stripe checkout** with test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
4. **Click "Pay"** and complete payment

---

### 3.3 Monitor Webhook Logs

Look in the **Supabase Functions → stripe-webhook → Logs** for these messages (in order):

```
[SUBSCRIPTION_SYNC] Starting subscription sync for customer: cus_XXX
[SUBSCRIPTION_SYNC] Customer record found: user_id=<UUID>, db_id=<ID>
[SUBSCRIPTION_SYNC] Upserting subscription: status=active
[SUBSCRIPTION_SYNC] Successfully synced subscription for customer: cus_XXX
[NOTIFICATION_TRIGGER] Subscription status is active - notification trigger should fire for customer: cus_XXX
[NOTIFICATION_TRIGGER] Admin notification will be sent if: 1) stripe_customers.user_id exists, 2) profiles.is_site_admin=true exists
```

**Timing**: All logs should appear within 200-500ms

**If you see errors**:
- Note the error message
- Refer to Troubleshooting section

---

### 3.4 Check Notifications Panel

**Watch for notification to appear** in the Notifications panel (kept open from 3.1):

**Expected**:
- [ ] New notification appears without page refresh
- [ ] Green credit card icon
- [ ] Title: "New Subscription"
- [ ] Message includes new subscriber's email
- [ ] Unread count badge appears/increments
- [ ] Notification shows details (email, subscription ID, plan)

**Timing**: Should appear within 500-1000ms total (webhook + database + real-time)

**If notification doesn't appear**:
- Refresh the page (F5)
- Check Supabase logs for errors
- Refer to Troubleshooting section

---

### 3.5 Verify Notification Details

Click the notification to verify it contains:
- [ ] Correct subscriber email
- [ ] Correct subscription ID
- [ ] Correct plan/price_id
- [ ] Status: "active"
- [ ] Current timestamp

---

## STEP 4: Multi-Admin Test (Optional)

Test that multiple admins receive independent notifications.

### 4.1 Make Another User Admin

1. Have another user log in (or create test account)
2. In SQL Editor, run:
```sql
UPDATE profiles SET is_site_admin = true
WHERE id = '<OTHER_USER_UUID>';
```

### 4.2 Create Test Notification

Run the manual test SQL from Step 2.1 again

### 4.3 Verify Both Admins See It

1. **User 1** opens Notifications tab - should see notification
2. **User 2** opens Notifications tab - should see **independent** notification
3. **User 1** marks as read
4. **User 2** checks - their notification should still be unread (independent)

**Result**: Each admin has their own notification row ✓

---

## STEP 5: Real-time Update Test (Optional)

Test that notifications update instantly without page refresh.

### 5.1 Create First Test Notification

1. Keep **Notifications panel open** on left side
2. Run Step 2.1 SQL to create test notification
3. Verify it appears within 1-5 seconds

### 5.2 Create Second Test Notification

1. **Don't refresh page** - keep Notifications panel visible
2. In new browser tab, run Step 2.1 SQL again
3. **Back in original tab** - without refreshing, watch Notifications panel
4. **Expected**: New notification appears automatically within 2-5 seconds

**Result**: Real-time updates working ✓

---

## STEP 6: Verification Checklist

After all tests, verify these queries in Supabase SQL Editor:

```sql
-- Count total subscription notifications
SELECT COUNT(*) as total_subscription_notifications
FROM notifications
WHERE type = 'subscription_activated';

-- Show recent subscription notifications
SELECT
  n.type,
  n.title,
  n.data->>'user_email' as subscriber_email,
  n.read,
  p.username as admin_username,
  n.created_at
FROM notifications n
LEFT JOIN profiles p ON n.recipient_id = p.id
WHERE n.type = 'subscription_activated'
ORDER BY n.created_at DESC
LIMIT 10;

-- Verify current user can see their notifications
SELECT COUNT(*) as notifications_visible_to_me
FROM notifications
WHERE recipient_id = auth.uid();
```

**Expected Results**:
- First query: `total_subscription_notifications >= 1` (your manual/real tests)
- Second query: Shows notifications with correct emails and timestamps
- Third query: `notifications_visible_to_me >= 1` (you can see your notifications)

---

## STEP 7: Webhook Logs Analysis

Go to **Supabase → Functions → stripe-webhook → Logs**

### Expected Log Pattern for New Subscription:

```
[SUBSCRIPTION_SYNC] Starting subscription sync for customer: cus_123abc
[SUBSCRIPTION_SYNC] Customer record found: user_id=<uuid>, db_id=456
[SUBSCRIPTION_SYNC] Upserting subscription: id=sub_xyz, status=active, customer=cus_123abc
[SUBSCRIPTION_SYNC] Successfully synced subscription for customer: cus_123abc
[NOTIFICATION_TRIGGER] Subscription status is active - notification trigger should fire
[NOTIFICATION_TRIGGER] Admin notification will be sent if: 1) stripe_customers.user_id exists, 2) profiles.is_site_admin=true exists
```

### What Each Log Means:

| Log | Meaning |
|-----|---------|
| `[SUBSCRIPTION_SYNC] Starting...` | Webhook received and processing started |
| `Customer record found` | Stripe customer linked to user account ✓ |
| `Upserting subscription` | Updating database with subscription details |
| `Successfully synced` | Database update completed ✓ |
| `Subscription status is active` | Trigger should now fire |
| `Admin notification will be sent if` | Conditions being checked |

**If you see WARNING messages**:
- `WARNING: No stripe_customers record found` - Customer not linked to user
- `WARNING: No site admins found` - No admins in system
- `Error looking up customer record` - Database connection issue

---

## TROUBLESHOOTING

### Problem: Notification doesn't appear in UI

**Check 1**: Are you admin?
```sql
SELECT is_site_admin FROM profiles WHERE id = auth.uid();
```
If false, run: `UPDATE profiles SET is_site_admin = true WHERE id = auth.uid();`

**Check 2**: Does stripe_customers record exist?
```sql
SELECT user_id, customer_id FROM stripe_customers LIMIT 5;
```
If empty or user_id is NULL, issue is in customer creation

**Check 3**: Refresh page
- Press F5 to refresh
- Notification may appear after refresh

**Check 4**: Check RLS policy
```sql
-- This should return the notification if RLS is working
SELECT COUNT(*) FROM notifications
WHERE type = 'subscription_activated';
```

**Check 5**: Check webhook logs
- Go to Supabase → Functions → stripe-webhook → Logs
- Look for `[SUBSCRIPTION_SYNC]` messages
- Check for any ERROR messages

---

### Problem: Manual test notification SQL fails

**Error**: "No admin users found"
- Run Step 1.1 to make yourself admin

**Error**: "No active subscriptions found"
- You need to have at least one active subscription
- Process a real Stripe subscription first (Step 3)
- Or ask your admin to subscribe

**Error**: "Error looking up customer record"
- Database connectivity issue
- Check Supabase status page
- Try again in 30 seconds

---

### Problem: Webhook logs show errors

**Error**: `[SUBSCRIPTION_SYNC] Error syncing subscription`
- Check Stripe API keys are correct
- Check webhook secret is correct
- Verify stripe_subscriptions table has proper schema

**Error**: `WARNING: No stripe_customers record found`
- Stripe customer exists but not linked to user
- Check stripe_customers table for orphaned records

**Error**: `WARNING: No site admins found`
- No one is marked as admin
- Make yourself admin (Step 1.1)

---

### Problem: Notification appears but shows "Unknown" email

**Likely cause**: User email not found in auth.users

**Check**:
```sql
SELECT au.id, au.email, sc.customer_id
FROM auth.users au
JOIN stripe_customers sc ON au.id = sc.user_id
LIMIT 5;
```

If email is NULL, contact Supabase support

---

### Problem: Real subscription test - payment doesn't complete

**Steps**:
1. Check Stripe test keys are correct
2. Verify webhook endpoint URL is correct
3. Check Supabase function logs for signature verification errors
4. Try different test card (e.g., `5555 5555 5555 4444`)

---

## SUCCESS CRITERIA

You have successfully tested the system when:

- [ ] Step 1 - All pre-test verifications pass
- [ ] Step 2 - Manual test notification appears in UI within 5 seconds
- [ ] Step 2 - Notification shows correct subscriber email
- [ ] Step 2 - Notification shows green credit card icon
- [ ] Step 2 - Can mark notification as read
- [ ] Step 3 - Webhook logs show all `[SUBSCRIPTION_SYNC]` messages
- [ ] Step 3 - Real subscription creates notification in UI within 1 second
- [ ] Step 4 - Multiple admins receive independent notifications
- [ ] Step 5 - Real-time updates work without page refresh
- [ ] Step 6 - Verification queries show notifications in database
- [ ] Step 7 - Webhook logs show clean flow with no errors

---

## Summary

The admin subscription notification system is working correctly when:

1. **Detection**: Stripe webhook detects subscription payments
2. **Logging**: Webhook logs show `[SUBSCRIPTION_SYNC]` and `[NOTIFICATION_TRIGGER]` messages
3. **Creation**: Database trigger creates notification immediately
4. **Delivery**: Admin sees notification within 500-1000ms (real-time)
5. **Persistence**: Notification saved to database and persists on refresh
6. **Interaction**: Admin can mark as read, status persists

**All tests complete ✓ - System ready for production**
