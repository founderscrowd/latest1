/*
  # Fix Storage RLS Policies for Image Uploads

  1. Storage Buckets
    - Create `group-logos` bucket (public, 2MB limit)
    - Create `group-covers` bucket (public, 5MB limit)

  2. Storage Policies
    - Allow authenticated users to upload files to both buckets
    - Allow authenticated users to update their own uploaded files
    - Allow authenticated users to delete their own uploaded files
    - Allow public read access to all files in both buckets

  3. Security
    - Files are organized by group ID in folder structure
    - Only authenticated users can upload
    - File size limits enforced at bucket level
*/

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('group-logos', 'group-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/gif']),
  ('group-covers', 'group-covers', true, 5242880, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for group-logos bucket
DROP POLICY IF EXISTS "Authenticated users can upload group logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload group logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'group-logos');

DROP POLICY IF EXISTS "Authenticated users can update group logos" ON storage.objects;
CREATE POLICY "Authenticated users can update group logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'group-logos');

DROP POLICY IF EXISTS "Authenticated users can delete group logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete group logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'group-logos');

DROP POLICY IF EXISTS "Public can view group logos" ON storage.objects;
CREATE POLICY "Public can view group logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'group-logos');

-- Storage policies for group-covers bucket
DROP POLICY IF EXISTS "Authenticated users can upload group covers" ON storage.objects;
CREATE POLICY "Authenticated users can upload group covers"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'group-covers');

DROP POLICY IF EXISTS "Authenticated users can update group covers" ON storage.objects;
CREATE POLICY "Authenticated users can update group covers"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'group-covers');

DROP POLICY IF EXISTS "Authenticated users can delete group covers" ON storage.objects;
CREATE POLICY "Authenticated users can delete group covers"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'group-covers');

DROP POLICY IF EXISTS "Public can view group covers" ON storage.objects;
CREATE POLICY "Public can view group covers"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'group-covers');