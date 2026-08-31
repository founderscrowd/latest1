/*
  # Add foreign key constraint for groups creator_id

  1. Changes
    - Add foreign key constraint linking groups.creator_id to profiles.id
    - This enables Supabase to understand the relationship for joins

  2. Security
    - No changes to RLS policies needed
    - Maintains existing data integrity
*/

-- Add foreign key constraint to link groups.creator_id to profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'groups_creator_id_fkey' 
    AND table_name = 'groups'
  ) THEN
    ALTER TABLE public.groups 
    ADD CONSTRAINT groups_creator_id_fkey 
    FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;