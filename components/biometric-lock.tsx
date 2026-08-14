import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Pico } from '@/components/pico';
import { ThemedText } from '@/components/themed-text';
import { Fonts, type PaletteType } from '@/constants/theme';
import { useBudget } from '@/lib/store';
import { useAppTheme } from '@/lib/theme';

/**
 * App lock: when the user enables biometric protection, this overlay covers
 * the UI until the device (Face ID / fingerprint) is unlocked. It re-locks
 * whenever the app returns from the background.
 */
export function BiometricLock() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { biometricEnabled } = useBudget();
  const [locked, setLocked] = useState(false);

  const tryUnlock = useCallback(async () => {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    if (!hardware || !enrolled) {
      setLocked(false);
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Pico to see your budget',
      disableDeviceFallback: false,
    });
    setLocked(!result.success);
  }, []);

  // Lock as soon as the app backgrounds; unlock when it becomes active again.
  useEffect(() => {
    if (!biometricEnabled) {
      setLocked(false);
      return;
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setLocked(true);
      } else if (locked) {
        void tryUnlock();
      }
    });
    return () => sub.remove();
  }, [biometricEnabled, locked, tryUnlock]);

  if (!biometricEnabled || !locked) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Pico size={140} pose="peeking" />
        <ThemedText type="title">Locked 🔒</ThemedText>
        <ThemedText style={styles.hint}>Your budget is hidden until you unlock it.</ThemedText>
        <PrimaryButton title="Unlock" onPress={() => void tryUnlock()} style={styles.button} />
      </View>
    </View>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 100,
      backgroundColor: palette.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      alignItems: 'center',
      gap: 16,
      maxWidth: 320,
      width: '100%',
    },
    hint: {
      textAlign: 'center',
      color: palette.inkMuted,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: Fonts.body,
    },
    button: {
      alignSelf: 'stretch',
      marginTop: 4,
    },
  });
}
