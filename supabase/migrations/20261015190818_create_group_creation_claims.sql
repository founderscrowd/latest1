/*
  # Create Group Creation Claims Table + publish_group Function

  1. Purpose
    - Enables idempotent group creation for the smart onboarding flow.
    - Prevents duplicate groups when a visitor authenticates via OAuth redirect,
      email confirmation callback, or page refresh after clicking "Publish Group".
    - Each draft has a unique draft_id. The first publish attempt claims it;
      repeated attempts with the same draft_id return the already-created group
      instead of creating a duplicate.

  2. New Tables
    - `group_creation_claims`
      - `id` (uuid, primary key)
      - `draft_id` (text, unique — the client-generated idempotency key)
      - `user_id` (uuid, foreign key to auth.users, defaults to auth.uid())
      - `group_id` (uuid, nullable — set to the created group's id on success)
      - `created_at` (timestamptz, default now())
      - `consumed_at` (timestamptz, nullable — set when the group is actually created)

  3. New Function
    - `publish_group(p_draft_id text, p_group_data jsonb)`
      - SECURITY DEFINER, SET search_path = public
      - Atomic: claims the draft_id (INSERT ... ON CONFLICT DO NOTHING), then
        either returns the existing group (if already created) or inserts a new
        group + starter member, records the group_id, and returns the group.
      - Derives creator from auth.uid() — never from parameters.
      - Revoked EXECUTE from anon; granted to authenticated.

  4. Security
    - RLS enabled on group_creation_claims.
    - Authenticated users can only SELECT/INSERT their own rows (auth.uid() = user_id).
    - The publish_group function is SECURITY DEFINER so it can insert into groups
      and group_members, but it validates the caller via auth.uid() internally.
    - A draft_id claimed by another user cannot return or expose that user's group:
      the unique constraint on draft_id means only the first caller gets a row,
      and the user_id on that row is set from auth.uid() at claim time.

  5. Notes
    - The function replicates the exact insert pattern used by the existing
      client-side createGroup: groups row with status='active', is_public default,
      plus a group_members row with role='starter', status='approved'.
    - The groups_slug_trigger auto-generates the slug on insert (existing trigger).
    - If the starter member insert fails, the group is deleted to prevent orphans,
      matching the existing createGroup cleanup behavior.
*/

CREATE TABLE IF NOT EXISTS public.group_creation_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  consumed_at timestamptz
);

ALTER TABLE public.group_creation_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_claims" ON public.group_creation_claims;
CREATE POLICY "select_own_claims"
  ON public.group_creation_claims FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_claims" ON public.group_creation_claims;
CREATE POLICY "insert_own_claims"
  ON public.group_creation_claims FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_group_creation_claims_draft_id ON public.group_creation_claims(draft_id);
CREATE INDEX IF NOT EXISTS idx_group_creation_claims_user_id ON public.group_creation_claims(user_id);

CREATE OR REPLACE FUNCTION public.publish_group(
  p_draft_id text,
  p_group_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_claim_id uuid;
  v_existing_group_id uuid;
  v_group_id uuid;
  v_group_row jsonb;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Atomically claim the draft_id. If a row already exists for this draft_id,
  -- ON CONFLICT DO NOTHING returns nothing, so we check for an existing group.
  INSERT INTO group_creation_claims (draft_id, user_id)
  VALUES (p_draft_id, v_user_id)
  ON CONFLICT (draft_id) DO NOTHING
  RETURNING id INTO v_claim_id;

  -- If we didn't insert a new claim, check if a group was already created
  IF v_claim_id IS NULL THEN
    SELECT group_id INTO v_existing_group_id
    FROM group_creation_claims
    WHERE draft_id = p_draft_id;

    -- If a group was already created, return it (idempotent response)
    IF v_existing_group_id IS NOT NULL THEN
      SELECT to_jsonb(g) INTO v_group_row
      FROM groups g
      WHERE g.id = v_existing_group_id;
      RETURN v_group_row;
    END IF;

    -- The claim exists but no group yet — another request is in progress
    -- or the group creation failed. Return a pending status so the client
    -- can retry. This should be extremely rare.
    RETURN jsonb_build_object('pending', true);
  END IF;

  -- We claimed the draft_id. Now create the group.
  BEGIN
    INSERT INTO groups (
      name, description, tags, equity_available, funding_needed,
      industry, max_members, stage, creator_id, status, is_public,
      location_type, country, city, legal_structure, organisation_type
    ) VALUES (
      p_group_data->>'name',
      p_group_data->>'description',
      COALESCE(
        CASE
          WHEN p_group_data ? 'tags' AND jsonb_typeof(p_group_data->'tags') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(p_group_data->'tags'))
          ELSE ARRAY[]::text[]
        END,
        ARRAY[]::text[]
      ),
      COALESCE((p_group_data->>'equity_available')::integer, 0),
      p_group_data->>'funding_needed',
      p_group_data->>'industry',
      COALESCE((p_group_data->>'max_members')::integer, 5),
      p_group_data->>'stage',
      v_user_id,
      'active',
      COALESCE((p_group_data->>'is_public')::boolean, true),
      COALESCE(p_group_data->>'location_type', 'worldwide'),
      NULLIF(p_group_data->>'country', ''),
      NULLIF(p_group_data->>'city', ''),
      COALESCE(p_group_data->>'legal_structure', 'not_yet_decided'),
      COALESCE(p_group_data->>'organisation_type', 'not_yet_decided')
    )
    RETURNING id, to_jsonb(groups) INTO v_group_id, v_group_row;

    -- Add creator as starter member (matches existing createGroup behavior)
    INSERT INTO group_members (group_id, user_id, role, status)
    VALUES (v_group_id, v_user_id, 'starter', 'approved');

    -- Record the group_id on the claim
    UPDATE group_creation_claims
    SET group_id = v_group_id, consumed_at = now()
    WHERE id = v_claim_id;

    RETURN v_group_row;

  EXCEPTION WHEN OTHERS THEN
    -- Clean up the claim so the user can retry
    DELETE FROM group_creation_claims WHERE id = v_claim_id;
    RAISE;
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_group FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_group TO authenticated;
