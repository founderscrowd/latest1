/*
# Update equity notification wording

1. Changes
- Updates the existing equity-allocation notification trigger functions.
- User-facing notification titles and messages now say "application" and
  "applied for" instead of "claim" and "claimed".
- Notification type values, JSON field names, function names, trigger names,
  table names, and database columns remain unchanged for compatibility.

2. Security
- Preserves SECURITY DEFINER and the fixed public search path on both functions.
- No RLS policies or access permissions are changed.

3. Legal meaning
- Notifications continue to describe a proposed application that requires
  review. They do not imply that shares were issued, ownership was transferred,
  or payment was made.
*/

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
  SELECT username INTO claimant_username
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF claimant_username IS NULL THEN
    claimant_username := 'Someone';
  END IF;

  SELECT name, slug, creator_id INTO group_name, group_slug, group_creator_id
  FROM public.groups
  WHERE id = NEW.group_id;

  IF NEW.investment_type = 'cash' THEN
    investment_label := 'cash investment';
  ELSE
    investment_label := 'skills/tasks';
  END IF;

  INSERT INTO public.notifications (user_id, recipient_id, type, title, message, data, "read", related_entity_id)
  SELECT
    gm.user_id,
    gm.user_id,
    'equity_claim_submitted',
    'New Equity Application',
    claimant_username || ' applied for ' || NEW.amount || '% equity via ' || investment_label || ' in ' || COALESCE(group_name, 'your group'),
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
  FROM public.group_members gm
  WHERE gm.group_id = NEW.group_id
    AND gm.user_id != NEW.user_id
    AND gm.status = 'approved'
    AND gm.role IN ('admin', 'starter');

  IF group_creator_id IS NOT NULL AND group_creator_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, recipient_id, type, title, message, data, "read", related_entity_id)
    SELECT
      group_creator_id,
      group_creator_id,
      'equity_claim_submitted',
      'New Equity Application',
      claimant_username || ' applied for ' || NEW.amount || '% equity via ' || investment_label || ' in ' || COALESCE(group_name, 'your group'),
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
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = NEW.group_id
        AND gm.user_id = group_creator_id
        AND gm.role IN ('admin', 'starter')
    );
  END IF;

  RETURN NEW;
END;
$$;

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
  IF OLD.status = NEW.status OR OLD.status != 'pending' OR NEW.status NOT IN ('approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  SELECT name, slug INTO group_name, group_slug
  FROM public.groups
  WHERE id = NEW.group_id;

  IF NEW.status = 'approved' THEN
    notif_type := 'equity_claim_approved';
    notif_title := 'Equity Application Approved';
    notif_message := 'Your equity application for ' || NEW.amount || '% in ' || COALESCE(group_name, 'the group') || ' was approved';
  ELSE
    notif_type := 'equity_claim_rejected';
    notif_title := 'Equity Application Declined';
    notif_message := 'Your equity application for ' || NEW.amount || '% in ' || COALESCE(group_name, 'the group') || ' was declined';
  END IF;

  INSERT INTO public.notifications (user_id, recipient_id, type, title, message, data, "read", related_entity_id)
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
