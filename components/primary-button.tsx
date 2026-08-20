import { useMemo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, type PaletteType } from '@/constants/theme';
import { haptic } from '@/lib/haptics';
import { useBudget } from '@/lib/store';
import { useAppTheme } from '@/lib/theme';

type PrimaryButtonProps = PressableProps & {
  title: string;
  variant?: 'sky' | 'leaf' | 'coral';
  big?: boolean;
  style?: ViewStyle;
  /** Show a spinner and swallow presses while busy. */
  loading?: boolean;
  /** Optional leading icon rendered before the title. */
  icon?: ReactNode;
};

/**
 * Big Friendly Button: sky fill, white text, 16px radius, generous height
 * (56px, or 64px when `big`) and a tactile pressed state.
 */
export function PrimaryButton({
  title,
  variant = 'sky',
  big = false,
  style,
  loading = false,
  icon,
  disabled,
  onPress,
  ...rest
}: PrimaryButtonProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { hapticsEnabled } = useBudget();
  const background =
    variant === 'leaf' ? palette.leafDeep : variant === 'coral' ? palette.coral : palette.sky;
  const isDisabled = disabled || loading;

  const handlePress = (e: Parameters<NonNullable<typeof onPress>>[0]) => {
    if (isDisabled) return;
    haptic('light', hapticsEnabled);
    onPress?.(e);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        big && styles.big,
        { backgroundColor: background },
        isDisabled && styles.disabled,
        !isDisabled && pressed && styles.pressed,
        style,
      ]}
      {...rest}>
      {({ pressed }) => (
        <View style={styles.labelRow}>
          {icon}
          <ThemedText style={[styles.label, pressed && styles.labelPressed]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
            ) : (
              title
            )}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    button: {
      minHeight: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    big: {
      minHeight: 64,
    },
    pressed: {
      transform: [{ scale: 0.97 }],
      backgroundColor: palette.skyDeep,
    },
    disabled: {
      opacity: 0.5,
    },
    label: {
      color: '#FFFFFF',
      fontFamily: Fonts.bodyBold,
      fontSize: 20,
      lineHeight: 28,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    labelPressed: {
      opacity: 0.95,
    },
    spinner: {
      marginVertical: -14,
    },
  });
}