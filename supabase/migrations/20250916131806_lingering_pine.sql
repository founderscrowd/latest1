/*
  # Create site-logos storage bucket and policies

  1. Storage Setup
    - Create `site-logos` storage bucket if it doesn't exist
    - Set bucket to be public for read access
    
  2. Security Policies
    - Allow public read access to all files in site-logos bucket
    - Allow authenticated users with admin privileges to upload/delete logos
    
  3. Notes
    - This enables the site logo functionality to work properly
    - Public read access is required for logos to display on the website
*/

-- Create the site-logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-logos', 'site-logos', true)
ON CONFLICT (id) DO UPDATE SET
  public = true;

-- Create policy for public read access to site logos
CREATE POLICY "Public read access for site logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'site-logos');

-- Create policy for site admins to upload logos
CREATE POLICY "Site admins can upload logos"
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

-- Create policy for site admins to update logos
CREATE POLICY "Site admins can update logos"
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

-- Create policy for site admins to delete logos
CREATE POLICY "Site admins can delete logos"
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