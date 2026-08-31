import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed',
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

async function syncCustomerFromStripe(customerId: string) {
  try {
    console.info(`[SUBSCRIPTION_SYNC] Starting subscription sync for customer: ${customerId}`);

    // First, verify the customer exists in stripe_customers table
    const { data: customerRecord, error: customerLookupError } = await supabase
      .from('stripe_customers')
      .select('user_id, id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (customerLookupError) {
      console.error(`[SUBSCRIPTION_SYNC] Error looking up customer record: ${customerLookupError.message}`);
    } else if (!customerRecord) {
      console.warn(`[SUBSCRIPTION_SYNC] WARNING: No stripe_customers record found for customer_id: ${customerId}. Notification may fail to send.`);
    } else {
      console.info(`[SUBSCRIPTION_SYNC] Customer record found: user_id=${customerRecord.user_id}, db_id=${customerRecord.id}`);
    }

    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
    });

    if (existingSubscriptions.data.length > 1) {
      const activeSubscriptions = existingSubscriptions.data.filter(sub =>
        sub.status === 'active' || sub.status === 'trialing'
      );

      if (activeSubscriptions.length > 1) {
        console.info(`[SUBSCRIPTION_SYNC] Found ${activeSubscriptions.length} active subscriptions for customer ${customerId}, cleaning up...`);

        const sortedSubscriptions = activeSubscriptions.sort((a, b) => b.created - a.created);
        const newestSubscription = sortedSubscriptions[0];
        const oldSubscriptions = sortedSubscriptions.slice(1);

        for (const oldSub of oldSubscriptions) {
          try {
            await stripe.subscriptions.cancel(oldSub.id);
            console.info(`[SUBSCRIPTION_SYNC] Canceled old subscription ${oldSub.id} for customer ${customerId}`);
          } catch (cancelError) {
            console.error(`[SUBSCRIPTION_SYNC] Failed to cancel old subscription ${oldSub.id}:`, cancelError);
          }
        }

        const { error: cleanupError } = await supabase
          .from('stripe_subscriptions')
          .delete()
          .eq('customer_id', customerId)
          .neq('subscription_id', newestSubscription.id);

        if (cleanupError) {
          console.error('[SUBSCRIPTION_SYNC] Error cleaning up old subscription records:', cleanupError);
        }
      }
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      expand: ['data.default_payment_method', 'data.discount'],
    });

    if (subscriptions.data.length === 0) {
      console.info(`[SUBSCRIPTION_SYNC] No subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('[SUBSCRIPTION_SYNC] Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
      return;
    }

    const subscription = subscriptions.data[0];
    const previousStatus = `[checking via database query]`;

    // Extract discount information if available
    const discountData: any = {};
    if (subscription.discount) {
      const coupon = subscription.discount.coupon;
      discountData.discount_code = subscription.discount.promotion_code || coupon.id;
      discountData.discount_percent_off = coupon.percent_off || null;
      discountData.discount_amount_off = coupon.amount_off || null;
      discountData.discount_duration = coupon.duration;
      discountData.discount_end_date = subscription.discount.end || null;
      discountData.discount_duration_in_months = coupon.duration_in_months || null;

      console.info(`[SUBSCRIPTION_SYNC] Subscription has discount: ${discountData.discount_code} (${coupon.percent_off ? `${coupon.percent_off}% off` : `$${(coupon.amount_off / 100).toFixed(2)} off`}${coupon.duration_in_months ? ` for ${coupon.duration_in_months} months` : ''})`);
    }

    console.info(`[SUBSCRIPTION_SYNC] Upserting subscription: id=${subscription.id}, status=${subscription.status}, customer=${customerId}, price=${subscription.items.data[0]?.price.id}`);

    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        ...discountData,
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('[SUBSCRIPTION_SYNC] Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`[SUBSCRIPTION_SYNC] Successfully synced subscription for customer: ${customerId}`);

    // Log subscription status for notification trigger monitoring
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      console.info(`[NOTIFICATION_TRIGGER] Subscription status is ${subscription.status} - notification trigger should fire for customer: ${customerId}`);
      console.info(`[NOTIFICATION_TRIGGER] Admin notification will be sent if: 1) stripe_customers.user_id exists, 2) profiles.is_site_admin=true exists, 3) notifications table accessible`);
    } else {
      console.info(`[SUBSCRIPTION_SYNC] Subscription status is ${subscription.status} (not active/trialing), notification trigger will not fire`);
    }
  } catch (error) {
    console.error(`[SUBSCRIPTION_SYNC] Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}
