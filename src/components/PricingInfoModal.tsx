import React from 'react';
import { X, Crown, Star, CheckCircle, Gift, ShieldCheck } from 'lucide-react';

interface PricingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

const PricingInfoModal: React.FC<PricingInfoModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Access the Greatest Startups Marketplace on Earth</h3>
            <p className="text-slate-600 mt-2">Join thousands of entrepreneurs building the future together</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 2 Months Free Banner */}
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

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Monthly Plan */}
          <div className="border-2 border-slate-200 rounded-xl p-6 hover:border-blue-300 transition-all">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Crown size={24} className="text-white" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Monthly Premium</h4>
              <div className="mb-2">
                <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                  $0.00 for 2 months
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                <span className="text-slate-400 line-through text-lg mr-2">$8.85</span>
                <span>$0.00</span>
              </div>
              <div className="text-sm text-slate-500 mt-1">
                Then $8.85/month after trial
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Create unlimited groups</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Advanced equity management tools</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Priority customer support</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Enhanced group analytics</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Custom group branding</span>
              </li>
            </ul>
          </div>

          {/* Annual Plan */}
          <div className="relative border-2 border-green-500 bg-green-50 rounded-xl p-6 transition-all">
            {/* Popular Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                BEST VALUE
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Star size={24} className="text-white" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Annual Premium</h4>
              <div className="mb-2">
                <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                  $0.00 for 2 months
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                <span className="text-slate-400 line-through text-lg mr-2">$48.00</span>
                <span>$0.00</span>
              </div>
              <div className="text-sm text-slate-500 mt-1">
                Then $48.00/year after trial
              </div>
              <div className="text-sm text-green-600 font-medium mt-1">
                Save 55% vs monthly
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-slate-700">All Premium features</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-slate-700">55% savings vs monthly</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Annual billing convenience</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Priority feature access</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          {onUpgrade && (
            <button
              onClick={() => {
                onUpgrade();
                onClose();
              }}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Start 2-Month Free Trial
            </button>
          )}
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-600">
            <ShieldCheck size={16} className="text-green-600" />
            <span>No charge for 2 months. Cancel anytime, no questions asked.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingInfoModal;
