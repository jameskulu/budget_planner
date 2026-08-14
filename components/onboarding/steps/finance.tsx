import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CurrencyInput } from '@/components/onboarding/currency-input';
import { DateSelector } from '@/components/onboarding/date-selector';
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { TextField } from '@/components/ui/text-field';
import { type PaletteType } from '@/constants/theme';
import { CURRENCIES } from '@/lib/currency';
import {
  createId,
  payFrequencyLabel,
  QUICK_BILLS,
  type OnboardingBill,
} from '@/lib/onboarding';
import { isoDaysFromToday } from '@/lib/safe-spend';
import { useBudget } from '@/lib/store';
import { useAppTheme } from '@/lib/theme';
import type { StepProps } from '@/components/onboarding/steps/welcome';

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim();
  const value = parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function IncomeStep({ value, update, next, back, symbol }: StepProps) {
  const { currency, setCurrency } = useBudget();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [raw, setRaw] = useState(value.income != null ? String(value.income) : '');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const amount = parseAmount(raw);
    if (amount === null) {
      setError('Enter an amount greater than zero.');
      return;
    }
    update({ income: amount });
    next();
  };

  const echo = value.payFrequency && value.income ? (
    <ThemedText style={styles.echo}>
      {symbol}{value.income.toLocaleString('en-US')} {payFrequencyLabel(value.payFrequency)}
    </ThemedText>
  ) : null;

  return (
    <OnboardingLayout
      title="How much do you usually get paid?"
      subtitle="Use the amount that actually reaches your account."
      progress={4 / 16}
      onBack={back}
      footer={<PrimaryButton title="Continue" onPress={submit} />}>
      <ThemedText style={styles.formLabel}>Currency</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {CURRENCIES.map((c) => {
          const active = c.code === currency.code;
          return (
            <Pressable
              key={c.code}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setCurrency(c.code)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.chipPressed,
              ]}>
              <ThemedText style={[styles.chipText, active && styles.chipTextActive]}>
                {c.symbol} {c.code}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
      <CurrencyInput
        symbol={symbol}
        value={raw}
        onChangeText={(t) => {
          setRaw(t);
          setError(null);
          const amount = parseAmount(t);
          update({ income: amount });
        }}
        placeholder="3,500"
        autoFocus
        error={error}
      />
      {echo}
    </OnboardingLayout>
  );
}

export function PaydayStep({ value, update, next, back }: StepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const selected = value.nextPayday;
  const daysLeft = selected
    ? Math.max(0, Math.round((new Date(selected).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <OnboardingLayout
      title="When's your next payday?"
      subtitle="Pico uses this to work out how much you can safely spend before your next paycheck."
      progress={5 / 16}
      onBack={back}
      footer={<PrimaryButton title="Continue" onPress={next} disabled={!selected} />}>
      <DateSelector
        days={30}
        value={selected}
        onSelect={(iso) => update({ nextPayday: iso })}
      />
      {daysLeft != null ? (
        <ThemedText style={styles.echo}>
          {daysLeft === 0 ? 'Today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} to go`}
        </ThemedText>
      ) : null}
    </OnboardingLayout>
  );
}

type BillDraft = {
  label: string;
  amount: string;
  frequency: OnboardingBill['frequency'];
  nextDue: string;
};

const FREQUENCIES: { id: OnboardingBill['frequency']; label: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Every 2 weeks' },
  { id: 'monthly', label: 'Monthly' },
];

export function BillsStep({ value, update, next, back, symbol }: StepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [draft, setDraft] = useState<BillDraft>({
    label: '',
    amount: '',
    frequency: 'monthly',
    nextDue: isoDaysFromToday(30),
  });
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState(false);

  const addBill = () => {
    const amount = parseAmount(draft.amount);
    if (!draft.label.trim() || amount === null) {
      setError('Enter a label and an amount greater than zero.');
      return;
    }
    const bill: OnboardingBill = {
      id: createId('bill'),
      label: draft.label.trim(),
      amount,
      frequency: draft.frequency,
      nextDue: draft.nextDue,
    };
    update({ bills: [...value.bills, bill] });
    setDraft({ label: '', amount: '', frequency: 'monthly', nextDue: isoDaysFromToday(30) });
    setError(null);
  };

  const removeBill = (id: string) => {
    update({ bills: value.bills.filter((b) => b.id !== id) });
  };

  return (
    <OnboardingLayout
      title="What bills do you need to cover?"
      subtitle="Add your regular expenses so Pico can protect them."
      progress={6 / 16}
      onBack={back}
      footer={
        <View style={styles.footerStack}>
          <PrimaryButton title="Continue" onPress={next} />
          <Pressable accessibilityRole="button" onPress={next}>
            <ThemedText style={styles.skip}>I&apos;ll add bills later</ThemedText>
          </Pressable>
        </View>
      }>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {QUICK_BILLS.map((b) => (
          <Pressable
            key={b.label}
            accessibilityRole="button"
            onPress={() => {
              setPicked(true);
              setDraft((d) => ({ ...d, label: b.label }));
            }}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
            <ThemedText style={styles.chipText}>
              {b.icon} {b.label}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {picked || draft.label ? (
        <View style={styles.form}>
          <TextField
            value={draft.label}
            onChangeText={(t) => setDraft((d) => ({ ...d, label: t }))}
            placeholder="Bill name"
            placeholderTextColor={palette.inkFaint}
          />
          <CurrencyInput
            symbol={symbol}
            value={draft.amount}
            onChangeText={(t) => {
              setDraft((d) => ({ ...d, amount: t }));
              setError(null);
            }}
            placeholder="1,200"
            error={error}
          />
          <View style={styles.freqRow}>
            {FREQUENCIES.map((f) => {
              const active = draft.frequency === f.id;
              return (
                <Pressable
                  key={f.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setDraft((d) => ({ ...d, frequency: f.id }))}
                  style={[styles.freq, active && styles.freqActive]}>
                  <ThemedText style={[styles.freqText, active && styles.freqTextActive]}>
                    {f.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ThemedText style={styles.formLabel}>Next due date</ThemedText>
          <DateSelector
            days={30}
            value={draft.nextDue}
            onSelect={(iso) => setDraft((d) => ({ ...d, nextDue: iso }))}
          />
          <PrimaryButton title="Add bill" variant="leaf" onPress={addBill} />
        </View>
      ) : null}

      {value.bills.length > 0 ? (
        <View style={styles.billList}>
          {value.bills.map((b) => (
            <View key={b.id} style={styles.billRow}>
              <ThemedText style={styles.billLabel} numberOfLines={1}>
                {b.label}
              </ThemedText>
              <ThemedText style={styles.billAmount}>
                {symbol}{b.amount.toLocaleString('en-US')}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${b.label}`}
                hitSlop={8}
                onPress={() => removeBill(b.id)}
                style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}>
                <ThemedText style={styles.removeText}>✕</ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </OnboardingLayout>
  );
}

export function SavingsStep({ value, update, next, back, symbol }: StepProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [raw, setRaw] = useState(value.savingsMonthly != null ? String(value.savingsMonthly) : '');
  const [error, setError] = useState<string | null>(null);

  const submit = (amount: number | null) => {
    update({ savingsMonthly: amount });
    next();
  };

  return (
    <OnboardingLayout
      title="How much would you like to save?"
      progress={7 / 16}
      onBack={back}
      footer={
        <View style={styles.footerStack}>
          <PrimaryButton
            title="Continue"
            onPress={() => {
              const amount = parseAmount(raw);
              if (raw.trim() !== '' && amount === null) {
                setError('Enter zero or a positive amount.');
                return;
              }
              submit(amount ?? 0);
            }}
          />
          <Pressable accessibilityRole="button" onPress={() => submit(0)}>
            <ThemedText style={styles.skip}>Skip for now</ThemedText>
          </Pressable>
        </View>
      }>
      <CurrencyInput
        symbol={symbol}
        value={raw}
        onChangeText={(t) => {
          setRaw(t);
          setError(null);
        }}
        placeholder="500"
        autoFocus
        error={error}
      />
      <ThemedText style={styles.perMonth}>/ month</ThemedText>
      <ThemedText style={styles.optionalLabel}>What are you saving for? (optional)</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {[
          { label: 'Vacation', icon: '🏖' },
          { label: 'Car', icon: '🚗' },
          { label: 'Home', icon: '🏠' },
          { label: 'Something big', icon: '🎯' },
        ].map((g) => {
          const active = value.savingsLabel === g.label;
          return (
            <Pressable
              key={g.label}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => update({ savingsLabel: active ? null : g.label })}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.chipPressed,
              ]}>
              <ThemedText style={[styles.chipText, active && styles.chipTextActive]}>
                {g.icon} {g.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </OnboardingLayout>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    echo: {
      color: palette.inkMuted,
      fontSize: 18,
      lineHeight: 26,
      fontFamily: 'Inter_600SemiBold',
    },
    perMonth: {
      color: palette.inkMuted,
      fontSize: 18,
      lineHeight: 26,
      marginTop: -12,
    },
    footerStack: {
      gap: 6,
    },
    skip: {
      textAlign: 'center',
      color: palette.inkMuted,
      fontSize: 16,
      lineHeight: 22,
      textDecorationLine: 'underline',
      paddingVertical: 6,
    },
    chipsRow: {
      gap: 8,
      paddingBottom: 4,
    },
    chip: {
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    chipActive: {
      borderColor: palette.berry,
      backgroundColor: palette.berrySoft,
    },
    chipPressed: {
      opacity: 0.7,
    },
    chipText: {
      fontSize: 16,
      lineHeight: 22,
      color: palette.ink,
    },
    chipTextActive: {
      color: palette.berry,
      fontFamily: 'Inter_700Bold',
    },
    form: {
      gap: 12,
    },
    formLabel: {
      fontSize: 16,
      lineHeight: 22,
      color: palette.inkMuted,
    },
    freqRow: {
      flexDirection: 'row',
      gap: 8,
    },
    freq: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    freqActive: {
      borderColor: palette.berry,
      backgroundColor: palette.berrySoft,
    },
    freqText: {
      fontSize: 15,
      lineHeight: 20,
      color: palette.inkMuted,
    },
    freqTextActive: {
      color: palette.berry,
      fontFamily: 'Inter_700Bold',
    },
    billList: {
      gap: 8,
    },
    billRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    billLabel: {
      flex: 1,
      fontSize: 17,
      lineHeight: 24,
      color: palette.ink,
      fontFamily: 'Inter_600SemiBold',
    },
    billAmount: {
      fontFamily: 'JetBrainsMono_700Bold',
      fontSize: 16,
      lineHeight: 22,
      color: palette.ink,
    },
    remove: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceSunken,
    },
    removePressed: {
      backgroundColor: palette.coralSoft,
    },
    removeText: {
      fontSize: 14,
      lineHeight: 16,
      color: palette.inkSubtle,
    },
    optionalLabel: {
      fontSize: 16,
      lineHeight: 22,
      color: palette.inkMuted,
    },
  });
}
