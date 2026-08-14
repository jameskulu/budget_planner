import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { type PaletteType } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

export function ProgressBar({ progress }: { progress: number }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const pct = Math.min(100, Math.max(0, progress * 100));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: palette.surfaceSunken,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: palette.berry,
    },
  });
}
