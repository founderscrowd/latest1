/*
# Fix Admin Signup Notifications

## Purpose
When a new user signs up, site admins should receive a notification.
The existing `handle_new_user` trigger only creates a profile row -- it does NOT
create any notification. This migration adds a post-insert function that creates
a `user_registered` notification for every site admin.

## Changes
1. Create function `notify_admins_new_user()` that inserts a notification
   for each site admin when a new auth.users row is created
2. Attach it to the existing `on_auth_user_created` trigger as a second trigger

## Notification Format
- type: 'user_registered'
- title: 'New User Registration'
- message: 'A new user has signed up: {email}'
- user_id: the admin's profile id (backward compat with admin panel)
- recipient_id: the admin's profile id
- data: { "user_id": "...", "email": "...", "username": "...", "created_at": "..." }

## Security
- Function is SECURITY DEFINER so it can insert into notifications table
  (which has INSERT restricted to service_role)
- Trigger runs on auth.users AFTER INSERT
*/

CREATE OR REPLACE FUNCTION public.notify_admins_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a notification for every site admin
  INSERT INTO notifications (user_id, recipient_id, type, title, message, data, "read", related_entity_id)
  SELECT
    p.id,
    p.id,
    'user_registered',
    'New User Registration',
    'A new user has signed up: ' || NEW.email,
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'username', COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
      'created_at', NEW.created_at
    ),
    false,
    NEW.id
  FROM profiles p
  WHERE p.is_site_admin = true;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it was previously created
DROP TRIGGER IF EXISTS on_auth_user_created_notify_admins ON auth.users;

-- Create the new trigger (runs AFTER the existing handle_new_user trigger)
CREATE TRIGGER on_auth_user_created_notify_admins
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_user();
