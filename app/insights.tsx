import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Card } from '@/components/card';
import { DonutChart, DonutLegend } from '@/components/donut-chart';
import { ThemedText } from '@/components/themed-text';
import { TrendChart } from '@/components/trend-chart';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts, type PaletteType } from '@/constants/theme';
import { CATEGORY_MAP } from '@/lib/categories';
import { useBudget } from '@/lib/store';
import { useAppTheme } from '@/lib/theme';
import type { Transaction } from '@/lib/types';

type Period = 'month' | 'last' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'last', label: 'Last month' },
  { key: 'all', label: 'All time' },
];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthKeyShift(date: Date, delta: number): string {
  const shifted = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  return monthKey(shifted);
}

function inPeriod(t: Transaction, period: Period, now: Date): boolean {
  if (period === 'all') return true;
  const current = monthKey(now);
  const target = period === 'month' ? current : monthKeyShift(now, -1);
  return t.date.startsWith(target);
}

type BreakdownRow = {
  categoryId: string;
  label: string;
  color: string;
  amount: number;
  share: number;
};

function buildBreakdown(
  list: Transaction[],
  kind: 'income' | 'expense',
  palette: PaletteType,
): BreakdownRow[] {
  const totals = new Map<string, number>();
  for (const t of list) {
    if (t.type !== kind) continue;
    if (kind === 'expense' && t.isInvestment) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      label: CATEGORY_MAP[categoryId]?.label ?? categoryId,
      color: CATEGORY_MAP[categoryId]?.color ?? palette.inkSubtle,
      amount,
      share: sum > 0 ? amount / sum : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function monthKeyString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function shortMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

/** Income vs spending totals for each of the last 6 calendar months. */
function buildTrend(
  transactions: Transaction[],
  now: Date,
): { label: string; income: number; spent: number }[] {
  const months: { key: string; income: number; spent: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKeyString(d), income: 0, spent: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const t of transactions) {
    const bucket = byKey.get(t.date.slice(0, 7));
    if (!bucket) continue;
    if (t.type === 'income') bucket.income += t.amount;
    else if (!t.isInvestment) bucket.spent += t.amount;
  }
  return months.map((m, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: shortMonth(d), income: m.income, spent: m.spent };
  });
}

export default function InsightsScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { transactions, money } = useBudget();
  const [period, setPeriod] = useState<Period>('month');

  const now = useMemo(() => new Date(), []);
  const list = useMemo(
    () => transactions.filter((t) => inPeriod(t, period, now)),
    [transactions, period, now],
  );

  const totals = useMemo(() => {
    let income = 0;
    let spent = 0;
    for (const t of list) {
      if (t.type === 'income') income += t.amount;
      else if (!t.isInvestment) spent += t.amount;
    }
    return { income, spent, saved: income - spent };
  }, [list]);

  const incomeRows = useMemo(() => buildBreakdown(list, 'income', palette), [list, palette]);
  const expenseRows = useMemo(() => buildBreakdown(list, 'expense', palette), [list, palette]);
  const trend = useMemo(() => buildTrend(transactions, now), [transactions, now]);
  const count = list.length;

  const donutSlices = expenseRows.map((r) => ({ value: r.amount, color: r.color }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.chrome}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={palette.ink} />
        </Pressable>
        <ThemedText type="title">Insights</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filters}>
          {PERIODS.map((p) => {
            const active = p.key === period;
            return (
              <Pressable
                key={p.key}
                accessibilityRole="button"
                onPress={() => setPeriod(p.key)}
                style={[styles.filter, active ? styles.filterActive : styles.filterInactive]}>
                <ThemedText
                  style={[styles.filterText, active ? styles.filterTextActive : { color: palette.inkMuted }]}>
                  {p.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {count === 0 ? (
          <Card>
            <ThemedText style={styles.empty}>
              No transactions in this period yet. Add a note on the home screen and the
              numbers will show up here.
            </ThemedText>
          </Card>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryCol}>
                <ThemedText style={styles.summaryLabel}>Income</ThemedText>
                <ThemedText style={[styles.summaryValue, { color: palette.leafDeep }]}>
                  {money(totals.income)}
                </ThemedText>
              </View>
              <View style={styles.summaryCol}>
                <ThemedText style={styles.summaryLabel}>Spent</ThemedText>
                <ThemedText style={[styles.summaryValue, { color: palette.coral }]}>
                  {money(totals.spent)}
                </ThemedText>
              </View>
              <View style={styles.summaryCol}>
                <ThemedText style={styles.summaryLabel}>Saved</ThemedText>
                <ThemedText
                  style={[
                    styles.summaryValue,
                    { color: totals.saved >= 0 ? palette.leafDeep : palette.coral },
                  ]}>
                  {totals.saved >= 0 ? '' : '−'}
                  {money(Math.abs(totals.saved))}
                </ThemedText>
              </View>
            </View>

            <Card>
              <ThemedText type="subtitle">Income vs spending</ThemedText>
              <ThemedText style={styles.emptySmall}>Last 6 months</ThemedText>
              <TrendChart data={trend} />
            </Card>

            <Card>
              <ThemedText type="subtitle">Spending by category</ThemedText>
              {expenseRows.length === 0 ? (
                <ThemedText style={styles.emptySmall}>No spending in this period.</ThemedText>
              ) : (
                <>
                  <DonutChart
                    slices={donutSlices}
                    centerLabel="spent"
                    centerValue={money(totals.spent)}
                  />
                  <DonutLegend slices={donutSlices} />
                  <View style={styles.listSpacing}>
                    {expenseRows.map((row) => (
                      <View key={row.categoryId} style={styles.barRow}>
                        <View style={styles.barLabelRow}>
                          <View style={[styles.dot, { backgroundColor: row.color }]} />
                          <ThemedText style={styles.barLabel}>{row.label}</ThemedText>
                          <ThemedText style={styles.barAmount}>{money(row.amount)}</ThemedText>
                        </View>
                        <View style={styles.track}>
                          <View
                            style={[
                              styles.fill,
                              { backgroundColor: row.color, width: `${Math.max(4, row.share * 100)}%` },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </Card>

            <Card>
              <ThemedText type="subtitle">Income by source</ThemedText>
              {incomeRows.length === 0 ? (
                <ThemedText style={styles.emptySmall}>No income in this period.</ThemedText>
              ) : (
                incomeRows.map((row) => (
                  <View key={row.categoryId} style={styles.barRow}>
                    <View style={styles.barLabelRow}>
                      <View style={[styles.dot, { backgroundColor: row.color }]} />
                      <ThemedText style={styles.barLabel}>{row.label}</ThemedText>
                      <ThemedText style={styles.barAmount}>{money(row.amount)}</ThemedText>
                    </View>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          { backgroundColor: row.color, width: `${Math.max(4, row.share * 100)}%` },
                        ]}
                      />
                    </View>
                  </View>
                ))
              )}
            </Card>
          </>
        )}
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
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filter: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  filterActive: {
    backgroundColor: palette.sky,
  },
  filterInactive: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.outline,
  },
  filterText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.outline,
    padding: 20,
    gap: 12,
  },
  summaryCol: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 14,
    lineHeight: 18,
    color: palette.inkMuted,
  },
  summaryValue: {
    fontFamily: Fonts.monoBold,
    fontSize: 18,
    lineHeight: 24,
  },
  empty: {
    color: palette.inkMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  emptySmall: {
    color: palette.inkSubtle,
    fontSize: 15,
    lineHeight: 22,
  },
  listSpacing: {
    gap: 12,
    marginTop: 4,
  },
  barRow: {
    gap: 6,
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  barLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: palette.ink,
  },
  barAmount: {
    fontFamily: Fonts.monoBold,
    fontSize: 15,
    lineHeight: 20,
    color: palette.ink,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.skySoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
}