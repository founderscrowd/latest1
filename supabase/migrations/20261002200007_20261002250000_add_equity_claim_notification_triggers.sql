/*
# Equity Claim Notification Triggers

## Purpose
Notify group starters/admins when someone submits an equity claim,
and notify the claimant when their claim is approved or rejected.

## Changes
1. Function `notify_group_starter_equity_claim()` + trigger on `equity_allocations` INSERT
   - When someone submits a new equity claim, the group starter and admins receive
     a notification with the claim amount, investment type, and group name.
   - Notification type: 'equity_claim_submitted'

2. Function `notify_claimant_equity_status()` + trigger on `equity_allocations` UPDATE
   - When a claim's status changes from 'pending' to 'approved' or 'rejected',
     the claimant receives a notification.
   - Notification type: 'equity_claim_approved' or 'equity_claim_rejected'

## Security
- Both functions are SECURITY DEFINER so they can insert into notifications
- Only notifies the group starter and admins (role = 'admin' or 'starter')
- Skips notifying the claimant
*/

-- ============ EQUITY CLAIM INSERT TRIGGER ============

CREATE OR REPLACE FUNCTION public.notify_group_starter_equity_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimant_username text;
  group_name text;
  group_slug text;
  group_creator_id uuid;
  investment_label text;
BEGIN
  -- Get claimant username
  SELECT username INTO claimant_username
  FROM profiles
  WHERE id = NEW.user_id;

  IF claimant_username IS NULL THEN
    claimant_username := 'Someone';
  END IF;

  -- Get group info
  SELECT name, slug, creator_id INTO group_name, group_slug, group_creator_id
  FROM groups
  WHERE id = NEW.group_id;

  -- Build investment type label
  IF NEW.investment_type = 'cash' THEN
    investment_label := 'cash investment';
  ELSE
    investment_label := 'skills/tasks';
  END IF;

  -- Insert notifications for the group starter and admins (excluding the claimant)
  INSERT INTO notifications (user_id, recipient_id, type, title, message, data, "read", related_entity_id)
  SELECT
    gm.user_id,
    gm.user_id,
    'equity_claim_submitted',
    'New Equity Claim',
    claimant_username || ' claimed ' || NEW.amount || '% equity via ' || investment_label || ' in ' || COALESCE(group_name, 'your group'),
    jsonb_build_object(
      'group_id', NEW.group_id,
      'group_name', group_name,
      'group_slug', group_slug,
      'claim_id', NEW.id,
      'claimant_user_id', NEW.user_id,
      'claimant_username', claimant_username,
      'amount', NEW.amount,
      'investment_type', NEW.investment_type
    ),
    false,
    NEW.id
  FROM group_members gm
  WHERE gm.group_id = NEW.group_id
    AND gm.user_id != NEW.user_id
    AND gm.status = 'approved'
    AND gm.role IN ('admin', 'starter');

  -- Also notify the group creator if not already covered by group_members
  IF group_creator_id IS NOT NULL AND group_creator_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, recipient_id, type, title, message, data, "read", related_entity_id)
    SELECT
      group_creator_id,
      group_creator_id,
      'equity_claim_submitted',
      'New Equity Claim',
      claimant_username || ' claimed ' || NEW.amount || '% equity via ' || investment_label || ' in ' || COALESCE(group_name, 'your group'),
      jsonb_build_object(
        'group_id', NEW.group_id,
        'group_name', group_name,
        'group_slug', group_slug,
        'claim_id', NEW.id,
        'claimant_user_id', NEW.user_id,
        'claimant_username', claimant_username,
        'amount', NEW.amount,
        'investment_type', NEW.investment_type
      ),
      false,
      NEW.id
    WHERE NOT EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = NEW.group_id
        AND gm.user_id = group_creator_id
        AND gm.role IN ('admin', 'starter')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_equity_claim_insert_notify_starter ON equity_allocations;
CREATE TRIGGER on_equity_claim_insert_notify_starter
AFTER INSERT ON equity_allocations
FOR EACH ROW
EXECUTE FUNCTION public.notify_group_starter_equity_claim();

-- ============ EQUITY CLAIM STATUS UPDATE TRIGGER ============

CREATE OR REPLACE FUNCTION public.notify_claimant_equity_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_name text;
  group_slug text;
  notif_type text;
  notif_title text;
  notif_message text;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only notify on transitions from 'pending' to 'approved' or 'rejected'
  IF OLD.status != 'pending' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get group info
  SELECT name, slug INTO group_name, group_slug
  FROM groups
  WHERE id = NEW.group_id;

  -- Determine notification type
  IF NEW.status = 'approved' THEN
    notif_type := 'equity_claim_approved';
    notif_title := 'Equity Claim Approved';
    notif_message := 'Your equity claim for ' || NEW.amount || '% in ' || COALESCE(group_name, 'the group') || ' was approved';
  ELSE
    notif_type := 'equity_claim_rejected';
    notif_title := 'Equity Claim Declined';
    notif_message := 'Your equity claim for ' || NEW.amount || '% in ' || COALESCE(group_name, 'the group') || ' was declined';
  END IF;

  -- Insert notification for the claimant
  INSERT INTO notifications (user_id, recipient_id, type, title, message, data, "read", related_entity_id)
  VALUES (
    NEW.user_id,
    NEW.user_id,
    notif_type,
    notif_title,
    notif_message,
    jsonb_build_object(
      'group_id', NEW.group_id,
      'group_name', group_name,
      'group_slug', group_slug,
      'claim_id', NEW.id,
      'amount', NEW.amount,
      'investment_type', NEW.investment_type,
      'new_status', NEW.status
    ),
    false,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_equity_claim_update_notify_claimant ON equity_allocations;
CREATE TRIGGER on_equity_claim_update_notify_claimant
AFTER UPDATE ON equity_allocations
FOR EACH ROW
EXECUTE FUNCTION public.notify_claimant_equity_status();
