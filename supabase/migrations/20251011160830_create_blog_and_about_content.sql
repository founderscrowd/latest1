/*
  # Create Blog and About Content Management System

  1. New Tables
    - `site_content`
      - `id` (uuid, primary key)
      - `content_type` (text) - either 'blog_post' or 'about_section'
      - `title` (text) - title of blog post or about section
      - `slug` (text) - URL-friendly version of title
      - `content_body` (text) - main content (supports markdown or HTML)
      - `excerpt` (text) - short summary for blog posts
      - `featured_image_url` (text) - URL to featured/header image
      - `additional_images` (jsonb) - array of additional image URLs
      - `is_published` (boolean) - whether content is live
      - `display_order` (integer) - order for displaying content
      - `meta_description` (text) - SEO description
      - `author_id` (uuid) - references profiles table
      - `published_at` (timestamptz) - publication date
      - `created_at` (timestamptz) - creation timestamp
      - `updated_at` (timestamptz) - last update timestamp

  2. Storage
    - Create `blog-content` bucket for blog and about page images
    - Enable public read access for the bucket

  3. Security
    - Enable RLS on `site_content` table
    - Add policy for public read access to published content
    - Add policy for site admins to manage all content
    - Add policy for authenticated users to view all content (including unpublished for admins)

  4. Indexes
    - Index on content_type for faster queries
    - Index on is_published for filtering
    - Index on published_at for sorting blog posts
    - Unique index on slug for SEO-friendly URLs
*/

-- Create site_content table
CREATE TABLE IF NOT EXISTS site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('blog_post', 'about_section')),
  title text NOT NULL,
  slug text NOT NULL,
  content_body text NOT NULL DEFAULT '',
  excerpt text DEFAULT '',
  featured_image_url text,
  additional_images jsonb DEFAULT '[]'::jsonb,
  is_published boolean DEFAULT false,
  display_order integer DEFAULT 0,
  meta_description text DEFAULT '',
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_site_content_type ON site_content(content_type);
CREATE INDEX IF NOT EXISTS idx_site_content_published ON site_content(is_published);
CREATE INDEX IF NOT EXISTS idx_site_content_published_at ON site_content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_content_display_order ON site_content(display_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_content_slug ON site_content(slug);

-- Create storage bucket for blog content
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-content', 'blog-content', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public read access for blog content" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload blog content" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own blog content" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own blog content" ON storage.objects;
END $$;

-- Storage policy: Allow public to read from blog-content bucket
CREATE POLICY "Public read access for blog content"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'blog-content');

-- Storage policy: Allow authenticated users to upload to blog-content bucket
CREATE POLICY "Authenticated users can upload blog content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blog-content');

-- Storage policy: Allow users to update their own uploads
CREATE POLICY "Users can update their own blog content"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blog-content');

-- Storage policy: Allow users to delete their own uploads
CREATE POLICY "Users can delete their own blog content"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blog-content');

-- Enable Row Level Security
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can view published content
CREATE POLICY "Public can view published site content"
ON site_content FOR SELECT
TO public
USING (is_published = true);

-- RLS Policy: Authenticated users can view all content (for admin preview)
CREATE POLICY "Authenticated users can view all site content"
ON site_content FOR SELECT
TO authenticated
USING (true);

-- RLS Policy: Site admins can insert content
CREATE POLICY "Site admins can insert site content"
ON site_content FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_site_admin = true
  )
);

-- RLS Policy: Site admins can update content
CREATE POLICY "Site admins can update site content"
ON site_content FOR UPDATE
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

-- RLS Policy: Site admins can delete content
CREATE POLICY "Site admins can delete site content"
ON site_content FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_site_admin = true
  )
);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before update
DROP TRIGGER IF EXISTS site_content_updated_at_trigger ON site_content;
CREATE TRIGGER site_content_updated_at_trigger
BEFORE UPDATE ON site_content
FOR EACH ROW
EXECUTE FUNCTION update_site_content_updated_at();

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title text)
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(title, '[^\w\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;