/*
  # Fix username column to allow NULL during signup

  1. Changes
    - Allow NULL values for username column temporarily during user creation
    - Keep the unique constraint and case-insensitive index
    - Update check constraint to allow NULL but still validate non-null values

  2. Notes
    - This allows Supabase Auth to create users successfully
    - The application will handle requiring username completion after signup
*/

-- Allow NULL values for username column
ALTER TABLE public.profiles ALTER COLUMN username DROP NOT NULL;

-- Update the check constraint to allow NULL but still validate non-null values
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_check 
CHECK (
  username IS NULL OR 
  (length(username) >= 3 AND length(username) <= 30 AND username ~ '^[a-zA-Z0-9 ]*$'::text)
);