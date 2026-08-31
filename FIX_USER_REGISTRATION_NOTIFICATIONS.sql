-- ============================================================================
-- FIX: Restore User Registration Notifications for Admins
-- ============================================================================
-- Run this script in your Supabase SQL Editor to enable admin notifications
-- when new users register.
-- ============================================================================

-- Step 1: Verify the notifications table exists
SELECT 'Checking if notifications table exists...' as step;
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name = 'notifications' AND table_schema = 'public';

-- Step 2: Verify you are a site admin
SELECT 'Checking your admin status...' as step;
SELECT id, username, email, is_site_admin
FROM profiles
WHERE id = auth.uid();

-- If you're not an admin, uncomment and run this:
-- UPDATE profiles SET is_site_admin = true WHERE id = auth.uid();

-- Step 3: Update the handle_new_user function to include notification creation
SELECT 'Updating handle_new_user function...' as step;

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

-- Step 4: Ensure the trigger exists and is active
SELECT 'Recreating trigger...' as step;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 5: Verify the trigger was created
SELECT 'Verifying trigger creation...' as step;
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Step 6: Test notification creation (optional)
SELECT 'Creating test notification...' as step;
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
    RAISE NOTICE 'Test notification created successfully!';
  ELSE
    RAISE NOTICE 'No admin users found. Please make yourself an admin first.';
  END IF;
END $$;

-- Step 7: View your notifications
SELECT 'Your recent notifications:' as step;
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

-- ============================================================================
-- VERIFICATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Check the "Test: New User Registered" notification appears above
-- 2. Go to your Profile > Notifications tab in the app
-- 3. You should see the test notification
-- 4. Try registering a new test user - you should receive a notification
-- ============================================================================

SELECT '✅ Setup complete! User registration notifications are now enabled.' as result;
