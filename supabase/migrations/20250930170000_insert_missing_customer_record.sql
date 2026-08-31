/*
  # Insert missing customer record for founderscrowd@gmail.com

  ## Problem
  The user '0cd223bd-0082-4b28-b638-e2c7b54f975e' (founderscrowd@gmail.com) has an
  active Stripe subscription but no customer record in stripe_customers table.

  ## Solution
  Manually insert the customer record linking the user to their Stripe customer ID.

  ## Changes
  1. Insert customer record for user_id -> customer_id mapping
*/

-- Insert the missing customer record
INSERT INTO stripe_customers (user_id, customer_id)
VALUES ('0cd223bd-0082-4b28-b638-e2c7b54f975e', 'cus_T7wB4ClYeISaNj')
ON CONFLICT (user_id) DO UPDATE
SET customer_id = EXCLUDED.customer_id;