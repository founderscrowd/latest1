/*
# Create Suggestions & Feedback table

1. New Tables
- `feedback`
  - `id` (uuid, primary key, default gen_random_uuid())
  - `user_id` (uuid, nullable, references auth.users — set when a logged-in user submits)
  - `email` (text, nullable — optional contact email for anonymous submitters)
  - `feedback_type` (text, not null — one of: suggestion, problem, experience, feature, confusing, other)
  - `message` (text, not null — the feedback content)
  - `page_url` (text, nullable — URL where feedback was submitted)
  - `status` (text, not null, default 'new' — one of: new, reviewing, implemented, dismissed)
  - `admin_notes` (text, nullable — private notes for administrators)
  - `created_at` (timestamptz, default now())

2. Security — Row Level Security
- Enable RLS on `feedback`.
- INSERT: anyone (anon + authenticated) can submit feedback — visitors don't need accounts.
- SELECT: only site administrators (profiles.is_site_admin = true) can read feedback.
- UPDATE: only site administrators can change status and add admin notes.
- DELETE: only site administrators can delete feedback.

3. Notification trigger
- After INSERT on feedback, create an in-app notification for the site admin so they are alerted to new feedback.
*/

CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  feedback_type text NOT NULL CHECK (feedback_type IN ('suggestion','problem','experience','feature','confusing','other')),
  message text NOT NULL,
  page_url text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','implemented','dismissed')),
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "anon_insert_feedback" ON feedback;
DROP POLICY IF EXISTS "admin_select_feedback" ON feedback;
DROP POLICY IF EXISTS "admin_update_feedback" ON feedback;
DROP POLICY IF EXISTS "admin_delete_feedback" ON feedback;

-- Anyone can submit feedback (visitors and logged-in users)
CREATE POLICY "anon_insert_feedback"
ON feedback FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only site admins can read feedback
CREATE POLICY "admin_select_feedback"
ON feedback FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_site_admin = true
  )
);

-- Only site admins can update feedback (status, admin notes)
CREATE POLICY "admin_update_feedback"
ON feedback FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_site_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_site_admin = true
  )
);

-- Only site admins can delete feedback
CREATE POLICY "admin_delete_feedback"
ON feedback FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_site_admin = true
  )
);

-- Create index for admin queries (sort by created_at, filter by status/type)
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback (status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback (feedback_type);

-- Trigger: notify admin when new feedback is submitted
CREATE OR REPLACE FUNCTION notify_admin_on_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
BEGIN
  -- Find the first site admin
  SELECT id INTO admin_id FROM profiles WHERE is_site_admin = true LIMIT 1;
  
  IF admin_id IS NOT NULL THEN
    INSERT INTO notifications (type, title, message, recipient_id, read, data)
    VALUES (
      'feedback',
      'New Feedback Received',
      LEFT(NEW.message, 100),
      admin_id,
      false,
      jsonb_build_object('feedback_id', NEW.id, 'feedback_type', NEW.feedback_type)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_feedback_inserted ON feedback;
CREATE TRIGGER on_feedback_inserted
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_feedback();