/*
  # Create Forum Tables for Group Discussions

  1. New Tables
    - `forum_topics`
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to groups)
      - `title` (text, topic title)
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamp)
      - `last_post_at` (timestamp, for sorting)
      - `is_locked` (boolean, prevents new posts)
      - `is_pinned` (boolean, shows at top)
      - `views_count` (integer, tracks popularity)
    
    - `forum_posts`
      - `id` (uuid, primary key)
      - `topic_id` (uuid, foreign key to forum_topics)
      - `posted_by` (uuid, foreign key to profiles)
      - `content` (text, post content)
      - `created_at` (timestamp)
      - `edited_at` (timestamp, nullable)

  2. Security
    - Enable RLS on both tables
    - Add policies for group members to read/write
    - Add policies for admins to manage topics/posts

  3. Performance
    - Add indexes for common queries
    - Add foreign key constraints for data integrity

  4. Functions
    - Add RPC function to increment topic views safely
*/

-- Create forum_topics table
CREATE TABLE IF NOT EXISTS forum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 200),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  last_post_at timestamptz DEFAULT now() NOT NULL,
  is_locked boolean DEFAULT false NOT NULL,
  is_pinned boolean DEFAULT false NOT NULL,
  views_count integer DEFAULT 0 NOT NULL CHECK (views_count >= 0)
);

-- Create forum_posts table
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  posted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(trim(content)) > 0 AND length(content) <= 10000),
  created_at timestamptz DEFAULT now() NOT NULL,
  edited_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_topics_group_id ON forum_topics(group_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_created_by ON forum_topics(created_by);
CREATE INDEX IF NOT EXISTS idx_forum_topics_last_post_at ON forum_topics(last_post_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_pinned_last_post ON forum_topics(group_id, is_pinned DESC, last_post_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_posts_topic_id ON forum_posts(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_posted_by ON forum_posts(posted_by);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(topic_id, created_at ASC);

-- Enable Row Level Security
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forum_topics

-- Allow group members to view topics
CREATE POLICY "Group members can view topics"
  ON forum_topics
  FOR SELECT
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

-- Allow group members to create topics
CREATE POLICY "Group members can create topics"
  ON forum_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND group_id IN (
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

-- Allow topic creators and group admins to update topics
CREATE POLICY "Topic creators and group admins can update topics"
  ON forum_topics
  FOR UPDATE
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

-- Allow topic creators and group admins to delete topics
CREATE POLICY "Topic creators and group admins can delete topics"
  ON forum_topics
  FOR DELETE
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

-- RLS Policies for forum_posts

-- Allow group members to view posts
CREATE POLICY "Group members can view posts"
  ON forum_posts
  FOR SELECT
  TO authenticated
  USING (
    topic_id IN (
      SELECT ft.id 
      FROM forum_topics ft
      WHERE ft.group_id IN (
        SELECT gm.group_id 
        FROM group_members gm 
        WHERE gm.user_id = auth.uid() 
        AND gm.status = 'approved'
      )
      OR ft.group_id IN (
        SELECT g.id 
        FROM groups g 
        WHERE g.creator_id = auth.uid()
      )
    )
  );

-- Allow group members to create posts (if topic is not locked)
CREATE POLICY "Group members can create posts"
  ON forum_posts
  FOR INSERT
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
        OR ft.group_id IN (
          SELECT g.id 
          FROM groups g 
          WHERE g.creator_id = auth.uid()
        )
      )
    )
  );

-- Allow post creators and group admins to update posts
CREATE POLICY "Post creators and group admins can update posts"
  ON forum_posts
  FOR UPDATE
  TO authenticated
  USING (
    posted_by = auth.uid()
    OR 
    topic_id IN (
      SELECT ft.id 
      FROM forum_topics ft
      WHERE ft.group_id IN (
        SELECT gm.group_id 
        FROM group_members gm 
        WHERE gm.user_id = auth.uid() 
        AND gm.role IN ('admin', 'starter') 
        AND gm.status = 'approved'
      )
      OR ft.group_id IN (
        SELECT g.id 
        FROM groups g 
        WHERE g.creator_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    posted_by = auth.uid()
    OR 
    topic_id IN (
      SELECT ft.id 
      FROM forum_topics ft
      WHERE ft.group_id IN (
        SELECT gm.group_id 
        FROM group_members gm 
        WHERE gm.user_id = auth.uid() 
        AND gm.role IN ('admin', 'starter') 
        AND gm.status = 'approved'
      )
      OR ft.group_id IN (
        SELECT g.id 
        FROM groups g 
        WHERE g.creator_id = auth.uid()
      )
    )
  );

-- Allow post creators and group admins to delete posts
CREATE POLICY "Post creators and group admins can delete posts"
  ON forum_posts
  FOR DELETE
  TO authenticated
  USING (
    posted_by = auth.uid()
    OR 
    topic_id IN (
      SELECT ft.id 
      FROM forum_topics ft
      WHERE ft.group_id IN (
        SELECT gm.group_id 
        FROM group_members gm 
        WHERE gm.user_id = auth.uid() 
        AND gm.role IN ('admin', 'starter') 
        AND gm.status = 'approved'
      )
      OR ft.group_id IN (
        SELECT g.id 
        FROM groups g 
        WHERE g.creator_id = auth.uid()
      )
    )
  );

-- Create RPC function to safely increment topic views
CREATE OR REPLACE FUNCTION public.increment_forum_topic_views(topic_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.forum_topics
  SET views_count = views_count + 1
  WHERE id = topic_id_param;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.increment_forum_topic_views(uuid) TO authenticated;

-- Create trigger to update last_post_at when new posts are added
CREATE OR REPLACE FUNCTION update_topic_last_post_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE forum_topics 
  SET last_post_at = NEW.created_at 
  WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_topic_last_post_at
  AFTER INSERT ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_topic_last_post_at();