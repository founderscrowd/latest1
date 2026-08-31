import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { subscription_id } = await req.json();

    if (!subscription_id) {
      return corsResponse({ error: 'Missing subscription_id' }, 400);
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      return corsResponse({ error: 'User not found' }, 404);
    }

    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError || !customer) {
      return corsResponse({ error: 'Customer not found' }, 404);
    }

    const subscription = await stripe.subscriptions.retrieve(subscription_id);
    
    if (subscription.customer !== customer.customer_id) {
      return corsResponse({ error: 'Unauthorized: Subscription does not belong to user' }, 403);
    }

    const cancelledSubscription = await stripe.subscriptions.update(subscription_id, {
      cancel_at_period_end: true,
    });

    console.log(`Cancelled subscription ${subscription_id} for customer ${customer.customer_id}`);

    const { error: updateError } = await supabase
      .from('stripe_subscriptions')
      .update({
        cancel_at_period_end: true,
        status: cancelledSubscription.status,
      })
      .eq('subscription_id', subscription_id);

    if (updateError) {
      console.error('Error updating subscription in database:', updateError);
    }

    return corsResponse({ 
      success: true, 
      message: 'Subscription cancelled successfully',
      cancel_at_period_end: true,
      current_period_end: cancelledSubscription.current_period_end
    });
  } catch (error: any) {
    console.error(`Subscription cancellation error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});