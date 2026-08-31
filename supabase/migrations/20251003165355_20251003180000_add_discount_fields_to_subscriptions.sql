/*
  # Add Discount/Coupon Fields to Stripe Subscriptions

  1. Changes
    - Add `discount_code` column to store the coupon/promo code used
    - Add `discount_percent_off` column to store percentage discount (e.g., 100 for 100% off)
    - Add `discount_amount_off` column to store fixed amount discount
    - Add `discount_duration` column to store discount duration (forever, once, repeating)
    - Add `discount_end_date` column to store when discount expires (for repeating discounts)
  
  2. Purpose
    - Track lifetime/free subscriptions created with 100% off coupons
    - Display appropriate pricing information to users with discounts
    - Distinguish between paid and free lifetime subscriptions
*/

-- Add discount fields to stripe_subscriptions table
ALTER TABLE stripe_subscriptions 
ADD COLUMN IF NOT EXISTS discount_code text,
ADD COLUMN IF NOT EXISTS discount_percent_off numeric,
ADD COLUMN IF NOT EXISTS discount_amount_off bigint,
ADD COLUMN IF NOT EXISTS discount_duration text,
ADD COLUMN IF NOT EXISTS discount_end_date bigint;

-- Add comments for clarity
COMMENT ON COLUMN stripe_subscriptions.discount_code IS 'The coupon or promo code applied to the subscription';
COMMENT ON COLUMN stripe_subscriptions.discount_percent_off IS 'Percentage off (e.g., 100 for 100% off)';
COMMENT ON COLUMN stripe_subscriptions.discount_amount_off IS 'Fixed amount off in cents';
COMMENT ON COLUMN stripe_subscriptions.discount_duration IS 'Discount duration: forever, once, or repeating';
COMMENT ON COLUMN stripe_subscriptions.discount_end_date IS 'Unix timestamp when discount ends (for repeating discounts)';