import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AuthContextValue = {
  loading: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<boolean>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Updates the user's display name (persisted to their profile). */
  updateName: (name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Guest access uses a real Supabase anonymous session, so the user gets a
 * valid UUID and their profile syncs to `user_profiles` like any other user.
 * Requires the "Anonymous sign-ins" provider to be enabled in the Supabase
 * dashboard (Authentication → Providers → Anonymous).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
    setError(null);
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Add your keys to .env and restart.');
      return;
    }
    try {
      if (Platform.OS === 'web') {
        const { error: err } = await supabase.auth.signInWithOAuth({ provider });
        if (err) throw err;
        return;
      }

      const redirectTo = Linking.createURL('auth-callback');
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (err) throw err;
      if (!data.url) return;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const code = new URL(result.url).searchParams.get('code');
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) throw exchangeErr;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not sign in with ${provider}.`);
    }
  }, []);

  const signInWithGoogle = useCallback(() => signInWithOAuth('google'), [signInWithOAuth]);

  const signInWithApple = useCallback(() => signInWithOAuth('apple'), [signInWithOAuth]);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setError(null);
      if (!isSupabaseConfigured) {
        setError('Supabase is not configured yet. Add your keys to .env and restart.');
        return false;
      }
      try {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not sign in with email.');
        return false;
      }
    },
    [],
  );

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string): Promise<boolean> => {
      setError(null);
      if (!isSupabaseConfigured) {
        setError('Supabase is not configured yet. Add your keys to .env and restart.');
        return false;
      }
      try {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (err) throw err;
        // When email confirmation is enabled, no session is returned yet.
        return Boolean(data.session);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not create your account.');
        return false;
      }
    },
    [],
  );

  const signInAsGuest = useCallback(async () => {
    setError(null);
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Add your keys to .env and restart.');
      return;
    }
    try {
      await supabase.auth.signInAnonymously();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in as a guest.');
    }
  }, []);

  const updateName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    setError(null);
    if (isSupabaseConfigured && session) {
      try {
        const { error: err } = await supabase.auth.updateUser({
          data: { full_name: trimmed },
        });
        if (err) throw err;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update your name.');
      }
    }
  }, [session]);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign out.');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      configured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      error,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      signUpWithEmail,
      signInAsGuest,
      signOut,
      updateName,
    }),
    [
      loading,
      session,
      error,
      signInWithGoogle,
      signInWithApple,
      signInWithEmail,
      signUpWithEmail,
      signInAsGuest,
      signOut,
      updateName,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
