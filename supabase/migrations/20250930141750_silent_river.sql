/*
  # Fix user presence RLS policies

  1. Security
    - Add missing INSERT and UPDATE policies for user_presence table
    - Allow authenticated users to manage their own presence records
    - Ensure users can only modify their own presence data

  This migration fixes the RLS policy violation error when users try to update their presence status.
*/

-- Add INSERT policy for user_presence table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_presence' 
    AND policyname = 'Users can insert their own presence'
  ) THEN
    CREATE POLICY "Users can insert their own presence"
      ON user_presence
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add UPDATE policy for user_presence table  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_presence' 
    AND policyname = 'Users can update their own presence'
  ) THEN
    CREATE POLICY "Users can update their own presence"
      ON user_presence
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;