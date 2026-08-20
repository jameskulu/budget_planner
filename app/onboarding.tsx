import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, View } from 'react-native';

import { AhaStep, AffordStep, AdjustStep, CalculatingStep, InsightsStep, SummaryStep, TrackStep, VoiceStep } from '@/components/onboarding/steps/demo';
import { BillsStep, IncomeStep, PaydayStep, SavingsStep } from '@/components/onboarding/steps/finance';
import { AccountStep, DoneStep, NotifyStep, PaywallStep } from '@/components/onboarding/steps/finish';
import { GoalStep, PayFrequencyStep, ProblemStep, WelcomeStep } from '@/components/onboarding/steps/welcome';
import { useAuth } from '@/lib/auth';
import { trackOnboardingCompleted, trackOnboardingStep } from '@/lib/analytics';
import { ONBOARDING_STEP_COUNT, type OnboardingPlan, type PlanPeriod } from '@/lib/onboarding';
import { useBudget } from '@/lib/store';
import { useAppTheme } from '@/lib/theme';

export default function OnboardingScreen() {
  const { user, signInWithGoogle, signInAsGuest } = useAuth();
  const params = useLocalSearchParams<{ step?: string }>();
  const jumpTo = params.step ? Number(params.step) : null;
  const {
    onboarding,
    onboardingLoaded,
    updateOnboarding,
    money,
    currency,
    addTransaction,
    notificationPrefs,
    setNotificationPrefs,
    recurring,
  } = useBudget();
  const [signingIn, setSigningIn] = useState(false);
  const [plan, setPlan] = useState<OnboardingPlan>(onboarding.plan);

  const symbol = currency.symbol;

  const { palette } = useAppTheme();

  const next = useCallback(() => {
    updateOnboarding({ step: Math.min(onboarding.step + 1, ONBOARDING_STEP_COUNT - 1) });
    trackOnboardingStep(Math.min(onboarding.step + 1, ONBOARDING_STEP_COUNT - 1));
  }, [onboarding.step, updateOnboarding]);

  const back = useCallback(() => {
    if (onboarding.step <= 0) {
      router.back();
      return;
    }
    updateOnboarding({ step: Math.max(onboarding.step - 1, 0) });
  }, [onboarding.step, updateOnboarding]);

  const choosePlan = useCallback((p: Exclude<OnboardingPlan, null>) => {
    setPlan(p);
    updateOnboarding({ plan: p });
  }, [updateOnboarding]);

  const setPeriod = useCallback((period: PlanPeriod) => {
    updateOnboarding({ planPeriod: period });
  }, [updateOnboarding]);

  const finish = useCallback(() => {
    trackOnboardingCompleted();
    updateOnboarding({ completed: true });
  }, [updateOnboarding]);

  const goDashboard = useCallback(() => {
    trackOnboardingCompleted();
    updateOnboarding({ completed: true });
    router.replace('/(tabs)');
  }, [updateOnboarding]);

  const handleGoogle = useCallback(async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
      // On web this navigates away; on native the session lands and we can
      // mark the plan complete when the user returns here or at dashboard.
    } finally {
      setSigningIn(false);
    }
  }, [signInWithGoogle]);

  const handleGuest = useCallback(() => {
    void signInAsGuest();
  }, [signInAsGuest]);

  const stepProps = useMemo(
    () => ({
      value: onboarding,
      update: updateOnboarding,
      next,
      back,
      symbol,
      money,
      plan,
      planPeriod: onboarding.planPeriod,
      choosePlan,
      setPeriod,
      finish,
      user,
      signingIn,
      onGoogle: handleGoogle,
      onGuest: handleGuest,
      goDashboard,
      addTransaction,
      notificationPrefs,
      setNotificationPrefs,
      recurring,
    }),
    [
      onboarding,
      updateOnboarding,
      next,
      back,
      symbol,
      money,
      plan,
      choosePlan,
      setPeriod,
      finish,
      user,
      signingIn,
      handleGoogle,
      handleGuest,
      goDashboard,
      addTransaction,
      notificationPrefs,
      setNotificationPrefs,
      recurring,
    ],
  );

  const step = onboarding.step;
  const effectiveStep = jumpTo ?? step;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [effectiveStep, progress]);

  if (!onboardingLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator color={palette.berry} />
      </View>
    );
  }

  if (onboarding.completed && jumpTo == null) {
    return <Redirect href="/(tabs)" />;
  }

  const renderStep = () => {
    switch (effectiveStep) {
      case 0:
        return <WelcomeStep {...stepProps} />;
      case 1:
        return <ProblemStep {...stepProps} />;
      case 2:
        return <GoalStep {...stepProps} />;
      case 3:
        return <PayFrequencyStep {...stepProps} />;
      case 4:
        return <IncomeStep {...stepProps} />;
      case 5:
        return <PaydayStep {...stepProps} />;
      case 6:
        return <BillsStep {...stepProps} />;
      case 7:
        return <SavingsStep {...stepProps} />;
      case 8:
        return <CalculatingStep {...stepProps} />;
      case 9:
        return <AhaStep {...stepProps} />;
      case 10:
        return <TrackStep {...stepProps} />;
      case 11:
        return <VoiceStep {...stepProps} />;
      case 12:
        return <AdjustStep {...stepProps} />;
      case 13:
        return <AffordStep {...stepProps} />;
      case 14:
        return <SummaryStep {...stepProps} />;
      case 15:
        return <InsightsStep {...stepProps} />;
      case 16:
        return <AccountStep {...stepProps} />;
      case 17:
        return <PaywallStep {...stepProps} />;
      case 18:
        return <NotifyStep {...stepProps} />;
      default:
        return <DoneStep {...stepProps} />;
    }
  };

  return (
    <Animated.View
      key={effectiveStep}
      style={{
        flex: 1,
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
        ],
      }}>
      {renderStep()}
    </Animated.View>
  );
}
