import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Network error detection helper
const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorString = error.toString?.()?.toLowerCase() || '';
  
  return (
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network error') ||
    errorMessage.includes('fetch error') ||
    errorMessage.includes('networkerror') ||
    errorMessage.includes('connection refused') ||
    errorMessage.includes('connection failed') ||
    errorMessage.includes('load failed') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('network request failed') ||
    errorMessage.includes('fetch api cannot load') ||
    errorMessage.includes('cors') ||
    errorString.includes('failed to fetch') ||
    errorString.includes('network error') ||
    errorString.includes('networkerror') ||
    errorString.includes('connection refused') ||
    errorString.includes('connection failed') ||
    errorString.includes('load failed') ||
    errorString.includes('timeout') ||
    errorString.includes('network request failed') ||
    errorString.includes('fetch api cannot load') ||
    errorString.includes('cors') ||
    error.name === 'TypeError' && errorMessage.includes('fetch')
  );
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing authentication...');
        
        // Add a longer delay and retry mechanism for connection issues
        await new Promise(resolve => setTimeout(resolve, 500));
        
        let retryCount = 0;
        const maxRetries = 3;
        let data, error;
        
        while (retryCount < maxRetries) {
          try {
            const result = await supabase.auth.getSession();
            data = result.data;
            error = result.error;
            break;
          } catch (fetchError) {
            retryCount++;
            console.warn(`🔄 Auth initialization attempt ${retryCount}/${maxRetries} failed:`, fetchError);
            
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            } else {
              error = fetchError;
            }
          }
        }
        
        if (error) {
          // Handle network errors gracefully
          if (isNetworkError(error)) {
            console.error('⚠️ Network error during auth initialization:', error.message);
            console.warn('🔧 This usually means:');
            console.warn('  - Internet connection problems');
            console.warn('  - Supabase project is paused/inactive');
            console.warn('  - Firewall/VPN blocking connection');
            console.warn('  - Incorrect Supabase URL in .env file');
            console.warn('📋 Please check your Supabase project status and network connection');
            // Set error message for user to see
            setError(`🔌 Connection Issue

Unable to connect to the server: ${error.message || 'Network error'}

This is usually temporary. Please try:
• Refreshing the page
• Checking your internet connection
• Waiting a moment and trying again

If the problem persists, the service may be temporarily unavailable.`);
            setUser(null);
            setLoading(false);
            return;
          }
          
          // Handle invalid JWT for non-existent user
          if (error.message && error.message.includes('User from sub claim in JWT does not exist')) {
            console.warn('⚠️ Invalid JWT token detected - user no longer exists');
            console.warn('🔧 Clearing invalid session from local storage');
            try {
              await supabase.auth.signOut({ scope: 'local' });
              console.log('✅ Invalid session cleared successfully');
            } catch (signOutError) {
              console.warn('⚠️ Error clearing invalid session:', signOutError);
            }
            setUser(null);
            setLoading(false);
            return;
          }
          
          // Handle invalid refresh token errors (check both message and error details)
          if (error.message && (
            error.message.includes('Invalid Refresh Token: Refresh Token Not Found') ||
            error.message.includes('refresh_token_not_found') ||
            error.message.includes('Invalid Refresh Token')
          )) {
            console.warn('⚠️ Invalid refresh token detected - clearing session');
            console.warn('🔧 Clearing invalid session from local storage');
            try {
              await supabase.auth.signOut({ scope: 'local' });
              console.log('✅ Invalid refresh token session cleared successfully');
            } catch (signOutError) {
              console.warn('⚠️ Error clearing invalid refresh token session:', signOutError);
            }
            setUser(null);
            setError(null); // Clear error after handling invalid refresh token
            setLoading(false);
            return;
          }
          
          // Handle other auth errors
          console.error('Auth initialization error:', error);
          setError(`❌ Authentication Error

${error.message || 'Authentication service unavailable'}

Please check your internet connection and try refreshing the page.`);
          setUser(null);
          setLoading(false);
          return;
        }
        
        console.log('✅ Authentication initialized successfully');
        setUser(data.session?.user ?? null);
        setError(null); // Clear any previous errors on successful initialization
        setLoading(false);
      } catch (error: any) {
        // Handle network connectivity issues
        if (isNetworkError(error)) {
          console.error('⚠️ Network connectivity issue during auth initialization:', error.message);
          console.warn('🔧 This usually indicates:');
          console.warn('  - Internet connection problems');
          console.warn('  - Supabase project is paused/inactive');
          console.warn('  - Firewall/VPN blocking connection');
          console.warn('  - Incorrect Supabase URL in .env file');
          console.warn('📋 Please check your Supabase project status and network connection');
          
          setError(`🔌 Connection Issue

Unable to connect to the server: ${error.message || 'Network error'}

This is usually temporary. Please try:
• Refreshing the page
• Checking your internet connection
• Waiting a moment and trying again

If the problem persists, the service may be temporarily unavailable.`);
          setUser(null);
          setLoading(false);
          return;
        }
        
        console.error('Unexpected error during auth initialization:', error);
        setError(`⚠️ Authentication Issue

${error.message || 'Unexpected error occurred'}

Please try refreshing the page. If the problem continues, please contact support.`);
        setUser(null);
        setLoading(false);
      }
    };
    
    initializeAuth();

    // Listen for auth changes
    let subscription: any;
    
    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔄 Auth state change:', event, session ? 'User present' : 'No user');
          // Only clear errors on successful auth events
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setError(null);
          }
          
          // Clear session data for sign-out events or when user is null
          if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || !session?.user) {
            setUser(null);
          } else {
            setUser(session.user);
          }
          setLoading(false);
        }
      );
      subscription = data.subscription;
    } catch (error) {
      console.error('❌ Failed to set up auth state listener:', error);
      setError('🔌 Connection Issue\n\nUnable to establish connection. Please refresh the page and try again.');
      setLoading(false);
    }

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.warn('⚠️ Error unsubscribing from auth changes:', error);
        }
      }
    };
  }, []);

  return { user, loading, error };
};