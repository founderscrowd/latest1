-- Remove the unique constraint that prevents multiple claims per user per group
-- This allows users to submit new claims after previous ones are approved/rejected
ALTER TABLE equity_allocations DROP CONSTRAINT IF EXISTS equity_allocations_group_id_user_id_key;

-- Function to request equity claim (UPDATED to allow multiple claims)
CREATE OR REPLACE FUNCTION request_equity_claim(
  p_group_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_investment_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_equity_available numeric;
  v_total_allocated numeric;
  v_remaining_equity numeric;
  v_user_membership record;
  v_claim_id uuid;
BEGIN
  -- Check if user is authenticated and matches the requesting user
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only create claims for yourself';
  END IF;

  -- Validate input parameters
  IF p_amount <= 0 OR p_amount > 100 THEN
    RAISE EXCEPTION 'Invalid equity amount: must be between 0.01 and 100';
  END IF;

  IF p_investment_type NOT IN ('cash', 'skills/tasks') THEN
    RAISE EXCEPTION 'Invalid investment type: must be cash or skills/tasks';
  END IF;

  -- Check if group exists and get equity available
  SELECT equity_available INTO v_group_equity_available
  FROM groups 
  WHERE id = p_group_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- Check if user is a member of the group
  SELECT * INTO v_user_membership
  FROM group_members 
  WHERE group_id = p_group_id 
  AND user_id = p_user_id 
  AND status = 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not an approved member of this group';
  END IF;

  -- Calculate total allocated equity (approved claims only)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_allocated
  FROM equity_allocations 
  WHERE group_id = p_group_id 
  AND status = 'approved';

  -- Calculate remaining equity
  v_remaining_equity := v_group_equity_available - v_total_allocated;

  -- Check if requested amount exceeds available equity
  IF p_amount > v_remaining_equity THEN
    RAISE EXCEPTION 'Requested equity (%) exceeds available equity (%)', p_amount, v_remaining_equity;
  END IF;

  -- MODIFIED: Check if user already has a PENDING claim for this group
  -- This allows multiple claims as long as no claim is currently pending
  IF EXISTS (
    SELECT 1 FROM equity_allocations
    WHERE group_id = p_group_id
    AND user_id = p_user_id
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'User already has a pending equity claim for this group. Please wait for approval or rejection.';
  END IF;

  -- Create the equity claim
  INSERT INTO equity_allocations (
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
    now()
  ) RETURNING id INTO v_claim_id;

  RETURN v_claim_id;
END;
$$;

-- Function to approve equity claim
CREATE OR REPLACE FUNCTION approve_equity_claim(
  p_claim_id uuid,
  p_approver_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim record;
  v_group_equity_available numeric;
  v_total_allocated numeric;
  v_remaining_equity numeric;
BEGIN
  -- Check if user is authenticated and matches the approver
  IF auth.uid() != p_approver_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only approve as yourself';
  END IF;

  -- Get the claim details
  SELECT * INTO v_claim
  FROM equity_allocations 
  WHERE id = p_claim_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equity claim not found';
  END IF;

  IF v_claim.status != 'pending' THEN
    RAISE EXCEPTION 'Can only approve pending claims';
  END IF;

  -- Check if approver is authorized (group creator or admin)
  IF NOT EXISTS (
    SELECT 1 FROM groups g WHERE g.id = v_claim.group_id AND g.creator_id = p_approver_user_id
    UNION
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = v_claim.group_id 
    AND gm.user_id = p_approver_user_id 
    AND gm.role IN ('admin', 'starter') 
    AND gm.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only group creators and admins can approve claims';
  END IF;

  -- Get group equity available
  SELECT equity_available INTO v_group_equity_available
  FROM groups 
  WHERE id = v_claim.group_id;

  -- Calculate total allocated equity (approved claims only, excluding this one)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_allocated
  FROM equity_allocations 
  WHERE group_id = v_claim.group_id 
  AND status = 'approved'
  AND id != p_claim_id;

  -- Calculate remaining equity
  v_remaining_equity := v_group_equity_available - v_total_allocated;

  -- Check if claim amount exceeds available equity
  IF v_claim.amount > v_remaining_equity THEN
    RAISE EXCEPTION 'Cannot approve: claim amount (%) exceeds available equity (%)', v_claim.amount, v_remaining_equity;
  END IF;

  -- Approve the claim
  UPDATE equity_allocations 
  SET 
    status = 'approved',
    approved_by = p_approver_user_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = p_claim_id;

  -- Update group's available equity
  UPDATE groups 
  SET equity_available = equity_available - v_claim.amount
  WHERE id = v_claim.group_id;
END;
$$;

-- Function to reject equity claim
CREATE OR REPLACE FUNCTION reject_equity_claim(
  p_claim_id uuid,
  p_rejecter_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_claim record;
BEGIN
  -- Check if user is authenticated and matches the rejecter
  IF auth.uid() != p_rejecter_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only reject as yourself';
  END IF;

  -- Get the claim details
  SELECT * INTO v_claim
  FROM equity_allocations 
  WHERE id = p_claim_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equity claim not found';
  END IF;

  IF v_claim.status != 'pending' THEN
    RAISE EXCEPTION 'Can only reject pending claims';
  END IF;

  -- Check if rejecter is authorized (group creator or admin)
  IF NOT EXISTS (
    SELECT 1 FROM groups g WHERE g.id = v_claim.group_id AND g.creator_id = p_rejecter_user_id
    UNION
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = v_claim.group_id 
    AND gm.user_id = p_rejecter_user_id 
    AND gm.role IN ('admin', 'starter') 
    AND gm.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only group creators and admins can reject claims';
  END IF;

  -- Reject the claim
  UPDATE equity_allocations 
  SET 
    status = 'rejected',
    approved_by = p_rejecter_user_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = p_claim_id;
END;
$$;