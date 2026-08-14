import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { mode } = useAppTheme();
  const colorFromProps = props[mode];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[mode][colorName];
  }
}
