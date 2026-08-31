import React from 'react';
import { X, Crown, Star, DollarSign, Calendar, CheckCircle } from 'lucide-react';

interface PricingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

const PricingInfoModal: React.FC<PricingInfoModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  // Prevent background scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
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

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Monthly Plan */}
          <div className="border-2 border-slate-200 rounded-xl p-6 hover:border-blue-300 transition-all">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Crown size={24} className="text-white" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Monthly Premium</h4>
              <div className="text-3xl font-bold text-slate-900">
                $8.85
                <span className="text-lg font-normal text-slate-600">/month</span>
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

            <div className="text-center">
              <div className="text-sm text-slate-600 mb-2">Perfect for getting started</div>
              <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                <Calendar size={12} />
                <span>Billed monthly</span>
              </div>
            </div>
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
              <div className="text-3xl font-bold text-slate-900">
                $48.00
                <span className="text-lg font-normal text-slate-600">/year</span>
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
                <span className="text-slate-700">Extended support hours</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Priority feature access</span>
              </li>
            </ul>

            <div className="text-center">
              <div className="text-sm text-green-700 mb-2">Best for serious entrepreneurs</div>
              <div className="flex items-center justify-center gap-1 text-xs text-green-600">
                <Calendar size={12} />
                <span>Billed annually</span>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <p className="text-slate-600 mb-6">
            Join the marketplace where innovative startups are born and co-founders connect to build the next big thing.
          </p>
          
          {onUpgrade && (
            <button
              onClick={() => {
                onUpgrade();
                onClose();
              }}
              className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Get Started Today
            </button>
          )}
        </div>

        {/* Features Highlight */}
        <div className="mt-8 p-6 bg-slate-50 rounded-lg">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 text-center">Why Choose EquityTake Premium?</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Crown size={20} className="text-blue-600" />
              </div>
              <h5 className="font-medium text-slate-900 mb-1">Unlimited Access</h5>
              <p className="text-slate-600">Create and join unlimited startup groups</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <DollarSign size={20} className="text-green-600" />
              </div>
              <h5 className="font-medium text-slate-900 mb-1">Equity Tools</h5>
              <p className="text-slate-600">Advanced equity management and tracking</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Star size={20} className="text-purple-600" />
              </div>
              <h5 className="font-medium text-slate-900 mb-1">Priority Support</h5>
              <p className="text-slate-600">Get help when you need it most</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingInfoModal;