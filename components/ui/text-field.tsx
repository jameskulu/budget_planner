import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { Fonts, Palette } from '@/constants/theme';

type TextFieldProps = TextInputProps & {
  /** Render at kid-friendly size: taller hit area, larger text. */
  big?: boolean;
  /** Element rendered inside the field, aligned right (e.g. a mic button). */
  right?: ReactNode;
};

/**
 * Skylearn input: 1px outline, surface background, 12px radius, 18px text.
 * Focus gets a sky border with a 4px sky-soft ring.
 */
export function TextField({ big = false, style, onFocus, onBlur, right, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  const input = (
    <TextInput
      placeholderTextColor={Palette.inkFaint}
      style={[
        styles.input,
        !!right && styles.inputWithRight,
        big && styles.big,
        focused && styles.inputFocused,
        style,
      ]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...rest}
    />
  );

  if (!right) {
    return <View style={focused && styles.focusRing}>{input}</View>;
  }

  return (
    <View style={focused && styles.focusRing}>
      <View style={[styles.row, big && styles.rowBig, focused && styles.rowFocused]}>
        {input}
        <View style={styles.rightSlot}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  focusRing: {
    borderRadius: 16,
    padding: 4,
    margin: -4,
    backgroundColor: Palette.skySoft,
  },
  input: {
    borderWidth: 1,
    borderColor: Palette.outline,
    backgroundColor: Palette.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: Fonts.body,
    color: Palette.ink,
  },
  big: {
    minHeight: 56,
    fontSize: 20,
  },
  inputFocused: {
    borderColor: Palette.sky,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.outline,
    backgroundColor: Palette.surface,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 8,
  },
  rowBig: {
    minHeight: 56,
  },
  rowFocused: {
    borderColor: Palette.sky,
  },
  inputWithRight: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingLeft: 0,
  },
  rightSlot: {
    marginLeft: 8,
  },
});
