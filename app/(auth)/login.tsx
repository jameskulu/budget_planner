import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleLogo } from '@/components/google-logo';
import { Pico } from '@/components/pico';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts, type PaletteType } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useAppTheme } from '@/lib/theme';

export default function LoginScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user, signInWithGoogle, signInAsGuest } = useAuth();

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Pico size={200} pose="showing_phone" />
          <ThemedText style={styles.heroAppName}>Pico</ThemedText>
          <ThemedText style={styles.heroTagline}>Your money buddy</ThemedText>
        </View>

        <View style={styles.stack}>
          <ThemedText style={styles.heading}>Welcome back</ThemedText>

          <View style={styles.buttonStack}>
            <Pressable
              accessibilityRole="button"
              onPress={signInWithGoogle}
              style={({ pressed }) => [styles.socialButton, styles.socialButtonLight, pressed && styles.socialPressed]}>
              <GoogleLogo size={22} />
              <ThemedText style={styles.socialLabel}>Continue with Google</ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(auth)/email')}
              style={({ pressed }) => [styles.socialButton, styles.socialButtonLight, pressed && styles.socialPressed]}>
              <View style={styles.mailIcon}>
                <IconSymbol name="envelope.fill" size={18} color={palette.skyDeep} />
              </View>
              <ThemedText style={styles.socialLabel}>Continue with email</ThemedText>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => void signInAsGuest()}
            style={({ pressed }) => [styles.guestLink, pressed && styles.socialPressed]}>
            <ThemedText style={styles.guestText}>Continue as guest</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      flexGrow: 1,
      padding: 24,
      justifyContent: 'center',
      gap: 24,
    },
    hero: {
      alignItems: 'center',
    },
    heroAppName: {
      fontFamily: Fonts.display,
      fontSize: 32,
      lineHeight: 40,
      marginTop: 4,
    },
    heroTagline: {
      color: palette.inkMuted,
      fontSize: 16,
      lineHeight: 22,
    },
    stack: {
      gap: 16,
    },
    heading: {
      fontFamily: Fonts.displaySemibold,
      fontSize: 22,
      lineHeight: 30,
      textAlign: 'center',
    },
    buttonStack: {
      gap: 12,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      minHeight: 56,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 20,
    },
    socialButtonLight: {
      borderColor: palette.outlineStrong,
      backgroundColor: palette.background,
    },
    socialPressed: {
      opacity: 0.85,
    },
    socialLabel: {
      fontFamily: Fonts.bodyBold,
      fontSize: 18,
    },
    mailIcon: {
      width: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    guestLink: {
      alignItems: 'center',
      paddingVertical: 6,
    },
    guestText: {
      color: palette.inkMuted,
      fontSize: 15,
      textDecorationLine: 'underline',
    },
  });
}