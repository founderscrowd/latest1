-- ============================================================================
-- COMPLETE FIX: User Registration Notifications
-- ============================================================================
-- This script will check your notifications table and fix it if needed
-- ============================================================================

-- Step 1: Check if notifications table exists and what columns it has
SELECT 'Step 1: Checking notifications table structure...' as status;

DO $$
DECLARE
  table_exists boolean;
  has_title_column boolean;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'notifications'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE NOTICE '❌ Notifications table does not exist. Creating it...';

    -- Create the notifications table
    CREATE TABLE notifications (
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

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
      ON notifications(recipient_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_notifications_type_created
      ON notifications(type, created_at DESC);

    -- Enable RLS
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

    RAISE NOTICE '✅ Notifications table created successfully';
  ELSE
    RAISE NOTICE '✅ Notifications table exists';

    -- Check if title column exists
    SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'title'
    ) INTO has_title_column;

    IF NOT has_title_column THEN
      RAISE NOTICE '⚠️ Title column missing. Adding it...';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Notification';
      RAISE NOTICE '✅ Title column added';
    ELSE
      RAISE NOTICE '✅ Title column exists';
    END IF;
  END IF;
END $$;

-- Step 2: Ensure RLS policies exist
SELECT 'Step 2: Setting up RLS policies...' as status;

DROP POLICY IF EXISTS "Site admins can view all notifications" ON notifications;
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

DROP POLICY IF EXISTS "Site admins can update notifications" ON notifications;
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

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Step 3: Check if you are a site admin
SELECT 'Step 3: Checking your admin status...' as status;
SELECT id, username, email, is_site_admin
FROM profiles
WHERE id = auth.uid();

-- If you're not an admin, uncomment and run this:
-- UPDATE profiles SET is_site_admin = true WHERE id = auth.uid();

-- Step 4: Update the handle_new_user function
SELECT 'Step 4: Updating handle_new_user function...' as status;

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
  -- Get all admin user IDs (query AFTER profile is created)
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

-- Step 5: Recreate the trigger
SELECT 'Step 5: Recreating trigger...' as status;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 6: Verify the trigger was created
SELECT 'Step 6: Verifying trigger...' as status;
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Step 7: Create a test notification
SELECT 'Step 7: Creating test notification...' as status;

DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get your admin ID
  SELECT id INTO admin_id FROM profiles WHERE is_site_admin = true LIMIT 1;

  IF admin_id IS NOT NULL THEN
    -- Create a test notification
    INSERT INTO notifications (type, title, message, data, recipient_id)
    VALUES (
      'user_registered',
      'Test: New User Registered',
      'This is a test notification to verify the system is working.',
      jsonb_build_object(
        'user_id', admin_id,
        'email', 'test@example.com',
        'created_at', NOW(),
        'test', true
      ),
      admin_id
    );
    RAISE NOTICE '✅ Test notification created successfully!';
  ELSE
    RAISE NOTICE '❌ No admin users found. Please make yourself an admin first.';
  END IF;
END $$;

-- Step 8: View your notifications
SELECT 'Step 8: Your recent notifications:' as status;
SELECT
  id,
  type,
  title,
  message,
  data->>'email' as user_email,
  read,
  created_at
FROM notifications
WHERE recipient_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

SELECT '✅ Setup complete! User registration notifications are now enabled.' as result;
