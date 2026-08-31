/*
  # Fix Subscription View Security Invoker
  
  1. Changes
    - Recreate stripe_user_subscriptions view WITH security_invoker option
    - This ensures the view runs with the invoking user's permissions
    - Required for auth.uid() to work correctly with authenticated users
  
  2. Security
    - Maintains RLS filtering by authenticated user
    - View queries respect the calling user's auth context
*/

-- Drop and recreate the view with correct security options
DROP VIEW IF EXISTS stripe_user_subscriptions;

CREATE VIEW stripe_user_subscriptions 
WITH (security_invoker = true) AS
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