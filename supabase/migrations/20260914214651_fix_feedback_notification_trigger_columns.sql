/*
# Fix feedback notification trigger column mapping

1. Purpose
- Update the feedback notification trigger to match the existing notifications table.
- The original trigger referenced notification columns that do not exist in this project, causing every feedback insert to fail after the row was created.

2. Existing table compatibility
- Writes `user_id` for the site administrator.
- Writes `type` as `feedback`.
- Writes a readable `message` containing the feedback type and message preview.
- Writes `related_entity_id` with the new feedback ID.
- Writes `is_read` as false.
- Leaves existing notification data and table structure unchanged.

3. Security
- Keeps the trigger function SECURITY DEFINER so a public feedback submission can create the administrator's notification without granting visitors access to the notifications table.
- Keeps the function search path fixed to `public`.

4. Data safety
- Does not drop, rename, or alter any existing columns or rows.
*/

CREATE OR REPLACE FUNCTION notify_admin_on_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id
  INTO admin_id
  FROM profiles
  WHERE is_site_admin = true
  LIMIT 1;

  IF admin_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      message,
      related_entity_id,
      is_read
    )
    VALUES (
      admin_id,
      'feedback',
      'New ' || NEW.feedback_type || ' feedback: ' || LEFT(NEW.message, 150),
      NEW.id,
      false
    );
  END IF;

  RETURN NEW;
END;
$$;