/*
  # Add foreign key relationship between group_members and profiles

  1. Database Changes
    - Add foreign key constraint from group_members.user_id to profiles.id
    - This enables Supabase to understand the relationship for joins

  2. Security
    - No RLS changes needed, using existing policies
*/

-- Add foreign key constraint from group_members.user_id to profiles.id
-- This will allow Supabase to understand the relationship for joins
DO $$
BEGIN
  -- Check if the foreign key constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_members_user_id_profiles_fkey'
    AND table_name = 'group_members'
  ) THEN
    ALTER TABLE group_members 
    ADD CONSTRAINT group_members_user_id_profiles_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;