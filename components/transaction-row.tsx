import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { CATEGORY_MAP } from '@/lib/categories';
import { formatDateIso } from '@/lib/format';
import { useBudget } from '@/lib/store';
import type { Transaction } from '@/lib/types';

export function TransactionRow({
  transaction,
  onDelete,
}: {
  transaction: Transaction;
  onDelete?: (id: string) => void;
}) {
  const { money } = useBudget();
  const category = CATEGORY_MAP[transaction.category];
  const isIncome = transaction.type === 'income';
  const isInvestment = transaction.isInvestment === true;
  const amountColor = isIncome ? Palette.leafDeep : isInvestment ? Palette.berry : Palette.ink;

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: category?.color ?? Palette.inkSubtle }]} />
      <View style={styles.middle}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {isInvestment ? 'Invested' : category?.label ?? transaction.category}
        </ThemedText>
        <ThemedText style={styles.note} numberOfLines={1}>
          {transaction.note}
        </ThemedText>
        <ThemedText style={styles.date}>{formatDateIso(transaction.date)}</ThemedText>
      </View>
      <ThemedText
        type="defaultSemiBold"
        numberOfLines={1}
        style={[{ color: amountColor }, styles.amount]}>
        {isIncome ? '+' : '-'}
        {money(transaction.amount)}
      </ThemedText>
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${category?.label ?? transaction.category}`}
          hitSlop={8}
          onPress={() => onDelete(transaction.id)}
          style={({ pressed }) => [styles.delete, pressed && styles.deletePressed]}>
          <ThemedText style={styles.deleteText}>✕</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    minHeight: 56,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  middle: {
    flex: 1,
  },
  amount: {
    flexShrink: 0,
  },
  note: {
    fontSize: 16,
    lineHeight: 22,
    color: Palette.inkMuted,
  },
  date: {
    fontSize: 14,
    lineHeight: 18,
    color: Palette.inkSubtle,
  },
  delete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceSunken,
  },
  deletePressed: {
    backgroundColor: Palette.coralSoft,
  },
  deleteText: {
    fontSize: 14,
    lineHeight: 16,
    color: Palette.inkSubtle,
  },
});