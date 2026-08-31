# Stripe Live Webhook Setup Guide

## 🎯 Quick Setup Instructions

Based on your screenshot, you need to click **"+ Add destination"** and configure your live webhook endpoint.

### Step 1: Add New Webhook Destination
1. Click the **"+ Add destination"** button (visible in your screenshot)
2. Enter your webhook endpoint URL:
   ```
   https://your-project-id.supabase.co/functions/v1/stripe-webhook
   ```
   Replace `your-project-id` with your actual Supabase project ID

### Step 2: Configure Events to Listen For
Select these events (critical for your app to work):

**Required Events:**
- `checkout.session.completed`
- `customer.subscription.created` 
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Optional but Recommended:**
- `customer.created`
- `customer.updated`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### Step 3: Get Your Webhook Secret
After creating the webhook:
1. Click on the newly created webhook
2. Click "Reveal" next to "Signing secret"
3. Copy the webhook secret (starts with `whsec_`)
4. Update your environment variables

## 🔧 Environment Variables Update

Update your `.env` file with:
```env
# Your live Stripe keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_key
STRIPE_SECRET_KEY=sk_live_your_actual_key
STRIPE_WEBHOOK_SECRET=whsec_your_new_live_webhook_secret
```

## 🏗️ Supabase Edge Functions Update

In Supabase Dashboard → Edge Functions → Settings:
1. Update `STRIPE_SECRET_KEY` with your live secret key
2. Update `STRIPE_WEBHOOK_SECRET` with your new live webhook secret

## ✅ Verification Steps

After setup:
1. Test a small live transaction
2. Check webhook delivery in Stripe Dashboard → Webhooks → [Your webhook] → Recent deliveries
3. Verify subscription data appears in your database
4. Confirm premium features are unlocked for the test user

## 🚨 Important Notes

- **Test vs Live:** You'll have separate webhook endpoints for test and live modes
- **Database:** Your existing database will work for both test and live data
- **Security:** Never commit live webhook secrets to version control
- **Testing:** Start with a small test purchase that you can refund

## 📍 Your Webhook URL Format

Your webhook URL should be:
```
https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/functions/v1/stripe-webhook
```

You can find your Supabase project ID in your Supabase Dashboard URL or Settings → General.