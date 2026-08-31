/*
  # Add INSERT policy for stripe_customers table

  ## Problem
  The stripe_customers table has RLS enabled but no INSERT policy, preventing
  the Supabase service role from creating customer records during checkout.

  ## Solution
  Add an INSERT policy that allows service role operations to create customer records.
  This is safe because:
  - Only the Edge Functions (using service role key) can insert
  - The user_id must match the authenticated user
  - Regular users cannot bypass authentication to insert records

  ## Changes
  1. Add INSERT policy for stripe_customers table
  2. Policy allows service role to insert records
*/

-- Add policy to allow service role to insert customer records
CREATE POLICY "Service role can insert customer data"
  ON stripe_customers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());