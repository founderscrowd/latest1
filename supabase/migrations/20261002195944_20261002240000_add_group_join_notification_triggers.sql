/*
# Group Join and Member Status Notification Triggers

## Purpose
Notify group starters/admins when someone joins or requests to join their group,
and notify the joiner when their membership is approved or rejected.

## Changes
1. Function `notify_group_starter_new_member()` + trigger on `group_members` INSERT
   - When someone joins (status = 'approved') or requests to join (status = 'pending'),
     the group starter and any group admins receive a notification.
   - Notification type: 'group_join_request' (if pending) or 'group_joined' (if approved)

2. Function `notify_member_status_changed()` + trigger on `group_members` UPDATE
   - When a member's status changes from 'pending' to 'approved' or 'rejected',
     the member receives a notification.
   - Notification type: 'group_join_approved' or 'group_join_rejected'

## Security
- Both functions are SECURITY DEFINER so they can insert into notifications
- Only notifies the group starter and admins (role = 'admin' or 'starter')
- Skips notifying the user who triggered the change
*/

-- ============ GROUP JOIN INSERT TRIGGER ============

CREATE OR REPLACE FUNCTION public.notify_group_starter_new_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  joiner_username text;
  group_name text;
  group_slug text;
  group_creator_id uuid;
  notif_type text;
  notif_title text;
  notif_message text;
BEGIN
  -- Get joiner username
  SELECT username INTO joiner_username
  FROM profiles
  WHERE id = NEW.user_id;

  IF joiner_username IS NULL THEN
    joiner_username := 'Someone';
  END IF;

  -- Get group info
  SELECT name, slug, creator_id INTO group_name, group_slug, group_creator_id
  FROM groups
  WHERE id = NEW.group_id;

  -- Determine notification type based on status
  IF NEW.status = 'pending' THEN
    notif_type := 'group_join_request';
    notif_title := 'New Join Request';
    notif_message := joiner_username || ' requested to join ' || COALESCE(group_name, 'your group');
  ELSE
    notif_type := 'group_joined';
    notif_title := 'New Member Joined';
    notif_message := joiner_username || ' joined ' || COALESCE(group_name, 'your group');
  END IF;

  -- Insert notifications for the group starter and admins (excluding the joiner)
  INSERT INTO notifications (user_id, recipient_id, type, title, message, data, "read", related_entity_id)
  SELECT
    gm.user_id,
    gm.user_id,
    notif_type,
    notif_title,
    notif_message,
    jsonb_build_object(
      'group_id', NEW.group_id,
      'group_name', group_name,
      'group_slug', group_slug,
      'joiner_user_id', NEW.user_id,
      'joiner_username', joiner_username,
      'member_status', NEW.status
    ),
    false,
    NEW.id
  FROM group_members gm
  WHERE gm.group_id = NEW.group_id
    AND gm.user_id != NEW.user_id
    AND gm.status = 'approved'
    AND gm.role IN ('admin', 'starter');

  -- Also notify the group creator if they're not already in group_members as a starter
  -- (covers the case where the creator might not be in group_members table)
  IF group_creator_id IS NOT NULL AND group_creator_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, recipient_id, type, title, message, data, "read", related_entity_id)
    SELECT
      group_creator_id,
      group_creator_id,
      notif_type,
      notif_title,
      notif_message,
      jsonb_build_object(
        'group_id', NEW.group_id,
        'group_name', group_name,
        'group_slug', group_slug,
        'joiner_user_id', NEW.user_id,
        'joiner_username', joiner_username,
        'member_status', NEW.status
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

DROP TRIGGER IF EXISTS on_group_member_insert_notify_starter ON group_members;
CREATE TRIGGER on_group_member_insert_notify_starter
AFTER INSERT ON group_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_group_starter_new_member();

-- ============ MEMBER STATUS UPDATE TRIGGER ============

CREATE OR REPLACE FUNCTION public.notify_member_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_name text;
  group_slug text;
  approver_username text;
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
    notif_type := 'group_join_approved';
    notif_title := 'Membership Approved';
    notif_message := 'Your request to join ' || COALESCE(group_name, 'the group') || ' was approved';
  ELSE
    notif_type := 'group_join_rejected';
    notif_title := 'Membership Declined';
    notif_message := 'Your request to join ' || COALESCE(group_name, 'the group') || ' was declined';
  END IF;

  -- Insert notification for the member whose status changed
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
      'member_id', NEW.id,
      'new_status', NEW.status
    ),
    false,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_group_member_update_notify_member ON group_members;
CREATE TRIGGER on_group_member_update_notify_member
AFTER UPDATE ON group_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_member_status_changed();
