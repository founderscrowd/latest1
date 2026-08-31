-- =====================================================
-- QUICK FIX: Run this SQL to create notification
-- for lanka926@btinternet.com subscription
-- =====================================================
-- Copy and paste this ENTIRE block into Supabase SQL Editor
-- and click "Run" to create the missing notification
-- =====================================================

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
    RAISE EXCEPTION 'User lanka926@btinternet.com not found. Check if email is correct.';
  END IF;

  RAISE NOTICE 'Found user: % (ID: %)', user_email, user_id_var;
  RAISE NOTICE 'Subscription ID: %', subscription_id_var;
  RAISE NOTICE 'Status: %', subscription_status_text;

  -- Get all admin user IDs
  SELECT ARRAY_AGG(id) INTO admin_users
  FROM profiles
  WHERE is_site_admin = true;

  -- Check if we have admins
  IF admin_users IS NULL OR array_length(admin_users, 1) IS NULL OR array_length(admin_users, 1) = 0 THEN
    RAISE EXCEPTION 'No site admins found! Make sure at least one user has is_site_admin = true';
  END IF;

  RAISE NOTICE 'Found % admin(s) to notify', array_length(admin_users, 1);

  -- Create notification for each admin
  INSERT INTO notifications (type, title, message, data, recipient_id)
  SELECT
    'subscription_activated',
    'New Subscription',
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
      'activated_at', NOW()
    ),
    unnest(admin_users);

  RAISE NOTICE '✅ SUCCESS! Created subscription notifications for % admin(s)', array_length(admin_users, 1);
  RAISE NOTICE '✅ Go to Profile > Notifications tab to view the notification';

END $$;

-- =====================================================
-- After running this, you should see output like:
-- NOTICE:  Found user: lanka926@btinternet.com (ID: abc-123...)
-- NOTICE:  Subscription ID: sub_xyz...
-- NOTICE:  Status: active
-- NOTICE:  Found 1 admin(s) to notify
-- NOTICE:  ✅ SUCCESS! Created subscription notifications for 1 admin(s)
-- NOTICE:  ✅ Go to Profile > Notifications tab to view the notification
-- =====================================================

-- To verify the notification was created, run:
SELECT
    n.id,
    n.type,
    n.title,
    n.message,
    n.data->>'user_email' as user_email,
    n.data->>'status' as subscription_status,
    n.read,
    n.created_at,
    p.username as admin_username
FROM notifications n
JOIN profiles p ON n.recipient_id = p.id
WHERE n.type = 'subscription_activated'
  AND n.data->>'user_email' = 'lanka926@btinternet.com'
ORDER BY n.created_at DESC;

-- This should show the notification with details
