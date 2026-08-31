/*
  # Add image columns to groups table

  1. Table Changes
    - Add `cover_image` column to `groups` table (text, nullable)
    - Add `logo_url` column to `groups` table (text, nullable)

  2. Purpose
    - Enable groups to have cover images and logos
    - Support image upload functionality in the application
*/

-- Add cover_image column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'cover_image'
  ) THEN
    ALTER TABLE public.groups ADD COLUMN cover_image TEXT;
  END IF;
END $$;

-- Add logo_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.groups ADD COLUMN logo_url TEXT;
  END IF;
END $$;