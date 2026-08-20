import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingLayout } from '@/components/onboarding/onboarding-layout';
import { SelectionCard } from '@/components/onboarding/selection-card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Fonts, type PaletteType } from '@/constants/theme';
import {
  GOALS,
  PAY_FREQUENCIES,
  PROBLEMS,
  type OnboardingState,
} from '@/lib/onboarding';
import { useAppTheme } from '@/lib/theme';

const { width: SW, height: SH } = Dimensions.get('window');

export type StepProps = {
  value: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
  back: () => void;
  symbol: string;
  money: (amount: number) => string;
};

// Feature pill tags shown floating around the mascot
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

export function WelcomeStep({ next }: StepProps) {
  const { palette, isDark } = useAppTheme();

  // Entry animation
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

  // Background: dark rich purple gradient using Pico's purple
  const bgTop = isDark ? '#1A0533' : '#3B0F80';
  const bgBottom = isDark ? '#0D0220' : '#6D28D9';

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
        style={{
          position: 'absolute',
          top: SH * 0.07,
          alignSelf: 'center',
          alignItems: 'center',
        }}>
        <Image
          source={require('../../../assets/images/pico/onbording.png')}
          style={{ width: SW * 0.82, height: SW * 0.82 }}
          resizeMode="contain"
        />
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
          style={{
            opacity: fadeIn,
            transform: [{ translateY: slideUp }],
            backgroundColor: 'rgba(255,255,255,0.10)',
            marginHorizontal: 16,
            marginBottom: 16,
            borderRadius: 32,
            paddingHorizontal: 24,
            paddingTop: 28,
            paddingBottom: 24,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
            // glassmorphism shadow
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
            elevation: 12,
            gap: 6,
          }}>
          {/* App name */}
          <ThemedText
            style={{
              fontFamily: Fonts.display,
              fontSize: 42,
              lineHeight: 48,
              color: '#FFFFFF',
              textAlign: 'center',
              letterSpacing: -1,
            }}>
            Pico Money
          </ThemedText>

          {/* Tagline */}
          <ThemedText
            style={{
              fontFamily: Fonts.body,
              fontSize: 16,
              lineHeight: 22,
              color: 'rgba(255,255,255,0.72)',
              textAlign: 'center',
              marginBottom: 20,
            }}>
            Track, budget {'&'} save — effortlessly.
          </ThemedText>

          {/* Get Started button — dark pill style */}
          <Pressable
            onPress={next}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#1A0533' : '#0F0020',
              borderRadius: 999,
              paddingVertical: 18,
              alignItems: 'center',
              transform: pressed ? [{ scale: 0.97 }] : [],
            })}>
            <ThemedText
              style={{
                fontFamily: Fonts.display,
                fontSize: 18,
                color: '#FFFFFF',
                letterSpacing: 0.2,
              }}>
              Get Started
            </ThemedText>
          </Pressable>

          <ThemedText
            style={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.45)',
              fontSize: 13,
              fontFamily: Fonts.body,
              marginTop: 4,
            }}>
            Takes less than 2 minutes
          </ThemedText>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

export function ProblemStep({ value, update, next, back }: StepProps) {
  return (
    <OnboardingLayout
      title="What sounds most like you?"
      subtitle="Everyone manages money differently."
      progress={1 / 20}
      onBack={back}
      footer={<PrimaryButton title="Continue" onPress={next} disabled={!value.problem} />}>
      {PROBLEMS.map((p) => (
        <SelectionCard
          key={p.id}
          icon={p.icon}
          title={p.title}
          subtitle={p.subtitle}
          selected={value.problem === p.id}
          onPress={() => update({ problem: p.id })}
        />
      ))}
    </OnboardingLayout>
  );
}

export function GoalStep({ value, update, next, back }: StepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <OnboardingLayout
      title="What do you want Pico to help you with?"
      progress={2 / 20}
      onBack={back}
      footer={<PrimaryButton title="Continue" onPress={next} disabled={!value.goal} />}>
      <View style={styles.grid}>
        {GOALS.map((g) => (
          <SelectionCard
            key={g.id}
            icon={g.icon}
            title={g.label}
            selected={value.goal === g.id}
            onPress={() => update({ goal: g.id })}
            style={styles.gridItem}
          />
        ))}
      </View>
    </OnboardingLayout>
  );
}

export function PayFrequencyStep({ value, update, next, back }: StepProps) {
  return (
    <OnboardingLayout
      title="How often do you get paid?"
      subtitle="Your pay schedule helps Pico calculate how much you can safely spend."
      progress={3 / 20}
      onBack={back}
      footer={<PrimaryButton title="Continue" onPress={next} disabled={!value.payFrequency} />}>
      {PAY_FREQUENCIES.map((f) => (
        <SelectionCard
          key={f.id}
          title={f.label}
          selected={value.payFrequency === f.id}
          onPress={() => update({ payFrequency: f.id })}
        />
      ))}
    </OnboardingLayout>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    heroStage: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 32,
      backgroundColor: palette.berrySoft,
      paddingTop: 24,
      paddingBottom: 16,
      marginTop: 4,
      overflow: 'hidden',
    },
    heroGlow: {
      position: 'absolute',
      top: -70,
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor: palette.berry,
      opacity: 0.12,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      marginLeft: 20,
      marginTop: 4,
      backgroundColor: palette.berry,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
    },
    heroBadgeText: {
      color: '#FFFFFF',
      fontSize: 13,
      lineHeight: 18,
      fontFamily: 'Inter_600SemiBold',
    },
    heroMascot: {
      alignItems: 'center',
      marginTop: 4,
    },
    heroText: {
      alignItems: 'center',
      gap: 4,
    },
    heroTitle: {
      fontSize: 34,
      lineHeight: 42,
    },
    heroSub: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 18,
      lineHeight: 26,
      color: palette.inkMuted,
    },
    features: {
      gap: 14,
      marginTop: 4,
    },
    feature: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: palette.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.outline,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    featureIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureIconLeaf: {
      backgroundColor: palette.leafSoft,
    },
    featureIconSky: {
      backgroundColor: palette.skySoft,
    },
    featureIconBerry: {
      backgroundColor: palette.berrySoft,
    },
    featureEmoji: {
      fontSize: 22,
    },
    featureText: {
      flex: 1,
      gap: 2,
    },
    featureTitle: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      lineHeight: 22,
      color: palette.ink,
    },
    featureBody: {
      fontSize: 15,
      lineHeight: 21,
      color: palette.inkMuted,
    },
    footerStack: {
      gap: 8,
    },
    minutes: {
      textAlign: 'center',
      color: palette.inkSubtle,
      fontSize: 14,
      lineHeight: 20,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    gridItem: {
      flexBasis: '47%',
      flexGrow: 1,
      minWidth: 140,
    },
  });
}
