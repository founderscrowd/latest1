/*
# Cleanup stale not_started subscription rows

## Purpose
Previous failed or incomplete checkout attempts left subscription rows in the
database with status = 'not_started' even though the corresponding Stripe
subscriptions were canceled. These stale rows block users from starting a new
checkout because the stripe_subscriptions table has a UNIQUE constraint on
customer_id -- the checkout function tries to INSERT a new not_started row and
fails.

## What this migration does
1. Updates all 'not_started' rows that have a subscription_id to status =
   'canceled' (matching the real Stripe status), and clears the subscription_id
   and price_id so the row is ready to be reused for a fresh checkout attempt.
2. Updates 'not_started' rows with a NULL subscription_id to clear price_id
   as well, so they are fully reset and ready for reuse.

## Safety
- No rows are deleted (preserves the unique constraint slot per customer).
- No active or trialing subscriptions are touched.
- Only 'not_started' rows are affected.
*/

-- Reset not_started rows that have an orphaned canceled subscription in Stripe
UPDATE stripe_subscriptions
SET
  status = 'canceled',
  subscription_id = NULL,
  price_id = NULL,
  current_period_start = NULL,
  current_period_end = NULL,
  cancel_at_period_end = false,
  payment_method_brand = NULL,
  payment_method_last4 = NULL,
  discount_code = NULL,
  discount_percent_off = NULL,
  discount_amount_off = NULL,
  discount_duration = NULL,
  discount_end_date = NULL,
  discount_duration_in_months = NULL,
  updated_at = now()
WHERE status = 'not_started'
  AND subscription_id IS NOT NULL;

-- Reset not_started rows that never got a subscription_id (fully blank)
UPDATE stripe_subscriptions
SET
  price_id = NULL,
  updated_at = now()
WHERE status = 'not_started'
  AND subscription_id IS NULL
  AND price_id IS NOT NULL;
