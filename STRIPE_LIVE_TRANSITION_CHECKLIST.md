# Stripe Live Mode Transition Checklist

## ✅ Pre-Transition Checklist

### 1. Stripe Dashboard Setup (COMPLETED)
- [x] Activate live mode in Stripe Dashboard
- [x] Create live products and pricing
- [x] Set up live webhook endpoints
- [x] Configure payment methods
- [x] Set up tax settings (if applicable)

### 2. Environment Variables Update (REQUIRED)
Update your `.env` file with live Stripe keys:

```env
# Replace test keys with live keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_live_publishable_key
STRIPE_SECRET_KEY=sk_live_your_actual_live_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_live_webhook_secret
```

### 3. Price ID Updates (REQUIRED)
Update the following files with your live price IDs:

**In `src/lib/stripeApi.ts`:**
- Replace `price_LIVE_MONTHLY_PRICE_ID` with your actual live monthly price ID
- Replace `price_LIVE_ANNUAL_PRICE_ID` with your actual live annual price ID

**In `src/components/SubscriptionManager.tsx`:**
- Replace both instances of price ID placeholders

**In `src/components/StripeSuccessPage.tsx`:**
- Replace the annual price ID placeholder

## 🔧 Required Actions

### Step 1: Update Environment Variables
1. Copy your live Stripe keys from the Stripe Dashboard
2. Update your `.env` file with the live keys
3. Restart your development server

### Step 2: Update Price IDs in Code
1. Get your live price IDs from Stripe Dashboard → Products
2. Replace all instances of:
   - `price_LIVE_MONTHLY_PRICE_ID` → your actual live monthly price ID
   - `price_LIVE_ANNUAL_PRICE_ID` → your actual live annual price ID

### Step 3: Supabase Edge Functions Environment
Update environment variables in Supabase Dashboard → Edge Functions:
1. Go to Supabase Dashboard → Edge Functions → Settings
2. Add/update these environment variables:
   - `STRIPE_SECRET_KEY` = your live secret key
   - `STRIPE_WEBHOOK_SECRET` = your live webhook secret

### Step 4: Webhook Configuration
1. In Stripe Dashboard → Webhooks, create a new webhook endpoint:
   - URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

### Step 5: Test Live Integration
1. Deploy your updated code
2. Test a small live transaction (you can refund it later)
3. Verify webhook delivery in Stripe Dashboard
4. Check that subscription data appears correctly in your database

## ⚠️ Important Notes

### Security Considerations
- **Never commit live keys to version control**
- Use environment variables for all sensitive data
- Regularly rotate your API keys
- Monitor webhook delivery for failures

### Database Considerations
- Your existing database schema supports live mode
- No database migrations are required
- Test and live data will be separate
- Consider backing up test data before switching

### Testing Recommendations
- Start with a small test purchase
- Verify all webhook events are processed
- Test subscription cancellation flow
- Confirm email notifications work
- Test edge cases (failed payments, etc.)

## 🚀 Post-Transition Verification

### Verify These Features Work:
- [ ] New subscription purchases
- [ ] Subscription status updates
- [ ] Payment method updates
- [ ] Subscription cancellations
- [ ] Webhook event processing
- [ ] Email notifications
- [ ] Premium feature access
- [ ] Billing history display

### Monitor These Metrics:
- Successful payment rate
- Webhook delivery success rate
- Subscription churn rate
- Failed payment recovery
- Customer support tickets

## 📞 Support Resources

If you encounter issues:
1. Check Stripe Dashboard → Logs for error details
2. Monitor Supabase Edge Functions logs
3. Verify webhook signatures are valid
4. Contact Stripe support for payment-specific issues

## 🔄 Rollback Plan

If you need to rollback to test mode:
1. Revert environment variables to test keys
2. Update price IDs back to test price IDs
3. Redeploy the application
4. Update webhook endpoints back to test mode

---

**Remember:** Always test thoroughly in a staging environment before deploying live payment processing to production!