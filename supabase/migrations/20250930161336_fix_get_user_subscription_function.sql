/*
  # Fix get_user_subscription function security context

  1. Changes
    - Drop and recreate get_user_subscription function with SECURITY INVOKER
    - This ensures the function runs with the caller's permissions
    - Allows proper RLS policy evaluation for authenticated users
  
  2. Security
    - Function will respect RLS policies on stripe_customers and stripe_subscriptions
    - Only returns data the authenticated user has permission to see
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_subscription();

-- Recreate with proper security context
CREATE OR REPLACE FUNCTION get_user_subscription()
RETURNS TABLE(
  customer_id text,
  subscription_id text,
  subscription_status stripe_subscription_status,
  price_id text,
  current_period_start bigint,
  current_period_end bigint,
  cancel_at_period_end boolean,
  payment_method_brand text,
  payment_method_last4 text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
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
$$;