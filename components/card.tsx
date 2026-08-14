import { useMemo } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { type PaletteType } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

/**
 * Skylearn card: white surface on a subtle page tint, 1px outline border,
 * 20px radius and a soft resting shadow.
 */
export function Card({ style, ...rest }: ViewProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View
      style={[styles.card, style]}
      {...rest}
    />
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: palette.outline,
      padding: 20,
      gap: 12,
      shadowColor: palette.ink,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 24,
      elevation: 2,
    },
  });
}