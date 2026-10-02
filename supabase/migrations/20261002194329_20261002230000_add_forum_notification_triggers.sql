/*
# Forum Notification Triggers

## Purpose
When a user creates a new forum topic or replies to an existing one, all other
group members should receive a notification so they know there's activity.

## Changes
1. Function `notify_group_members_new_topic()` + trigger on `forum_topics` INSERT
   - Notifies all approved group members (excluding the creator)
   - Notification type: 'forum_topic'
   
2. Function `notify_group_members_new_post()` + trigger on `forum_posts` INSERT
   - Notifies all approved group members (excluding the poster)
   - Notification type: 'forum_reply'
   - Includes topic title and group name in the notification

## Notification Format (new topic)
- type: 'forum_topic'
- title: 'New Discussion: {topic_title}'
- message: '{creator_username} started a new discussion in {group_name}'
- data: { "topic_id": "...", "group_id": "...", "group_name": "...", "topic_title": "...", "creator_username": "..." }

## Notification Format (new reply)
- type: 'forum_reply'
- title: 'New Reply: {topic_title}'
- message: '{poster_username} replied in {topic_title}'
- data: { "topic_id": "...", "post_id": "...", "group_id": "...", "group_name": "...", "topic_title": "...", "poster_username": "..." }

## Security
- Both functions are SECURITY DEFINER so they can insert into notifications
- Only notifies approved group members
*/

-- ============ NEW TOPIC TRIGGER ============

CREATE OR REPLACE FUNCTION public.notify_group_members_new_topic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_username text;
  group_name text;
  group_slug text;
BEGIN
  -- Get creator username
  SELECT username INTO creator_username
  FROM profiles
  WHERE id = NEW.created_by;

  IF creator_username IS NULL THEN
    creator_username := 'Someone';
  END IF;

  -- Get group info
  SELECT name, slug INTO group_name, group_slug
  FROM groups
  WHERE id = NEW.group_id;

  -- Insert notifications for all approved group members (excluding creator)
  INSERT INTO notifications (user_id, recipient_id, type, title, message, data, "read", related_entity_id)
  SELECT
    gm.user_id,
    gm.user_id,
    'forum_topic',
    'New Discussion: ' || NEW.title,
    creator_username || ' started a new discussion in ' || COALESCE(group_name, 'your group'),
    jsonb_build_object(
      'topic_id', NEW.id,
      'group_id', NEW.group_id,
      'group_name', group_name,
      'group_slug', group_slug,
      'topic_title', NEW.title,
      'creator_username', creator_username
    ),
    false,
    NEW.id
  FROM group_members gm
  WHERE gm.group_id = NEW.group_id
    AND gm.user_id != NEW.created_by
    AND gm.status = 'approved';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_forum_topic_insert_notify_members ON forum_topics;
CREATE TRIGGER on_forum_topic_insert_notify_members
AFTER INSERT ON forum_topics
FOR EACH ROW
EXECUTE FUNCTION public.notify_group_members_new_topic();

-- ============ NEW POST (REPLY) TRIGGER ============

CREATE OR REPLACE FUNCTION public.notify_group_members_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  poster_username text;
  topic_title text;
  topic_group_id uuid;
  group_name text;
  group_slug text;
BEGIN
  -- Get poster username
  SELECT username INTO poster_username
  FROM profiles
  WHERE id = NEW.posted_by;

  IF poster_username IS NULL THEN
    poster_username := 'Someone';
  END IF;

  -- Get topic info (title and group_id)
  SELECT title, group_id INTO topic_title, topic_group_id
  FROM forum_topics
  WHERE id = NEW.topic_id;

  -- Get group info
  SELECT name, slug INTO group_name, group_slug
  FROM groups
  WHERE id = topic_group_id;

  -- Insert notifications for all approved group members (excluding poster)
  INSERT INTO notifications (user_id, recipient_id, type, title, message, data, "read", related_entity_id)
  SELECT
    gm.user_id,
    gm.user_id,
    'forum_reply',
    'New Reply: ' || COALESCE(topic_title, 'Discussion'),
    poster_username || ' replied in ' || COALESCE(topic_title, 'a discussion'),
    jsonb_build_object(
      'topic_id', NEW.topic_id,
      'post_id', NEW.id,
      'group_id', topic_group_id,
      'group_name', group_name,
      'group_slug', group_slug,
      'topic_title', topic_title,
      'poster_username', poster_username
    ),
    false,
    NEW.id
  FROM group_members gm
  WHERE gm.group_id = topic_group_id
    AND gm.user_id != NEW.posted_by
    AND gm.status = 'approved';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_forum_post_insert_notify_members ON forum_posts;
CREATE TRIGGER on_forum_post_insert_notify_members
AFTER INSERT ON forum_posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_group_members_new_post();
