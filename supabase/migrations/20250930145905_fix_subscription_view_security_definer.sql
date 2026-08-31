/*
  # Fix Subscription View Security

  1. Changes
    - Recreate stripe_user_subscriptions view WITHOUT security_invoker
    - This makes the view run with definer's (postgres) privileges, bypassing RLS
    - The view still filters by auth.uid() so users only see their own data

  2. Security
    - View filters by auth.uid() ensuring data isolation per user
    - Runs with postgres privileges to bypass RLS on underlying tables
    - This is necessary because security_invoker was causing RLS conflicts
*/

-- Drop and recreate the view without security_invoker
DROP VIEW IF EXISTS stripe_user_subscriptions;

CREATE VIEW stripe_user_subscriptions AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id AND s.deleted_at IS NULL
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL;

GRANT SELECT ON stripe_user_subscriptions TO authenticated;