-- ============================================================================
-- STEP 1: PRE-TEST VERIFICATION - RUN EACH QUERY SEPARATELY
-- ============================================================================
-- Copy and paste each query below into Supabase SQL Editor
-- Do NOT include the \d command - that only works in psql CLI, not in Supabase
-- ============================================================================

-- ============================================================================
-- QUERY 1: Are you a site admin?
-- ============================================================================
-- Run this first
SELECT is_site_admin FROM profiles WHERE id = auth.uid();

-- Expected: is_site_admin = true
-- If false, run this to make yourself admin:
-- UPDATE profiles SET is_site_admin = true WHERE id = auth.uid();

-- ============================================================================
-- QUERY 2: Check trigger function exists
-- ============================================================================
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'notify_admins_of_new_subscription';

-- Expected: 1 row with routine_name = 'notify_admins_of_new_subscription'

-- ============================================================================
-- QUERY 3: Check trigger exists
-- ============================================================================
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'on_subscription_activated';

-- Expected: 1 row with trigger_name = 'on_subscription_activated'

-- ============================================================================
-- QUERY 4: Check notifications table exists
-- ============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'notifications' AND table_schema = 'public';

-- Expected: 1 row with table_name = 'notifications'

-- ============================================================================
-- QUERY 5: Check stripe_subscriptions table exists
-- ============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'stripe_subscriptions' AND table_schema = 'public';

-- Expected: 1 row with table_name = 'stripe_subscriptions'

-- ============================================================================
-- QUERY 6: Check if active subscriptions exist
-- ============================================================================
SELECT COUNT(*) as active_subscriptions
FROM stripe_subscriptions
WHERE status IN ('active', 'trialing');

-- Expected: active_subscriptions >= 1
-- If 0, you need to process a Stripe subscription first

-- ============================================================================
-- QUERY 7: Check if stripe_customers records exist
-- ============================================================================
SELECT COUNT(*) as customer_records
FROM stripe_customers
WHERE user_id IS NOT NULL;

-- Expected: customer_records >= 1
-- If 0, no customers linked to users

-- ============================================================================
-- If you are NOT admin, run this to fix:
-- ============================================================================
-- UPDATE profiles SET is_site_admin = true WHERE id = auth.uid();
