import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, type PaletteType } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type MonthBar = {
  label: string;
  income: number;
  spent: number;
};

const CHART_HEIGHT = 140;
const BAR_GAP = 3;
const GROUP_GAP = 14;

/** Grouped bar chart: income vs spending per month. */
export function TrendChart({ data }: { data: MonthBar[] }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const max = useMemo(
    () => Math.max(1, ...data.flatMap((m) => [m.income, m.spent])),
    [data],
  );

  const barWidth = useMemo(() => {
    const groups = Math.max(1, data.length);
    const available = 320;
    const gaps = (groups - 1) * GROUP_GAP + groups * BAR_GAP;
    return Math.max(4, Math.min(22, (available - gaps) / (groups * 2)));
  }, [data.length]);

  return (
    <View>
      <View style={styles.chartArea}>
        {data.map((month) => (
          <View key={month.label} style={[styles.group, { gap: BAR_GAP }]}>
            <View style={styles.barsWrap}>
              <View style={styles.bar}>
                <View
                  style={[
                    styles.fill,
                    styles.incomeFill,
                    { height: `${Math.max(2, (month.income / max) * 100)}%`, width: barWidth },
                  ]}
                />
              </View>
              <View style={styles.bar}>
                <View
                  style={[
                    styles.fill,
                    styles.spentFill,
                    { height: `${Math.max(2, (month.spent / max) * 100)}%`, width: barWidth },
                  ]}
                />
              </View>
            </View>
            <ThemedText style={styles.monthLabel}>{month.label}</ThemedText>
          </View>
        ))}
      </View>
      <View style={styles.key}>
        <View style={styles.keyItem}>
          <View style={[styles.keyDot, styles.incomeFill]} />
          <ThemedText style={styles.keyLabel}>Income</ThemedText>
        </View>
        <View style={styles.keyItem}>
          <View style={[styles.keyDot, styles.spentFill]} />
          <ThemedText style={styles.keyLabel}>Spent</ThemedText>
        </View>
      </View>
    </View>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    chartArea: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: CHART_HEIGHT,
    },
    group: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    barsWrap: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: CHART_HEIGHT - 26,
    },
    bar: {
      justifyContent: 'flex-end',
    },
    fill: {
      borderRadius: 4,
    },
    incomeFill: {
      backgroundColor: palette.leafDeep,
    },
    spentFill: {
      backgroundColor: palette.coral,
    },
    monthLabel: {
      fontSize: 12,
      lineHeight: 16,
      color: palette.inkSubtle,
      fontFamily: Fonts.bodyBold,
    },
    key: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
      marginTop: 16,
    },
    keyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    keyDot: {
      width: 10,
      height: 10,
      borderRadius: 3,
    },
    keyLabel: {
      fontSize: 14,
      lineHeight: 18,
      color: palette.inkMuted,
    },
  });
}
