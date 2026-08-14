import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingLayout } from '@/components/onboarding/onboarding-layout';
import { Pico } from '@/components/pico';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/text-field';
import { Fonts, Palette } from '@/constants/theme';
import type { OnboardingState } from '@/lib/onboarding';
import { parseAmountOnly, parseNote } from '@/lib/parser';
import { canAffordPurchase, computeSafeToSpend, daysUntil, type SafeSpendResult } from '@/lib/safe-spend';
import type { StepProps } from '@/components/onboarding/steps/welcome';

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
      progress={9 / 16}
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
        placeholderTextColor={Palette.inkFaint}
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

export function AdjustStep({ value, next, back, money }: StepProps) {
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
      progress={10 / 16}
      onBack={back}
      footer={<PrimaryButton title="Continue" onPress={next} />}>
      <View style={styles.beforeAfter}>
        <View style={styles.baCard}>
          <ThemedText style={styles.baLabel}>Before</ThemedText>
          <ThemedText style={styles.baValue}>{money(whole(before.dailyAllowance))}/day</ThemedText>
        </View>
        <View style={styles.baArrow}>
          <ThemedText style={styles.baArrowText}>→</ThemedText>
        </View>
        <View style={[styles.baCard, styles.baCardAfter]}>
          <ThemedText style={styles.baLabel}>After spending {money(demoAmount)}</ThemedText>
          <ThemedText style={styles.baValue}>{money(whole(after.dailyAllowance))}/day</ThemedText>
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
      progress={11 / 16}
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
        placeholderTextColor={Palette.inkFaint}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={run}
      />

      {result ? (
        <View style={[styles.affordCard, { borderColor: result.affordable ? Palette.leaf : Palette.coral }]}>
          <ThemedText
            type="title"
            style={{ color: result.affordable ? Palette.leafDeep : Palette.coral, fontSize: 26, lineHeight: 34 }}>
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
      progress={12 / 16}
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

const styles = StyleSheet.create({
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
    color: Palette.inkMuted,
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
    borderBottomColor: Palette.outline,
  },
  lineLabel: {
    fontSize: 17,
    lineHeight: 24,
    color: Palette.ink,
  },
  lineAmount: {
    fontFamily: Fonts.monoBold,
    fontSize: 20,
    lineHeight: 26,
    color: Palette.ink,
  },
  lineAmountHighlight: {
    color: Palette.berry,
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
    backgroundColor: Palette.berrySoft,
    paddingHorizontal: 40,
    paddingVertical: 24,
    marginTop: 8,
  },
  ahaNumber: {
    fontFamily: Fonts.monoBold,
    fontSize: 64,
    lineHeight: 72,
    color: Palette.berry,
    letterSpacing: -2,
  },
  ahaLabel: {
    fontSize: 17,
    lineHeight: 24,
    color: Palette.berry,
    fontFamily: 'Inter_600SemiBold',
  },
  ahaBody: {
    color: Palette.inkMuted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 340,
  },
  ahaNote: {
    color: Palette.inkSubtle,
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
    color: Palette.inkMuted,
    fontSize: 16,
    lineHeight: 22,
    textDecorationLine: 'underline',
    paddingVertical: 6,
  },
  resultCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.outline,
    backgroundColor: Palette.surface,
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
    backgroundColor: Palette.leafDeep,
  },
  resultText: {
    flex: 1,
    gap: 1,
  },
  resultTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    lineHeight: 22,
    color: Palette.ink,
  },
  resultMeta: {
    fontSize: 14,
    lineHeight: 18,
    color: Palette.inkMuted,
  },
  resultAmount: {
    fontFamily: Fonts.monoBold,
    fontSize: 18,
    lineHeight: 24,
    color: Palette.ink,
  },
  resultFound: {
    fontSize: 15,
    lineHeight: 20,
    color: Palette.leafDeep,
    fontFamily: 'Inter_600SemiBold',
  },
  error: {
    color: Palette.coral,
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
    borderColor: Palette.outline,
    backgroundColor: Palette.surface,
    padding: 16,
    gap: 4,
  },
  baCardAfter: {
    borderColor: Palette.berry,
    backgroundColor: Palette.berrySoft,
  },
  baLabel: {
    fontSize: 14,
    lineHeight: 18,
    color: Palette.inkMuted,
  },
  baValue: {
    fontFamily: Fonts.monoBold,
    fontSize: 26,
    lineHeight: 32,
    color: Palette.ink,
  },
  baArrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  baArrowText: {
    fontSize: 20,
    color: Palette.inkSubtle,
  },
  adjustBody: {
    color: Palette.inkMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  adjustNote: {
    color: Palette.inkSubtle,
    fontSize: 15,
    lineHeight: 22,
  },
  affordCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
    gap: 10,
    backgroundColor: Palette.surface,
  },
  affordBody: {
    fontSize: 16,
    lineHeight: 24,
    color: Palette.inkMuted,
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
    color: Palette.inkMuted,
  },
  affordRowValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: Fonts.monoBold,
    fontSize: 15,
    lineHeight: 20,
    color: Palette.ink,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.outline,
    backgroundColor: Palette.surface,
    padding: 18,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Palette.outline,
  },
  summaryLabel: {
    fontSize: 16,
    lineHeight: 22,
    color: Palette.inkMuted,
  },
  summaryValue: {
    fontFamily: Fonts.monoBold,
    fontSize: 17,
    lineHeight: 22,
    color: Palette.ink,
  },
  summaryValueHighlight: {
    color: Palette.berry,
    fontSize: 20,
  },
});
