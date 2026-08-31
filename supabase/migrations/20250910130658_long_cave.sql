/*
  # Forum System Database Migration

  This migration creates a complete forum system for group discussions.

  ## What this creates:
  1. New Tables
     - `forum_topics` - Discussion topics within groups
     - `forum_posts` - Individual posts within topics
  
  2. Security
     - Row Level Security (RLS) enabled on all tables
     - Policies ensuring only group members can access discussions
     - Role-based permissions for admins and starters
  
  3. Performance
     - Optimized indexes for fast queries
     - Composite indexes for sorting and filtering
     - Foreign key constraints for data integrity
  
  4. Functions & Triggers
     - View counting function with safety checks
     - Automatic last_post_at updates via triggers
*/

-- Create forum_topics table if it doesn't exist
CREATE TABLE IF NOT EXISTS forum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_post_at timestamptz NOT NULL DEFAULT now(),
  is_locked boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  views_count integer NOT NULL DEFAULT 0,
  
  -- Constraints
  CONSTRAINT forum_topics_title_check CHECK (length(trim(title)) > 0 AND length(title) <= 200),
  CONSTRAINT forum_topics_views_count_check CHECK (views_count >= 0)
);

-- Create forum_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  posted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  
  -- Constraints
  CONSTRAINT forum_posts_content_check CHECK (length(trim(content)) > 0 AND length(content) <= 10000)
);

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_forum_topics_group_id ON forum_topics(group_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_created_by ON forum_topics(created_by);
CREATE INDEX IF NOT EXISTS idx_forum_topics_last_post_at ON forum_topics(last_post_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_pinned_last_post ON forum_topics(group_id, is_pinned DESC, last_post_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_posts_topic_id ON forum_posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_posted_by ON forum_posts(posted_by);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(topic_id, created_at);

-- Enable Row Level Security
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
-- Forum Topics Policies
DROP POLICY IF EXISTS "Group members can view topics" ON forum_topics;
DROP POLICY IF EXISTS "Group members can create topics" ON forum_topics;
DROP POLICY IF EXISTS "Topic creators and group admins can update topics" ON forum_topics;
DROP POLICY IF EXISTS "Topic creators and group admins can delete topics" ON forum_topics;

CREATE POLICY "Group members can view topics"
  ON forum_topics FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT gm.group_id 
      FROM group_members gm 
      WHERE gm.user_id = auth.uid() 
      AND gm.status = 'approved'
    )
    OR 
    group_id IN (
      SELECT g.id 
      FROM groups g 
      WHERE g.creator_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create topics"
  ON forum_topics FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() 
    AND (
      group_id IN (
        SELECT gm.group_id 
        FROM group_members gm 
        WHERE gm.user_id = auth.uid() 
        AND gm.status = 'approved'
      )
      OR 
      group_id IN (
        SELECT g.id 
        FROM groups g 
        WHERE g.creator_id = auth.uid()
      )
    )
  );

CREATE POLICY "Topic creators and group admins can update topics"
  ON forum_topics FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR 
    group_id IN (
      SELECT gm.group_id 
      FROM group_members gm 
      WHERE gm.user_id = auth.uid() 
      AND gm.role IN ('admin', 'starter') 
      AND gm.status = 'approved'
    )
    OR 
    group_id IN (
      SELECT g.id 
      FROM groups g 
      WHERE g.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR 
    group_id IN (
      SELECT gm.group_id 
      FROM group_members gm 
      WHERE gm.user_id = auth.uid() 
      AND gm.role IN ('admin', 'starter') 
      AND gm.status = 'approved'
    )
    OR 
    group_id IN (
      SELECT g.id 
      FROM groups g 
      WHERE g.creator_id = auth.uid()
    )
  );

CREATE POLICY "Topic creators and group admins can delete topics"
  ON forum_topics FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR 
    group_id IN (
      SELECT gm.group_id 
      FROM group_members gm 
      WHERE gm.user_id = auth.uid() 
      AND gm.role IN ('admin', 'starter') 
      AND gm.status = 'approved'
    )
    OR 
    group_id IN (
      SELECT g.id 
      FROM groups g 
      WHERE g.creator_id = auth.uid()
    )
  );

-- Forum Posts Policies
DROP POLICY IF EXISTS "Group members can view posts" ON forum_posts;
DROP POLICY IF EXISTS "Group members can create posts" ON forum_posts;
DROP POLICY IF EXISTS "Post creators and group admins can update posts" ON forum_posts;
DROP POLICY IF EXISTS "Post creators and group admins can delete posts" ON forum_posts;

CREATE POLICY "Group members can view posts"
  ON forum_posts FOR SELECT
  TO authenticated
  USING (
    topic_id IN (
      SELECT ft.id 
      FROM forum_topics ft 
      WHERE (
        ft.group_id IN (
          SELECT gm.group_id 
          FROM group_members gm 
          WHERE gm.user_id = auth.uid() 
          AND gm.status = 'approved'
        )
        OR 
        ft.group_id IN (
          SELECT g.id 
          FROM groups g 
          WHERE g.creator_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Group members can create posts"
  ON forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    posted_by = auth.uid() 
    AND topic_id IN (
      SELECT ft.id 
      FROM forum_topics ft 
      WHERE ft.is_locked = false 
      AND (
        ft.group_id IN (
          SELECT gm.group_id 
          FROM group_members gm 
          WHERE gm.user_id = auth.uid() 
          AND gm.status = 'approved'
        )
        OR 
        ft.group_id IN (
          SELECT g.id 
          FROM groups g 
          WHERE g.creator_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Post creators and group admins can update posts"
  ON forum_posts FOR UPDATE
  TO authenticated
  USING (
    posted_by = auth.uid()
    OR 
    topic_id IN (
      SELECT ft.id 
      FROM forum_topics ft 
      WHERE (
        ft.group_id IN (
          SELECT gm.group_id 
          FROM group_members gm 
          WHERE gm.user_id = auth.uid() 
          AND gm.role IN ('admin', 'starter') 
          AND gm.status = 'approved'
        )
        OR 
        ft.group_id IN (
          SELECT g.id 
          FROM groups g 
          WHERE g.creator_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    posted_by = auth.uid()
    OR 
    topic_id IN (
      SELECT ft.id 
      FROM forum_topics ft 
      WHERE (
        ft.group_id IN (
          SELECT gm.group_id 
          FROM group_members gm 
          WHERE gm.user_id = auth.uid() 
          AND gm.role IN ('admin', 'starter') 
          AND gm.status = 'approved'
        )
        OR 
        ft.group_id IN (
          SELECT g.id 
          FROM groups g 
          WHERE g.creator_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Post creators and group admins can delete posts"
  ON forum_posts FOR DELETE
  TO authenticated
  USING (
    posted_by = auth.uid()
    OR 
    topic_id IN (
      SELECT ft.id 
      FROM forum_topics ft 
      WHERE (
        ft.group_id IN (
          SELECT gm.group_id 
          FROM group_members gm 
          WHERE gm.user_id = auth.uid() 
          AND gm.role IN ('admin', 'starter') 
          AND gm.status = 'approved'
        )
        OR 
        ft.group_id IN (
          SELECT g.id 
          FROM groups g 
          WHERE g.creator_id = auth.uid()
        )
      )
    )
  );

-- Create or replace the increment views function
CREATE OR REPLACE FUNCTION increment_forum_topic_views(topic_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE forum_topics 
  SET views_count = views_count + 1 
  WHERE id = topic_id_param;
END;
$$;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_topic_last_post_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE forum_topics 
  SET last_post_at = NEW.created_at 
  WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS trigger_update_topic_last_post_at ON forum_posts;
CREATE TRIGGER trigger_update_topic_last_post_at
  AFTER INSERT ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_topic_last_post_at();