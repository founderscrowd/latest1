/*
# Add restricted public profile display view

1. Overview
- Adds a read-only view containing only the fields needed to identify members in public-facing areas.
- The view supports group member lists, chat, forums, and other avatar displays without exposing private profile columns.

2. New Database Object
- `public.public_profile_display`
- `id`: the user's identifier needed to match a member record.
- `username`: the public display name shown beside an avatar.
- `avatar_url`: the public profile picture URL.

3. Security
- The underlying `profiles` table and its existing RLS policies are unchanged.
- The view exposes no email address, administrator flags, terms fields, timestamps, or other private profile data.
- SELECT is granted only to `anon` and `authenticated`, and no write privileges are granted.
- The view intentionally serves display-only profile information and is not a replacement for private profile access.

4. Important Notes
- Existing profiles, avatar files, and avatar URLs are preserved unchanged.
- The frontend must query this view instead of querying `profiles` when it only needs public display information.
- This migration is idempotent and safe to reapply.
*/

CREATE OR REPLACE VIEW public.public_profile_display AS
SELECT
  id,
  username,
  avatar_url
FROM public.profiles;

REVOKE ALL ON public.public_profile_display FROM PUBLIC;
GRANT SELECT ON public.public_profile_display TO anon, authenticated;