/*
  # Fix user presence RLS policies

  1. Security Updates
    - Add INSERT policy for authenticated users to create their own presence records
    - Add UPDATE policy for authenticated users to update their own presence records
    - Ensure users can only manage their own presence data

  This fixes the "new row violates row-level security policy" error when users try to update their online/offline status.
*/

-- Add INSERT policy for user presence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_presence' 
    AND policyname = 'Users can insert their own presence'
  ) THEN
    CREATE POLICY "Users can insert their own presence"
      ON user_presence
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Add UPDATE policy for user presence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_presence' 
    AND policyname = 'Users can update their own presence'
  ) THEN
    CREATE POLICY "Users can update their own presence"
      ON user_presence
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;