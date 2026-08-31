# Subscription Status Display Troubleshooting Guide

## Problem Statement
Users with active subscriptions are not seeing their status correctly displayed as "active" on their profile page under the "Billing and Subscription" section.

---

## 1. Initial Investigation Steps

### A. Frontend Code Review
**Files to examine:**
- `/src/components/SubscriptionManager.tsx` (lines 28-53, 191-224) - Main subscription display component
- `/src/lib/stripeApi.ts` (lines 144-171) - API call to fetch subscription data
- `/src/components/ProfilePage.tsx` - Parent component that renders SubscriptionManager

**Key questions:**
- Is the component receiving data? (Check state: `subscription`)
- Is the data being transformed correctly?
- Are there conditional renders blocking the display?

### B. Database Verification Queries

```sql
-- 1. Check if subscription data exists in base tables
SELECT
    c.user_id,
    c.customer_id,
    s.subscription_id,
    s.status,
    s.price_id,
    s.current_period_end,
    s.deleted_at as sub_deleted,
    c.deleted_at as customer_deleted
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE s.status = 'active'
AND c.deleted_at IS NULL
AND s.deleted_at IS NULL;

-- 2. Test the view directly (as service role)
SELECT * FROM stripe_user_subscriptions;

-- 3. Check view definition
SELECT pg_get_viewdef('stripe_user_subscriptions', true);

-- 4. Verify view security settings
SELECT
    c.relname,
    CASE
        WHEN c.reloptions IS NULL THEN 'No options set'
        ELSE array_to_string(c.reloptions, ', ')
    END as options
FROM pg_class c
WHERE c.relname = 'stripe_user_subscriptions';

-- 5. Check RLS policies on underlying tables
SELECT
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('stripe_customers', 'stripe_subscriptions')
ORDER BY tablename, policyname;

-- 6. Verify grants on the view
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'stripe_user_subscriptions';
```

### C. API Endpoint Testing

**Test in Browser Console (logged in as subscriber):**
```javascript
// 1. Check if user is authenticated
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// 2. Test direct query to view
const { data, error } = await supabase
  .from('stripe_user_subscriptions')
  .select('*')
  .maybeSingle();
console.log('View response:', { data, error });

// 3. Test direct query to base tables
const { data: customer } = await supabase
  .from('stripe_customers')
  .select('*')
  .eq('user_id', user.id)
  .maybeSingle();
console.log('Customer data:', customer);

// 4. Check if subscription exists for this customer
if (customer) {
  const { data: sub } = await supabase
    .from('stripe_subscriptions')
    .select('*')
    .eq('customer_id', customer.customer_id)
    .maybeSingle();
  console.log('Subscription data:', sub);
}
```

---

## 2. Common Root Causes

### Frontend Issues:
1. **State not updating** - Component doesn't trigger re-fetch after subscription change
2. **Conditional rendering bug** - UI only shows for specific status values
3. **Type mismatch** - Frontend expects different field names than database returns
4. **Authentication state** - User not properly authenticated when query runs
5. **Error swallowing** - Errors caught but not logged, hiding the real issue

### Backend/Database Issues:
6. **View definition bug** - LEFT JOIN + WHERE clause filtering nulls incorrectly
7. **Missing security_invoker** - View not running with user's auth context
8. **RLS policy blocking** - Row Level Security preventing data access
9. **Soft delete filtering** - deleted_at checks excluding active records
10. **Missing grants** - View permissions not granted to authenticated role
11. **auth.uid() not working** - Security context not passed to view correctly
12. **Data integrity** - Subscription marked as active but missing required fields

### Integration Issues:
13. **Stripe webhook delay** - Subscription created but webhook hasn't updated database
14. **Stale cache** - Frontend caching old subscription state
15. **Session issue** - User session not refreshed after subscription purchase

---

## 3. Debugging Process

### Step 1: Enable Debug Logging (Already Added)
The code now includes console logging in `stripeApi.ts`:
```typescript
console.log('[getUserSubscription] Fetching for user:', user.user.id);
console.log('[getUserSubscription] Response:', { data, error });
```

**Action:** Have user open browser DevTools > Console and navigate to profile page. Collect logs.

### Step 2: Verify Data Exists
Run this query as service_role:
```sql
SELECT
    c.user_id,
    u.email,
    c.customer_id,
    s.subscription_id,
    s.status,
    s.deleted_at
FROM stripe_customers c
JOIN auth.users u ON c.user_id = u.id
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE u.email = 'AFFECTED_USER_EMAIL@example.com';
```

**Expected:** Should return row with status='active' and deleted_at=NULL

### Step 3: Test View as Authenticated User
```sql
-- This simulates what an authenticated user sees
-- Replace USER_ID with actual affected user's ID
SET request.jwt.claims TO '{"sub": "USER_ID_HERE"}';
SELECT * FROM stripe_user_subscriptions;
RESET request.jwt.claims;
```

**Expected:** Should return subscription data

### Step 4: Check View Security Settings
```sql
SELECT
    c.relname,
    array_to_string(c.reloptions, ', ') as options
FROM pg_class c
WHERE c.relname = 'stripe_user_subscriptions';
```

**Expected:** Should show `security_invoker=true`
**If not:** View won't properly respect auth.uid() context

### Step 5: Validate View Definition
```sql
SELECT pg_get_viewdef('stripe_user_subscriptions', true);
```

**Check for these bugs:**
- ❌ BAD: `LEFT JOIN ... WHERE s.deleted_at IS NULL` (filters out all nulls)
- ✅ GOOD: `LEFT JOIN ... ON ... AND s.deleted_at IS NULL` (only filters when joined)

### Step 6: Test Frontend Query
Open browser console on profile page:
```javascript
// Copy user ID from earlier log
const userId = 'PASTE_USER_ID_HERE';

// Test the exact query frontend makes
const { data, error } = await supabase
  .from('stripe_user_subscriptions')
  .select('*')
  .maybeSingle();

console.table(data);
console.error(error);
```

### Step 7: Check for Infinite Recursion
Look for this error in logs:
```
infinite recursion detected in policy for relation "profiles"
```

**Cause:** RLS policies that query the same table they protect
**Solution:** Create SECURITY DEFINER functions to bypass RLS for admin checks

---

## 4. Potential Solutions

### Solution 1: Fix View Security Invoker (MOST COMMON)
**Problem:** View missing `security_invoker=true` option

```sql
DROP VIEW IF EXISTS stripe_user_subscriptions;

CREATE VIEW stripe_user_subscriptions
WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s
    ON c.customer_id = s.customer_id
    AND s.deleted_at IS NULL
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL;

GRANT SELECT ON stripe_user_subscriptions TO authenticated;
```

### Solution 2: Fix LEFT JOIN + WHERE Clause Bug
**Problem:** View filters out NULL subscriptions incorrectly

**Before (WRONG):**
```sql
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid() AND s.deleted_at IS NULL
```

**After (CORRECT):**
```sql
LEFT JOIN stripe_subscriptions s
    ON c.customer_id = s.customer_id
    AND s.deleted_at IS NULL  -- Move to JOIN condition
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
```

### Solution 3: Fix Profiles Infinite Recursion
**Problem:** RLS policies that SELECT from profiles within profile policies

```sql
-- Create private schema
CREATE SCHEMA IF NOT EXISTS private;

-- Create secure function to bypass RLS
DROP FUNCTION IF EXISTS private.is_site_admin(uuid) CASCADE;

CREATE FUNCTION private.is_site_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_site_admin FROM public.profiles WHERE id = user_id LIMIT 1),
    false
  );
$$;

-- Update policies to use function
DROP POLICY IF EXISTS "Site admins can read all profiles" ON profiles;

CREATE POLICY "Site admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    private.is_site_admin(auth.uid()) = true
    OR auth.uid() = id
  );
```

### Solution 4: Grant Missing Permissions
```sql
-- Ensure view has correct grants
GRANT SELECT ON stripe_user_subscriptions TO authenticated;
GRANT SELECT ON stripe_user_subscriptions TO anon;

-- Ensure base tables have RLS policies
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Add policies if missing
CREATE POLICY "Users can view their own customer data"
  ON stripe_customers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their own subscription data"
  ON stripe_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id FROM stripe_customers WHERE user_id = auth.uid()
    )
  );
```

### Solution 5: Force Frontend Refresh
**Problem:** Cached state or stale session

```typescript
// Add to SubscriptionManager component
useEffect(() => {
  if (user) {
    // Force fresh session on mount
    supabase.auth.refreshSession().then(() => {
      fetchSubscriptionData();
    });
  }
}, [user]);
```

### Solution 6: Add Retry Logic
**Problem:** Race condition or temporary failure

```typescript
async getUserSubscription(): Promise<StripeSubscription | null> {
  const maxRetries = 3;
  let lastError = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (!error) return data;

      lastError = error;
      if (error.code === 'PGRST116') return null; // Not found

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    } catch (error) {
      lastError = error;
    }
  }

  console.error('Failed after retries:', lastError);
  return null;
}
```

---

## 5. Testing and Verification

### Test Case 1: Happy Path - Active Subscriber
**Setup:**
- User with active subscription (status='active')
- Valid customer_id and subscription_id
- No deleted_at timestamps

**Steps:**
1. Log in as active subscriber
2. Navigate to Profile > Billing & Subscription
3. Wait for loading spinner to complete

**Expected Result:**
- Green checkmark icon displayed
- Status shows "Active" in green badge
- Subscription details visible (next billing date, payment method)
- "Cancel Subscription" button visible

**Verification Query:**
```sql
SELECT
    s.subscription_status,
    s.current_period_end,
    s.payment_method_brand
FROM stripe_user_subscriptions s;
```

### Test Case 2: Cancelled But Active Until Period End
**Setup:**
- Subscription with cancel_at_period_end = true
- Status still 'active'

**Expected Result:**
- Orange warning badge "Cancelled"
- Status shows "Active until cancellation"
- Message: "Subscription ends on [date]"
- No "Cancel Subscription" button

### Test Case 3: No Subscription
**Setup:**
- User exists but no stripe_customer record
- OR customer exists but no subscription

**Expected Result:**
- Crown icon (grayed out)
- "No Active Subscription" heading
- "Upgrade to Premium" button
- No error messages

### Test Case 4: Past Due Subscription
**Setup:**
- Subscription with status='past_due'

**Expected Result:**
- Red X icon
- Status shows "Past due" in red badge
- Appropriate warning message

### Test Case 5: Fresh Sign-up → Purchase → Display
**Steps:**
1. Create new account
2. Complete Stripe checkout
3. Webhook processes payment
4. Return to profile page

**Expected Result:**
- Subscription displays immediately or within 30 seconds
- Status = "active"
- All subscription details populated

**If fails:** Check webhook processing and database writes

### Edge Cases to Test:

1. **Multiple browser tabs open**
   - Update subscription in one tab
   - Verify other tab shows update on refresh

2. **Session expired during viewing**
   - Leave profile page open 1+ hour
   - Refresh page
   - Should re-authenticate and load data

3. **Network interruption**
   - Disable network mid-load
   - Re-enable network
   - Should retry or show error

4. **Rapid navigation**
   - Click to profile page
   - Immediately click away
   - Click back to profile
   - Should load correctly without race condition

5. **Concurrent subscription changes**
   - User upgrades from monthly to yearly
   - Should show new plan immediately after checkout

---

## 6. Diagnostic Checklist

Use this checklist when troubleshooting:

```
□ User is properly authenticated (check browser console for user object)
□ Subscription data exists in stripe_subscriptions table
□ Customer record exists in stripe_customers table with correct user_id
□ stripe_subscriptions.deleted_at IS NULL
□ stripe_customers.deleted_at IS NULL
□ stripe_subscriptions.status = 'active'
□ View stripe_user_subscriptions has security_invoker=true
□ View definition uses correct JOIN logic (deleted_at in JOIN, not WHERE)
□ View has GRANT SELECT for authenticated role
□ No infinite recursion errors in browser console
□ No 401/403 errors in network tab
□ Frontend getUserSubscription() returns non-null data
□ SubscriptionManager component receives subscription in state
□ No conditional render blocking display
□ Stripe webhook successfully processed payment
□ No JavaScript errors in browser console
□ Browser has recent version (not caching old code)
```

---

## 7. Quick Diagnostic Commands

Run these in order to quickly identify the issue:

```bash
# 1. Check if view has security_invoker
psql -c "SELECT relname, reloptions FROM pg_class WHERE relname = 'stripe_user_subscriptions';"

# 2. Verify active subscriptions exist
psql -c "SELECT COUNT(*) FROM stripe_subscriptions WHERE status = 'active' AND deleted_at IS NULL;"

# 3. Check view definition for bugs
psql -c "SELECT pg_get_viewdef('stripe_user_subscriptions', true);"

# 4. Test view returns data (as service role)
psql -c "SELECT * FROM stripe_user_subscriptions LIMIT 5;"

# 5. Check for infinite recursion policies
psql -c "SELECT tablename, policyname FROM pg_policies WHERE tablename = 'profiles' AND (qual LIKE '%SELECT%profiles%' OR with_check LIKE '%SELECT%profiles%');"
```

---

## 8. Common Error Messages and Solutions

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `infinite recursion detected in policy for relation "profiles"` | RLS policy queries same table it protects | Create SECURITY DEFINER function (Solution 3) |
| `new row violates row-level security policy` | User can't INSERT/UPDATE due to WITH CHECK | Review RLS WITH CHECK clauses |
| `null value in column violates not-null constraint` | Missing required field in INSERT | Check trigger/function creating records |
| Returns `data: null` with no error | View filtering out user's data | Check WHERE clauses and auth.uid() |
| 401 Unauthorized | User not authenticated or session expired | Refresh session, check auth state |
| 403 Forbidden | RLS blocking access | Add/fix RLS policies |
| PGRST116 | No rows found (not an error) | Expected when user has no subscription |
| `function auth.uid() does not exist` | View not using security_invoker | Add security_invoker=true to view |

---

## 9. Monitoring and Prevention

### Add Application Monitoring:
```typescript
// In stripeApi.ts
async getUserSubscription(): Promise<StripeSubscription | null> {
  const startTime = Date.now();

  try {
    // ... existing code ...

    const duration = Date.now() - startTime;

    // Log slow queries
    if (duration > 1000) {
      console.warn(`[SLOW QUERY] getUserSubscription took ${duration}ms`);
    }

    // Log successful fetches
    if (data) {
      console.log(`[SUBSCRIPTION] Loaded: ${data.subscription_status}`);
    } else {
      console.log(`[SUBSCRIPTION] No subscription found for user`);
    }

    return data;
  } catch (error) {
    console.error(`[ERROR] getUserSubscription failed after ${Date.now() - startTime}ms:`, error);
    throw error;
  }
}
```

### Database Health Checks:
```sql
-- Create view for monitoring
CREATE OR REPLACE VIEW subscription_health AS
SELECT
    COUNT(*) FILTER (WHERE status = 'active') as active_count,
    COUNT(*) FILTER (WHERE status = 'canceled') as canceled_count,
    COUNT(*) FILTER (WHERE status = 'past_due') as past_due_count,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as soft_deleted_count,
    COUNT(*) FILTER (WHERE current_period_end < EXTRACT(EPOCH FROM NOW())) as expired_count
FROM stripe_subscriptions;

-- Check regularly
SELECT * FROM subscription_health;
```

---

## 10. Resolution Workflow

```
1. User reports issue
   ↓
2. Collect user email/ID
   ↓
3. Run verification queries (Section 1B)
   ↓
4. Check logs from debug console (Step 1)
   ↓
5. Identify root cause (Section 2)
   ↓
6. Apply appropriate solution (Section 4)
   ↓
7. Ask user to hard refresh (Ctrl+Shift+R)
   ↓
8. Verify fix with test cases (Section 5)
   ↓
9. Document in issue tracker
   ↓
10. Monitor for recurrence
```

---

## Current Status (As of Last Fix)

**Fixes Applied:**
1. ✅ Created `private.is_site_admin()` function to fix infinite recursion
2. ✅ Fixed view LEFT JOIN + WHERE clause bug
3. ✅ Added `security_invoker=true` to stripe_user_subscriptions view
4. ✅ Added debug logging to getUserSubscription()

**Verification:**
```sql
-- Should return: security_invoker=true
SELECT array_to_string(reloptions, ', ')
FROM pg_class
WHERE relname = 'stripe_user_subscriptions';

-- Should return active subscriptions
SELECT * FROM stripe_user_subscriptions;
```

**Next Steps for User:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Log out and log back in (clears session)
3. Navigate to Profile > Billing & Subscription
4. Check browser console for debug logs
5. Report what's shown in logs if still not working