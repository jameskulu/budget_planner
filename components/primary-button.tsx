import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Palette } from '@/constants/theme';

type PrimaryButtonProps = PressableProps & {
  title: string;
  variant?: 'sky' | 'leaf' | 'coral';
  big?: boolean;
  style?: ViewStyle;
  /** Show a spinner and swallow presses while busy. */
  loading?: boolean;
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
  disabled,
  ...rest
}: PrimaryButtonProps) {
  const background =
    variant === 'leaf' ? Palette.leafDeep : variant === 'coral' ? Palette.coral : Palette.sky;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
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
        <ThemedText style={[styles.label, pressed && styles.labelPressed]}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
          ) : (
            title
          )}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: Palette.skyDeep,
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
  labelPressed: {
    opacity: 0.95,
  },
  spinner: {
    marginVertical: -14,
  },
});