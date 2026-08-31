import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ForgotPasswordPageProps {
  siteLogoUrl?: string | null;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ siteLogoUrl }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-3 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center hover:scale-105 transition-transform duration-300">
            {siteLogoUrl && siteLogoUrl.trim() !== '' ? (
              <img
                src={siteLogoUrl}
                alt="EquityTake Logo"
                className="h-32 max-w-[576px] md:max-w-[432px] sm:max-w-[288px] object-contain"
              />
            ) : null}
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-xs text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Check Your Email</h2>
              <p className="text-slate-600 mb-6">
                We've sent a password reset link to <strong>{email}</strong>.
                Click the link in the email to reset your password.
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  className="w-full px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Try Different Email
                </button>
                <Link
                  to="/"
                  className="block w-full px-4 py-2.5 bg-orange-600 text-white rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors text-center"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Forgot Password?</h2>
                <p className="text-slate-600 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-orange-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/"
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPasswordPage;
