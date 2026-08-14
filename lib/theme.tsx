import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

import { DarkPalette, Palette, type PaletteType, type ThemeMode } from '@/constants/theme';

const THEME_KEY = 'budget-planner:theme:v1';

type ThemeContextValue = {
  /** The effective theme: user preference or the device scheme. */
  mode: ThemeMode;
  /** The active palette for the current mode. */
  palette: PaletteType;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const device = useDeviceColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(THEME_KEY);
      if (!cancelled) {
        if (raw === 'dark' || raw === 'light') setModeState(raw);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(THEME_KEY, mode).catch(() => {});
    }
  }, [mode, loaded]);

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const toggleMode = useCallback(
    () => setModeState((m) => (m === 'dark' ? 'light' : 'dark')),
    [],
  );

  const value = useMemo<ThemeContextValue>(() => {
    const effective: ThemeMode = loaded ? mode : (device ?? 'light');
    return {
      mode: effective,
      palette: effective === 'dark' ? DarkPalette : Palette,
      isDark: effective === 'dark',
      setMode,
      toggleMode,
    };
  }, [loaded, mode, device, setMode, toggleMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return ctx;
}
