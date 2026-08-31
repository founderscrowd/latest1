-- =====================================================
-- SUBSCRIPTION NOTIFICATION VERIFICATION & TESTING
-- =====================================================
-- This file contains SQL queries to verify and test
-- the subscription notification system.
-- =====================================================

-- =====================================================
-- STEP 1: Verify Site Admins Exist
-- =====================================================
-- Check if there are any site admins who should receive notifications
SELECT
    id,
    username,
    is_site_admin,
    created_at
FROM profiles
WHERE is_site_admin = true;

-- Expected Result: Should show at least one admin user
-- If no admins, the first user should be admin by default


-- =====================================================
-- STEP 2: Check Existing Subscriptions
-- =====================================================
-- Find the subscription for lanka926@btinternet.com
SELECT
    au.email as user_email,
    sc.customer_id,
    ss.subscription_id,
    ss.status,
    ss.price_id,
    ss.current_period_start,
    ss.current_period_end,
    ss.created_at as subscription_created_at,
    ss.updated_at as subscription_updated_at
FROM auth.users au
JOIN stripe_customers sc ON au.id = sc.user_id
JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
WHERE au.email = 'lanka926@btinternet.com';

-- Expected Result: Should show subscription details
-- Note: The trigger only fires on NEW activations
-- If subscription already existed before trigger was added, no notification was created


-- =====================================================
-- STEP 3: Check Existing Notifications
-- =====================================================
-- Check if any notifications exist for this subscription
SELECT
    n.id,
    n.type,
    n.title,
    n.message,
    n.data,
    n.read,
    n.recipient_id,
    n.created_at,
    p.username as recipient_username
FROM notifications n
LEFT JOIN profiles p ON n.recipient_id = p.id
WHERE n.type = 'subscription_activated'
ORDER BY n.created_at DESC;

-- Expected Result: Should show subscription notifications if any exist
-- If empty, notifications were never created


-- =====================================================
-- STEP 4: Manually Create Notification for Existing Subscription
-- =====================================================
-- If the subscription existed BEFORE the trigger was added,
-- you can manually create a notification using this query:

DO $$
DECLARE
  admin_users uuid[];
  user_email text;
  user_id_var uuid;
  customer_id_var text;
  subscription_id_var text;
  price_id_var text;
  subscription_status_text text;
  current_period_start_var bigint;
  current_period_end_var bigint;
BEGIN
  -- Get the user and subscription details for lanka926@btinternet.com
  SELECT
    au.id,
    au.email,
    sc.customer_id,
    ss.subscription_id,
    ss.price_id,
    ss.status::text,
    ss.current_period_start,
    ss.current_period_end
  INTO
    user_id_var,
    user_email,
    customer_id_var,
    subscription_id_var,
    price_id_var,
    subscription_status_text,
    current_period_start_var,
    current_period_end_var
  FROM auth.users au
  JOIN stripe_customers sc ON au.id = sc.user_id
  JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
  WHERE au.email = 'lanka926@btinternet.com'
  LIMIT 1;

  -- Check if we found the user
  IF user_id_var IS NULL THEN
    RAISE NOTICE 'User lanka926@btinternet.com not found';
    RETURN;
  END IF;

  -- Get all admin user IDs
  SELECT ARRAY_AGG(id) INTO admin_users
  FROM profiles
  WHERE is_site_admin = true;

  -- Check if we have admins
  IF admin_users IS NULL OR array_length(admin_users, 1) IS NULL OR array_length(admin_users, 1) = 0 THEN
    RAISE NOTICE 'No site admins found';
    RETURN;
  END IF;

  -- Create notification for each admin
  INSERT INTO notifications (type, title, message, data, recipient_id)
  SELECT
    'subscription_activated',
    'New Subscription (Manual)',
    'User ' || user_email || ' has subscribed to a paid plan.',
    jsonb_build_object(
      'user_id', user_id_var,
      'user_email', user_email,
      'customer_id', customer_id_var,
      'subscription_id', subscription_id_var,
      'price_id', price_id_var,
      'status', subscription_status_text,
      'current_period_start', current_period_start_var,
      'current_period_end', current_period_end_var,
      'activated_at', NOW(),
      'note', 'Manually created for existing subscription'
    ),
    unnest(admin_users);

  RAISE NOTICE 'Created subscription notifications for % admins', array_length(admin_users, 1);
END $$;

-- Expected Result: Should see a notice about how many admins were notified


-- =====================================================
-- STEP 5: Verify Notifications Were Created
-- =====================================================
-- Check all subscription notifications after manual creation
SELECT
    n.id,
    n.type,
    n.title,
    n.message,
    n.data->>'user_email' as user_email,
    n.data->>'price_id' as price_id,
    n.data->>'status' as status,
    n.read,
    n.recipient_id,
    p.username as recipient_username,
    p.is_site_admin,
    n.created_at
FROM notifications n
LEFT JOIN profiles p ON n.recipient_id = p.id
WHERE n.type = 'subscription_activated'
ORDER BY n.created_at DESC;

-- Expected Result: Should show notifications for admins
-- Each admin should have one notification


-- =====================================================
-- STEP 6: Test Trigger with Status Update
-- =====================================================
-- To test that the trigger works for FUTURE subscriptions,
-- you can update the subscription status to 'inactive' and then back to 'active'
-- (Only do this if you want to test - it will create duplicate notifications!)

-- UNCOMMENT TO TEST:
-- UPDATE stripe_subscriptions
-- SET status = 'canceled'
-- WHERE customer_id IN (
--   SELECT customer_id FROM stripe_customers sc
--   JOIN auth.users au ON sc.user_id = au.id
--   WHERE au.email = 'lanka926@btinternet.com'
-- );

-- Then update back to active (this should trigger notification):
-- UPDATE stripe_subscriptions
-- SET status = 'active'
-- WHERE customer_id IN (
--   SELECT customer_id FROM stripe_customers sc
--   JOIN auth.users au ON sc.user_id = au.id
--   WHERE au.email = 'lanka926@btinternet.com'
-- );


-- =====================================================
-- STEP 7: Check All Notifications for a Specific Admin
-- =====================================================
-- Replace 'your-admin-email@example.com' with the actual admin email
SELECT
    n.id,
    n.type,
    n.title,
    n.message,
    n.data,
    n.read,
    n.created_at
FROM notifications n
JOIN profiles p ON n.recipient_id = p.id
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'your-admin-email@example.com'
ORDER BY n.created_at DESC;


-- =====================================================
-- STEP 8: Verify Trigger Function Exists
-- =====================================================
-- Check if the trigger function was created
SELECT
    routine_name,
    routine_type,
    security_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'notify_admins_of_new_subscription';

-- Expected Result: Should show the function with DEFINER security


-- =====================================================
-- STEP 9: Verify Trigger Exists
-- =====================================================
-- Check if the trigger was created on stripe_subscriptions
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_subscription_activated';

-- Expected Result: Should show trigger that fires AFTER INSERT OR UPDATE


-- =====================================================
-- CLEANUP (OPTIONAL)
-- =====================================================
-- If you created test notifications and want to remove them:
-- DELETE FROM notifications WHERE data->>'note' = 'Manually created for existing subscription';
