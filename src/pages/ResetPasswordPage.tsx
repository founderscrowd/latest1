import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ResetPasswordPageProps {
  siteLogoUrl?: string | null;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ siteLogoUrl }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkRecoveryToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');

      if (type === 'recovery' && accessToken) {
        setValidToken(true);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setValidToken(true);
        } else {
          setValidToken(false);
        }
      }
    };

    checkRecoveryToken();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidToken(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (validToken === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (validToken === false) {
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
          </nav>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-red-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Invalid or Expired Link</h2>
            <p className="text-slate-600 mb-6">
              This password reset link is invalid or has expired.
              Please request a new password reset link.
            </p>
            <div className="space-y-3">
              <Link
                to="/forgot-password"
                className="block w-full px-4 py-2.5 bg-orange-600 text-white rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors text-center"
              >
                Request New Link
              </Link>
              <Link
                to="/"
                className="block w-full px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors text-center"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Updated!</h2>
              <p className="text-slate-600 mb-6">
                Your password has been successfully updated.
                You will be redirected to the home page in a few seconds.
              </p>
              <Link
                to="/"
                className="block w-full px-4 py-2.5 bg-orange-600 text-white rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors text-center"
              >
                Go to Home Now
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Reset Your Password</h2>
                <p className="text-slate-600 text-sm">
                  Enter your new password below.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                    required
                    minLength={8}
                    autoFocus
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                    required
                    minLength={8}
                  />
                </div>

                <p className="text-xs text-slate-500">
                  Password must be at least 8 characters long
                </p>

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full bg-orange-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPasswordPage;
