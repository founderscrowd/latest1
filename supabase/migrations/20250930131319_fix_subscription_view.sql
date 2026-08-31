/*
  # Fix Subscription View Bug
  
  1. Changes
    - Drop and recreate `stripe_user_subscriptions` view with corrected WHERE clause
    - Fix the bug where LEFT JOIN + `s.deleted_at IS NULL` was excluding all rows
    - Now properly handles NULL subscription cases (users without subscriptions)
  
  2. Security
    - Maintains RLS filtering by authenticated user
    - Still filters out soft-deleted customer records
    - Only filters subscription deleted_at when subscription exists
*/

-- Drop the existing view
DROP VIEW IF EXISTS stripe_user_subscriptions;

-- Recreate with fixed logic
CREATE VIEW stripe_user_subscriptions WITH (security_invoker = true) AS
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