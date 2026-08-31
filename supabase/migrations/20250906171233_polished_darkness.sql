/*
  # Create group_members table

  1. New Tables
    - `group_members`
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to groups.id)
      - `user_id` (uuid, foreign key to auth.users.id)
      - `role` (text, default 'member')
      - `status` (text, default 'pending')
      - `joined_at` (timestamp with time zone, default now())
      - Unique constraint on (group_id, user_id) to prevent duplicate memberships

  2. Security
    - Enable RLS on `group_members` table
    - Add policies for authenticated users to manage their own memberships
    - Add policies for group admins to manage group memberships
*/

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member'::text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (group_id, user_id)
);

-- Add check constraints for valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'group_members_role_check'
  ) THEN
    ALTER TABLE public.group_members 
    ADD CONSTRAINT group_members_role_check 
    CHECK (role IN ('admin', 'member', 'pending'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'group_members_status_check'
  ) THEN
    ALTER TABLE public.group_members 
    ADD CONSTRAINT group_members_status_check 
    CHECK (status IN ('approved', 'pending', 'rejected'));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Policy for users to view memberships of groups they're part of
CREATE POLICY "Users can view group memberships they're part of"
  ON public.group_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

-- Policy for users to insert their own membership requests
CREATE POLICY "Users can request to join groups"
  ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy for users to update their own membership status (leave group)
CREATE POLICY "Users can leave groups"
  ON public.group_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policy for group admins to manage memberships
CREATE POLICY "Group admins can manage memberships"
  ON public.group_members
  FOR ALL
  TO authenticated
  USING (
    group_id IN (
      SELECT g.id FROM public.groups g 
      WHERE g.creator_id = auth.uid()
    ) OR
    group_id IN (
      SELECT gm.group_id FROM public.group_members gm 
      WHERE gm.user_id = auth.uid() AND gm.role = 'admin' AND gm.status = 'approved'
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT g.id FROM public.groups g 
      WHERE g.creator_id = auth.uid()
    ) OR
    group_id IN (
      SELECT gm.group_id FROM public.group_members gm 
      WHERE gm.user_id = auth.uid() AND gm.role = 'admin' AND gm.status = 'approved'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON public.group_members(status);