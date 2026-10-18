import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, ensureUserProfile } from '../lib/supabase';
import { trackLogin, trackCompleteRegistration } from '../lib/metaPixel';
import { trackEvent as trackGAEvent } from '../lib/googleAnalytics';
import { trackTikTokCompleteRegistration } from '../lib/tiktokPixel';
import { trackGoogleAdsConversion } from '../lib/googleAds';

const STARTUP_TIMEOUT_MS = 8000;
const MAX_RETRIES = 3;

// Network error detection helper — never logs sensitive data, only error shape.
const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  const msg = error.message?.toLowerCase() || '';
  const str = error.toString?.()?.toLowerCase() || '';
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('fetch error') ||
    msg.includes('networkerror') ||
    msg.includes('connection refused') ||
    msg.includes('connection failed') ||
    msg.includes('load failed') ||
    msg.includes('timeout') ||
    msg.includes('network request failed') ||
    msg.includes('fetch api cannot load') ||
    msg.includes('cors') ||
    str.includes('failed to fetch') ||
    str.includes('network error') ||
    str.includes('networkerror') ||
    str.includes('connection refused') ||
    str.includes('connection failed') ||
    str.includes('load failed') ||
    str.includes('timeout') ||
    str.includes('network request failed') ||
    str.includes('fetch api cannot load') ||
    str.includes('cors') ||
    (error.name === 'TypeError' && msg.includes('fetch'))
  );
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  // Guards against overlapping auth attempts.
  const initializingRef = useRef(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    let startupTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    resolvedRef.current = false;

    // Safety-net timeout: if loading is still true after STARTUP_TIMEOUT_MS,
    // force loading false and show a recoverable timeout state instead of an
    // infinite spinner. Guarantees visitors are never stuck on
    // "Loading application..." regardless of the failure mode.
    startupTimer = setTimeout(() => {
      if (resolvedRef.current || cancelled) return;
      console.warn('[auth] Startup timeout reached — showing recovery UI');
      setTimedOut(true);
      setLoading(false);
    }, STARTUP_TIMEOUT_MS);

    const initializeAuth = async () => {
      if (initializingRef.current) {
        console.warn('[auth] initializeAuth called while already running — skipping');
        return;
      }
      initializingRef.current = true;

      try {
        console.log('[auth] Initializing authentication');

        let retryCount = 0;
        let data: any = null;
        let lastError: any = null;

        // Retry loop handles BOTH thrown errors and non-throwing error
        // results (the Supabase custom fetch wrapper resolves with 503
        // instead of throwing, so the catch branch alone was insufficient).
        while (retryCount < MAX_RETRIES) {
          if (cancelled) return;
          try {
            const result = await supabase.auth.getSession();
            if (result.error && isNetworkError(result.error) && retryCount < MAX_RETRIES - 1) {
              lastError = result.error;
              retryCount++;
              console.warn(`[auth] getSession network error, attempt ${retryCount}/${MAX_RETRIES}`);
              await new Promise(r => setTimeout(r, 1000 * retryCount));
              continue;
            }
            data = result.data;
            lastError = result.error;
            break;
          } catch (fetchError) {
            lastError = fetchError;
            retryCount++;
            if (retryCount < MAX_RETRIES) {
              console.warn(`[auth] getSession threw, attempt ${retryCount}/${MAX_RETRIES}`);
              await new Promise(r => setTimeout(r, 1000 * retryCount));
            }
          }
        }

        if (cancelled) return;

        const error = lastError;

        if (error) {
          if (isNetworkError(error)) {
            console.warn('[auth] Network error during init — not signing out');
            // Do NOT sign out — a transient network failure must not log
            // users out or create duplicate profiles. Only surface an error
            // if we genuinely have no session.
            if (data?.session?.user) {
              setUser(data.session.user);
              setError(null);
            } else {
              setError(`Connection issue

Unable to reach the server. Please check your internet connection and try again.

This is usually temporary.`);
            }
            return;
          }

          if (error.message?.includes('User from sub claim in JWT does not exist')) {
            console.warn('[auth] Invalid JWT — user no longer exists, clearing local session');
            try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
            setUser(null);
            return;
          }

          if (error.message && (
            error.message.includes('Invalid Refresh Token: Refresh Token Not Found') ||
            error.message.includes('refresh_token_not_found') ||
            error.message.includes('Invalid Refresh Token')
          )) {
            console.warn('[auth] Invalid refresh token — clearing local session only');
            try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
            setUser(null);
            return;
          }

          console.error('[auth] Unhandled auth init error:', error.message || 'unknown');
          setError(`Authentication issue

${error.message || 'Authentication service unavailable'}

Please try refreshing the page.`);
          setUser(null);
          return;
        }

        console.log('[auth] Session initialized, user present:', !!data?.session?.user);
        setUser(data?.session?.user ?? null);
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        if (isNetworkError(err)) {
          console.warn('[auth] Network error during init (caught) — not signing out');
          setError(`Connection issue

Unable to reach the server. Please check your internet connection and try again.`);
        } else {
          console.error('[auth] Unexpected init error:', err?.message || 'unknown');
          setError(`Authentication issue

Please try refreshing the page. If the problem continues, please contact support.`);
        }
        setUser(null);
      } finally {
        if (!cancelled) {
          resolvedRef.current = true;
          initializingRef.current = false;
          setLoading(false);
          if (startupTimer) clearTimeout(startupTimer);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes. The callback is wrapped in try/finally so
    // that setLoading(false) ALWAYS runs even if the body throws (e.g. a
    // network error during ensureUserProfile). This is the critical fix:
    // previously a throw would skip setLoading(false) and leave the app
    // stuck on "Loading application..." indefinitely.
    let subscription: any;
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        (async () => {
          if (cancelled) return;
          console.log('[auth] State change:', event, session ? 'session present' : 'no session');
          try {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              setError(null);
            }

            if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || !session?.user) {
              setUser(null);
            } else {
              setUser(session.user);

              if (event === 'SIGNED_IN') {
                const provider = session.user.app_metadata?.provider;
                try {
                  const createdProfile = await ensureUserProfile(session.user);
                  if (createdProfile) {
                    trackGAEvent('sign_up', { method: provider || 'email' });
                    trackCompleteRegistration();
                    trackTikTokCompleteRegistration();
                    trackGoogleAdsConversion(session.user.id);
                  } else {
                    trackGAEvent('login', { method: provider || 'email' });
                    trackLogin();
                  }
                } catch (profileErr: any) {
                  // Profile creation failure must NOT block loading or sign
                  // the user out. Non-fatal — a later sign-in will retry.
                  console.warn('[auth] Profile ensure failed during SIGNED_IN:', profileErr?.message || 'unknown');
                }
              }
            }
          } catch (err: any) {
            console.error('[auth] Error in onAuthStateChange callback:', err?.message || 'unknown');
          } finally {
            if (!cancelled) {
              resolvedRef.current = true;
              setLoading(false);
              if (startupTimer) clearTimeout(startupTimer);
            }
          }
        })();
      });
      subscription = data.subscription;
    } catch (err) {
      console.error('[auth] Failed to set up auth state listener:', (err as any)?.message || 'unknown');
      setError('Connection issue — unable to establish authentication. Please refresh the page.');
      setLoading(false);
      if (startupTimer) clearTimeout(startupTimer);
    }

    return () => {
      cancelled = true;
      if (startupTimer) clearTimeout(startupTimer);
      if (subscription) {
        try { subscription.unsubscribe(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryNonce]);

  const retry = () => {
    console.log('[auth] Retry requested by user');
    setTimedOut(false);
    setError(null);
    setUser(null);
    setLoading(true);
    setRetryNonce(n => n + 1);
  };

  return { user, loading, error, timedOut, retry };
};
