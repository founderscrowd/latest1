/*
  # Fix Storage RLS Policies for Image Uploads

  1. Storage Policies
    - Add INSERT policy for group-logos bucket (authenticated users)
    - Add INSERT policy for group-covers bucket (authenticated users)
    - Add UPDATE policy for group-logos bucket (authenticated users)
    - Add UPDATE policy for group-covers bucket (authenticated users)
    - Add DELETE policy for group-logos bucket (authenticated users)
    - Add DELETE policy for group-covers bucket (authenticated users)

  2. Security
    - Policies allow authenticated users to upload, update, and delete their own files
    - File paths include group ID for organization
*/

-- Storage policies for group-logos bucket
CREATE POLICY "Authenticated users can upload group logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'group-logos');

CREATE POLICY "Authenticated users can update group logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'group-logos');

CREATE POLICY "Authenticated users can delete group logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'group-logos');

-- Storage policies for group-covers bucket
CREATE POLICY "Authenticated users can upload group covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'group-covers');

CREATE POLICY "Authenticated users can update group covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'group-covers');

CREATE POLICY "Authenticated users can delete group covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'group-covers');