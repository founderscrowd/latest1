/*
# Add batch subscription status lookup function

## Purpose
Adds a SECURITY DEFINER function that takes an array of user IDs and returns
each user's subscription status. This is needed to display "Inactive" badges
on group members whose subscription has been canceled or is not active.

## Why SECURITY DEFINER
The stripe_customers and stripe_subscriptions tables have RLS policies that
only let a user see their own data. Group members need to see each other's
subscription status to display badges, so the function must run with
elevated privileges to bypass RLS while exposing only the minimal data
(user_id + subscription_status + cancel_at_period_end).

## New function
- `get_batch_subscription_status(user_ids uuid[])`
  Returns a table with columns:
  - user_id (uuid) — the user ID passed in
  - subscription_status (text) — one of: 'active', 'canceled', 'not_started', or NULL if no record
  - cancel_at_period_end (boolean) — whether the subscription is set to cancel

## Security
- SECURITY DEFINER — runs with the function owner's privileges to bypass RLS on stripe tables
- Only exposes user_id, subscription_status, and cancel_at_period_end — no sensitive payment data
- SEARCH_PATH set to 'public' to prevent search path injection
- Only returns rows for user_ids that were passed in
*/

CREATE OR REPLACE FUNCTION public.get_batch_subscription_status(user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  subscription_status text,
  cancel_at_period_end boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
SELECT
  c.user_id,
  s.status::text AS subscription_status,
  s.cancel_at_period_end
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s
  ON c.customer_id = s.customer_id
  AND s.deleted_at IS NULL
WHERE c.user_id = ANY(user_ids)
  AND c.deleted_at IS NULL;
$function$;

-- Grant execute to authenticated users (group members viewing each other)
GRANT EXECUTE ON FUNCTION public.get_batch_subscription_status(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_batch_subscription_status(uuid[]) TO anon;
