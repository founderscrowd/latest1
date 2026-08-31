# Subscription Notifications Guide

## Overview

This system automatically notifies all site administrators when users subscribe to paid plans. Notifications appear in real-time in the admin's profile page under the "Notifications" tab.

## How It Works

### 1. Subscription Flow

1. User creates a Stripe checkout session via the app
2. User completes payment in Stripe
3. Stripe sends webhook event to your app
4. Webhook handler updates `stripe_subscriptions` table
5. **Database trigger automatically fires** when subscription status becomes 'active' or 'trialing'
6. Trigger creates notifications for all site admins
7. Admins see notification in real-time (no page refresh needed)

### 2. Database Trigger

The trigger `on_subscription_activated` monitors the `stripe_subscriptions` table:

- **Fires on**: INSERT or UPDATE of status column
- **Condition**: Only when status changes to 'active' or 'trialing'
- **Prevents duplicates**: Only fires when previous status was NOT active/trialing
- **Error handling**: Failures don't break subscription updates (logged as warnings)

### 3. Notification Details

Each notification includes:
- User email
- Subscription ID
- Price/Plan ID
- Subscription status
- Period start/end dates
- Activation timestamp

## Important: Existing Subscriptions

**The trigger only fires for NEW subscription activations or status changes that occur AFTER the trigger was installed.**

If a user (like lanka926@btinternet.com) subscribed BEFORE the trigger was added:
- No notification was automatically created
- You need to manually create a notification (see verification SQL file)

## Viewing Notifications

### For Site Administrators:

1. Log in to your admin account
2. Click your profile icon or go to Profile page
3. Click the **"Notifications" tab** (only visible to admins)
4. View all notifications with unread count badge
5. Click individual notifications to mark as read
6. Use "Mark all read" to clear all unread notifications

### Notification Types:

- **User Registration**: Blue user icon - when someone creates an account
- **Subscription Activated**: Green credit card icon - when someone subscribes

## Testing & Verification

### Step 1: Run the Verification SQL

Execute the queries in `SUBSCRIPTION_NOTIFICATION_VERIFICATION.sql` to:

1. ✅ Verify site admins exist
2. ✅ Check existing subscriptions
3. ✅ View existing notifications
4. ✅ Manually create notification for lanka926@btinternet.com (if needed)
5. ✅ Verify the trigger and function exist

### Step 2: Test with a New Subscription

To verify the system works for new subscriptions:

1. Create a test account
2. Go through the subscription flow
3. Complete payment in Stripe
4. Wait for webhook to process (usually < 30 seconds)
5. Check admin's Notifications tab - should see new notification immediately

### Step 3: Check Stripe Webhook Logs

In Stripe Dashboard > Developers > Webhooks:
- Verify webhook endpoint is active
- Check recent events show successful delivery
- Look for `checkout.session.completed` events

## Troubleshooting

### Admin Not Receiving Notifications

#### Problem 1: User is not marked as site admin
```sql
-- Check admin status
SELECT id, username, is_site_admin FROM profiles WHERE id = 'YOUR-USER-ID';

-- Make user an admin
UPDATE profiles SET is_site_admin = true WHERE id = 'YOUR-USER-ID';
```

#### Problem 2: Trigger not installed
```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_subscription_activated';

-- If missing, run the migration:
-- supabase/migrations/20250125180000_add_subscription_notifications.sql
```

#### Problem 3: Notifications table doesn't exist
```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'notifications';

-- If missing, run the migration:
-- supabase/migrations/20250125170000_create_user_registration_notifications.sql
```

#### Problem 4: Webhook not firing
- Check Stripe webhook configuration
- Verify webhook secret matches your .env
- Check Stripe webhook logs for errors
- Ensure webhook URL is correct

#### Problem 5: RLS Policies blocking access
```sql
-- Check if user can see notifications
SELECT * FROM notifications WHERE recipient_id = 'YOUR-USER-ID';

-- If blocked, check admin status
SELECT is_site_admin FROM profiles WHERE id = 'YOUR-USER-ID';
```

### Notification Not Created for Existing Subscription

If a subscription existed BEFORE the trigger was installed:

1. Run Step 4 from `SUBSCRIPTION_NOTIFICATION_VERIFICATION.sql`
2. This manually creates notifications for existing subscriptions
3. Future subscriptions will auto-notify

### Real-time Updates Not Working

If notifications don't appear without page refresh:

1. Check browser console for WebSocket errors
2. Verify Supabase Realtime is enabled in project settings
3. Check network tab for `postgres_changes` subscriptions
4. Refresh the page to reconnect

## Files Modified/Created

### Database Migrations
1. `supabase/migrations/20250125170000_create_user_registration_notifications.sql`
   - Creates notifications table
   - Sets up RLS policies
   - Creates user registration trigger

2. `supabase/migrations/20250125180000_add_subscription_notifications.sql`
   - Creates subscription notification trigger
   - Monitors stripe_subscriptions status changes
   - Auto-creates admin notifications

### Frontend Components
1. `src/lib/notificationApi.ts`
   - API functions for fetching/updating notifications
   - Real-time subscription handler

2. `src/components/NotificationsPanel.tsx`
   - UI component for displaying notifications
   - Handles both registration and subscription types
   - Real-time updates via Supabase

3. `src/components/ProfilePage.tsx`
   - Added Notifications tab (admin only)
   - Integrated NotificationsPanel component

### Documentation
1. `SUBSCRIPTION_NOTIFICATIONS_GUIDE.md` (this file)
2. `SUBSCRIPTION_NOTIFICATION_VERIFICATION.sql`
3. `USER_REGISTRATION_NOTIFICATIONS.md`

## Security

- **RLS Policies**: Only site admins can view notifications
- **SECURITY DEFINER**: Trigger runs with elevated privileges to create notifications
- **Error Isolation**: Notification failures don't break subscription updates
- **Data Privacy**: Notifications only show necessary user info

## Future Enhancements

Potential improvements:
- Email notifications in addition to in-app
- SMS notifications for critical events
- Notification preferences/settings
- Notification grouping/categories
- Push notifications
- Slack/Discord webhooks
- Notification history/archive
- Custom notification rules

## Support

If notifications still don't work after following this guide:

1. Check Supabase logs for errors
2. Verify all migrations have been applied
3. Test database trigger manually with SQL
4. Check browser console for JavaScript errors
5. Verify Supabase project is not paused

## Testing Checklist

Before marking as complete, verify:

- [ ] Admin user exists and is marked as `is_site_admin = true`
- [ ] Notifications table exists with proper RLS
- [ ] Trigger `on_subscription_activated` exists on `stripe_subscriptions`
- [ ] Function `notify_admins_of_new_subscription()` exists
- [ ] Notification created for lanka926@btinternet.com (manually or via trigger test)
- [ ] Admin can see notification in Profile > Notifications tab
- [ ] Notification shows correct user email and subscription details
- [ ] Real-time updates work (new notifications appear without refresh)
- [ ] Mark as read functionality works
- [ ] Frontend builds without errors
- [ ] Stripe webhook processes successfully
