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
  signInAsTestUser: () => void;
  signOut: () => Promise<void>;
  /** Updates the user's display name (persisted to their profile). */
  updateName: (name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function makeTestUser(): User {
  return {
    id: 'test-user',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    app_metadata: { provider: 'test' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
}

/**
 * On native, Supabase hands us the auth URL and we open it in a browser
 * session; the callback returns a URL carrying the PKCE `code` we exchange
 * for a session. On web the browser does the redirect and supabase-js
 * parses the session straight out of the URL hash.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [testUser, setTestUser] = useState<User | null>(null);
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

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. Add your keys to .env and restart.');
      return;
    }
    try {
      if (Platform.OS === 'web') {
        const { error: err } = await supabase.auth.signInWithOAuth({
          provider: 'google',
        });
        if (err) throw err;
        return;
      }

      const redirectTo = Linking.createURL('auth-callback');
      const { data, error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
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
      setError(e instanceof Error ? e.message : 'Could not sign in with Google.');
    }
  }, []);

  const signInAsTestUser = useCallback(() => {
    setError(null);
    setTestUser(makeTestUser());
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
      return;
    }
    setTestUser((prev) =>
      prev ? { ...prev, user_metadata: { ...prev.user_metadata, full_name: trimmed } } : prev,
    );
  }, [session]);

  const signOut = useCallback(async () => {
    setError(null);
    setTestUser(null);
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
      user: session?.user ?? testUser,
      error,
      signInWithGoogle,
      signInAsTestUser,
      signOut,
      updateName,
    }),
    [loading, session, testUser, error, signInWithGoogle, signInAsTestUser, signOut, updateName],
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
