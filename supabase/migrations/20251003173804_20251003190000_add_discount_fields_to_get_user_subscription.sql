/*
  # Add discount fields to get_user_subscription function

  1. Changes
    - Update get_user_subscription function to include discount fields
    - Returns discount_code, discount_percent_off, discount_amount_off, discount_duration, discount_end_date
  
  2. Purpose
    - Allow frontend to display lifetime/free subscription information
    - Show coupon codes and discount percentages in user's billing page
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_user_subscription();

-- Recreate with discount fields
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
  payment_method_last4 text,
  discount_code text,
  discount_percent_off numeric,
  discount_amount_off bigint,
  discount_duration text,
  discount_end_date bigint
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
    s.payment_method_last4,
    s.discount_code,
    s.discount_percent_off,
    s.discount_amount_off,
    s.discount_duration,
    s.discount_end_date
  FROM stripe_customers c
  LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id AND s.deleted_at IS NULL
  WHERE c.user_id = auth.uid()
  AND c.deleted_at IS NULL;
$$;