-- First, drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow site admins to view logos" ON storage.objects;

-- Create a new policy that allows public read access to site logos
CREATE POLICY "Public read access to site logos"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'site-logos');

-- Also create a policy for authenticated users (covers both anon and authenticated)
CREATE POLICY "Authenticated read access to site logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'site-logos');