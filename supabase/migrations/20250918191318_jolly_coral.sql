/*
  # Create user profile RPC function

  1. New Functions
    - `create_user_profile` - Creates or updates user profiles with SECURITY DEFINER privileges
      - Parameters: user_id (uuid), user_email (text), user_username (text)
      - Returns: void
      - Uses ON CONFLICT to handle existing profiles
      - Bypasses RLS restrictions when needed

  2. Security
    - Function runs with SECURITY DEFINER privileges
    - Grants EXECUTE permission to authenticated users
    - Handles profile creation even when RLS policies might block direct inserts

  3. Purpose
    - Fallback mechanism for profile creation during user registration
    - Ensures profiles are created consistently regardless of RLS policy restrictions
*/

CREATE OR REPLACE FUNCTION public.create_user_profile(
    user_id uuid,
    user_email text,
    user_username text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, created_at, updated_at)
    VALUES (user_id, user_email, user_username, now(), now())
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        updated_at = now();
END;
$$;

-- Grant execution privilege to the authenticated role
GRANT EXECUTE ON FUNCTION public.create_user_profile(uuid, text, text) TO authenticated;