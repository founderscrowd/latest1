import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval?: 'month' | 'year';
  priceId: string;
  features: string[];
}

export interface StripeSubscription {
  customer_id: string;
  subscription_id: string;
  subscription_status: string;
  price_id: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  payment_method_brand?: string;
  payment_method_last4?: string;
  discount_code?: string;
  discount_percent_off?: number;
  discount_amount_off?: number;
  discount_duration?: string;
  discount_end_date?: number;
  discount_duration_in_months?: number;
}

export interface StripeOrder {
  customer_id: string;
  order_id: number;
  checkout_session_id: string;
  payment_intent_id: string;
  amount_subtotal: number;
  amount_total: number;
  currency: string;
  payment_status: string;
  order_status: string;
  order_date: string;
}

export const PROMOTION_CODE_2_MONTHS_FREE = '2MONTHSFREE';

// Predefined products - these would typically come from your Stripe dashboard
export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'premium_membership',
    name: 'Premium Membership',
    description: 'Access to premium features and priority support',
    price: 885, // $8.85
    currency: 'usd',
    interval: 'month',
    priceId: 'price_1S8kqUFAQpARsbKQUNrnL2oF', // Replace this with your actual live monthly price ID
    features: [
      'Join and claim equity with unlimited startup groups',
      'Create unlimited startups',
      'Advanced equity management tools',
      'Priority customer support',
      'Group chat',
      'Group forum'
    ]
  },
  {
    id: 'annual_premium',
    name: 'Premium Annual',
    description: 'Annual premium membership with 55% savings',
    price: 4800, 
    currency: 'usd',
    interval: 'year',
    priceId: 'price_1S8ktrFAQpARsbKQO5oJBCfm', // Replace this with your actual live annual price ID
    features: [
      'All Premium features',
      '55% savings vs monthly',
      'Annual billing',
      'Extended support hours'
    ]
  },
];

class StripeAPI {
  async createCheckoutSession(
    priceId: string, 
    mode: 'payment' | 'subscription' = 'subscription',
    successUrl?: string,
    cancelUrl?: string,
    allowPromotionCodes?: boolean,
    promotionCode?: string
  ): Promise<{ sessionId: string; url: string }> {
    try {
      // Get the current user's session with access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('User session not found. Please sign in again.');
      }
      
      if (!session.user) {
        throw new Error('User not authenticated');
      }

      const defaultSuccessUrl = `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`;
      const defaultCancelUrl = `${window.location.origin}/cancel`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: priceId,
          mode,
          success_url: successUrl || defaultSuccessUrl,
          cancel_url: cancelUrl || defaultCancelUrl,
          allow_promotion_codes: allowPromotionCodes ?? true,
          promotion_code: promotionCode
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  async redirectToCheckout(
    priceId: string,
    mode: 'payment' | 'subscription' = 'subscription',
    allowPromotionCodes?: boolean,
    promotionCode?: string
  ) {
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const { sessionId } = await this.createCheckoutSession(priceId, mode, undefined, undefined, allowPromotionCodes, promotionCode);
      
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (error) {
      console.error('Error redirecting to checkout:', error);
      throw error;
    }
  }

  async getUserSubscription(): Promise<StripeSubscription | null> {
    try {
      // Get the current session to verify auth state
      const { data: { session } } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        console.log('[getUserSubscription] No user found');
        return null;
      }

      console.log('[getUserSubscription] Auth Status:', {
        userId: userData.user.id,
        email: userData.user.email,
        hasSession: !!session,
        sessionValid: session ? 'yes' : 'no'
      });

      // Debug: Check if customer record exists
      const { data: customerData, error: customerError } = await supabase
        .from('stripe_customers')
        .select('*')
        .eq('user_id', userData.user.id)
        .is('deleted_at', null);

      console.log('[getUserSubscription] Customer Query:', {
        userId: userData.user.id,
        customerData,
        customerError
      });

      // Call the RPC function (returns array, not single object)
      const { data, error } = await supabase
        .rpc('get_user_subscription');

      console.log('[getUserSubscription] RPC Result:', {
        hasData: !!data,
        hasError: !!error,
        dataType: typeof data,
        isArray: Array.isArray(data),
        dataLength: Array.isArray(data) ? data.length : 'not array',
        dataKeys: data ? Object.keys(data) : [],
        data: data,
        error: error
      });

      if (error) {
        console.error('[getUserSubscription] RPC Error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      // RPC functions return arrays, so get the first element
      const subscriptionData = Array.isArray(data) && data.length > 0 ? data[0] : null;

      console.log('[getUserSubscription] Extracted subscription:', subscriptionData);

      // If we have data but no subscription_id, return null
      if (subscriptionData && !subscriptionData.subscription_id) {
        console.log('[getUserSubscription] Customer exists but no subscription:', {
          customerId: subscriptionData.customer_id,
          subscriptionId: subscriptionData.subscription_id
        });
        return null;
      }

      // Log success or no data
      if (subscriptionData && subscriptionData.subscription_id) {
        console.log('[getUserSubscription] ✅ SUCCESS - Active subscription found:', {
          subscription_id: subscriptionData.subscription_id,
          status: subscriptionData.subscription_status,
          price_id: subscriptionData.price_id,
          customer_id: subscriptionData.customer_id
        });
        return subscriptionData;
      } else {
        console.log('[getUserSubscription] No subscription record for this user');
        return null;
      }
    } catch (error) {
      console.error('[getUserSubscription] Unexpected error:', error);
      return null;
    }
  }

  async getUserOrders(): Promise<StripeOrder[]> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('stripe_user_orders')
        .select('*')
        .order('order_date', { ascending: false });

      if (error) {
        console.error('Error fetching user orders:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting user orders:', error);
      return [];
    }
  }

  async syncSubscriptionFromStripe(): Promise<void> {
    try {
      // Get customer ID from database
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: customerData, error: customerError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (customerError || !customerData) {
        throw new Error('No Stripe customer found');
      }

      // Trigger webhook manually by calling it with customer_id
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('User session not found');
      }

      // Call a sync edge function (we'll create this)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-sync-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customerData.customer_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync subscription');
      }

      return await response.json();
    } catch (error) {
      console.error('Error syncing subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(): Promise<void> {
    try {
      const subscription = await this.getUserSubscription();
      if (!subscription) throw new Error('No active subscription found');

      // Get the current user's session with access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('User session not found. Please sign in again.');
      }

      if (!session.user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_id: subscription.subscription_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  formatPrice(amount: number, currency: string = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  getProductById(productId: string): StripeProduct | undefined {
    return STRIPE_PRODUCTS.find(product => product.id === productId);
  }
}

export const stripeAPI = new StripeAPI();
export { stripePromise };