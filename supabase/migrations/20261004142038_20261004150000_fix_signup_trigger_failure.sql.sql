/*
# Prevent signup trigger failures from blocking account creation

1. Changes
- Updates `handle_new_user` so new profiles use the submitted display name from
  `raw_user_meta_data.username`, with the email prefix as a fallback.
- Keeps `accepted_terms_at` set to the signup time.
- Updates `notify_admins_new_user` so an optional admin notification failure does
  not roll back the new account transaction.
- Updates `create_user_profile` so its fallback profile creation also records
  `accepted_terms_at` when it is missing.

2. Security
- Keeps both profile and notification trigger functions as SECURITY DEFINER.
- Sets a fixed `search_path` on the trigger functions so table references are
  resolved predictably.
- No access policies are changed.

3. Important notes
- Account creation remains the required operation; notification delivery is
  secondary and must not prevent a user from signing up.
- Existing profiles and notifications are unchanged.
- The statements are idempotent and safe to reapply.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  should_be_admin BOOLEAN := false;
  profile_username TEXT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  IF user_count = 0 THEN
    should_be_admin := true;
  END IF;

  profile_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    split_part(COALESCE(NEW.email, 'user_' || NEW.id::text), '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    email,
    username,
    created_at,
    updated_at,
    is_site_admin,
    accepted_terms_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    profile_username,
    NOW(),
    NOW(),
    should_be_admin,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.notifications (
      user_id,
      recipient_id,
      type,
      title,
      message,
      data,
      "read",
      related_entity_id
    )
    SELECT
      p.id,
      p.id,
      'user_registered',
      'New User Registration',
      'A new user has signed up: ' || NEW.email,
      jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'username', COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        'created_at', NEW.created_at
      ),
      false,
      NEW.id
    FROM public.profiles p
    WHERE p.is_site_admin = true;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'New user notification could not be created: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id uuid,
  user_email text,
  user_username text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    created_at,
    updated_at,
    accepted_terms_at
  )
  VALUES (
    user_id,
    user_email,
    user_username,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    updated_at = NOW(),
    accepted_terms_at = COALESCE(public.profiles.accepted_terms_at, EXCLUDED.accepted_terms_at);
END;
$$;
