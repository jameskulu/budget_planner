import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { DonutChart } from '@/components/donut-chart';
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout';
import { Pico } from '@/components/pico';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TextField } from '@/components/ui/text-field';
import { Fonts, type PaletteType } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';
import type { OnboardingState } from '@/lib/onboarding';
import { parseAmountOnly, parseNote } from '@/lib/parser';
import { canAffordPurchase, computeSafeToSpend, daysUntil, type SafeSpendResult } from '@/lib/safe-spend';
import type { StepProps } from '@/components/onboarding/steps/welcome';

type SRModule = (typeof import('expo-speech-recognition'))['ExpoSpeechRecognitionModule'];

let cachedSR: SRModule | null | undefined;

/**
 * Loaded lazily so Node static rendering and unsupported platforms
 * never execute the speech-recognition module.
 */
async function loadSR(): Promise<SRModule | null> {
  if (cachedSR !== undefined) return cachedSR;
  if (Platform.OS === 'web' && typeof window === 'undefined') {
    cachedSR = null;
    return null;
  }
  try {
    const mod = await import('expo-speech-recognition');
    cachedSR = mod.ExpoSpeechRecognitionModule;
  } catch {
    cachedSR = null;
  }
  return cachedSR;
}

type SafeInput = {
  income: number;
  payFrequency: OnboardingState['payFrequency'];
  nextPayday: string;
  bills: OnboardingState['bills'];
  savingsMonthly: number;
  spentThisPeriod: number;
};

function safeInput(state: OnboardingState, spent: number): SafeInput {
  return {
    income: state.income ?? 0,
    payFrequency: state.payFrequency ?? 'monthly',
    nextPayday: state.nextPayday ?? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    bills: state.bills,
    savingsMonthly: state.savingsMonthly ?? 0,
    spentThisPeriod: spent,
  };
}

function whole(n: number): number {
  return Math.round(n);
}

export function CalculatingStep({ value, next, money }: StepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [stage, setStage] = useState(0);
  const result = useMemo(
    () => computeSafeToSpend(safeInput(value, 0) as Parameters<typeof computeSafeToSpend>[0]),
    [value],
  );

  useEffect(() => {
    const timers = [400, 1100, 1800, 2500, 3400].map((ms, i) =>
      setTimeout(() => setStage(i + 1), ms),
    );
    const advance = setTimeout(() => next(), 4200);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(advance);
    };
  }, [next]);

  const lines = [
    { label: 'Income', amount: value.income ?? 0, sign: '+' as const, shown: stage >= 1 },
    { label: 'Upcoming bills', amount: result.billsDue, sign: '-' as const, shown: stage >= 2 },
    { label: 'Savings goal', amount: result.savingsSlice, sign: '-' as const, shown: stage >= 3 },
    { label: 'Available spending', amount: result.availableForPeriod, sign: '' as const, shown: stage >= 4, highlight: true },
  ];

  return (
    <OnboardingLayout>
      <View style={styles.calcWrap}>
        <Pico size={120} />
        <ThemedText type="title" style={styles.calcTitle}>
          {stage >= 5 ? "Okay, I've got it! 🧮" : "Okay, I've got it! 🧮"}
        </ThemedText>
        <ThemedText style={styles.calcSub}>
          {stage >= 5 ? "Here's your plan." : 'Let me crunch the numbers...'}
        </ThemedText>
      </View>

      <View style={styles.lines}>
        {lines.map((line) => (
          <View key={line.label} style={styles.line}>
            <ThemedText style={styles.lineLabel}>{line.label}</ThemedText>
            <ThemedText
              style={[
                styles.lineAmount,
                line.highlight && styles.lineAmountHighlight,
              ]}>
              {line.shown ? `${line.sign}${money(line.amount)}` : ' '}
            </ThemedText>
          </View>
        ))}
      </View>
    </OnboardingLayout>
  );
}

export function AhaStep({ value, next, money }: StepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const result = useMemo(
    () => computeSafeToSpend(safeInput(value, 0) as Parameters<typeof computeSafeToSpend>[0]),
    [value],
  );

  return (
    <OnboardingLayout
      footer={<PrimaryButton title="See how it works" onPress={next} />}>
      <View style={styles.ahaWrap}>
        <Pico size={120} />
        <ThemedText type="title" style={styles.ahaTitle}>You&apos;re all set! 🎉</ThemedText>
        <View style={styles.ahaNumberCard}>
          <ThemedText style={styles.ahaNumber}>{money(whole(result.dailyAllowance))}</ThemedText>
          <ThemedText style={styles.ahaLabel}>Safe to spend today</ThemedText>
        </View>
        <ThemedText style={styles.ahaBody}>
          Based on your income, bills, savings goal, current spending, and next payday.
        </ThemedText>
        <ThemedText style={styles.ahaNote}>
          Your spending allowance will automatically adjust as your situation changes.
        </ThemedText>
      </View>
    </OnboardingLayout>
  );
}

export function TrackStep({
  value,
  update,
  next,
  back,
  money,
  symbol,
  addTransaction,
}: StepProps & { addTransaction: (parsed: NonNullable<OnboardingState['demo']['parsed']>) => string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [text, setText] = useState(`Spent ${symbol}25 on lunch`);
  const [confirmed, setConfirmed] = useState(false);

  const parsed = useMemo(() => parseNote(text), [text]);
  const first = parsed.ok ? parsed.parsed[0] : null;

  const handleAdd = () => {
    if (!first) return;
    update({ demo: { parsed: first, logged: false } });
    addTransaction(first);
    setConfirmed(true);
    setTimeout(next, 900);
  };

  return (
    <OnboardingLayout
      title="Just write what you spent ✍️"
      subtitle="No forms. No spreadsheets."
      progress={10 / 20}
      onBack={back}
      footer={
        <View style={styles.footerStack}>
          {confirmed ? (
            <PrimaryButton title="Continue" onPress={next} />
          ) : (
            <View style={styles.footerRow}>
              <View style={styles.footerFlex}>
                <PrimaryButton title="Add transaction" variant="leaf" onPress={handleAdd} disabled={!first} />
              </View>
              <PrimaryButton title="Try another" onPress={() => setText(`Bought groceries for ${symbol}60 yesterday`)} />
            </View>
          )}
          <Pressable accessibilityRole="button" onPress={next}>
            <ThemedText style={styles.skip}>Skip this demo</ThemedText>
          </Pressable>
        </View>
      }>
      <TextField
        big
        value={text}
        onChangeText={setText}
        placeholder="What happened with your money?"
        placeholderTextColor={palette.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {first ? (
        <View style={styles.resultCard}>
          <View style={styles.resultRow}>
            <View style={styles.resultDot} />
            <View style={styles.resultText}>
              <ThemedText style={styles.resultTitle}>{first.note}</ThemedText>
              <ThemedText style={styles.resultMeta}>{first.category}</ThemedText>
            </View>
            <ThemedText style={styles.resultAmount}>
              {first.type === 'income' ? '+' : '-'}
              {money(first.amount)}
            </ThemedText>
          </View>
          <ThemedText style={styles.resultFound}>
            I found {parsed.ok ? parsed.parsed.length : 0} transaction{parsed.ok && parsed.parsed.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      ) : (
        <ThemedText style={styles.error}>{parsed.ok ? '' : parsed.error}</ThemedText>
      )}
    </OnboardingLayout>
  );
}

/**
 * The flagship feature: tap the mic, say what you spent, and Pico logs it.
 * Falls back to a simulated transcript when speech recognition isn't
 * available (e.g. Expo Go or web).
 */
export function VoiceStep({
  value,
  update,
  next,
  back,
  money,
  symbol,
  addTransaction,
}: StepProps & { addTransaction: (parsed: NonNullable<OnboardingState['demo']['parsed']>) => string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const moduleRef = useRef<SRModule | null>(null);
  const disposedRef = useRef(false);

  const parsed = useMemo(() => (transcript ? parseNote(transcript) : null), [transcript]);
  const first = parsed?.ok ? parsed.parsed[0] : null;

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!listening) return;
    const anim = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    );
    pulse.setValue(0);
    anim.start();
    return () => anim.stop();
  }, [listening, pulse]);

  const handleTranscript = useCallback(
    (text: string) => {
      if (disposedRef.current) return;
      setTranscript(text);
      setListening(false);
    },
    [],
  );

  useEffect(() => {
    let subs: { remove(): void }[] = [];
    (async () => {
      const module = await loadSR();
      if (disposedRef.current || !module) return;
      moduleRef.current = module;
      const onResult = (ev: { isFinal?: boolean; results?: { transcript?: string }[] }) => {
        if (!ev.isFinal) return;
        const t = ev.results?.[0]?.transcript ?? '';
        if (!t.trim()) return;
        handleTranscript(t);
      };
      const onError = (ev: { error?: string }) => {
        setListening(false);
        if (ev.error === 'no-speech') setError("I didn't hear anything — try again.");
        else if (ev.error === 'not-allowed') setError('Microphone permission is off.');
        else setError('Dictation stopped.');
      };
      const onEnd = () => setListening(false);
      subs.push(module.addListener('result', onResult));
      subs.push(module.addListener('error', onError));
      subs.push(module.addListener('end', onEnd));
    })();
    return () => {
      subs.forEach((s) => s.remove());
    };
  }, [handleTranscript]);

  const listen = async () => {
    setError(null);
    const module = await loadSR();
    moduleRef.current = module;
    if (!module) {
      // No speech recognition here (Expo Go / web): simulate a live demo.
      setTranscript('');
      setListening(true);
      setTimeout(() => {
        if (disposedRef.current) return;
        setListening(false);
        handleTranscript(`Spent ${symbol}25 on lunch`);
      }, 1600);
      return;
    }
    try {
      const perm = await module.requestPermissionsAsync();
      if (perm && !perm.granted) {
        setError('Microphone permission is off.');
        return;
      }
    } catch {}
    setTranscript('');
    setListening(true);
    try {
      module.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
        contextualStrings: ['spent', 'bought', 'paid', 'salary', 'received', 'groceries', 'coffee', 'rent'],
      });
    } catch {
      setListening(false);
      setError('Could not start dictation.');
    }
  };

  const stop = () => {
    setListening(false);
    try {
      moduleRef.current?.stop();
    } catch {}
  };

  const handleAdd = () => {
    if (!first) return;
    update({ demo: { parsed: first, logged: false } });
    addTransaction(first);
    setConfirmed(true);
  };

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <OnboardingLayout
      title="Or just say it 🎤"
      subtitle="Speak your spending — Pico logs it instantly."
      progress={11 / 20}
      onBack={back}
      footer={
        <View style={styles.footerStack}>
          {confirmed ? (
            <PrimaryButton title="Continue" onPress={next} />
          ) : first ? (
            <>
              <PrimaryButton title="Add transaction" variant="leaf" onPress={handleAdd} />
              <Pressable accessibilityRole="button" onPress={listen}>
                <ThemedText style={styles.skip}>Listen again</ThemedText>
              </Pressable>
            </>
          ) : (
            <Pressable accessibilityRole="button" onPress={next}>
              <ThemedText style={styles.skip}>Skip this demo</ThemedText>
            </Pressable>
          )}
        </View>
      }>
      <View style={styles.voiceWrap}>
        <View style={styles.voiceMicArea}>
          {listening ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.voiceRing,
                { transform: [{ scale: ringScale }], opacity: ringOpacity },
              ]}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Stop listening' : 'Record spending or income'}
            onPress={listening ? stop : () => void listen()}
            style={({ pressed }) => [
              styles.voiceMic,
              listening && styles.voiceMicListening,
              pressed && styles.pressed,
            ]}>
            <IconSymbol name="mic.fill" size={38} color={listening ? '#FFFFFF' : palette.surface} />
          </Pressable>
        </View>
        {listening ? (
          <ThemedText style={styles.voiceHint}>Listening… say it!</ThemedText>
        ) : error ? (
          <ThemedText style={styles.voiceError}>{error}</ThemedText>
        ) : first ? (
          <ThemedText style={styles.voiceHint}>Say something like “spent {symbol}25 on lunch”</ThemedText>
        ) : (
          <ThemedText style={styles.voiceHint}>Tap the mic and say what you spent</ThemedText>
        )}
      </View>

      {first ? (
        <View style={styles.resultCard}>
          <View style={styles.resultRow}>
            <View style={styles.resultDot} />
            <View style={styles.resultText}>
              <ThemedText style={styles.resultTitle}>{first.note}</ThemedText>
              <ThemedText style={styles.resultMeta}>{first.category}</ThemedText>
            </View>
            <ThemedText style={styles.resultAmount}>
              {first.type === 'income' ? '+' : '-'}
              {money(first.amount)}
            </ThemedText>
          </View>
          <ThemedText style={styles.resultFound}>
            I heard you {parsed && parsed.ok && parsed.parsed.length !== 1 ? `— ${parsed.parsed.length} transactions` : ''}
          </ThemedText>
        </View>
      ) : null}
    </OnboardingLayout>
  );
}

export function AdjustStep({ value, next, back, money }: StepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const demoAmount = value.demo.parsed?.amount ?? 0;
  const before = useMemo(
    () => computeSafeToSpend(safeInput(value, 0) as Parameters<typeof computeSafeToSpend>[0]),
    [value],
  );
  const after = useMemo(
    () => computeSafeToSpend(safeInput(value, demoAmount) as Parameters<typeof computeSafeToSpend>[0]),
    [value, demoAmount],
  );

  return (
    <OnboardingLayout
      title="Updated automatically 🔄"
      progress={12 / 20}
      onBack={back}
      footer={<PrimaryButton title="Continue" onPress={next} />}>
      <View style={styles.beforeAfter}>
        <View style={styles.baCard}>
          <ThemedText style={styles.baLabel}>Before</ThemedText>
          <ThemedText
            style={styles.baValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}>
            {money(whole(before.dailyAllowance))}/day
          </ThemedText>
        </View>
        <View style={styles.baArrow}>
          <ThemedText style={styles.baArrowText}>→</ThemedText>
        </View>
        <View style={[styles.baCard, styles.baCardAfter]}>
          <ThemedText style={styles.baLabel}>After spending {money(demoAmount)}</ThemedText>
          <ThemedText
            style={styles.baValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}>
            {money(whole(after.dailyAllowance))}/day
          </ThemedText>
        </View>
      </View>
      <ThemedText style={styles.adjustBody}>
        Pico automatically adjusts your spending allowance as you spend.
      </ThemedText>
      <ThemedText style={styles.adjustNote}>
        You don&apos;t need to manually recalculate your budget.
      </ThemedText>
    </OnboardingLayout>
  );
}

export function AffordStep({ value, next, back, money, symbol }: StepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [text, setText] = useState(`Can I buy ${symbol}120 shoes?`);
  const [result, setResult] = useState<(SafeSpendResult & { affordable: boolean }) | null>(null);

  const run = () => {
    const cost = parseAmountOnly(text);
    if (cost === null) return;
    const spent = value.demo.parsed?.amount ?? 0;
    const verdict = canAffordPurchase(
      safeInput(value, spent) as Parameters<typeof canAffordPurchase>[0],
      cost,
    );
    setResult(verdict);
  };

  const nextPayday = value.nextPayday;
  const days = nextPayday ? daysUntil(nextPayday) : null;

  return (
    <OnboardingLayout
      title="Thinking about buying something?"
      subtitle="Ask Pico before you spend."
      progress={13 / 20}
      onBack={back}
      footer={
        <View style={styles.footerStack}>
          <PrimaryButton title={result ? 'Continue' : 'Check'} onPress={() => (result ? next() : run())} />
          <Pressable accessibilityRole="button" onPress={next}>
            <ThemedText style={styles.skip}>Skip this demo</ThemedText>
          </Pressable>
        </View>
      }>
      <TextField
        big
        value={text}
        onChangeText={(t) => {
          setText(t);
          setResult(null);
        }}
        placeholder={`Can I buy ${symbol}120 shoes?`}
        placeholderTextColor={palette.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={run}
      />

      {result ? (
        <View style={[styles.affordCard, { borderColor: result.affordable ? palette.leaf : palette.coral }]}>
          <ThemedText
            type="title"
            style={{ color: result.affordable ? palette.leafDeep : palette.coral, fontSize: 26, lineHeight: 34 }}>
            {result.affordable ? '✅ Yes, you can.' : '❌ Not quite.'}
          </ThemedText>
          <ThemedText style={styles.affordBody}>
            {result.affordable
              ? "You'll still be on track."
              : `You'd be ${money(whole(Math.max(0, parseAmountOnly(text) ?? 0 - result.remainingForPeriod)))} over.`}
          </ThemedText>
          <View style={styles.affordRow}>
            <ThemedText style={styles.affordRowLabel}>Safe to spend</ThemedText>
            <ThemedText style={styles.affordRowValue}>
              {money(whole(result.dailyAllowance))}/day → {money(whole((result.remainingForPeriod - (parseAmountOnly(text) ?? 0)) / Math.max(1, result.daysUntilPayday)))}
              {days != null ? ` · ${days} day${days === 1 ? '' : 's'} to payday` : ''}
            </ThemedText>
          </View>
        </View>
      ) : null}
    </OnboardingLayout>
  );
}

export function SummaryStep({ value, next, back, money }: StepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const result = useMemo(
    () => computeSafeToSpend(safeInput(value, 0) as Parameters<typeof computeSafeToSpend>[0]),
    [value],
  );

  const rows = [
    { label: 'Income', value: money(value.income ?? 0) },
    { label: 'Bills', value: `−${money(result.billsDue)}` },
    {
      label: 'Savings goal',
      value: value.savingsMonthly ? `−${money(value.savingsMonthly)}` : '—',
    },
    { label: 'Safe to spend', value: `${money(whole(result.dailyAllowance))}/day`, highlight: true },
  ];

  return (
    <OnboardingLayout
      title="Here's your money snapshot"
      progress={14 / 20}
      onBack={back}
      footer={<PrimaryButton title="Continue" onPress={next} />}>
      <View style={styles.summaryCard}>
        {rows.map((row) => (
          <View key={row.label} style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>{row.label}</ThemedText>
            <ThemedText style={[styles.summaryValue, row.highlight && styles.summaryValueHighlight]}>
              {row.value}
            </ThemedText>
          </View>
        ))}
        {value.nextPayday ? (
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Next payday</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {new Date(value.nextPayday).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
              })}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </OnboardingLayout>
  );
}

/**
 * A preview of the Insights experience: where the money goes at a glance.
 * Uses the plan the user just built so it feels personal.
 */
export function InsightsStep({ value, next, back, money }: StepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const result = useMemo(
    () => computeSafeToSpend(safeInput(value, 0) as Parameters<typeof computeSafeToSpend>[0]),
    [value],
  );

  const slices = [
    { value: result.billsDue, color: palette.coral },
    { value: result.savingsSlice, color: palette.skyDeep },
    { value: Math.max(0, result.availableForPeriod), color: palette.leaf },
  ].filter((s) => s.value > 0);

  const rows = [
    { label: 'Bills & investments', amount: result.billsDue, color: palette.coral },
    { label: 'Savings goal', amount: result.savingsSlice, color: palette.skyDeep },
    { label: 'Available to spend', amount: Math.max(0, result.availableForPeriod), color: palette.leaf, highlight: true },
  ];

  return (
    <OnboardingLayout
      title="See where your money goes 📊"
      subtitle="Insights update automatically as you spend."
      progress={15 / 20}
      onBack={back}
      footer={<PrimaryButton title="Continue" onPress={next} />}>
      <DonutChart
        slices={slices}
        centerLabel="this period"
        centerValue={money(whole(result.availableForPeriod))}
      />
      <View style={styles.insightsCard}>
        {rows.map((row) => (
          <View key={row.label} style={styles.insightsRow}>
            <View style={[styles.insightsDot, { backgroundColor: row.color }]} />
            <ThemedText style={styles.insightsLabel}>{row.label}</ThemedText>
            <ThemedText style={[styles.insightsValue, row.highlight && styles.insightsValueHighlight]}>
              {money(whole(row.amount))}
            </ThemedText>
          </View>
        ))}
      </View>
      <ThemedText style={styles.insightsNote}>
        Track spending by category, see trends, and stay on track — without lifting a finger.
      </ThemedText>
    </OnboardingLayout>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    calcWrap: {
      alignItems: 'center',
      gap: 8,
      paddingTop: 24,
    },
    calcTitle: {
      fontSize: 30,
      marginTop: 8,
    },
    calcSub: {
      color: palette.inkMuted,
      fontSize: 17,
      lineHeight: 26,
    },
    lines: {
      gap: 2,
    },
    line: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: palette.outline,
    },
    lineLabel: {
      fontSize: 17,
      lineHeight: 24,
      color: palette.ink,
    },
    lineAmount: {
      fontFamily: Fonts.monoBold,
      fontSize: 20,
      lineHeight: 26,
      color: palette.ink,
    },
    lineAmountHighlight: {
      color: palette.berry,
      fontSize: 24,
    },
    ahaWrap: {
      alignItems: 'center',
      gap: 10,
      paddingTop: 24,
    },
    ahaTitle: {
      fontSize: 30,
      marginTop: 8,
    },
    ahaNumberCard: {
      alignItems: 'center',
      gap: 2,
      borderRadius: 24,
      backgroundColor: palette.berrySoft,
      paddingHorizontal: 40,
      paddingVertical: 24,
      marginTop: 8,
    },
    ahaNumber: {
      fontFamily: Fonts.monoBold,
      fontSize: 64,
      lineHeight: 72,
      color: palette.berry,
      letterSpacing: -2,
    },
    ahaLabel: {
      fontSize: 17,
      lineHeight: 24,
      color: palette.berry,
      fontFamily: 'Inter_600SemiBold',
    },
    ahaBody: {
      color: palette.inkMuted,
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
      maxWidth: 340,
    },
    ahaNote: {
      color: palette.inkSubtle,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: 340,
    },
    footerStack: {
      gap: 6,
    },
    footerRow: {
      flexDirection: 'row',
      gap: 8,
    },
    footerFlex: {
      flex: 1,
    },
    skip: {
      textAlign: 'center',
      color: palette.inkMuted,
      fontSize: 16,
      lineHeight: 22,
      textDecorationLine: 'underline',
      paddingVertical: 6,
    },
    resultCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
      padding: 16,
      gap: 10,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    resultDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: palette.leafDeep,
    },
    resultText: {
      flex: 1,
      gap: 1,
    },
    resultTitle: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 17,
      lineHeight: 22,
      color: palette.ink,
    },
    resultMeta: {
      fontSize: 14,
      lineHeight: 18,
      color: palette.inkMuted,
    },
    resultAmount: {
      fontFamily: Fonts.monoBold,
      fontSize: 18,
      lineHeight: 24,
      color: palette.ink,
    },
    resultFound: {
      fontSize: 15,
      lineHeight: 20,
      color: palette.leafDeep,
      fontFamily: 'Inter_600SemiBold',
    },
    error: {
      color: palette.coral,
      fontSize: 15,
      lineHeight: 20,
    },
    beforeAfter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    baCard: {
      flex: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
      padding: 16,
      gap: 4,
    },
    baCardAfter: {
      borderColor: palette.berry,
      backgroundColor: palette.berrySoft,
    },
    baLabel: {
      fontSize: 14,
      lineHeight: 18,
      color: palette.inkMuted,
    },
    baValue: {
      fontFamily: Fonts.monoBold,
      fontSize: 22,
      lineHeight: 26,
      color: palette.ink,
      flexShrink: 1,
    },
    baArrow: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    baArrowText: {
      fontSize: 20,
      color: palette.inkSubtle,
    },
    adjustBody: {
      color: palette.inkMuted,
      fontSize: 16,
      lineHeight: 24,
    },
    adjustNote: {
      color: palette.inkSubtle,
      fontSize: 15,
      lineHeight: 22,
    },
    affordCard: {
      borderRadius: 20,
      borderWidth: 2,
      padding: 20,
      gap: 10,
      backgroundColor: palette.surface,
    },
    affordBody: {
      fontSize: 16,
      lineHeight: 24,
      color: palette.inkMuted,
    },
    affordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    affordRowLabel: {
      fontSize: 15,
      lineHeight: 20,
      color: palette.inkMuted,
    },
    affordRowValue: {
      flex: 1,
      textAlign: 'right',
      fontFamily: Fonts.monoBold,
      fontSize: 15,
      lineHeight: 20,
      color: palette.ink,
    },
    summaryCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
      padding: 18,
      gap: 4,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.outline,
    },
    summaryLabel: {
      fontSize: 16,
      lineHeight: 22,
      color: palette.inkMuted,
    },
    summaryValue: {
      fontFamily: Fonts.monoBold,
      fontSize: 17,
      lineHeight: 22,
      color: palette.ink,
    },
    summaryValueHighlight: {
      color: palette.berry,
      fontSize: 20,
    },
    voiceWrap: {
      alignItems: 'center',
      gap: 14,
      paddingTop: 24,
    },
    voiceMicArea: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    voiceMic: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: palette.skyDeep,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: palette.ink,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 8,
    },
    voiceMicListening: {
      backgroundColor: palette.coral,
    },
    voiceRing: {
      position: 'absolute',
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: palette.coral,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.96 }],
    },
    voiceHint: {
      textAlign: 'center',
      color: palette.inkMuted,
      fontSize: 16,
      lineHeight: 22,
      maxWidth: 320,
    },
    voiceError: {
      textAlign: 'center',
      color: palette.coral,
      fontSize: 16,
      lineHeight: 22,
      maxWidth: 320,
    },
    insightsCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
      padding: 18,
      gap: 4,
    },
    insightsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.outline,
    },
    insightsDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    insightsLabel: {
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      color: palette.inkMuted,
    },
    insightsValue: {
      fontFamily: Fonts.monoBold,
      fontSize: 17,
      lineHeight: 22,
      color: palette.ink,
    },
    insightsValueHighlight: {
      color: palette.berry,
      fontSize: 20,
    },
    insightsNote: {
      color: palette.inkSubtle,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: 340,
      alignSelf: 'center',
    },
  });
}
