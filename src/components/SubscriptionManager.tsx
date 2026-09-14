import React, { useState, useEffect } from 'react';
import { Crown, CreditCard, Calendar, AlertTriangle, CheckCircle, XCircle, RefreshCw, ExternalLink, TrendingUp, Zap } from 'lucide-react';
import { stripeAPI, StripeSubscription, StripeOrder } from '../lib/stripeApi';
import { useAuth } from '../hooks/useAuth';

interface SubscriptionManagerProps {
  onUpgrade?: () => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onUpgrade }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<StripeSubscription | null>(null);
  const [orders, setOrders] = useState<StripeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState<'monthly' | 'yearly' | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      console.log('[SubscriptionManager] Starting fetch...');

      const [subscriptionData, ordersData] = await Promise.all([
        stripeAPI.getUserSubscription(),
        stripeAPI.getUserOrders()
      ]);

      console.log('[SubscriptionManager] Received subscription:', subscriptionData);
      console.log('[SubscriptionManager] Received orders:', ordersData);

      setSubscription(subscriptionData);
      setOrders(ordersData);

      // Determine subscription type based on price_id
      if (subscriptionData?.price_id) {
        console.log('[SubscriptionManager] Price ID:', subscriptionData.price_id);
        if (subscriptionData.price_id === 'price_1S8kqUFAQpARsbKQUNrnL2oF') {
          setSubscriptionType('monthly');
          console.log('[SubscriptionManager] Set to monthly');
        } else if (subscriptionData.price_id === 'price_1S8ktrFAQpARsbKQO5oJBCfm') {
          setSubscriptionType('yearly');
          console.log('[SubscriptionManager] Set to yearly');
        }
      } else {
        console.log('[SubscriptionManager] No subscription data or price_id');
      }
    } catch (err: any) {
      console.error('[SubscriptionManager] Error fetching subscription data:', err);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
      console.log('[SubscriptionManager] Loading complete');
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    // Show comprehensive warning about equity loss
    const confirmMessage = `⚠️ CRITICAL WARNING: SUBSCRIPTION CANCELLATION WILL RESULT IN EQUITY LOSS

🚨 IMMEDIATE CONSEQUENCES:
• ALL PENDING EQUITY CLAIMS will be automatically CANCELLED
• ALL APPROVED EQUITY CLAIMS may be REVOKED at group discretion
• You will LOSE ACCESS to all equity management tools
• You will be REMOVED from premium groups you created
• You will LOSE all equity tracking and analytics
• NO REFUNDS will be provided for lost equity

💰 FINANCIAL IMPACT:
Any equity you have claimed or been approved for in startup groups may be permanently forfeited. This could represent significant financial value that cannot be recovered.

📋 WHAT HAPPENS NEXT:
• Your subscription will remain active until ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}
• After that date, you'll lose access to premium features
• Group creators may choose to revoke your equity claims
• You'll be downgraded to the free plan with limited features

🔒 THIS ACTION CANNOT BE UNDONE

Are you absolutely sure you want to cancel your subscription and risk losing your equity claims?`;

    // Use custom confirmation instead of browser confirm
    setShowCancelConfirm(true);
  };

  const handleConfirmCancellation = async () => {
    try {
      setActionLoading(true);
      await stripeAPI.cancelSubscription();
      await fetchSubscriptionData(); // Refresh data
      setShowCancelConfirm(false);
      setError(''); // Clear any previous errors
      setSuccessMessage('Sorry to see you go! Your subscription has been cancelled. Welcome back anytime! 🙋‍♂️');
      setTimeout(() => setSuccessMessage(''), 8000);
    } catch (err: any) {
      console.error('Error canceling subscription:', err);
      setError('Failed to cancel subscription. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncSubscription = async () => {
    try {
      setSyncLoading(true);
      setError('');
      await stripeAPI.syncSubscriptionFromStripe();
      await fetchSubscriptionData();
      setSuccessMessage('Subscription synced successfully from Stripe!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error('Error syncing subscription:', err);
      setError('Failed to sync subscription. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleUpgradeToYearly = async () => {
    if (!subscription || subscriptionType !== 'monthly') return;

    try {
      setUpgradeLoading(true);
      // Redirect to checkout for yearly subscription
      await stripeAPI.redirectToCheckout('price_1S8ktrFAQpARsbKQO5oJBCfm', 'subscription', true);
    } catch (err: any) {
      console.error('Error upgrading to yearly:', err);
      setError('Failed to upgrade subscription. Please try again.');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'canceled':
      case 'past_due':
        return 'text-red-600 bg-red-100';
      case 'trialing':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'canceled':
      case 'past_due':
        return <XCircle size={16} className="text-red-600" />;
      case 'trialing':
        return <Crown size={16} className="text-blue-600" />;
      default:
        return <AlertTriangle size={16} className="text-slate-600" />;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Debug logging for render
  console.log('[SubscriptionManager RENDER] State:', {
    loading,
    hasSubscription: !!subscription,
    subscription,
    subscriptionType,
    error
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Crown size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Subscription Status</h3>
            <p className="text-sm text-slate-600">Manage your premium membership</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm mb-4">
            {successMessage}
          </div>
        )}

        {subscription ? (
          <div className="space-y-4">
            {/* Status */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(subscription.subscription_status)}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">Premium Membership</span>
                    {subscriptionType && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        subscriptionType === 'yearly' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {subscriptionType === 'yearly' ? 'Annual Plan' : 'Monthly Plan'}
                      </span>
                    )}
                    {subscription.cancel_at_period_end && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-800">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <div className={`text-sm px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                    subscription.cancel_at_period_end 
                      ? 'bg-orange-100 text-orange-800'
                      : getStatusColor(subscription.subscription_status)
                  }`}>
                    {subscription.cancel_at_period_end 
                      ? 'Active until cancellation'
                      : subscription.subscription_status.charAt(0).toUpperCase() + subscription.subscription_status.slice(1)
                    }
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div>
                  <div className="text-sm text-slate-600">
                    {subscription.cancel_at_period_end ? 'Subscription ends' : 'Next billing'}
                  </div>
                  <div className={`font-semibold ${
                    subscription.cancel_at_period_end ? 'text-orange-600' : 'text-slate-900'
                  }`}>
                    {formatDate(subscription.current_period_end)}
                  </div>
                  {subscription.cancel_at_period_end && (
                    <div className="text-xs text-orange-600 mt-1">
                      No further charges will be made
                    </div>
                  )}
                </div>
                
                {/* Upgrade to Yearly Option */}
                {subscriptionType === 'monthly' && subscription.subscription_status === 'active' && (
                  <div className="text-right">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-green-900 mb-1">Save 55% with Annual</div>
                      <div className="text-xs text-green-700 mb-2">Switch to yearly billing</div>
                      <button
                        onClick={handleUpgradeToYearly}
                        disabled={upgradeLoading}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {upgradeLoading ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                        ) : (
                          <TrendingUp size={12} />
                        )}
                        Upgrade to Annual
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Details */}
            {subscriptionType && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Crown size={16} className="text-blue-600" />
                  <span className="font-medium text-blue-900">Plan Details</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Billing Cycle:</span>
                    <span className="ml-2 text-blue-800">
                      {subscriptionType === 'yearly' ? 'Annual' : 'Monthly'}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Price:</span>
                    <span className="ml-2 text-blue-800">
                      {subscription.discount_percent_off === 100 && subscription.discount_duration === 'forever' ? (
                        <span className="text-green-700 font-semibold">FREE (Lifetime Access)</span>
                      ) : subscription.discount_percent_off === 100 && subscription.discount_duration === 'repeating' ? (
                        <span className="text-green-700 font-semibold">
                          FREE for {subscription.discount_duration_in_months || 2} months
                        </span>
                      ) : subscription.discount_percent_off ? (
                        <span>
                          <span className="line-through text-slate-500">
                            {subscriptionType === 'yearly' ? '$48.00/year' : '$8.85/month'}
                          </span>
                          <span className="ml-2 text-green-700 font-semibold">
                            {subscription.discount_percent_off}% OFF
                          </span>
                        </span>
                      ) : (
                        subscriptionType === 'yearly' ? '$48.00/year' : '$8.85/month'
                      )}
                    </span>
                  </div>
                  {subscription.discount_code && (
                    <div className="md:col-span-2 bg-green-100 border border-green-300 rounded p-2">
                      <span className="text-green-800 font-medium">Coupon Applied:</span>
                      <span className="ml-2 text-green-900 font-semibold">{subscription.discount_code}</span>
                      {subscription.discount_duration === 'forever' && (
                        <span className="ml-2 text-green-700">(Lifetime discount)</span>
                      )}
                      {subscription.discount_duration === 'repeating' && subscription.discount_end_date && (
                        <span className="ml-2 text-green-700">
                          (Free until {formatDate(subscription.discount_end_date)})
                        </span>
                      )}
                    </div>
                  )}
                  {subscriptionType === 'yearly' && !subscription.discount_percent_off && (
                    <div className="md:col-span-2">
                      <span className="text-green-700 font-medium">Annual Savings:</span>
                      <span className="ml-2 text-green-800">$58.20 (55% off monthly rate)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Billing Period Info or Discount Info */}
            {subscription.discount_percent_off === 100 && subscription.discount_duration === 'forever' ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-600" />
                  <div>
                    <div className="font-semibold text-green-900">Lifetime Access</div>
                    <div className="text-sm text-green-700">No billing required - you have lifetime premium access!</div>
                  </div>
                </div>
              </div>
            ) : subscription.discount_percent_off === 100 && subscription.discount_duration === 'repeating' ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-green-600" />
                  <div>
                    <div className="font-semibold text-green-900">
                      {subscription.discount_duration_in_months || 2} Months Free
                    </div>
                    <div className="text-sm text-green-700">
                      Your subscription is free until {formatDate(subscription.discount_end_date)}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Regular billing starts after the free period ends
                    </div>
                  </div>
                </div>
              </div>
            ) : subscription.discount_percent_off ? (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">Next billing</div>
                <div className="font-semibold text-slate-900">
                  {formatDate(subscription.current_period_end)}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {subscription.discount_percent_off}% discount applied
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600">Next billing</div>
                <div className="font-semibold text-slate-900">
                  {formatDate(subscription.current_period_end)}
                </div>
              </div>
            )}

            {/* Payment Method */}
            {subscription.payment_method_brand && subscription.payment_method_last4 && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className="text-slate-600" />
                  <div>
                    <div className="font-semibold text-slate-900">Payment Method</div>
                    <div className="text-sm text-slate-600">
                      {subscription.payment_method_brand.toUpperCase()} ending in {subscription.payment_method_last4}
                    </div>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Update
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => fetchSubscriptionData()}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={actionLoading ? 'animate-spin' : ''} />
                Refresh
              </button>

              <button
                onClick={handleSyncSubscription}
                disabled={syncLoading}
                className="flex items-center gap-2 px-4 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                title="Sync subscription data from Stripe to update discount information"
              >
                <Zap size={16} className={syncLoading ? 'animate-pulse' : ''} />
                {syncLoading ? 'Syncing...' : 'Sync from Stripe'}
              </button>
              
              {subscription.subscription_status === 'active' && !subscription.cancel_at_period_end && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Cancel Subscription
                </button>
              )}
              
              {subscription.cancel_at_period_end && (
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-lg">
                  <AlertTriangle size={16} />
                  <div>
                    <div className="font-medium">Subscription Cancelled</div>
                    <div className="text-sm">Access ends on {formatDate(subscription.current_period_end)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Crown size={48} className="text-slate-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-slate-900 mb-2">All Features Unlocked</h4>
            <p className="text-slate-600">
              EquityTake is completely free. You have full access to all features, no subscription required.
            </p>
          </div>
        )}
      </div>

      {/* Cancel Subscription Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Cancel Subscription</h3>
            </div>

            <div className="mb-6 max-h-[60vh] overflow-y-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h4 className="font-bold text-red-900 mb-3">⚠️ CRITICAL WARNING: SUBSCRIPTION CANCELLATION WILL RESULT IN EQUITY LOSS</h4>
                
                <div className="space-y-3 text-red-800">
                  <div>
                    <h5 className="font-semibold mb-2">🚨 IMMEDIATE CONSEQUENCES:</h5>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                      <li>ALL PENDING EQUITY CLAIMS will be automatically CANCELLED</li>
                      <li>ALL APPROVED EQUITY CLAIMS may be REVOKED at group discretion</li>
                      <li>You will LOSE ACCESS to all equity management tools</li>
                      <li>You will be REMOVED from premium groups you created</li>
                      <li>You will LOSE all equity tracking and analytics</li>
                      <li>NO REFUNDS will be provided for lost equity</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-2">💰 FINANCIAL IMPACT:</h5>
                    <p className="text-sm">
                      Any equity you have claimed or been approved for in startup groups may be permanently forfeited. 
                      This could represent significant financial value that cannot be recovered.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-2">📋 WHAT HAPPENS NEXT:</h5>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                      <li>Your subscription will remain active until {new Date(subscription?.current_period_end ? subscription.current_period_end * 1000 : Date.now()).toLocaleDateString()}</li>
                      <li>After that date, you'll lose access to premium features</li>
                      <li>Group creators may choose to revoke your equity claims</li>
                      <li>You'll be downgraded to the free plan with limited features</li>
                    </ul>
                  </div>

                  <div className="bg-red-100 border border-red-300 rounded p-3 mt-4">
                    <p className="font-bold text-center">🔒 THIS ACTION CANNOT BE UNDONE</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleConfirmCancellation}
                disabled={actionLoading}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Cancel Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order History */}
      {orders.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Order History
          </h3>
          
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.order_id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <CreditCard size={16} className="text-slate-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {stripeAPI.formatPrice(order.amount_total, order.currency || 'usd')}
                    </div>
                    <div className="text-sm text-slate-600">
                      {new Date(order.order_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-sm px-2 py-1 rounded-full ${
                    order.order_status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : order.order_status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {order.order_status ? order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1) : 'Unknown'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Billing Information</span>
        </div>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• All payments are processed securely by Stripe</p>
          <p>• You can cancel your subscription at any time</p>
          <p>• Refunds are subject to our terms of service</p>
          <p>• For billing questions, contact support</p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;