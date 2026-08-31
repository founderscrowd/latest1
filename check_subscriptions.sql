-- Check stripe_customers table
SELECT 'stripe_customers' as table_name, customer_id, user_id, email, deleted_at
FROM stripe_customers
LIMIT 5;

-- Check stripe_subscriptions table
SELECT 'stripe_subscriptions' as table_name, subscription_id, customer_id, status, price_id, deleted_at
FROM stripe_subscriptions
LIMIT 5;
