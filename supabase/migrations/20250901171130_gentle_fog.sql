/*
  # Clean RLS Setup for User Tables

  1. Tables Updated
    - `profiles` - Enable RLS and add policies for user data access
    - `notes` - Enable RLS and add policies for user notes
    - `groups` - Enable RLS and add policies for group management

  2. Security Policies
    - Users can only access their own profile data
    - Users can only manage their own notes
    - Authenticated users can view all groups, but only creators can modify their groups

  3. Storage Buckets
    - Creates public buckets for group logos and covers
    - Uses Supabase's default storage policies (no custom RLS on storage.objects)
*/

-- Enable RLS on user tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "profiles select own" ON public.profiles;
CREATE POLICY "profiles select own" ON public.profiles FOR SELECT TO public USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles insert own" ON public.profiles;
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO public WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO public USING (auth.uid() = id);

-- Notes policies
DROP POLICY IF EXISTS "notes select own" ON public.notes;
CREATE POLICY "notes select own" ON public.notes FOR SELECT TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes insert own" ON public.notes;
CREATE POLICY "notes insert own" ON public.notes FOR INSERT TO public WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes update own" ON public.notes;
CREATE POLICY "notes update own" ON public.notes FOR UPDATE TO public USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes delete own" ON public.notes;
CREATE POLICY "notes delete own" ON public.notes FOR DELETE TO public USING (auth.uid() = user_id);

-- Groups policies
DROP POLICY IF EXISTS "Groups are viewable by authenticated users" ON public.groups;
CREATE POLICY "Groups are viewable by authenticated users" ON public.groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
CREATE POLICY "Group creators can update their groups" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can delete own groups" ON public.groups;
CREATE POLICY "Users can delete own groups" ON public.groups FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- Create storage buckets (public buckets use Supabase's default policies)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('group-logos', 'group-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/gif']),
  ('group-covers', 'group-covers', true, 5242880, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;