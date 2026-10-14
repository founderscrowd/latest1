import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { signIn, signInWithGoogle } from '../lib/supabase';
import { trackLogin } from '../lib/metaPixel';
import { trackEvent as trackGAEvent, trackPageView as trackGAPageView } from '../lib/googleAnalytics';

interface SignInPageProps {
  siteLogoUrl?: string | null;
}

const SignInPage: React.FC<SignInPageProps> = ({ siteLogoUrl }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    trackGAPageView('/sign-in');
  }, []);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Could not start Google sign-in. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error.message);
      } else {
        trackLogin();
        trackGAEvent('login');
        navigate('/', { replace: true });
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Helmet>
        <title>Sign in to EquityTake</title>
        <meta name="description" content="Sign in to your EquityTake account to find co-founders, join startup groups, and discuss proposed equity splits." />
        <meta name="robots" content="noindex" />
        <link rel="canonical" href="https://equitytakeaway.com/sign-in" />
      </Helmet>

      <header className="bg-white border-b border-slate-200 py-3 sticky top-0 z-50 shadow-sm">
        <nav className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center hover:scale-105 transition-transform duration-300">
            {siteLogoUrl && siteLogoUrl.trim() !== '' ? (
              <img
                src={siteLogoUrl}
                alt="EquityTake Logo"
                className="h-32 max-w-[576px] md:max-w-[432px] sm:max-w-[288px] object-contain"
              />
            ) : (
              <span className="text-2xl font-bold text-slate-900">EquityTake</span>
            )}
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
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign in to EquityTake</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Use your EquityTake account. This is not a Google, bank, or other site login.
            </p>
          </div>

          <div className="mb-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 border border-slate-300 rounded-lg font-semibold text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M16.51 8.18c0-.57-.05-1.12-.14-1.65H9v3.12h4.21c-.18.97-.74 1.79-1.58 2.34v1.95h2.55c1.49-1.37 2.33-3.4 2.33-5.76z"/>
                <path fill="#34A853" d="M9 17c2.13 0 3.92-.71 5.22-1.92l-2.55-1.95c-.71.48-1.62.76-2.67.76-2.05 0-3.79-1.39-4.41-3.26H1.96v2.03A8 8 0 0 0 9 17z"/>
                <path fill="#FBBC05" d="M4.59 10.63A4.8 4.8 0 0 1 4.32 9c0-.57.1-1.11.27-1.63V5.34H1.96A8 8 0 0 0 1 9c0 1.29.31 2.51.96 3.66l3.63-2.03z"/>
                <path fill="#EA4335" d="M9 4.58c1.16 0 2.2.4 3.02 1.18l2.27-2.27C13.92 2.23 12.13 1.5 9 1.5A8 8 0 0 0 1.96 5.34l3.63 2.03C5.21 5.97 6.95 4.58 9 4.58z"/>
              </svg>
              {googleLoading ? 'Redirecting...' : 'Continue with Google'}
            </button>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-400">or</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                required
                minLength={6}
              />
            </div>

            <div className="text-right -mt-2">
              <Link
                to="/forgot-password/"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-slate-600">
              Don't have an account?
              <Link
                to="/?auth=signup"
                className="ml-2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
              >
                Sign Up
              </Link>
            </p>
            <p className="text-xs text-slate-400">
              <a
                href="https://equitytakeaway.com"
                className="hover:text-slate-600 transition-colors"
              >
                equitytakeaway.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignInPage;
