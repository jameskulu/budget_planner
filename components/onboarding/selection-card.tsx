import { useMemo } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { type PaletteType } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type SelectionCardProps = {
  icon?: string;
  title: string;
  subtitle?: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
};

export function SelectionCard({
  icon,
  title,
  subtitle,
  selected = false,
  onPress,
  style,
}: SelectionCardProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.pressed,
        style,
      ]}>
      {icon ? <ThemedText style={styles.icon}>{icon}</ThemedText> : null}
      <View style={styles.text}>
        <ThemedText style={[styles.title, selected && styles.titleSelected]}>
          {title}
        </ThemedText>
        {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
      </View>
      {selected ? <ThemedText style={styles.check}>✓</ThemedText> : null}
    </Pressable>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
      paddingHorizontal: 18,
      paddingVertical: 16,
      minHeight: 72,
    },
    cardSelected: {
      borderColor: palette.berry,
      backgroundColor: palette.berrySoft,
    },
    pressed: {
      opacity: 0.75,
      transform: [{ scale: 0.99 }],
    },
    icon: {
      fontSize: 28,
      lineHeight: 34,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontFamily: 'Inter_700Bold',
      fontSize: 17,
      lineHeight: 24,
      color: palette.ink,
    },
    titleSelected: {
      color: palette.ink,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 21,
      color: palette.inkMuted,
    },
    check: {
      color: palette.berry,
      fontSize: 18,
      lineHeight: 22,
      fontFamily: 'Inter_700Bold',
    },
  });
}
