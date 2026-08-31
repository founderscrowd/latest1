/*
  # Fix stripe_customers foreign key to enable user deletion

  1. Problem
    - stripe_customers.user_id references auth.users(id) without CASCADE delete
    - This prevents deleting users from Supabase Auth dashboard
    - Error: "Database error deleting user"

  2. Solution
    - Drop existing foreign key constraint
    - Add new constraint with ON DELETE CASCADE
    - This allows automatic cleanup of stripe_customers when users are deleted

  3. Security
    - No RLS policy changes needed
    - Maintains data integrity while allowing user deletion
*/

-- Drop the existing foreign key constraint
ALTER TABLE stripe_customers 
DROP CONSTRAINT IF EXISTS stripe_customers_user_id_fkey;

-- Add the constraint back with CASCADE delete
ALTER TABLE stripe_customers 
ADD CONSTRAINT stripe_customers_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;