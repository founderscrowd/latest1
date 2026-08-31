/*
  # Add Subscription Notifications for Admins

  1. Changes
    - Create trigger function to notify admins when users subscribe
    - Trigger fires when subscription status becomes 'active' or 'trialing'
    - Notifications include user email, subscription details, and timestamp

  2. Notifications
    - Only created for NEW activations (not updates)
    - All site admins receive notifications
    - Includes subscription price_id and period information

  3. Security
    - Function runs with SECURITY DEFINER to access all tables
    - Uses existing notifications RLS policies
*/

-- Function to create admin notifications when a user subscribes
CREATE OR REPLACE FUNCTION notify_admins_of_new_subscription()
RETURNS TRIGGER AS $$
DECLARE
  admin_users uuid[];
  user_email text;
  user_id_var uuid;
  subscription_status_text text;
BEGIN
  -- Only proceed if status is now active or trialing
  IF NEW.status NOT IN ('active', 'trialing') THEN
    RETURN NEW;
  END IF;

  -- Check if this is a NEW activation (not just an update)
  -- On INSERT: OLD is NULL, so this is definitely new
  -- On UPDATE: Check if previous status was not active/trialing
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('active', 'trialing') THEN
      -- Already was active, don't send notification
      RETURN NEW;
    END IF;
  END IF;

  -- Get the user's email and ID from stripe_customers
  SELECT sc.user_id, COALESCE(au.email, 'Unknown') INTO user_id_var, user_email
  FROM stripe_customers sc
  LEFT JOIN auth.users au ON sc.user_id = au.id
  WHERE sc.customer_id = NEW.customer_id
  LIMIT 1;

  -- If no user found, log and return
  IF user_id_var IS NULL THEN
    RAISE WARNING 'No user found for customer_id: %', NEW.customer_id;
    RETURN NEW;
  END IF;

  -- Get all admin user IDs
  SELECT ARRAY_AGG(id) INTO admin_users
  FROM profiles
  WHERE is_site_admin = true;

  -- Only proceed if we have admins to notify
  IF admin_users IS NULL OR array_length(admin_users, 1) IS NULL OR array_length(admin_users, 1) = 0 THEN
    RAISE WARNING 'No site admins found to notify about subscription for user: %', user_email;
    RETURN NEW;
  END IF;

  -- Convert status enum to text for notification
  subscription_status_text := NEW.status::text;

  -- Create notification for each admin
  INSERT INTO notifications (type, title, message, data, recipient_id)
  SELECT
    'subscription_activated',
    'New Subscription',
    'User ' || user_email || ' has subscribed to a paid plan.',
    jsonb_build_object(
      'user_id', user_id_var,
      'user_email', user_email,
      'customer_id', NEW.customer_id,
      'subscription_id', NEW.subscription_id,
      'price_id', NEW.price_id,
      'status', subscription_status_text,
      'current_period_start', NEW.current_period_start,
      'current_period_end', NEW.current_period_end,
      'activated_at', NOW()
    ),
    unnest(admin_users);

  RAISE NOTICE 'Created subscription notifications for % admins about user: %', array_length(admin_users, 1), user_email;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the subscription update
    RAISE WARNING 'Error creating subscription notification: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on stripe_subscriptions for inserts and updates
DROP TRIGGER IF EXISTS on_subscription_activated ON stripe_subscriptions;
CREATE TRIGGER on_subscription_activated
  AFTER INSERT OR UPDATE OF status ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_of_new_subscription();

-- Add comment for documentation
COMMENT ON FUNCTION notify_admins_of_new_subscription() IS 
'Creates notifications for all site admins when a user activates a subscription (status becomes active or trialing)';
