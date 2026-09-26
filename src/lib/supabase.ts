import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined' || supabaseUrl === '' || supabaseAnonKey === '') {
  throw new Error('Missing or invalid Supabase environment variables. Please check your .env file.')
}

try {
  new URL(supabaseUrl)
} catch {
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`)
}

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

// Auth helper functions
export const signUp = async (email: string, password: string, username: string) => {
  try {
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
      throw authError;
    }

    // The handle_new_user DB trigger creates the profile automatically on signup.
    // Attempt a client-side upsert as a fallback in case the trigger missed it
    // (e.g. email confirmation required and session not yet established).
    if (authData.user) {
      try {
        await createUserProfile(authData.user, username.trim());
      } catch {
        // Non-fatal: the DB trigger or a later sign-in will ensure the profile exists.
      }
    }

    const needsEmailConfirmation = authData.user && !authData.user.email_confirmed_at;

    return {
      user: authData.user,
      session: authData.session,
      needsEmailConfirmation: needsEmailConfirmation || false
    };
  } catch (error) {
    throw error;
  }
};

// Create or update the user's profile using the authenticated client (respects RLS).
// Falls back to the create_user_profile SECURITY DEFINER RPC if the direct upsert fails.
const createUserProfile = async (user: any, username: string) => {
  const profileData = {
    id: user.id,
    email: user.email,
    username: username,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (!error) return;
  } catch {
    // Fall through to RPC fallback
  }

  try {
    const { error: rpcError } = await supabase.rpc('create_user_profile', {
      user_id: user.id,
      user_email: user.email,
      user_username: username
    });

    if (rpcError) throw rpcError;
  } catch (err) {
    throw new Error(`Profile creation failed: ${(err as Error).message}`);
  }
};

// Check if username is available (case-insensitive)
export const checkUsernameAvailability = async (username: string): Promise<{ available: boolean; error?: any }> => {
  try {
    if (!username || username.trim().length < 3) {
      return { available: false }
    }

    const trimmedUsername = username.trim();

    if (trimmedUsername.length > 30) {
      return { available: false }
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(trimmedUsername)) {
      return { available: false }
    }

    const { data, error } = await supabase
      .rpc('check_username_availability', {
        input_username: trimmedUsername
      })

    if (error) {
      return await fallbackUsernameCheck(trimmedUsername);
    }

    return { available: data === true }

  } catch (error) {
    return await fallbackUsernameCheck(username.trim());
  }
}

// Fallback function for direct database query
const fallbackUsernameCheck = async (trimmedUsername: string): Promise<{ available: boolean; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmedUsername.toLowerCase())
      .limit(1)

    if (error) {
      return { available: false, error }
    }

    const { data: originalCaseData, error: originalError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmedUsername)
      .limit(1)

    if (originalError) {
      return { available: false, error: originalError }
    }

    const isAvailable = data.length === 0 && originalCaseData.length === 0;

    return { available: isAvailable }
  } catch (error) {
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
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!existingProfile) {
        const usernameFromMetadata = data.user.user_metadata?.username;
        await createUserProfile(data.user, usernameFromMetadata || '');
      }
    } catch {
      // Non-fatal: the DB trigger should have created the profile.
    }
  }

  return { data, error };
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()

  if (error && error.message === 'User from sub claim in JWT does not exist') {
    await supabase.auth.signOut({ scope: 'local' });
    return { error: null };
  }

  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const resendVerificationEmail = async (email: string): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to resend verification email. Please try again.' };
  }
};
