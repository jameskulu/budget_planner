import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, type PaletteType } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type ToastTone = 'info' | 'ok' | 'error';

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

/**
 * Global toast: a floating pill at the bottom of the screen that auto-dismisses.
 * Wrap the app once with <ToastProvider> and call useToast().showToast(...).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ id: nextId++, message, tone });
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, 2800);
    },
    [opacity],
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  const toneColor =
    toast?.tone === 'error'
      ? palette.coral
      : toast?.tone === 'ok'
        ? palette.leafDeep
        : palette.skyDeep;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={styles.host}>
          <Animated.View style={[styles.pill, { opacity }]}>
            <ThemedText style={[styles.text, { color: toneColor }]}>{toast.message}</ThemedText>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    host: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 96,
      alignItems: 'center',
      zIndex: 1000,
    },
    pill: {
      maxWidth: '86%',
      borderRadius: 999,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.outline,
      paddingHorizontal: 18,
      paddingVertical: 12,
      shadowColor: palette.ink,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
    },
    text: {
      fontFamily: Fonts.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
}
