-- FIX: Enable Admin Notifications for User Registration
-- Run this in Supabase SQL Editor if you're not receiving user registration notifications

-- 1. First, check if you are a site admin
SELECT id, email, username, is_site_admin
FROM profiles
WHERE id = auth.uid();

-- 2. If is_site_admin is FALSE, run the following to make yourself an admin:
UPDATE profiles
SET is_site_admin = true
WHERE id = auth.uid();

-- 3. Verify the update worked
SELECT id, email, username, is_site_admin
FROM profiles
WHERE id = auth.uid();

-- 4. Check if any admins exist now
SELECT COUNT(*) as admin_count
FROM profiles
WHERE is_site_admin = true;

-- 5. If no admins exist, make the first user an admin
DO $$
DECLARE
  admin_count INTEGER;
  first_user_id UUID;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM profiles WHERE is_site_admin = true;

  IF admin_count = 0 THEN
    SELECT id INTO first_user_id
    FROM profiles
    ORDER BY created_at ASC
    LIMIT 1;

    IF first_user_id IS NOT NULL THEN
      UPDATE profiles SET is_site_admin = true WHERE id = first_user_id;
      RAISE NOTICE 'Made user % a site admin', first_user_id;
    END IF;
  END IF;
END $$;

-- 6. Test: Create a manual test notification (optional)
-- This verifies the system can create notifications
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE is_site_admin = true LIMIT 1;

  IF admin_id IS NOT NULL THEN
    INSERT INTO notifications (type, title, message, data, recipient_id)
    VALUES (
      'user_registered',
      'Test Notification',
      'This is a test notification to verify the system is working.',
      jsonb_build_object('test', true),
      admin_id
    );
    RAISE NOTICE 'Created test notification for admin %', admin_id;
  ELSE
    RAISE WARNING 'No admin found - notifications will not be created';
  END IF;
END $$;

-- 7. Verify notification was created
SELECT COUNT(*) as notification_count, type
FROM notifications
GROUP BY type
ORDER BY COUNT(*) DESC;

-- 8. View recent notifications
SELECT id, type, title, message, read, recipient_id, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
