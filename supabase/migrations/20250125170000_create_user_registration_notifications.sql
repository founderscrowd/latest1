/*
  # Create User Registration Notifications System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key) - Unique notification ID
      - `type` (text) - Type of notification (e.g., 'user_registered', 'user_deleted')
      - `title` (text) - Notification title
      - `message` (text) - Notification message
      - `data` (jsonb) - Additional data about the notification
      - `read` (boolean) - Whether the notification has been read
      - `recipient_id` (uuid) - ID of the user who should receive this notification (null for system-wide)
      - `created_at` (timestamptz) - When the notification was created
      - `read_at` (timestamptz) - When the notification was read

  2. Changes
    - Update handle_new_user function to create a notification for admins
    - Add index on notifications for better query performance

  3. Security
    - Enable RLS on notifications table
    - Only site admins can view notifications
    - System can insert notifications via trigger
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type_created
  ON notifications(type, created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Site admins can view all notifications
CREATE POLICY "Site admins can view all notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_site_admin = true
    )
  );

-- Site admins can mark notifications as read
CREATE POLICY "Site admins can update notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_site_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_site_admin = true
    )
  );

-- System can insert notifications (via triggers)
CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Update the handle_new_user function to create notifications
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  should_be_admin BOOLEAN := false;
  admin_users uuid[];
BEGIN
  -- Check if this will be the first user
  SELECT COUNT(*) INTO user_count FROM profiles;

  IF user_count = 0 THEN
    should_be_admin := true;
  END IF;

  -- Insert profile with correct columns
  INSERT INTO public.profiles (id, username, created_at, updated_at, is_site_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, 'user_' || NEW.id::text),
    NOW(),
    NOW(),
    should_be_admin
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create notification for all site admins about new user registration
  -- Get all admin user IDs
  SELECT ARRAY_AGG(id) INTO admin_users
  FROM profiles
  WHERE is_site_admin = true;

  -- Insert notification for each admin
  IF admin_users IS NOT NULL AND array_length(admin_users, 1) > 0 THEN
    INSERT INTO notifications (type, title, message, data, recipient_id)
    SELECT
      'user_registered',
      'New User Registered',
      'A new user ' || COALESCE(NEW.email, 'user_' || NEW.id::text) || ' has registered.',
      jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'created_at', NEW.created_at
      ),
      unnest(admin_users);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists (this should already exist from previous migrations)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
