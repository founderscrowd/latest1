/*
  # Fix get_user_subscription function to use SECURITY INVOKER

  1. Changes
    - Change function from SECURITY DEFINER to SECURITY INVOKER
    - This allows auth.uid() to work correctly with the caller's context
    - The function will now use the caller's privileges and auth context

  2. Security
    - Function runs with caller's privileges (SECURITY INVOKER)
    - Uses auth.uid() which works correctly in this context
    - RLS policies on underlying tables still apply
*/

-- Drop and recreate the function with SECURITY INVOKER
DROP FUNCTION IF EXISTS get_user_subscription();

CREATE OR REPLACE FUNCTION get_user_subscription()
RETURNS TABLE (
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
SECURITY INVOKER
LANGUAGE sql
STABLE
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_subscription() TO authenticated;