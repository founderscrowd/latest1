/*
  # Site Settings and Logo Management System

  1. New Tables
    - `site_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique) - setting names like 'logo_url', 'site_name'
      - `value` (text) - setting values
      - `description` (text) - optional descriptions
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage Bucket
    - `site-logos` bucket for storing site logo files

  3. Security
    - Enable RLS on `site_settings` table
    - Public read access to all site settings
    - Admin-only write/update/delete access (users with is_site_admin = true)
    - Admin-only access to site-logos storage bucket

  4. Initial Data
    - Insert default logo_url setting (null initially)
*/

-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on site_settings table
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for site_settings table

-- Allow public read access to all site settings
-- This allows any user (authenticated or not) to view site configuration
CREATE POLICY "Allow public read access to site settings"
  ON site_settings
  FOR SELECT
  TO public
  USING (true);

-- Allow only site admins to insert new settings
-- Checks if the authenticated user has is_site_admin = true in their profile
CREATE POLICY "Allow site admins to insert settings"
  ON site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_site_admin = true
    )
  );

-- Allow only site admins to update existing settings
-- Ensures only users with admin privileges can modify site configuration
CREATE POLICY "Allow site admins to update settings"
  ON site_settings
  FOR UPDATE
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

-- Allow only site admins to delete settings
-- Prevents accidental deletion of important site configuration
CREATE POLICY "Allow site admins to delete settings"
  ON site_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_site_admin = true
    )
  );

-- Create storage bucket for site logos
-- Note: This creates the bucket programmatically, but you may need to create it manually
-- in the Supabase Dashboard if this fails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-logos',
  'site-logos', 
  false, -- Private bucket
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for site-logos bucket

-- Allow site admins to view/download logo files
-- This policy allows admins to see uploaded logos
CREATE POLICY "Allow site admins to view logos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'site-logos' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_site_admin = true
    )
  );

-- Allow site admins to upload logo files
-- Restricts file uploads to admin users only
CREATE POLICY "Allow site admins to upload logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-logos' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_site_admin = true
    )
  );

-- Allow site admins to update/replace logo files
-- Enables admins to replace existing logo files
CREATE POLICY "Allow site admins to update logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'site-logos' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_site_admin = true
    )
  )
  WITH CHECK (
    bucket_id = 'site-logos' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_site_admin = true
    )
  );

-- Allow site admins to delete logo files
-- Enables admins to remove old logo files when uploading new ones
CREATE POLICY "Allow site admins to delete logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'site-logos' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_site_admin = true
    )
  );

-- Insert default logo_url setting
-- This creates the initial setting record that will store the logo URL
INSERT INTO site_settings (key, value, description)
VALUES (
  'logo_url',
  NULL,
  'URL of the site logo displayed in the header'
) ON CONFLICT (key) DO NOTHING;

-- Create function to check username availability (if not exists)
-- This function is referenced in the supabase.ts file
CREATE OR REPLACE FUNCTION check_username_availability(input_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if username exists (case-insensitive)
  RETURN NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE lower(username) = lower(input_username)
  );
END;
$$;