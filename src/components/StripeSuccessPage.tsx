import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowLeft, Crown, Zap, CreditCard, ExternalLink, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { stripeAPI, STRIPE_PRODUCTS } from '../lib/stripeApi';
import { trackPurchase } from '../lib/metaPixel';

interface StripeSuccessPageProps {
  onBack: () => void;
  sessionId?: string;
}

const StripeSuccessPage: React.FC<StripeSuccessPageProps> = ({ onBack, sessionId }) => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [isYearlyUpgrade, setIsYearlyUpgrade] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionId && !authLoading) {
      // Only fetch subscription data after auth has completed loading
      fetchUpdatedSubscription();
    } else {
      if (!authLoading) {
        setLoading(false);
      }
    }
  }, [sessionId, authLoading]);

  const fetchUpdatedSubscription = async () => {
    try {
      const subscriptionData = await stripeAPI.getUserSubscription();
      setSubscription(subscriptionData);
      
      // Check if this is a yearly plan upgrade
      if (subscriptionData?.price_id === 'price_1S8ktrFAQpARsbKQO5oJBCfm') {
        setIsYearlyUpgrade(true);
      }

      // Track the purchase with Meta Pixel
      if (subscriptionData?.price_id) {
        const product = STRIPE_PRODUCTS.find(p => p.priceId === subscriptionData.price_id);
        if (product) {
          trackPurchase(product.price / 100, product.currency.toUpperCase());
        }
      }
    } catch (err: any) {
      console.error('Error fetching updated subscription:', err);
      setError('Payment successful, but there was an issue loading your subscription details.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number | string | null | undefined) => {
    if (!timestamp) {
      return 'Not available';
    }

    let dateValue: number;
    if (typeof timestamp === 'string') {
      dateValue = parseInt(timestamp, 10);
    } else {
      dateValue = timestamp;
    }

    if (isNaN(dateValue) || dateValue === 0) {
      return 'Not available';
    }

    const date = new Date(dateValue * 1000);

    if (isNaN(date.getTime())) {
      return 'Not available';
    }

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getNextBillingDate = () => {
    if (!subscription) return 'Not available';

    if (subscription.discount_percent_off === 100 || subscription.discount_percent_off === '100') {
      return formatDate(subscription.discount_end_date || subscription.current_period_end);
    }

    return formatDate(subscription.current_period_end);
  };

  const hasDiscount = subscription && (subscription.discount_percent_off || subscription.discount_amount_off);
  const isFreeWithCoupon = subscription && (subscription.discount_percent_off === 100 || subscription.discount_percent_off === '100');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Home
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Payment Successful! 🎉
          </h1>
          
          {isYearlyUpgrade ? (
            <p className="text-lg text-slate-600 mb-6">
              Congratulations! You now have the yearly plan and you're saving 55% compared to monthly billing.
            </p>
          ) : (
            <p className="text-lg text-slate-600 mb-6">
              Thank you for upgrading to Premium. Your account has been updated with new features.
            </p>
          )}
        </div>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {/* Subscription Details */}
        {subscription && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Crown size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Your Premium Membership</h3>
                <p className="text-sm text-slate-600">Active and ready to use</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="font-medium text-green-900">Status</span>
                </div>
                <p className="text-green-800 capitalize">{subscription.subscription_status}</p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} className="text-blue-600" />
                  <span className="font-medium text-blue-900">Next Billing</span>
                </div>
                <p className="text-blue-800">{getNextBillingDate()}</p>
                {isFreeWithCoupon && (
                  <p className="text-xs text-blue-600 mt-1">Free trial ends on this date</p>
                )}
              </div>
            </div>

            {hasDiscount && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-green-600" />
                  <span className="font-medium text-green-900">Active Discount</span>
                </div>
                <div className="space-y-1">
                  {subscription.discount_percent_off && (
                    <p className="text-green-800 font-semibold">
                      {subscription.discount_percent_off}% off {subscription.discount_duration === 'repeating' ? 'for limited time' : subscription.discount_duration}
                    </p>
                  )}
                  {isFreeWithCoupon && (
                    <p className="text-sm text-green-700">
                      Your subscription is free until {formatDate(subscription.discount_end_date)}
                    </p>
                  )}
                  {subscription.discount_code && (
                    <p className="text-xs text-green-600 mt-2">
                      Coupon applied: {subscription.discount_code}
                    </p>
                  )}
                </div>
              </div>
            )}

            {subscription.payment_method_brand && subscription.payment_method_last4 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={16} className="text-slate-600" />
                  <span className="font-medium text-slate-900">Payment Method</span>
                </div>
                <p className="text-slate-700">
                  {subscription.payment_method_brand.toUpperCase()} ending in {subscription.payment_method_last4}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Conditional Content Based on Upgrade Type */}
        {isYearlyUpgrade ? (
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white mb-8">
            <h3 className="text-xl font-bold mb-4">🎉 Welcome to the Yearly Plan!</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">55% Annual Savings</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">Convenient Annual Billing</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">Priority Feature Access</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">All Premium Features</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">Locked-in Pricing</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white mb-8">
            <h3 className="text-xl font-bold mb-4">🚀 Premium Startup Features Unlocked!</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">Unlimited Group Creation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">Equity Management & Claims</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">Equity Structure Analytics</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">Group Chats & Forums</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">Co-founder Analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span className="font-medium">Priority Support</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center mt-8">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Start Using Premium Features
          </button>
        </div>
      </div>
    </div>
  );
};

export default StripeSuccessPage;