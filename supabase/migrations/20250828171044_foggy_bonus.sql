/*
  # Create groups table

  1. New Tables
    - `groups`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text, required)
      - `tags` (text array)
      - `equity_available` (integer, default 0)
      - `funding_needed` (text, required)
      - `industry` (text, required)
      - `max_members` (integer, default 5)
      - `stage` (text, required)
      - `created_at` (timestamp with timezone, default now())
      - `creator_id` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on `groups` table
    - Add policy for authenticated users to read all groups
    - Add policy for authenticated users to create groups
    - Add policy for creators to update/delete their own groups
*/

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  tags text[] DEFAULT '{}',
  equity_available integer DEFAULT 0,
  funding_needed text NOT NULL,
  industry text NOT NULL,
  max_members integer DEFAULT 5,
  stage text NOT NULL,
  created_at timestamptz DEFAULT now(),
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all groups
CREATE POLICY "Groups are viewable by authenticated users"
  ON groups
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create groups
CREATE POLICY "Users can create groups"
  ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

-- Allow creators to update their own groups
CREATE POLICY "Users can update own groups"
  ON groups
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Allow creators to delete their own groups
CREATE POLICY "Users can delete own groups"
  ON groups
  FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);