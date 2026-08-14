import { StyleSheet, View } from 'react-native';

import { OnboardingLayout } from '@/components/onboarding/onboarding-layout';
import { SelectionCard } from '@/components/onboarding/selection-card';
import { Pico } from '@/components/pico';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import {
  GOALS,
  PAY_FREQUENCIES,
  PROBLEMS,
  type OnboardingState,
} from '@/lib/onboarding';

export type StepProps = {
  value: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  next: () => void;
  back: () => void;
  symbol: string;
  money: (amount: number) => string;
};

export function WelcomeStep({ next }: StepProps) {
  return (
    <OnboardingLayout
      footer={
        <View style={styles.footerStack}>
          <PrimaryButton title="Get started" onPress={next} />
          <ThemedText style={styles.minutes}>Takes less than 2 minutes.</ThemedText>
        </View>
      }>
      <View style={styles.heroStage}>
        <View style={styles.heroGlow} />
        <View style={styles.heroBadge}>
          <ThemedText style={styles.heroBadgeText}>👋 Say hello</ThemedText>
        </View>
        <View style={styles.heroMascot}>
          <Pico
            size={230}
            pose="onboarding"
            speech="Hi! I'm Pico, your money buddy!"
            speechPosition="bottom"
            interactive
          />
        </View>
      </View>

      <View style={styles.heroText}>
        <ThemedText type="title" style={styles.heroTitle}>
          Meet Pico
        </ThemedText>
        <ThemedText style={styles.heroSub}>Your money buddy. 💜</ThemedText>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <View style={[styles.featureIcon, styles.featureIconLeaf]}>
            <ThemedText style={styles.featureEmoji}>💸</ThemedText>
          </View>
          <View style={styles.featureText}>
            <ThemedText style={styles.featureTitle}>Know what you can spend</ThemedText>
            <ThemedText style={styles.featureBody}>
              No guesswork, no budgeting spreadsheets.
            </ThemedText>
          </View>
        </View>
        <View style={styles.feature}>
          <View style={[styles.featureIcon, styles.featureIconSky]}>
            <ThemedText style={styles.featureEmoji}>📋</ThemedText>
          </View>
          <View style={styles.featureText}>
            <ThemedText style={styles.featureTitle}>Stay on top of bills</ThemedText>
            <ThemedText style={styles.featureBody}>
              Pico tracks your recurring bills automatically.
            </ThemedText>
          </View>
        </View>
        <View style={styles.feature}>
          <View style={[styles.featureIcon, styles.featureIconBerry]}>
            <ThemedText style={styles.featureEmoji}>🎯</ThemedText>
          </View>
          <View style={styles.featureText}>
            <ThemedText style={styles.featureTitle}>Save without the effort</ThemedText>
            <ThemedText style={styles.featureBody}>
              Small daily wins add up to big goals.
            </ThemedText>
          </View>
        </View>
      </View>
    </OnboardingLayout>
  );
}

export function ProblemStep({ value, update, next, back }: StepProps) {
  return (
    <OnboardingLayout
      title="What sounds most like you?"
      subtitle="Everyone manages money differently."
      progress={1 / 16}
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
  return (
    <OnboardingLayout
      title="What do you want Pico to help you with?"
      progress={2 / 16}
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
      progress={3 / 16}
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

const styles = StyleSheet.create({
  heroStage: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: Palette.berrySoft,
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
    backgroundColor: Palette.berry,
    opacity: 0.12,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginTop: 4,
    backgroundColor: Palette.berry,
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
    color: Palette.inkMuted,
  },
  features: {
    gap: 14,
    marginTop: 4,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.outline,
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
    backgroundColor: Palette.leafSoft,
  },
  featureIconSky: {
    backgroundColor: Palette.skySoft,
  },
  featureIconBerry: {
    backgroundColor: Palette.berrySoft,
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
    color: Palette.ink,
  },
  featureBody: {
    fontSize: 15,
    lineHeight: 21,
    color: Palette.inkMuted,
  },
  footerStack: {
    gap: 8,
  },
  minutes: {
    textAlign: 'center',
    color: Palette.inkSubtle,
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
