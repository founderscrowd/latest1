import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, CheckCircle, Lightbulb, AlertTriangle, Smile, Sparkles, HelpCircle, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { feedbackApi, FeedbackType } from '../lib/feedbackApi';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const feedbackTypes: { value: FeedbackType; label: string; icon: React.ReactNode }[] = [
  { value: 'suggestion', label: 'Suggest an improvement', icon: <Lightbulb size={18} /> },
  { value: 'problem', label: 'Report a problem', icon: <AlertTriangle size={18} /> },
  { value: 'experience', label: 'Tell us about my experience', icon: <Smile size={18} /> },
  { value: 'feature', label: 'Suggest a new feature', icon: <Sparkles size={18} /> },
  { value: 'confusing', label: 'Something is confusing', icon: <HelpCircle size={18} /> },
  { value: 'other', label: 'Other', icon: <MessageSquare size={18} /> },
];

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [feedbackType, setFeedbackType] = useState<FeedbackType | ''>('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (user?.email) {
        setEmail(user.email);
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, user]);

  const resetForm = () => {
    setFeedbackType('');
    setMessage('');
    setEmail(user?.email || '');
    setSuccess(false);
    setError('');
  };

  const handleSubmit = async () => {
    if (!feedbackType) {
      setError('Please select a feedback type.');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      setError('Please provide at least a few words of feedback.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await feedbackApi.submitFeedback({
        feedback_type: feedbackType as FeedbackType,
        message: message.trim(),
        email: user ? undefined : email.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        resetForm();
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Thank You!</h3>
            <p className="text-slate-600">
              Your feedback helps us improve EquityTake.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <MessageSquare size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Suggestions & Feedback</h3>
                  <p className="text-sm text-slate-500">Help us make EquityTake better</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block mb-3 font-semibold text-sm text-slate-700">
                  What would you like to do?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {feedbackTypes.map((ft) => (
                    <button
                      key={ft.value}
                      onClick={() => setFeedbackType(ft.value)}
                      className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-sm text-left transition-colors ${
                        feedbackType === ft.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={feedbackType === ft.value ? 'text-blue-600' : 'text-slate-400'}>
                        {ft.icon}
                      </span>
                      <span className="font-medium">{ft.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2 font-semibold text-sm text-slate-700">
                  Your feedback
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none text-sm"
                  placeholder="Tell us what you think, what isn't working, or what you would like EquityTake to do better."
                />
                <div className="text-right text-xs text-slate-400 mt-1">
                  {message.length}/2000
                </div>
              </div>

              {!user && (
                <div>
                  <label className="block mb-2 font-semibold text-sm text-slate-700">
                    Email address <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                      placeholder="your@email.com (leave blank to submit anonymously)"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    We'll only use this to follow up on your feedback.
                  </p>
                </div>
              )}

              {user && (
                <p className="text-xs text-slate-500">
                  Submitting as <strong>{user.email}</strong>
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Feedback
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
