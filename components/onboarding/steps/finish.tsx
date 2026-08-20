import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { OnboardingLayout } from '@/components/onboarding/onboarding-layout';
import { Pico } from '@/components/pico';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { GoogleLogo } from '@/components/google-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts, type PaletteType } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';
import { payFrequencyLabel, type OnboardingPlan, type PlanPeriod } from '@/lib/onboarding';
import {
  canPurchase,
  getAvailablePlans,
  isPremium,
  purchasePackage,
  restorePurchases,
  setMockPremium,
  type AvailablePlans,
} from '@/lib/purchases';
import { trackPaywallViewed, trackTrialStarted } from '@/lib/analytics';
import { requestNotificationPermission, syncNotifications, type NotificationPrefs } from '@/lib/notifications';
import type { RecurringItem } from '@/lib/recurring';
import type { StepProps } from '@/components/onboarding/steps/welcome';

type FinishStepProps = StepProps & {
  plan: OnboardingPlan;
  planPeriod: PlanPeriod;
  choosePlan: (plan: Exclude<OnboardingPlan, null>) => void;
  setPeriod: (period: PlanPeriod) => void;
  finish: () => void;
  user: { email?: string | null } | null;
  signingIn: boolean;
  onGoogle: () => Promise<void>;
  onGuest: () => void;
  goDashboard: () => void;
  notificationPrefs: NotificationPrefs;
  setNotificationPrefs: (prefs: NotificationPrefs) => void;
  recurring: RecurringItem[];
};

const BENEFITS = [
  'Automatic spending plan',
  'Natural-language expense tracking',
  'Smart spending guidance',
  '"Can I afford this?"',
  'Personalized money insights',
  'Savings tracking',
  'Automatic spending adjustments',
];

export function PaywallStep({ plan, planPeriod, choosePlan, setPeriod, next, user }: FinishStepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [available, setAvailable] = useState<AvailablePlans>({ monthly: null, annual: null });
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [alreadyPremium, setAlreadyPremium] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);

  useEffect(() => {
    trackPaywallViewed();
    let mounted = true;
    getAvailablePlans().then((plans) => {
      if (mounted) setAvailable(plans);
    });
    // Returning subscriber? Auto-detect so they're never asked to buy again.
    isPremium(user?.email).then((active) => {
      if (mounted) {
        setAlreadyPremium(active);
        setCheckingPremium(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [user?.email]);

  const activePackage = planPeriod === 'monthly' ? available.monthly : available.annual;
  const monthly = available.monthly?.product;
  const annual = available.annual?.product;

  const pickTrial = async () => {
    setError(null);
    if (canPurchase && activePackage) {
      setPurchasing(true);
      const outcome = await purchasePackage(activePackage);
      setPurchasing(false);
      if (outcome.status === 'purchased') {
        trackTrialStarted();
        choosePlan('trial');
        next();
        return;
      }
      if (outcome.status === 'cancelled') return;
      setError(outcome.message);
      return;
    }
    // Mock / preview mode (Expo Go, no keys): simulate the trial locally.
    await setMockPremium(true);
    trackTrialStarted();
    choosePlan('trial');
    next();
  };

  const handleRestore = async () => {
    setRestoring(true);
    setError(null);
    const active = await restorePurchases();
    setRestoring(false);
    if (active) {
      choosePlan('trial');
      setRestored(true);
    } else {
      setError('No previous purchase was found to restore.');
    }
  };

  return (
    <OnboardingLayout
      title="Meet your money buddy, Pico 💚"
      subtitle="Stop budgeting. Start knowing."
      footer={
        <View style={styles.footerStack}>
          {alreadyPremium ? (
            <PrimaryButton
              title="Continue"
              onPress={() => {
                choosePlan('trial');
                next();
              }}
            />
          ) : (
            <>
              <PrimaryButton
                title="Start my free trial"
                onPress={() => void pickTrial()}
                loading={purchasing}
              />
              {error ? <ThemedText style={styles.paywallError}>{error}</ThemedText> : null}
              {restored ? (
                <ThemedText style={styles.restored}>✓ Purchases restored</ThemedText>
              ) : null}
              <Pressable accessibilityRole="button" onPress={handleRestore}>
                <ThemedText style={styles.skip}>{restoring ? 'Restoring…' : 'Restore purchases'}</ThemedText>
              </Pressable>
            </>
          )}
        </View>
      }>
      <View style={styles.picoPaywallHeader}>
        <Pico
          size={72}
          pose="insights"
          speech={
            checkingPremium
              ? 'Checking your plan…'
              : alreadyPremium
                ? 'You are already subscribed — enjoy everything! 🎉'
                : 'Try 7 days free — unlock full Pico insights & guidance!'
          }
          speechPosition="right"
          interactive
        />
      </View>

      {checkingPremium ? (
        <ThemedText style={styles.checking}>Just a moment…</ThemedText>
      ) : alreadyPremium ? (
        <View style={styles.premiumCard}>
          <ThemedText style={styles.premiumTitle}>Premium is active ✓</ThemedText>
          <ThemedText style={styles.premiumBody}>
            Your subscription was found and restored automatically. No need to buy
            anything again.
          </ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b} style={styles.benefitRow}>
                <ThemedText style={styles.check}>✓</ThemedText>
                <ThemedText style={styles.benefitText}>{b}</ThemedText>
              </View>
            ))}
          </View>

          <View style={styles.plans}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: planPeriod === 'monthly' }}
              onPress={() => setPeriod('monthly')}
              style={({ pressed }) => [
                styles.plan,
                planPeriod === 'monthly' && styles.planSelected,
                pressed && styles.pressed,
              ]}>
              <View style={styles.planTop}>
                <ThemedText style={styles.planTitle}>Monthly</ThemedText>
                <View style={styles.planPill}>
                  <ThemedText style={styles.planPillText}>7 days free</ThemedText>
                </View>
              </View>
              <ThemedText style={styles.planPrice}>
                {monthly?.priceString ?? '$4.99'}
                <ThemedText style={styles.planPeriod}>/month</ThemedText>
              </ThemedText>
              <ThemedText style={styles.planNote}>after your free trial</ThemedText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: planPeriod === 'yearly' }}
              onPress={() => setPeriod('yearly')}
              style={({ pressed }) => [
                styles.plan,
                styles.planRecommended,
                planPeriod === 'yearly' && styles.planSelected,
                pressed && styles.pressed,
              ]}>
              <View style={styles.planTop}>
                <ThemedText style={styles.planTitle}>Annual</ThemedText>
                <View style={[styles.planPill, styles.planPillRecommended]}>
                  <ThemedText style={[styles.planPillText, styles.planPillTextRecommended]}>
                    Save 50%
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.planPrice}>
                {annual?.priceString ?? '$29.99'}
                <ThemedText style={styles.planPeriod}>/year</ThemedText>
              </ThemedText>
              <ThemedText style={styles.planNote}>7 days free, then $2.50/month billed yearly</ThemedText>
            </Pressable>
          </View>

          <ThemedText style={styles.terms}>
            Cancel anytime in your settings. You won&apos;t be charged until your free trial
            ends.
          </ThemedText>
        </>
      )}
    </OnboardingLayout>
  );
}

export function NotifyStep({
  next,
  notificationPrefs,
  setNotificationPrefs,
  recurring,
}: FinishStepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [enabled, setEnabled] = useState(false);
  const [denied, setDenied] = useState(false);

  const enableReminders = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      setDenied(true);
      return;
    }
    const nextPrefs: NotificationPrefs = { ...notificationPrefs, dailyReminder: true };
    setNotificationPrefs(nextPrefs);
    await syncNotifications(nextPrefs, recurring);
    setEnabled(true);
  };

  const skip = () => {
    const nextPrefs: NotificationPrefs = { ...notificationPrefs, dailyReminder: false };
    setNotificationPrefs(nextPrefs);
    next();
  };

  return (
    <OnboardingLayout
      title="Daily money reminders"
      subtitle="Let Pico nudge you each morning with your safe-to-spend."
      footer={
        <View style={styles.footerStack}>
          {enabled ? (
            <PrimaryButton title="Continue" onPress={next} />
          ) : (
            <>
              <PrimaryButton title="Yes, remind me daily" onPress={() => void enableReminders()} />
              <Pressable accessibilityRole="button" onPress={skip}>
                <ThemedText style={styles.skip}>Not right now</ThemedText>
              </Pressable>
            </>
          )}
        </View>
      }>
      <View style={styles.notifyWrap}>
        <Pico
          size={96}
          pose="showing_phone"
          speech="I'll tell you what you can safely spend every morning! 📲"
          speechPosition="bottom"
          interactive
        />
        {denied ? (
          <ThemedText style={styles.notifyDenied}>
            Notifications are off for this app. You can enable them anytime in Settings.
          </ThemedText>
        ) : null}
      </View>
    </OnboardingLayout>
  );
}

export function AccountStep({
  user,
  signingIn,
  onGoogle,
  onGuest,
  next,
}: FinishStepProps) {
  const signedIn = Boolean(user);
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <OnboardingLayout
      title="Save your money plan"
      subtitle="Create a free account so your plan is safe and synced."
      footer={
        signedIn ? (
          <PrimaryButton title="Continue" onPress={next} />
        ) : (
          <View style={styles.footerStack}>
            <PrimaryButton
              title="Continue with Google"
              icon={<GoogleLogo size={22} />}
              onPress={() => {
                void onGoogle();
              }}
              loading={signingIn}
            />
            <PrimaryButton
              title="Continue with Email"
              variant="leaf"
              icon={
                <View style={styles.footerIcon}>
                  <IconSymbol name="envelope.fill" size={18} color="#FFFFFF" />
                </View>
              }
              onPress={() => router.push('/(auth)/email')}
            />
          </View>
        )
      }>
      <View style={styles.accountWrap}>
        <Pico
          size={88}
          pose="showing_phone"
          speech={signedIn ? "You're all set! Plan saved to your account 🔒" : "I'll make sure your budget plan stays safe!"}
          speechPosition="bottom"
          interactive
        />
        {signedIn ? (
          <ThemedText style={styles.accountSigned}>
            You&apos;re signed in. Your plan will be saved to your account.
          </ThemedText>
        ) : (
          <ThemedText style={styles.accountHint}>
            No unnecessary profile questions. Just a quick way to keep your plan.
          </ThemedText>
        )}
      </View>
    </OnboardingLayout>
  );
}

export function DoneStep({ finish, goDashboard }: FinishStepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <OnboardingLayout
      footer={<PrimaryButton title="Go to my dashboard" onPress={goDashboard} />}>
      <View style={styles.doneWrap}>
        <Pico
          size={110}
          pose="thumbsup"
          speech="You're all set! I've got your money covered 🎉"
          speechPosition="bottom"
          badge="READY"
          interactive
        />
        <ThemedText type="title" style={styles.doneTitle}>You&apos;re ready! 🎉</ThemedText>
        <ThemedText style={styles.doneBody}>Pico has your back.</ThemedText>
        <ThemedText style={styles.doneHint}>{payFrequencyLabel('monthly')}</ThemedText>
      </View>
    </OnboardingLayout>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    footerStack: {
      gap: 6,
    },
    footerIcon: {
      width: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    picoPaywallHeader: {
      paddingBottom: 8,
      alignItems: 'center',
    },
    skip: {
      textAlign: 'center',
      color: palette.inkMuted,
      fontSize: 16,
      lineHeight: 22,
      textDecorationLine: 'underline',
      paddingVertical: 6,
    },
    benefits: {
      gap: 10,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    check: {
      color: palette.leafDeep,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: 'Inter_700Bold',
      width: 20,
    },
    benefitText: {
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      color: palette.ink,
    },
    plans: {
      gap: 12,
    },
    checking: {
      color: palette.inkMuted,
      fontSize: 16,
      lineHeight: 22,
      textAlign: 'center',
      paddingVertical: 24,
    },
    premiumCard: {
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: palette.leaf,
      backgroundColor: palette.leafSoft,
      padding: 24,
      gap: 8,
      alignItems: 'center',
    },
    premiumTitle: {
      fontFamily: 'Inter_700Bold',
      fontSize: 22,
      lineHeight: 28,
      color: palette.leafDeep,
    },
    premiumBody: {
      color: palette.inkMuted,
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
    },
    plan: {
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
      padding: 20,
      gap: 4,
    },
    planRecommended: {
      borderColor: palette.outline,
    },
    planSelected: {
      borderColor: palette.berry,
      backgroundColor: palette.berrySoft,
    },
    pressed: {
      opacity: 0.75,
      transform: [{ scale: 0.99 }],
    },
    planTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    planTitle: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 18,
      lineHeight: 24,
      color: palette.ink,
    },
    planPill: {
      borderRadius: 999,
      backgroundColor: palette.surfaceSunken,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    planPillRecommended: {
      backgroundColor: palette.berry,
    },
    planPillText: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.inkMuted,
      fontFamily: 'Inter_700Bold',
    },
    planPillTextRecommended: {
      color: '#FFFFFF',
    },
    planPrice: {
      fontFamily: Fonts.monoBold,
      fontSize: 30,
      lineHeight: 38,
      color: palette.ink,
    },
    planPeriod: {
      fontFamily: Fonts.body,
      fontSize: 16,
      color: palette.inkMuted,
    },
    planNote: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.inkMuted,
    },
    terms: {
      color: palette.inkSubtle,
      fontSize: 14,
      lineHeight: 20,
    },
    paywallError: {
      color: palette.coral,
      fontSize: 15,
      lineHeight: 20,
    },
    restored: {
      color: palette.leafDeep,
      fontSize: 15,
      lineHeight: 20,
      fontFamily: 'Inter_600SemiBold',
    },
    accountWrap: {
      alignItems: 'center',
      gap: 12,
      paddingTop: 24,
    },
    notifyWrap: {
      alignItems: 'center',
      gap: 12,
      paddingTop: 24,
    },
    notifyDenied: {
      color: palette.coral,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: 320,
    },
    accountSigned: {
      color: palette.leafDeep,
      fontSize: 17,
      lineHeight: 26,
      textAlign: 'center',
      maxWidth: 320,
      fontFamily: 'Inter_600SemiBold',
    },
    accountHint: {
      color: palette.inkMuted,
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
      maxWidth: 320,
    },
    doneWrap: {
      alignItems: 'center',
      gap: 8,
      paddingTop: 24,
    },
    doneTitle: {
      fontSize: 32,
      marginTop: 8,
    },
    doneBody: {
      color: palette.inkMuted,
      fontSize: 17,
      lineHeight: 26,
    },
    doneHint: {
      color: palette.inkSubtle,
      fontSize: 15,
      lineHeight: 22,
    },
  });
}
