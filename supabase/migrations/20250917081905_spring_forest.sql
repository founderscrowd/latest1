/*
  # Create forum attachments table

  1. New Tables
    - `forum_attachments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to forum_posts)
      - `file_name` (text)
      - `file_size` (bigint)
      - `file_type` (text)
      - `file_url` (text)
      - `thumbnail_url` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `forum_attachments` table
    - Add policies for forum participants to view attachments
    - Add policies for post authors to upload attachments

  3. Storage
    - Create forum-attachments bucket with proper policies
*/

-- Create forum_attachments table
CREATE TABLE IF NOT EXISTS forum_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE forum_attachments ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_attachments_post_id ON forum_attachments(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_attachments_created_at ON forum_attachments(created_at DESC);

-- RLS Policies for forum_attachments
CREATE POLICY "Forum participants can view attachments"
  ON forum_attachments
  FOR SELECT
  TO authenticated
  USING (
    post_id IN (
      SELECT fp.id
      FROM forum_posts fp
      JOIN forum_topics ft ON ft.id = fp.topic_id
      WHERE (
        -- Group members can view
        ft.group_id IN (
          SELECT gm.group_id
          FROM group_members gm
          WHERE gm.user_id = auth.uid() AND gm.status = 'approved'
        )
        OR
        -- Group creators can view
        ft.group_id IN (
          SELECT g.id
          FROM groups g
          WHERE g.creator_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Post authors can upload attachments"
  ON forum_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    post_id IN (
      SELECT fp.id
      FROM forum_posts fp
      WHERE fp.posted_by = auth.uid()
    )
  );

-- Create storage bucket for forum attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('forum-attachments', 'forum-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for forum-attachments bucket
CREATE POLICY "Forum participants can view attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'forum-attachments'
    AND name ~ '^[^/]+/[^/]+/[^/]+\.[^/]+$' -- Ensure proper path format
  );

CREATE POLICY "Authenticated users can upload forum attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'forum-attachments'
    AND (storage.foldername(name))[1] IS NOT NULL -- Ensure file is in a folder
    AND (storage.foldername(name))[2] = auth.uid()::text -- User can only upload to their own folder
  );

CREATE POLICY "Users can delete their own forum attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'forum-attachments'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );