import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { type PaletteType } from '@/constants/theme';
import { isoDaysFromToday } from '@/lib/safe-spend';
import { useAppTheme } from '@/lib/theme';

type DateChip = {
  iso: string;
  weekday: string;
  day: number;
};

function buildChips(days: number, today: Date): DateChip[] {
  return Array.from({ length: days }, (_, i) => {
    const iso = isoDaysFromToday(i + 1, today);
    const [, m, d] = iso.split('-').map(Number);
    const date = new Date(today.getFullYear(), m - 1, d);
    return {
      iso,
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: d,
    };
  });
}

/**
 * Horizontal list of upcoming dates to pick a next payday. No native date
 * picker dependency — friendly chips work on every platform.
 */
export function DateSelector({
  days = 14,
  value,
  onSelect,
  today = new Date(),
}: {
  days?: number;
  value: string | null;
  onSelect: (iso: string) => void;
  today?: Date;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const chips = buildChips(days, today);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {chips.map((chip) => {
        const selected = chip.iso === value;
        return (
          <Pressable
            key={chip.iso}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(chip.iso)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.chipSelected,
              pressed && styles.pressed,
            ]}>
            <ThemedText style={[styles.weekday, selected && styles.weekdaySelected]}>
              {chip.weekday}
            </ThemedText>
            <ThemedText style={[styles.day, selected && styles.daySelected]}>
              {chip.day}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    row: {
      gap: 10,
      paddingBottom: 4,
    },
    chip: {
      alignItems: 'center',
      gap: 2,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minWidth: 64,
    },
    chipSelected: {
      borderColor: palette.berry,
      backgroundColor: palette.berrySoft,
    },
    pressed: {
      opacity: 0.75,
      transform: [{ scale: 0.98 }],
    },
    weekday: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.inkMuted,
    },
    weekdaySelected: {
      color: palette.berry,
      fontFamily: 'Inter_700Bold',
    },
    day: {
      fontFamily: 'Inter_700Bold',
      fontSize: 20,
      lineHeight: 26,
      color: palette.ink,
    },
    daySelected: {
      color: palette.berry,
    },
  });
}