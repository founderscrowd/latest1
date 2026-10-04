/*
# Add accepted_terms_at column to profiles

1. Changes
- Adds `accepted_terms_at` (timestamptz, nullable) to `public.profiles`.
- Updates the `handle_new_user` trigger function to set `accepted_terms_at = NOW()`
  when a new user is created, recording that they accepted the Terms of Service
  at sign-up time.
- Existing rows keep NULL (they signed up before this field existed).

2. Security
- No new RLS policies needed. The column is written by the SECURITY DEFINER
  trigger and by the existing create_user_profile RPC. Users can already
  UPDATE their own profile row; this column is not user-editable directly
  (it is set once at sign-up), but no extra policy restriction is added
  because the column has no sensitive meaning.

3. Notes
- The column is nullable so existing profiles are unaffected.
- The trigger change is idempotent (CREATE OR REPLACE).
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  should_be_admin BOOLEAN := false;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;

  IF user_count = 0 THEN
    should_be_admin := true;
  END IF;

  INSERT INTO public.profiles (id, username, created_at, updated_at, is_site_admin, accepted_terms_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, 'user_' || NEW.id::text),
    NOW(),
    NOW(),
    should_be_admin,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
