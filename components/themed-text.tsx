import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, Palette } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: Fonts.body,
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  defaultSemiBold: {
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    lineHeight: 28,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 44,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 32,
  },
  link: {
    fontFamily: Fonts.bodyBold,
    lineHeight: 28,
    fontSize: 16,
    color: Palette.sky,
  },
});