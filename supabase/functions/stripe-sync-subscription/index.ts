import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { customer_id } = await req.json();

    if (!customer_id) {
      return new Response(
        JSON.stringify({ error: 'customer_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch subscription from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customer_id,
      limit: 1,
      expand: ['data.default_payment_method', 'data.discount'],
    });

    if (subscriptions.data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No subscription found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const subscription = subscriptions.data[0];

    // Extract discount information
    const discountData: any = {};
    if (subscription.discount) {
      const coupon = subscription.discount.coupon;
      discountData.discount_code = subscription.discount.promotion_code || coupon.id;
      discountData.discount_percent_off = coupon.percent_off || null;
      discountData.discount_amount_off = coupon.amount_off || null;
      discountData.discount_duration = coupon.duration;
      discountData.discount_end_date = subscription.discount.end || null;

      console.info(`Syncing subscription with discount: ${discountData.discount_code}`);
    }

    // Update subscription in database
    const { error: subError } = await supabase
      .from('stripe_subscriptions')
      .upsert(
        {
          customer_id: customer_id,
          subscription_id: subscription.id,
          price_id: subscription.items.data[0].price.id,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          ...(subscription.default_payment_method &&
          typeof subscription.default_payment_method !== 'string'
            ? {
                payment_method_brand:
                  subscription.default_payment_method.card?.brand ?? null,
                payment_method_last4:
                  subscription.default_payment_method.card?.last4 ?? null,
              }
            : {}),
          ...discountData,
          status: subscription.status,
        },
        {
          onConflict: 'customer_id',
        }
      );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Subscription synced successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in sync function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
