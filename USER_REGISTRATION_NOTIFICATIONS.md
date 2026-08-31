# User Registration Notifications

This document describes the user registration notification system that alerts site administrators when new users sign up.

## Overview

When a new user registers on the platform, all site administrators are automatically notified through an in-app notification system. Admins can view these notifications in their profile page.

## How It Works

### 1. Database Setup

A new `notifications` table has been created with the following structure:
- Stores notification details (type, title, message, data)
- Tracks read/unread status
- Links to admin recipients
- Includes timestamps for creation and read status

### 2. Automatic Notification Creation

When a new user registers:
- The `handle_new_user()` database function is triggered automatically
- It creates a user profile
- It identifies all site administrators
- It creates a notification for each admin with user registration details

### 3. Viewing Notifications

Site administrators can view notifications by:
1. Logging into their account
2. Going to their Profile page
3. Clicking the "Notifications" tab (only visible to admins)

The notifications panel shows:
- Notification title and message
- User email and registration time
- Read/unread status
- Time since notification was created

### 4. Managing Notifications

Admins can:
- Mark individual notifications as read
- Mark all notifications as read at once
- View notification details including user email and registration timestamp

### 5. Real-time Updates

The notification system uses Supabase real-time subscriptions, so:
- New notifications appear instantly without page refresh
- Unread count updates automatically
- No polling required

## Technical Details

### Files Created/Modified

1. **Database Migration**: `supabase/migrations/20250125170000_create_user_registration_notifications.sql`
   - Creates notifications table with RLS policies
   - Updates handle_new_user function to create notifications

2. **API Functions**: `src/lib/notificationApi.ts`
   - Functions to fetch notifications
   - Functions to mark notifications as read
   - Real-time subscription handler

3. **UI Component**: `src/components/NotificationsPanel.tsx`
   - Displays notifications in a clean interface
   - Handles marking as read
   - Shows unread count badge

4. **Profile Integration**: `src/components/ProfilePage.tsx`
   - Added notifications tab for admins
   - Integrated NotificationsPanel component

### Security

- Only site administrators can view notifications (enforced via RLS)
- Notifications are tied to specific admin users
- Database triggers run securely with SECURITY DEFINER

## Usage Example

When a new user registers with email "newuser@example.com", all site admins will receive a notification:

**Title**: New User Registered

**Message**: A new user newuser@example.com has registered.

**Details**:
- Email: newuser@example.com
- Registration time: [timestamp]

## Future Enhancements

Possible improvements:
- Email notifications in addition to in-app notifications
- Different notification types (user deleted, subscription changes, etc.)
- Notification preferences/settings
- Push notifications for mobile devices
