-- ============================================================================
-- ADMIN SUBSCRIPTION NOTIFICATION SYSTEM - COMPLETE TEST SUITE
-- ============================================================================
-- Run each section in order in Supabase SQL Editor
-- This verifies the complete end-to-end notification flow
-- ============================================================================

-- ============================================================================
-- SECTION 1: VERIFY SYSTEM COMPONENTS EXIST
-- ============================================================================

-- Test 1.1: Verify trigger function exists
SELECT
  'Trigger Function' as component,
  routine_name,
  'EXISTS' as status
FROM information_schema.routines
WHERE routine_name = 'notify_admins_of_new_subscription'
UNION ALL
-- Test 1.2: Verify trigger exists
SELECT
  'Database Trigger',
  trigger_name,
  'EXISTS'
FROM information_schema.triggers
WHERE trigger_name = 'on_subscription_activated'
UNION ALL
-- Test 1.3: Verify notifications table exists
SELECT
  'Notifications Table',
  table_name,
  'EXISTS'
FROM information_schema.tables
WHERE table_name = 'notifications' AND table_schema = 'public'
UNION ALL
-- Test 1.4: Verify stripe_subscriptions table exists
SELECT
  'Stripe Subscriptions Table',
  table_name,
  'EXISTS'
FROM information_schema.tables
WHERE table_name = 'stripe_subscriptions' AND table_schema = 'public'
UNION ALL
-- Test 1.5: Verify stripe_customers table exists
SELECT
  'Stripe Customers Table',
  table_name,
  'EXISTS'
FROM information_schema.tables
WHERE table_name = 'stripe_customers' AND table_schema = 'public'
ORDER BY component;

-- ============================================================================
-- SECTION 2: VERIFY ADMIN USER SETUP
-- ============================================================================

-- Test 2.1: Check current user is admin
SELECT
  'Current User Admin Status' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL - Make yourself admin first' END as result
FROM profiles
WHERE id = auth.uid() AND is_site_admin = true;

-- Test 2.2: List all site admins
SELECT
  'Site Admins' as check_type,
  COUNT(*) as admin_count,
  STRING_AGG(DISTINCT p.username, ', ' ORDER BY p.username) as usernames
FROM profiles p
WHERE p.is_site_admin = true;

-- Test 2.3: If no admins exist, show how many users
SELECT
  'Total Users' as check_type,
  COUNT(*) as user_count
FROM profiles;

-- ============================================================================
-- SECTION 3: VERIFY DATA RELATIONSHIPS
-- ============================================================================

-- Test 3.1: Check stripe_customers records
SELECT
  'Stripe Customers' as check_type,
  COUNT(*) as total_customers,
  COUNT(DISTINCT user_id) as users_with_customers,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as missing_user_ids
FROM stripe_customers;

-- Test 3.2: Check stripe_subscriptions records
SELECT
  'Stripe Subscriptions' as check_type,
  status,
  COUNT(*) as count
FROM stripe_subscriptions
GROUP BY status
ORDER BY status;

-- Test 3.3: Check if active subscriptions have matching customers
SELECT
  'Subscription-Customer Link' as check_type,
  COUNT(DISTINCT ss.customer_id) as subscriptions_with_customers,
  COUNT(DISTINCT ss.customer_id)
    FILTER (WHERE sc.customer_id IS NOT NULL) as linked_to_customers,
  COUNT(DISTINCT ss.customer_id)
    FILTER (WHERE sc.customer_id IS NULL) as MISSING_CUSTOMER_RECORDS
FROM stripe_subscriptions ss
LEFT JOIN stripe_customers sc ON ss.customer_id = sc.customer_id
WHERE ss.status IN ('active', 'trialing');

-- Test 3.4: Check user-customer-subscription chain for active subscriptions
SELECT
  'User → Customer → Subscription Chain' as check_type,
  au.email,
  sc.customer_id,
  ss.subscription_id,
  ss.status,
  ss.price_id,
  ss.created_at,
  CASE
    WHEN p.is_site_admin THEN 'YES'
    ELSE 'NO - User not admin'
  END as user_is_admin
FROM auth.users au
JOIN stripe_customers sc ON au.id = sc.user_id
JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
JOIN profiles p ON au.id = p.id
WHERE ss.status IN ('active', 'trialing')
ORDER BY ss.created_at DESC;

-- ============================================================================
-- SECTION 4: CHECK EXISTING NOTIFICATIONS
-- ============================================================================

-- Test 4.1: Count subscription notifications by admin
SELECT
  'Subscription Notifications' as check_type,
  COUNT(*) as total_subscription_notifications,
  COUNT(DISTINCT recipient_id) as admins_with_notifications
FROM notifications
WHERE type = 'subscription_activated';

-- Test 4.2: Show recent subscription notifications
SELECT
  n.id,
  n.type,
  n.title,
  n.data->>'user_email' as subscriber_email,
  n.data->>'status' as sub_status,
  p.username as admin_username,
  n.read,
  n.created_at
FROM notifications n
LEFT JOIN profiles p ON n.recipient_id = p.id
WHERE n.type = 'subscription_activated'
ORDER BY n.created_at DESC
LIMIT 10;

-- Test 4.3: Check notification RLS policy
SELECT
  'RLS Policy Check' as check_type,
  (SELECT COUNT(*) FROM notifications) as total_notifications,
  (SELECT COUNT(*) FROM notifications
   WHERE recipient_id = auth.uid()) as visible_to_current_user
;

-- ============================================================================
-- SECTION 5: TRIGGER VERIFICATION
-- ============================================================================

-- Test 5.1: Verify trigger is on correct table and events
SELECT
  tgname as trigger_name,
  relname as table_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE tgname = 'on_subscription_activated';

-- Test 5.2: Check for trigger execution in recent updates
SELECT
  'Recent Stripe Subscription Updates' as check_type,
  count(*) as updates_in_last_hour,
  MAX(updated_at) as most_recent_update
FROM stripe_subscriptions
WHERE updated_at > NOW() - INTERVAL '1 hour';

-- ============================================================================
-- SECTION 6: MANUAL NOTIFICATION TEST (ONLY IF ALL ABOVE PASS)
-- ============================================================================

-- Test 6: Create a manual test notification to verify full pipeline
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
    RAISE EXCEPTION 'ERROR: No admin users found. Make yourself admin first.';
  END IF;
  RAISE NOTICE 'Step 1: Found admin user: %', admin_id;

  -- Step 2: Get first active subscription user details
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
    RAISE EXCEPTION 'ERROR: No active subscriptions found. Subscribe to a plan first.';
  END IF;
  RAISE NOTICE 'Step 2: Found subscription - email: %, customer: %, subscription: %, price: %',
    user_email_var, customer_id_var, subscription_id_var, price_id_var;

  -- Step 3: Create test notification
  INSERT INTO notifications (type, title, message, data, recipient_id)
  VALUES (
    'subscription_activated',
    'New Subscription (Manual Test)',
    'User ' || user_email_var || ' has subscribed to a paid plan (MANUAL TEST).',
    jsonb_build_object(
      'user_id', user_id_var,
      'user_email', user_email_var,
      'customer_id', customer_id_var,
      'subscription_id', subscription_id_var,
      'price_id', price_id_var,
      'status', status_var,
      'activated_at', NOW(),
      'test', true,
      'note', 'This is a manual test to verify notification system'
    ),
    admin_id
  )
  RETURNING id INTO admin_id;

  RAISE NOTICE 'SUCCESS: Created test notification!';
  RAISE NOTICE 'Notification ID: %', admin_id;
  RAISE NOTICE 'Admin recipient: %', admin_id;
  RAISE NOTICE 'Subscriber email: %', user_email_var;
  RAISE NOTICE 'Check Notifications panel in UI within 1-5 seconds';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR: %', SQLERRM;
END $$;

-- ============================================================================
-- SECTION 7: POST-TEST VERIFICATION
-- ============================================================================

-- Test 7.1: Verify the test notification was created
SELECT
  'Test Notification Created' as check_type,
  COUNT(*) as test_notifications,
  COUNT(CASE WHEN data->>'test' = 'true' THEN 1 END) as verified_as_test
FROM notifications
WHERE type = 'subscription_activated'
AND data->>'test' = 'true'
AND created_at > NOW() - INTERVAL '1 minute';

-- Test 7.2: Check notification is visible to current admin
SELECT
  n.id,
  n.type,
  n.title,
  n.data->>'user_email' as subscriber_email,
  CASE WHEN n.read THEN 'Read' ELSE 'Unread' END as read_status,
  n.created_at,
  'Should be visible in UI' as next_step
FROM notifications n
WHERE n.type = 'subscription_activated'
AND n.recipient_id = auth.uid()
AND n.data->>'test' = 'true'
ORDER BY n.created_at DESC
LIMIT 1;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

SELECT 'TEST COMPLETE' as status;

-- Instructions:
-- 1. Run SECTION 1 to verify all database components exist
-- 2. Run SECTION 2 to verify you are a site admin
-- 3. Run SECTION 3 to check data relationships
-- 4. Run SECTION 4 to see existing notifications
-- 5. Run SECTION 5 to verify trigger exists
-- 6. Run SECTION 6 to create manual test notification
-- 7. Check UI - Notifications panel should show the test notification
-- 8. Run SECTION 7 to verify notification was created
-- 9. Repeat SECTION 6 and check UI to verify real-time updates
