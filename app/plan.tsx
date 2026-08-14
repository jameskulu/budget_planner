import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Pico } from '@/components/pico';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TextField } from '@/components/ui/text-field';
import { Fonts, type PaletteType } from '@/constants/theme';
import { useBudget } from '@/lib/store';
import { useAppTheme } from '@/lib/theme';
import type { RecurringItem } from '@/lib/recurring';

function AddForm({ type }: { type: RecurringItem['type'] }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { addRecurring } = useBudget();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const cleaned = amount.replace(/,/g, '').trim();
    const value = parseFloat(cleaned);
    const dayValue = Math.round(parseFloat(day));
    if (!label.trim() || !Number.isFinite(value) || value <= 0) {
      setError('Enter a label and a positive amount.');
      return;
    }
    addRecurring({
      type,
      label: label.trim(),
      amount: value,
      day: Number.isFinite(dayValue) ? Math.min(Math.max(dayValue, 1), 31) : 1,
    });
    setLabel('');
    setAmount('');
    setDay('1');
    setError(null);
  };

  return (
    <View style={styles.form}>
      <TextField
        value={label}
        onChangeText={setLabel}
        placeholder={
          type === 'income'
            ? 'e.g. Salary'
            : type === 'investment'
              ? 'e.g. Index fund'
              : 'e.g. Rent'
        }
        placeholderTextColor={palette.inkFaint}
        style={styles.formLabel}
      />
      <View style={styles.formRow}>
        <TextField
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount"
          placeholderTextColor={palette.inkFaint}
          keyboardType="numeric"
          style={styles.formAmount}
        />
        <TextField
          value={day}
          onChangeText={setDay}
          placeholder="Day"
          placeholderTextColor={palette.inkFaint}
          keyboardType="number-pad"
          style={styles.formDay}
        />
        <PrimaryButton title="Add" onPress={submit} style={styles.formButton} />
      </View>
      <ThemedText style={styles.formDayHint}>Day of the month it lands on (e.g. rent on the 1st).</ThemedText>
      {error ? <ThemedText style={styles.formError}>{error}</ThemedText> : null}
    </View>
  );
}

function RecurringList({
  items,
  emptyText,
  accent,
}: {
  items: RecurringItem[];
  emptyText: string;
  accent: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { deleteRecurring, money } = useBudget();

  if (items.length === 0) {
    return <ThemedText style={styles.emptyText}>{emptyText}</ThemedText>;
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={[styles.rowDot, { backgroundColor: accent }]} />
          <View style={styles.rowMiddle}>
            <ThemedText style={styles.rowLabel} numberOfLines={1}>
              {item.label}
            </ThemedText>
            <ThemedText style={styles.rowPerMonth}>every month</ThemedText>
          </View>
          <ThemedText style={styles.rowAmount}>
            {item.type === 'income' ? '+' : '-'}
            {money(item.amount)}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.label}`}
            hitSlop={8}
            onPress={() => deleteRecurring(item.id)}
            style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}>
            <ThemedText style={styles.removeText}>✕</ThemedText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

export default function PlanScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { recurring, monthly, money } = useBudget();

  const income = recurring.filter((r) => r.type === 'income');
  const expense = recurring.filter((r) => r.type === 'expense');
  const investment = recurring.filter((r) => r.type === 'investment');
  const canSave = monthly.savingsEstimate > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={28} color={palette.ink} />
            </Pressable>
            <ThemedText type="title">Monthly plan</ThemedText>
          </View>

          <Pico
            size={72}
            pose="upcoming_bill"
            speech="Pico automatically tracks your bills & recurring savings! 📋"
            interactive
            speechPosition="right"
          />

          <Card style={styles.estimateCard}>
            <ThemedText style={styles.estimateLabel}>You could save</ThemedText>
            <ThemedText
              style={[styles.estimateValue, { color: canSave ? palette.leafDeep : palette.coral }]}>
              {money(monthly.savingsEstimate)}
              <ThemedText style={styles.estimatePerMonth}> / month</ThemedText>
            </ThemedText>
            <ThemedText style={styles.estimateHint}>
              Expected income {money(monthly.recurringIncome)} − fixed costs{' '}
              {money(monthly.recurringExpense)}
              {monthly.recurringInvestment > 0
                ? ` − investments ${money(monthly.recurringInvestment)}`
                : ''}
              . Add your salary, bills and investments below for a closer
              estimate.
            </ThemedText>
          </Card>

          <Card>
            <ThemedText type="subtitle" style={{ color: palette.leafDeep }}>
              Monthly income
            </ThemedText>
            <AddForm type="income" />
            <RecurringList
              items={income}
              emptyText="No recurring income yet."
              accent={palette.leafDeep}
            />
          </Card>

          <Card>
            <ThemedText type="subtitle" style={{ color: palette.coral }}>
              Fixed costs
            </ThemedText>
            <AddForm type="expense" />
            <RecurringList
              items={expense}
              emptyText="No recurring bills yet."
              accent={palette.coral}
            />
          </Card>

          <Card>
            <ThemedText type="subtitle" style={{ color: palette.berry }}>
              Investments
            </ThemedText>
            <AddForm type="investment" />
            <RecurringList
              items={investment}
              emptyText="No recurring investments yet."
              accent={palette.berry}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  estimateCard: {
    gap: 6,
  },
  estimateLabel: {
    fontSize: 16,
    color: palette.inkMuted,
  },
  estimateValue: {
    fontFamily: Fonts.monoBold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -1,
  },
  estimatePerMonth: {
    fontFamily: Fonts.body,
    fontSize: 18,
    color: palette.inkMuted,
  },
  estimateHint: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkMuted,
  },
  form: {
    gap: 8,
  },
  formLabel: {
    fontSize: 16,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formAmount: {
    flex: 1,
    fontSize: 16,
  },
  formDay: {
    width: 72,
    fontSize: 16,
  },
  formDayHint: {
    color: palette.inkSubtle,
    fontSize: 14,
    lineHeight: 20,
  },
  formButton: {
    minHeight: 48,
    paddingHorizontal: 20,
  },
  formError: {
    color: palette.coral,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: palette.inkSubtle,
    fontSize: 16,
    lineHeight: 22,
  },
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    minHeight: 52,
  },
  rowDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rowMiddle: {
    flex: 1,
    gap: 1,
  },
  rowLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    lineHeight: 22,
  },
  rowPerMonth: {
    fontSize: 14,
    lineHeight: 18,
    color: palette.inkSubtle,
  },
  rowAmount: {
    fontFamily: Fonts.monoBold,
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
});
}
