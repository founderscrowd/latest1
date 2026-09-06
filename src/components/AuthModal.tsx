import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Mail, Lock, User, MailCheck, RotateCw, ArrowLeft } from 'lucide-react';
import { signIn, signUp, checkUsernameAvailability, resendVerificationEmail } from '../lib/supabase';
import { trackCompleteRegistration, trackLogin } from '../lib/metaPixel';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  initialIsSignUp?: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess, initialIsSignUp = false }) => {
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [displayNameAvailable, setDisplayNameAvailable] = useState<boolean | null>(null);
  const [checkingDisplayName, setCheckingDisplayName] = useState(false);
  const [displayNameChecked, setDisplayNameChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update isSignUp when initialIsSignUp prop changes
  useEffect(() => {
    setIsSignUp(initialIsSignUp);
  }, [initialIsSignUp]);

  // Debounced username availability check
  const checkUsername = useCallback(
    async (username: string) => {
      const trimmedUsername = username.trim();
      
      // Store the current username being checked to prevent race conditions
      const currentCheckingUsername = trimmedUsername;
      
      if (!trimmedUsername || trimmedUsername.length < 3) {
        setDisplayNameError('Display name must be at least 3 characters');
        setDisplayNameAvailable(false);
        setDisplayNameChecked(true);
        setCheckingDisplayName(false);
        return;
      }
      
      if (trimmedUsername.length > 30) {
        setDisplayNameError('Display name must be 30 characters or less');
        setDisplayNameAvailable(false);
        setDisplayNameChecked(true);
        setCheckingDisplayName(false);
        return;
      }
      
      // Check pattern (alphanumeric and spaces only)
      const pattern = /^[a-zA-Z0-9\s]+$/;
      if (!pattern.test(trimmedUsername)) {
        setDisplayNameError('Display name can only contain letters, numbers, and spaces');
        setDisplayNameAvailable(false);
        setDisplayNameChecked(true);
        setCheckingDisplayName(false);
        return;
      }
      
      setCheckingDisplayName(true);
      setDisplayNameError('');
      setDisplayNameAvailable(null);
      setDisplayNameChecked(false);
      
      try {
        const { available, error } = await checkUsernameAvailability(trimmedUsername);
        
        // Prevent race condition: only update state if this is still the current username
        if (currentCheckingUsername !== displayName.trim()) {
          console.log('Race condition detected, ignoring result for:', currentCheckingUsername);
          return;
        }
        
        if (error) {
          console.error('Username check failed:', error);
          setDisplayNameError('Error checking availability. Please try again.');
          setDisplayNameAvailable(false);
          setDisplayNameChecked(true);
        } else if (available) {
          setDisplayNameError('');
          setDisplayNameAvailable(true);
          setDisplayNameChecked(true);
        } else {
          setDisplayNameError('This display name is already taken');
          setDisplayNameAvailable(false);
          setDisplayNameChecked(true);
        }
      } catch (err) {
        // Only update state if this is still the current username
        if (currentCheckingUsername === displayName.trim()) {
          console.error('Username check exception:', err);
          setDisplayNameError('Error checking availability. Please try again.');
          setDisplayNameAvailable(false);
          setDisplayNameChecked(true);
        }
      } finally {
        // Only stop checking indicator if this is still the current username
        if (currentCheckingUsername === displayName.trim()) {
          setCheckingDisplayName(false);
        }
      }
    },
    [displayName]
  );

  // Debounce username checking
  useEffect(() => {
    if (!isSignUp || !displayName) {
      setDisplayNameError('');
      setDisplayNameAvailable(null);
      setCheckingDisplayName(false);
      return;
    }
    
    const trimmedUsername = displayName.trim();
    
    // Immediately reset states when user types
    setDisplayNameAvailable(null);
    setDisplayNameError('');
    setDisplayNameChecked(false);
    
    // Don't check usernames that are too short
    if (trimmedUsername.length < 3) {
      setDisplayNameError('Display name must be at least 3 characters');
      setDisplayNameAvailable(false);
      setDisplayNameChecked(true);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      checkUsername(trimmedUsername);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [displayName, isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Enhanced validation for sign up
    if (isSignUp) {
      // Password strength validation
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }
      
      // Username validation
      const trimmedUsername = displayName.trim();
      if (!trimmedUsername || trimmedUsername.length < 3) {
        setError('Display name is required and must be at least 3 characters');
        setLoading(false);
        return;
      }
      
      if (trimmedUsername.length > 30) {
        setError('Display name must be 30 characters or less');
        setLoading(false);
        return;
      }
      
      if (!/^[a-zA-Z0-9\s]+$/.test(trimmedUsername)) {
        setError('Display name can only contain letters, numbers, and spaces');
        setLoading(false);
        return;
      }

      
      // Double-check username availability before submission
      try {
        const { available, error: checkError } = await checkUsernameAvailability(trimmedUsername);
        if (checkError || !available) {
          setError('This username is already taken. Please choose a different username.');
          setDisplayNameAvailable(false);
          setDisplayNameError('This username is already taken');
          setLoading(false);
          return;
        }
      } catch (err) {
        setError('Error validating username. Please try again.');
        setLoading(false);
        return;
      }
    }

    try {
      let result;
      if (isSignUp) {
        result = await signUp(email, password, displayName.trim());
      } else {
        result = await signIn(email, password);
      }

      if (result.error) {
        // Check if it's a username constraint violation
        if (result.error.message && result.error.message.includes('username is already taken')) {
          setError(result.error.message);
          setDisplayNameAvailable(false);
          setDisplayNameError('This username is already taken');
        } else {
          setError(result.error.message);
        }
      } else {
        if (result.needsEmailConfirmation) {
          setSignedUpEmail(email);
          setShowVerificationScreen(true);
          setLoading(false);
          startResendCooldown();
          return;
        }

        if (isSignUp) {
          trackCompleteRegistration();
        } else {
          trackLogin();
        }

        onAuthSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || resendStatus === 'sending') return;
    setResendStatus('sending');
    setResendMessage('');

    const { error: resendError } = await resendVerificationEmail(signedUpEmail);

    if (resendError) {
      setResendStatus('error');
      setResendMessage(resendError);
    } else {
      setResendStatus('sent');
      setResendMessage('Verification email sent. Check your inbox and spam folder.');
      startResendCooldown();
    }
  };

  const handleUseDifferentEmail = () => {
    setShowVerificationScreen(false);
    setSignedUpEmail('');
    setResendCooldown(0);
    setResendStatus('idle');
    setResendMessage('');
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setDisplayNameError('');
    setDisplayNameAvailable(null);
    setDisplayNameChecked(false);
    setCheckingDisplayName(false);
    setError('');
    setIsSignUp(true);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setDisplayNameError('');
    setDisplayNameAvailable(null);
    setDisplayNameChecked(false);
    setCheckingDisplayName(false);
    setError('');
    setIsSignUp(initialIsSignUp);
    setShowVerificationScreen(false);
    setSignedUpEmail('');
    setResendCooldown(0);
    setResendStatus('idle');
    setResendMessage('');
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  if (showVerificationScreen) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-bold text-slate-900">Verify your email</h3>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center py-2">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <MailCheck size={28} className="text-blue-600" />
            </div>

            <p className="text-slate-700 font-medium mb-1">Almost there!</p>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              We sent a confirmation link to
              <span className="block font-semibold text-slate-800 mt-0.5">{signedUpEmail}</span>
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Click the link in that email to activate your account.
              Didn't arrive? Check your spam or junk folder, then try resending below.
            </p>

            {resendMessage && (
              <div
                className={`w-full px-3 py-2 rounded-lg text-sm mb-4 ${
                  resendStatus === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}
              >
                {resendMessage}
              </div>
            )}

            <button
              onClick={handleResendEmail}
              disabled={resendCooldown > 0 || resendStatus === 'sending'}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {resendStatus === 'sending' ? (
                <>
                  <RotateCw size={16} className="animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend available in ${resendCooldown}s`
              ) : (
                <>
                  <RotateCw size={16} />
                  Resend verification email
                </>
              )}
            </button>

            <button
              onClick={handleUseDifferentEmail}
              className="mt-3 text-sm text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} />
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-900">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h3>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
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

          {!isSignUp && (
            <div className="text-right -mt-2">
              <Link
                to="/forgot-password"
                onClick={onClose}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>
          )}

          {isSignUp && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Enter your name or nickname (this will be public)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-sm ${
                    displayNameError 
                      ? 'border-red-300 focus:border-red-500' 
                      : displayNameAvailable 
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-slate-300 focus:border-blue-500'
                  }`}
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9\s]+"
                />
              </div>
              
              {/* Display name validation feedback */}
              <div className="space-y-1">
                {checkingDisplayName && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                    Checking availability...
                  </p>
                )}
                
                {displayNameError && (
                  <p className="text-xs text-red-600">{displayNameError}</p>
                )}
                
                {displayNameAvailable && !checkingDisplayName && !displayNameError && (
                  <p className="text-xs text-green-600">✓ Display name is available</p>
                )}
                
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>This will be your public name and cannot be changed later</span>
                  <span>{displayName.length}/30</span>
                </div>
              </div>
            </>
          )}

          {isSignUp && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-sm"
                required
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              (isSignUp && (
                displayNameAvailable !== true ||
                checkingDisplayName || 
                !!displayNameError ||
                !displayName ||
                displayName.trim().length < 3
              ))
            }
            className="w-full bg-orange-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;