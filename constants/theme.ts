/**
 * Skylearn design system tokens (see skylearn-DESIGN.md).
 * The app ships with light + dark themes; the active palette is resolved at
 * runtime via useAppTheme() and applied to components/screens.
 */

export const Palette = {
  // Brand
  sky: '#3B82F6',
  skyBright: '#60A5FA',
  skyDeep: '#1D4ED8',
  skySoft: '#DBEAFE',

  // Achievement
  sun: '#FBBF24',
  sunBright: '#FCD34D',
  sunDeep: '#D97706',
  sunSoft: '#FEF3C7',

  // Progress / correct
  leaf: '#22C55E',
  leafSoft: '#DCFCE7',
  leafDeep: '#16A34A',

  // Gentle error
  coral: '#F87171',
  coralSoft: '#FEE2E2',

  // Secondary accent
  berry: '#A855F7',
  berrySoft: '#F3E8FF',

  // Text
  ink: '#0F172A',
  inkMuted: '#475569',
  inkSubtle: '#94A3B8',
  inkFaint: '#CBD5E1',

  // Lines
  outline: '#E2E8F0',
  outlineStrong: '#94A3B8',

  // Surfaces
  surface: '#F8FAFC',
  surfaceSunken: '#F1F5F9',
  background: '#FFFFFF',
} as const;

export const DarkPalette = {
  // Brand
  sky: '#60A5FA',
  skyBright: '#93C5FD',
  skyDeep: '#3B82F6',
  skySoft: '#1E3A5F',

  // Achievement
  sun: '#FBBF24',
  sunBright: '#FCD34D',
  sunDeep: '#F59E0B',
  sunSoft: '#3A2E12',

  // Progress / correct
  leaf: '#4ADE80',
  leafSoft: '#143D24',
  leafDeep: '#22C55E',

  // Gentle error
  coral: '#FCA5A5',
  coralSoft: '#3B1C1C',

  // Secondary accent
  berry: '#C084FC',
  berrySoft: '#2A1B3F',

  // Text
  ink: '#F1F5F9',
  inkMuted: '#CBD5E1',
  inkSubtle: '#94A3B8',
  inkFaint: '#64748B',

  // Lines
  outline: '#334155',
  outlineStrong: '#475569',

  // Surfaces
  surface: '#1E293B',
  surfaceSunken: '#16202E',
  background: '#0F172A',
} as const;

/**
 * Font family names registered at runtime in app/_layout.tsx via
 * useFonts(). They must match the keys used there exactly.
 */
export const Fonts = {
  display: 'Inter_700Bold',
  displaySemibold: 'Inter_600SemiBold',
  displayMedium: 'Inter_500Medium',
  body: 'Inter_400Regular',
  bodyBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

/**
 * The app supports light and dark schemes. Tokens resolve to the matching
 * palette at runtime via useAppTheme().
 */
export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.background,
    tint: Palette.sky,
    icon: Palette.inkSubtle,
    tabIconDefault: Palette.inkSubtle,
    tabIconSelected: Palette.sky,
  },
  dark: {
    text: DarkPalette.ink,
    background: DarkPalette.background,
    tint: DarkPalette.sky,
    icon: DarkPalette.inkSubtle,
    tabIconDefault: DarkPalette.inkSubtle,
    tabIconSelected: DarkPalette.sky,
  },
};

export type ThemeMode = 'light' | 'dark';

/** Shape shared by the light and dark palettes. */
export type PaletteType = { [K in keyof typeof Palette]: string };