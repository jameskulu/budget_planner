import { StyleSheet, View } from 'react-native';

import { Palette } from '@/constants/theme';

export function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.surfaceSunken,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Palette.berry,
  },
});
