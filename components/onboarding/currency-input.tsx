import { useMemo } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, type PaletteType } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type CurrencyInputProps = {
  symbol: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  error?: string | null;
} & Pick<TextInputProps, 'returnKeyType' | 'onSubmitEditing'>;

/** Large numeric input with a currency symbol prefix and inline error. */
export function CurrencyInput({
  symbol,
  value,
  onChangeText,
  placeholder,
  autoFocus,
  error,
  ...rest
}: CurrencyInputProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.box, error ? styles.boxError : null]}>
        <ThemedText style={styles.symbol}>{symbol}</ThemedText>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.inkFaint}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          style={styles.input}
          {...rest}
        />
      </View>
      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </View>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    wrap: {
      gap: 6,
    },
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderColor: palette.outline,
      backgroundColor: palette.surface,
      borderRadius: 18,
      paddingHorizontal: 18,
      minHeight: 72,
    },
    boxError: {
      borderColor: palette.coral,
    },
    symbol: {
      fontFamily: Fonts.monoBold,
      fontSize: 26,
      color: palette.inkMuted,
    },
    input: {
      flex: 1,
      fontFamily: Fonts.monoBold,
      fontSize: 32,
      color: palette.ink,
      paddingVertical: 12,
    },
    error: {
      color: palette.coral,
      fontSize: 15,
      lineHeight: 20,
    },
  });
}