import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Pico } from '@/components/pico';
import { ThemedText } from '@/components/themed-text';
import { TransactionRow } from '@/components/transaction-row';
import { Fonts, type PaletteType } from '@/constants/theme';
import { useBudget } from '@/lib/store';
import { useAppTheme } from '@/lib/theme';
import type { TransactionType } from '@/lib/types';

type Filter = 'all' | TransactionType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expenses' },
];

export default function TransactionsScreen() {
  const { transactions, deleteTransaction, money } = useBudget();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const list =
      filter === 'all'
        ? transactions
        : transactions.filter((t) => t.type === filter);
    return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [transactions, filter]);

  const total = useMemo(
    () =>
      filtered.reduce(
        (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
        0,
      ),
    [filtered],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">History</ThemedText>
        <ThemedText style={{ color: palette.inkMuted }}>
          Net balance change:{' '}
          <ThemedText
            type="defaultSemiBold"
            style={{ color: total >= 0 ? palette.leafDeep : palette.coral }}>
            {total >= 0 ? '+' : '-'}
            {money(Math.abs(total))}
          </ThemedText>
        </ThemedText>

        <View style={styles.filters}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                onPress={() => setFilter(f.key)}
                style={[
                  styles.filter,
                  active ? styles.filterActive : styles.filterInactive,
                ]}>
                <ThemedText
                  style={[styles.filterText, active ? styles.filterTextActive : { color: palette.inkMuted }]}>
                  {f.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <Card>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Pico
                size={120}
                pose="add_transaction"
                speech="No transactions here yet! Add your first note on the home screen."
                speechPosition="bottom"
              />
            </View>
          ) : (
            filtered.map((t) => (
              <TransactionRow key={t.id} transaction={t} onDelete={deleteTransaction} />
            ))
          )}
        </Card>
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
    content: {
      padding: 20,
      paddingBottom: 40,
      gap: 16,
    },
    filters: {
      flexDirection: 'row',
      gap: 8,
    },
    filter: {
      borderRadius: 999,
      paddingHorizontal: 18,
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
      fontSize: 16,
    },
    filterTextActive: {
      color: '#FFFFFF',
    },
    emptyState: {
      paddingVertical: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}