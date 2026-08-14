import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const isServer = typeof window === 'undefined';

/** True once the developer has dropped real credentials into .env */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && !isServer);

/**
 * AsyncStorage's web build touches `window`, which explodes during Node
 * static rendering. Guard it so SSR never calls into it.
 */
const safeStorage = {
  getItem: async (key: string) => (isServer ? null : AsyncStorage.getItem(key)),
  setItem: async (key: string, value: string) => {
    if (!isServer) await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (!isServer) await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder',
  {
    auth: {
      storage: safeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
);
