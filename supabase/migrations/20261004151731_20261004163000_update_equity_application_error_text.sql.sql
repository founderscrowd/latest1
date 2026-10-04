/*
# Update equity application error text

1. Changes
- Updates the existing `request_equity_claim` function's user-facing errors to
  say "application" rather than "claim".
- Keeps the function name, parameters, table names, status values, and database
  fields unchanged for compatibility.
- Keeps the existing validation, membership checks, and pending-application
  protection unchanged.

2. Security
- Preserves SECURITY DEFINER and adds a fixed public search path.
- Authorization still requires the authenticated user to match the requesting
  user ID and to be an approved group member.
- No RLS policies or permissions are changed.

3. Legal meaning
- The updated wording describes a proposed application only. It does not imply
  that shares were issued, ownership was transferred, or payment was made.
*/

CREATE OR REPLACE FUNCTION public.request_equity_claim(
  p_group_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_investment_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_equity_available numeric;
  v_total_allocated numeric;
  v_remaining_equity numeric;
  v_user_membership record;
  v_claim_id uuid;
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only create applications for yourself';
  END IF;

  IF p_amount <= 0 OR p_amount > 100 THEN
    RAISE EXCEPTION 'Invalid equity amount: must be between 0.01 and 100';
  END IF;

  IF p_investment_type NOT IN ('cash', 'skills/tasks') THEN
    RAISE EXCEPTION 'Invalid investment type: must be cash or skills/tasks';
  END IF;

  SELECT equity_available INTO v_group_equity_available
  FROM public.groups
  WHERE id = p_group_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  SELECT * INTO v_user_membership
  FROM public.group_members
  WHERE group_id = p_group_id
    AND user_id = p_user_id
    AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not an approved member of this group';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_allocated
  FROM public.equity_allocations
  WHERE group_id = p_group_id
    AND status = 'approved';

  v_remaining_equity := v_group_equity_available - v_total_allocated;

  IF p_amount > v_remaining_equity THEN
    RAISE EXCEPTION 'Requested equity (%) exceeds available equity (%)', p_amount, v_remaining_equity;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.equity_allocations
    WHERE group_id = p_group_id
      AND user_id = p_user_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending equity application for this group. Please wait for approval or rejection.';
  END IF;

  INSERT INTO public.equity_allocations (
    group_id,
    user_id,
    amount,
    investment_type,
    status,
    requested_at
  ) VALUES (
    p_group_id,
    p_user_id,
    p_amount,
    p_investment_type,
    'pending',
    NOW()
  ) RETURNING id INTO v_claim_id;

  RETURN v_claim_id;
END;
$$;
