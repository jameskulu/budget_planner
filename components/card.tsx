import { StyleSheet, View, type ViewProps } from 'react-native';

import { Palette } from '@/constants/theme';

/**
 * Skylearn card: white surface on a subtle page tint, 1px outline border,
 * 20px radius and a soft resting shadow.
 */
export function Card({ style, ...rest }: ViewProps) {
  return (
    <View
      style={[styles.card, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.outline,
    padding: 20,
    gap: 12,
    shadowColor: Palette.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
});