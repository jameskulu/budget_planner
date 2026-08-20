import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleLogo } from '@/components/google-logo';
import { Pico } from '@/components/pico';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useAppTheme } from '@/lib/theme';

const { width: SW, height: SH } = Dimensions.get('window');

// Feature pill tags shown floating around the mascot (same as onboarding welcome).
const PILLS = [
  { label: '💸 Budget', top: 0.14, left: 0.04, rotate: '-8deg' },
  { label: '📊 Track', top: 0.10, left: 0.58, rotate: '7deg' },
  { label: '🎯 Goals', top: 0.26, left: 0.68, rotate: '-5deg' },
  { label: '🔔 Bills', top: 0.30, left: -0.02, rotate: '6deg' },
  { label: '💰 Save', top: 0.46, left: 0.60, rotate: '8deg' },
];

function FloatingPill({
  label,
  top,
  left,
  rotate,
  delay,
}: {
  label: string;
  top: number;
  left: number;
  rotate: string;
  delay: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -8,
          duration: 1800,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [translateY, delay]);

  return (
    <Animated.View
      style={[
        pillStyles.pill,
        {
          top: SH * top,
          left: SW * left,
          transform: [{ translateY }, { rotate }],
        },
      ]}>
      <ThemedText style={pillStyles.pillText}>{label}</ThemedText>
    </Animated.View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  pillText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E0A40',
  },
});

export default function LoginScreen() {
  const { isDark } = useAppTheme();
  const { user, signInWithGoogle, error } = useAuth();
  const styles = useMemo(() => createStyles(), []);

  // Entry animation (same as welcome)
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeIn, slideUp]);

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  // Background: same rich purple as the onboarding welcome page.
  const bgTop = isDark ? '#1A0533' : '#3B0F80';

  return (
    <View style={{ flex: 1, backgroundColor: bgTop }}>
      {/* Soft radial glow behind mascot */}
      <View
        style={{
          position: 'absolute',
          top: SH * 0.10,
          alignSelf: 'center',
          width: SW * 0.9,
          height: SW * 0.9,
          borderRadius: SW * 0.45,
          backgroundColor: '#A855F7',
          opacity: 0.22,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: SH * 0.18,
          alignSelf: 'center',
          width: SW * 0.65,
          height: SW * 0.65,
          borderRadius: SW * 0.325,
          backgroundColor: '#C084FC',
          opacity: 0.18,
        }}
      />

      {/* Floating pill tags */}
      {PILLS.map((p, i) => (
        <FloatingPill key={p.label} {...p} delay={i * 280} />
      ))}

      {/* Mascot hero */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: SH * 0.07,
          alignSelf: 'center',
          alignItems: 'center',
        }}>
        <Pico size={SW * 0.82} pose="showing_phone" />
      </View>

      {/* Bottom content card */}
      <SafeAreaView
        edges={['bottom']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeIn,
              transform: [{ translateY: slideUp }],
            },
          ]}>
          {/* App name */}
          <ThemedText style={styles.appName}>Pico Money</ThemedText>

          {/* Tagline */}
          <ThemedText style={styles.tagline}>
            Track, budget {'&'} save — effortlessly.
          </ThemedText>

          {/* Sign in actions */}
          <View style={styles.buttonStack}>
            <Pressable
              accessibilityRole="button"
              onPress={signInWithGoogle}
              style={({ pressed }) => [styles.socialButton, pressed && styles.socialPressed]}>
              <GoogleLogo size={22} />
              <ThemedText style={styles.socialLabel}>Continue with Google</ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(auth)/email')}
              style={({ pressed }) => [styles.socialButton, pressed && styles.socialPressed]}>
              <View style={styles.mailIcon}>
                <IconSymbol name="envelope.fill" size={18} color="#1D4ED8" />
              </View>
              <ThemedText style={styles.socialLabel}>Continue with Email</ThemedText>
            </Pressable>
          </View>

          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    card: {
      backgroundColor: 'rgba(255,255,255,0.10)',
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 32,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
      gap: 6,
    },
    appName: {
      fontFamily: Fonts.display,
      fontSize: 42,
      lineHeight: 48,
      color: '#FFFFFF',
      textAlign: 'center',
      letterSpacing: -1,
    },
    tagline: {
      fontFamily: Fonts.body,
      fontSize: 16,
      lineHeight: 22,
      color: 'rgba(255,255,255,0.72)',
      textAlign: 'center',
      marginBottom: 20,
    },
    buttonStack: {
      gap: 12,
      marginTop: 4,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      minHeight: 56,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 20,
    },
    socialPressed: {
      opacity: 0.85,
    },
    socialLabel: {
      fontFamily: Fonts.bodyBold,
      fontSize: 18,
      color: '#0F172A',
    },
    mailIcon: {
      width: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      color: '#FCA5A5',
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
}