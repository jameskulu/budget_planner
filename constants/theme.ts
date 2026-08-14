/**
 * Skylearn design system tokens (see skylearn-DESIGN.md).
 * The app is light-only: surfaces are white, corners soft, type large and
 * clean (Inter for headings and body, JetBrains Mono for numbers).
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
 * Skylearn is a light-first system. Both schemes resolve to the same tokens
 * so the app always renders light regardless of the device setting.
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
    text: Palette.ink,
    background: Palette.background,
    tint: Palette.sky,
    icon: Palette.inkSubtle,
    tabIconDefault: Palette.inkSubtle,
    tabIconSelected: Palette.sky,
  },
};