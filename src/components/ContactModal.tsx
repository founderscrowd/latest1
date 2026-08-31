import React from 'react';
import { X, Mail, MessageCircle, Clock, CheckCircle } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
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

  const handleEmailClick = () => {
    window.location.href = 'mailto:equitytake@gmail.com?subject=EquityTake Support Request';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageCircle size={20} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Contact Support</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Main Contact Info */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">
              We're Here to Help!
            </h4>
            <p className="text-slate-600 mb-4">
              Have questions about EquityTake, subscriptions, or need assistance? 
              Our team is ready to help you succeed.
            </p>
          </div>

          {/* Email Contact */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Mail size={18} className="text-blue-600" />
              <h5 className="font-semibold text-blue-900">Email Support</h5>
            </div>
            <div className="text-center">
              <button
                onClick={handleEmailClick}
                className="text-lg font-bold text-blue-600 hover:text-blue-700 transition-colors underline"
              >
                equitytake@gmail.com
              </button>
              <p className="text-sm text-blue-800 mt-2">
                Click to open your email client with a pre-filled subject line
              </p>
            </div>
          </div>

          {/* What We Can Help With */}
          <div>
            <h5 className="font-semibold text-slate-900 mb-3">What we can help with:</h5>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle size={14} className="text-green-600" />
                <span>Account and subscription questions</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle size={14} className="text-green-600" />
                <span>Group creation and management</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle size={14} className="text-green-600" />
                <span>Equity claims and allocations</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle size={14} className="text-green-600" />
                <span>Technical issues and bugs</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle size={14} className="text-green-600" />
                <span>Billing and payment support</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle size={14} className="text-green-600" />
                <span>Platform features and guidance</span>
              </div>
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-green-600" />
              <span className="font-semibold text-green-900">Response Time</span>
            </div>
            <p className="text-sm text-green-800">
              We typically respond within <strong>24 hours</strong> during business days. 
              For urgent issues, please mention "URGENT" in your subject line.
            </p>
          </div>

          {/* Close Button */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;