/*
  # Add discount_duration_in_months field to stripe_subscriptions

  1. Changes
    - Add `discount_duration_in_months` column to store the number of months for repeating discounts
    - This comes directly from Stripe's coupon.duration_in_months field
  
  2. Purpose
    - Accurately display "X months free" instead of calculating from timestamps
    - Use the exact duration from Stripe rather than approximating
*/

-- Add discount_duration_in_months field
ALTER TABLE stripe_subscriptions 
ADD COLUMN IF NOT EXISTS discount_duration_in_months integer;

-- Add comment for clarity
COMMENT ON COLUMN stripe_subscriptions.discount_duration_in_months IS 'Number of months for repeating discounts (from Stripe coupon.duration_in_months)';
