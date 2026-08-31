import React from 'react';
import { XCircle, ArrowLeft, RefreshCw, CreditCard } from 'lucide-react';

interface StripeCancelPageProps {
  onBack: () => void;
  onRetry?: () => void;
}

const StripeCancelPage: React.FC<StripeCancelPageProps> = ({ onBack, onRetry }) => {
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
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle size={40} className="text-orange-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Payment Cancelled
          </h1>
          
          <p className="text-lg text-slate-600 mb-6">
            Your payment was cancelled. No charges were made to your account.
          </p>
        </div>

        {/* Information */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">What happened?</h3>
          <div className="space-y-3 text-slate-700">
            <p>
              You cancelled the payment process before it was completed. This is completely normal and 
              no charges have been made to your payment method.
            </p>
            <p>
              If you experienced any issues during checkout or have questions about our pricing, 
              please don't hesitate to contact our support team.
            </p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">What would you like to do?</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <RefreshCw size={16} className="text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Try Again</h4>
                <p className="text-sm text-slate-600">
                  Ready to upgrade? You can restart the checkout process anytime.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CreditCard size={16} className="text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Continue with Free Plan</h4>
                <p className="text-sm text-slate-600">
                  You can continue using EquityTake with the free plan and upgrade later.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Common Issues */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">Common Issues & Solutions</h3>
          <div className="space-y-3 text-sm text-yellow-800">
            <div>
              <strong>Payment method declined:</strong> Try a different card or contact your bank
            </div>
            <div>
              <strong>Browser issues:</strong> Clear your cache or try a different browser
            </div>
            <div>
              <strong>Network problems:</strong> Check your internet connection and try again
            </div>
            <div>
              <strong>Still having trouble?</strong> Contact our support team for assistance
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <RefreshCw size={16} />
              Try Payment Again
            </button>
          )}
          
          <button
            onClick={onBack}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
          >
            Continue with Free Plan
          </button>
          
          <a
            href="mailto:equitytake@gmail.com"
            className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold"
          >
            <CreditCard size={16} />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default StripeCancelPage;