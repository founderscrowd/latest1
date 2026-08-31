import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Enhanced configuration validation with detailed debugging
console.log('🔍 Supabase Configuration Check:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ MISSING',
  key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 30)}...` : '❌ MISSING',
  urlType: typeof supabaseUrl,
  keyType: typeof supabaseAnonKey,
  urlLength: supabaseUrl?.length || 0,
  keyLength: supabaseAnonKey?.length || 0,
  rawUrl: import.meta.env.VITE_SUPABASE_URL,
  rawKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
});

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined' || supabaseUrl === '' || supabaseAnonKey === '') {
  console.error('Supabase environment variables:', { supabaseUrl, supabaseAnonKey })
  throw new Error(`
    Missing or invalid Supabase environment variables. 
    
    Please check your .env file and ensure you have:
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    
    You can find these values in your Supabase Dashboard > Settings > API
    
    Current values:
    - VITE_SUPABASE_URL: ${supabaseUrl || 'NOT SET'}
    - VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'SET' : 'NOT SET'}
  `)
}

// Validate URL format
try {
  new URL(supabaseUrl)
  console.log('✅ Supabase URL format is valid')
} catch (error) {
  console.error('Invalid Supabase URL format:', supabaseUrl)
  throw new Error(`
    Invalid Supabase URL format: ${supabaseUrl}
    
    Your Supabase URL should look like: https://your-project-id.supabase.co
    Please check your Supabase Dashboard > Settings > API for the correct URL.
  `)
}

// Test connection to Supabase
const testConnection = async (): Promise<boolean> => {
  try {
    console.log('🔄 Testing Supabase connection...')
    
    // Test REST API endpoint with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const restResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!restResponse.ok) {
      console.error(`❌ Supabase REST API connection failed: ${restResponse.status} ${restResponse.statusText}`)
      return false
    }
    
    console.log('✅ Supabase REST API connection test successful')
    return true
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('❌ Supabase connection timed out after 5 seconds. This may indicate network issues or that your Supabase project is paused.')
      } else if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
        console.error('❌ Network connection to Supabase failed. Please check: 1) Internet connection is stable, 2) Supabase project is active (not paused), 3) VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct, 4) Firewall/VPN/ad-blocker settings, 5) CORS configuration in Supabase dashboard')
      } else {
        console.error('❌ Supabase connection error:', error.message)
      }
    } else {
      console.error('❌ Supabase connection test failed with unknown error')
    }
    return false
  }
}

// Test connection but don't block app initialization
testConnection().then(connected => {
  if (!connected) {
    console.warn(`
⚠️ Supabase connection test failed. Please check:

1. Your internet connection is stable
2. Your Supabase project is active (not paused)
3. Your environment variables are correct:
   - VITE_SUPABASE_URL: ${supabaseUrl}
   - VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'SET' : 'NOT SET'}
4. Firewall/VPN/ad-blocker settings aren't blocking the connection
5. CORS configuration in your Supabase dashboard

The app will continue to load, but some features may not work properly.
    `)
  }
}).catch(error => {
  console.warn('⚠️ Connection test failed:', error)
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'equitytake-auth-token'
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'equitytake-web'
    },
    fetch: (url, options = {}) => {
      return fetch(url, options).catch((error) => {
        // Suppress connection errors during initialization to prevent console spam
        // These will be properly handled by useAuth hook
        console.warn('🔌 Supabase connection issue:', error.message);

        // Return a mock failed response instead of throwing
        return Promise.resolve(new Response(
          JSON.stringify({
            error: {
              message: error.message,
              status: 0
            }
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        ));
      });
    }
  }
})

// Service role client for operations that need to bypass RLS
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

// Auth helper functions
export const signUp = async (email: string, password: string, username: string) => {
  try {
    console.log('🔄 Starting user registration process...');
    console.log('📝 Registration data:', { email, username: username.trim() });
    
    // Sign up the user with username in metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          username: username.trim()
        }
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    console.log('✅ User auth record created successfully');
    console.log('👤 Auth user data:', { id: authData.user?.id, email: authData.user?.email });
    
    // Always attempt to create profile for new users
    if (authData.user) {
      console.log('🔄 Creating profile for new user...');
      try {
        await createUserProfile(authData.user, username.trim(), authData.session?.access_token);
        console.log('✅ Profile created successfully during registration');
      } catch (profileError) {
        console.error('❌ Profile creation failed during registration:', profileError);
        // Don't throw error here - user can still sign in and profile will be created then
        console.log('ℹ️ Profile will be created on first sign-in if registration profile creation failed');
      }
    }

    // Check if email confirmation is needed
    const needsEmailConfirmation = authData.user && !authData.user.email_confirmed_at;
    
    console.log('🎉 User registration completed successfully');

    return {
      user: authData.user,
      session: authData.session,
      needsEmailConfirmation: needsEmailConfirmation || false
    };
  } catch (error) {
    console.error('SignUp error:', error);
    throw error;
  }
};

// Helper function to create user profile
const createUserProfile = async (user: any, username: string, accessToken?: string) => {
  try {
    console.log('🔄 Creating profile for user:', { id: user.id, email: user.email, username });
    
    // Strategy 1: Use service role client if available (bypasses RLS)
    if (supabaseAdmin) {
      console.log('🔧 Using service role client for profile creation');
      try {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            username: username,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })
          .select();

        if (error) {
          console.error('❌ Service role profile creation failed:', error);
          throw error;
        }
        
        console.log('✅ Profile created successfully with service role:', data);
        return;
      } catch (serviceError) {
        console.error('❌ Service role client failed, trying authenticated client:', serviceError);
        // Fall through to try authenticated client
      }
    }
    
    // Strategy 2: Use authenticated client if access token is available
    if (accessToken) {
      console.log('🔧 Using authenticated client for profile creation');
      try {
        const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        });
        
        const { data, error } = await authenticatedClient
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            username: username,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          })
          .select();

        if (error) {
          console.error('❌ Authenticated profile creation failed:', error);
          throw error;
        }
        
        console.log('✅ Profile created successfully with authenticated client:', data);
        return;
      } catch (authError) {
        console.error('❌ Authenticated client failed, trying RPC function:', authError);
        // Fall through to try RPC function
      }
    }
    
    // Strategy 3: Use RPC function as final fallback
    console.log('🔧 Using RPC function for profile creation');
    try {
      const { data, error } = await supabase.rpc('create_user_profile', {
        user_id: user.id,
        user_email: user.email,
        user_username: username
      });

      if (error) {
        console.error('❌ RPC profile creation failed:', error);
        throw error;
      }
      
      console.log('✅ Profile created successfully with RPC function:', data);
      return;
    } catch (rpcError) {
      console.error('❌ All profile creation strategies failed:', rpcError);
      throw new Error(`Profile creation failed: ${rpcError.message}`);
    }
  } catch (error) {
    console.error('❌ Profile creation error:', error);
    throw error;
  }
};

// Check if username is available (case-insensitive)
export const checkUsernameAvailability = async (username: string): Promise<{ available: boolean; error?: any }> => {
  try {
    if (!username || username.trim().length < 3) {
      return { available: false }
    }
    
    const trimmedUsername = username.trim();
    
    // Additional security validation
    if (trimmedUsername.length > 30) {
      return { available: false }
    }
    
    if (!/^[a-zA-Z0-9\s]+$/.test(trimmedUsername)) {
      return { available: false }
    }
    
    // Use a database function to check case-insensitive username availability
    // This matches the unique constraint: profiles_username_lower_idx on lower(username)
    const { data, error } = await supabase
      .rpc('check_username_availability', { 
        input_username: trimmedUsername 
      })
    
    if (error) {
      console.error('Username availability RPC error:', error);
      // Fallback to direct query if RPC fails
      return await fallbackUsernameCheck(trimmedUsername);
    }
    
    console.log(`Username check for "${trimmedUsername}": ${data ? 'available' : 'taken'}`);
    return { available: data === true }
    
  } catch (error) {
    console.error('Username availability check exception:', error);
    // Fallback to direct query on exception
    return await fallbackUsernameCheck(username.trim());
  }
}

// Fallback function for direct database query
const fallbackUsernameCheck = async (trimmedUsername: string): Promise<{ available: boolean; error?: any }> => {
  try {
    // Direct query using lower() function to match the database index
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmedUsername.toLowerCase())
      .limit(1)
    
    if (error) {
      console.error('Fallback username check error:', error);
      return { available: false, error }
    }
    
    // Also check with original case
    const { data: originalCaseData, error: originalError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmedUsername)
      .limit(1)
    
    if (originalError) {
      console.error('Original case username check error:', originalError);
      return { available: false, error: originalError }
    }
    
    const isAvailable = data.length === 0 && originalCaseData.length === 0;
    console.log(`Fallback username check for "${trimmedUsername}": ${isAvailable ? 'available' : 'taken'}`, {
      lowercaseMatch: data,
      originalCaseMatch: originalCaseData
    });
    
    return { available: isAvailable }
  } catch (error) {
    console.error('Fallback username check exception:', error);
    return { available: false, error }
  }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // If sign in is successful, ensure profile exists
  if (data.user && !error) {
    console.log('🔄 Sign-in successful, checking/creating profile...');
    try {
      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', data.user.id)
        .maybeSingle();

      console.log('📋 Existing profile check:', existingProfile);
      
      // If no profile exists, create one with username from metadata
      if (!existingProfile) {
        const usernameFromMetadata = data.user.user_metadata?.username;
        console.log('📝 Username from metadata:', usernameFromMetadata);
        
        if (usernameFromMetadata) {
          await createUserProfile(data.user, usernameFromMetadata, data.session?.access_token);
        } else {
          console.log('⚠️ No username in metadata, creating profile without username');
          await createUserProfile(data.user, '', data.session?.access_token);
        }
      } else {
        console.log('✅ Profile already exists:', existingProfile);
      }
    } catch (profileError) {
      console.error('❌ Error in profile creation process:', profileError);
      // Don't throw error here to avoid breaking sign-in
    }
  }

  return { data, error };
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  
  // If sign out fails because user doesn't exist or JWT is invalid, clear local session
  if (error && error.message === 'User from sub claim in JWT does not exist') {
    console.log('🔄 Clearing local session due to invalid JWT');
    await supabase.auth.signOut({ scope: 'local' });
    return { error: null };
  }
  
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}