import React, { useState } from 'react';
import { X, Check, Crown, Zap, Star, CreditCard, Loader2, FileText, ExternalLink, Gift } from 'lucide-react';
import { stripeAPI, STRIPE_PRODUCTS, PROMOTION_CODE_2_MONTHS_FREE } from '../lib/stripeApi';
import { trackInitiateCheckout } from '../lib/metaPixel';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct?: string;
  onShowTerms?: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, selectedProduct, onShowTerms }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handlePurchase = async (priceId: string, mode: 'payment' | 'subscription') => {
    if (!termsAccepted) {
      setError('Please accept the Terms & Conditions before proceeding with payment.');
      
      // Gently scroll to the Terms & Conditions section
      setTimeout(() => {
        const termsSection = document.getElementById('terms-acceptance-section');
        if (termsSection) {
          termsSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Add a subtle highlight effect to draw attention
          termsSection.style.transition = 'background-color 0.3s ease';
          termsSection.style.backgroundColor = '#fef3c7'; // yellow-100
          setTimeout(() => {
            termsSection.style.backgroundColor = '#f8fafc'; // slate-50
          }, 2000);
        }
      }, 100);
      return;
    }

    try {
      setLoading(priceId);
      setError('');
      
      trackInitiateCheckout();
      await stripeAPI.redirectToCheckout(priceId, mode, true, PROMOTION_CODE_2_MONTHS_FREE);
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.message || 'Failed to start checkout process');
    } finally {
      setLoading(null);
    }
  };

  const handleTermsLinkClick = () => {
    if (onShowTerms) {
      onShowTerms();
    } else {
      // Fallback: open in new tab if onShowTerms is not provided
      window.open('/terms', '_blank');
    }
  };

  if (!isOpen) return null;

  const monthlyProduct = STRIPE_PRODUCTS.find(p => p.id === 'premium_membership');
  const annualProduct = STRIPE_PRODUCTS.find(p => p.id === 'annual_premium');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Choose Your Plan</h3>
            <p className="text-slate-600">Unlock premium features to supercharge your startup journey</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Free Trial Banner */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 mb-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-0 right-8 -mb-6 w-16 h-16 bg-white/10 rounded-full"></div>
          <div className="relative flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Gift size={24} className="text-white" />
            </div>
            <div>
              <h4 className="text-lg font-bold">2 Months Free - No Charge Today</h4>
              <p className="text-sm text-white/90">
                Your first 2 months of full site access are on us. Cancel anytime, no questions asked.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Premium */}
          {monthlyProduct && (
            <div className={`relative border-2 rounded-xl p-6 transition-all ${
              selectedProduct === 'premium_membership' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:border-blue-300'
            }`}>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <Crown size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">{monthlyProduct.name}</h4>
                <p className="text-slate-600 text-sm mb-4">{monthlyProduct.description}</p>
                <div className="mb-2">
                  <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                    $0.00 for 2 months
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  <span className="text-slate-400 line-through text-lg mr-2">{stripeAPI.formatPrice(monthlyProduct.price)}</span>
                  <span>$0.00</span>
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  Then {stripeAPI.formatPrice(monthlyProduct.price)}/month after trial
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {monthlyProduct.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-green-600 flex-shrink-0" />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePurchase(monthlyProduct.priceId, 'subscription')}
                disabled={loading === monthlyProduct.priceId}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === monthlyProduct.priceId ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Start 2-Month Free Trial
                  </>
                )}
              </button>
            </div>
          )}

          {/* Annual Premium */}
          {annualProduct && (
            <div className={`relative border-2 rounded-xl p-6 transition-all ${
              selectedProduct === 'annual_premium' 
                ? 'border-green-500 bg-green-50' 
                : 'border-slate-200 hover:border-green-300'
            }`}>
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  MOST POPULAR
                </span>
              </div>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <Star size={24} className="text-white" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">{annualProduct.name}</h4>
                <p className="text-slate-600 text-sm mb-4">{annualProduct.description}</p>
                <div className="mb-2">
                  <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                    $0.00 for 2 months
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  <span className="text-slate-400 line-through text-lg mr-2">{stripeAPI.formatPrice(annualProduct.price)}</span>
                  <span>$0.00</span>
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  Then {stripeAPI.formatPrice(annualProduct.price)}/year after trial
                </div>
                <div className="text-sm text-green-600 font-medium mt-1">
                  Save 55% vs monthly
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {annualProduct.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-green-600 flex-shrink-0" />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePurchase(annualProduct.priceId, 'subscription')}
                disabled={loading === annualProduct.priceId}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === annualProduct.priceId ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Start 2-Month Free Trial
                  </>
                )}
              </button>
            </div>
          )}

        </div>

        {/* Terms & Conditions Acceptance */}
        <div id="terms-acceptance-section" className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terms-acceptance"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked && error.includes('Terms & Conditions')) {
                  setError('');
                }
              }}
              className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="terms-acceptance" className="text-sm text-slate-700 leading-relaxed">
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={handleTermsLinkClick}
                className="text-blue-600 hover:text-blue-700 underline font-medium inline-flex items-center gap-1"
              >
                Terms & Conditions
                <ExternalLink size={12} />
              </button>
              {' '}and understand the risks associated with startup investments and equity participation.
            </label>
          </div>
          
          {!termsAccepted && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <FileText size={12} />
              <span>Please review our terms before proceeding with payment</span>
            </div>
          )}
        </div>


        {/* Security Notice */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Secure Payment</span>
          </div>
          <p className="text-sm text-blue-800">
            All payments are processed securely by Stripe. We never store your payment information on our servers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;