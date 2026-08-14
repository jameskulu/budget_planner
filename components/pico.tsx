import { useMemo, useState } from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, type PaletteType } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

const PICO_POSES = {
  // Direct mappings to the new no-background mascot illustrations
  add_transaction: require('../assets/images/pico/add_transcation.png'),
  can_i_afford_it: require('../assets/images/pico/can_i_afford_it.png'),
  home_dashboard: require('../assets/images/pico/home_dashboard.png'),
  insights: require('../assets/images/pico/insights.png'),
  no_internet: require('../assets/images/pico/no_internet.png'),
  on_track: require('../assets/images/pico/on_track.png'),
  onboarding: require('../assets/images/pico/onbording.png'),
  peeking: require('../assets/images/pico/peeking.png'),
  savings_goal: require('../assets/images/pico/savings_goal.png'),
  showing_phone: require('../assets/images/pico/showing_phone.png'),
  syncing: require('../assets/images/pico/syncing.png'),
  thumbsup: require('../assets/images/pico/thumps_up.png'),
  transaction_added: require('../assets/images/pico/transaction_added.png'),
  upcoming_bill: require('../assets/images/pico/upcoming_bill.png'),
  using_phone: require('../assets/images/pico/using_phone.png'),
  warning: require('../assets/images/pico/warning.png'),

  // Aliases for backward compatibility and semantic pose usage:
  icon: require('../assets/images/pico/home_dashboard.png'),
  waving: require('../assets/images/pico/showing_phone.png'),
  phone: require('../assets/images/pico/using_phone.png'),
  clipboard: require('../assets/images/pico/upcoming_bill.png'),
  laptop: require('../assets/images/pico/using_phone.png'),
  thinking: require('../assets/images/pico/can_i_afford_it.png'),
  piggy: require('../assets/images/pico/savings_goal.png'),
  idea: require('../assets/images/pico/insights.png'),
};

export type PicoPose = keyof typeof PICO_POSES;

const PICO_QUOTES = [
  "I've got your money covered! 💜",
  "You focus on living, I'll handle the rest! ✨",
  "Small daily savings add up to big goals! 🎯",
  "Checking before spending is a superpower! ⚡",
  "You're doing great with your budget today! 🚀",
  "Every smart choice brings you closer to freedom! 🌈",
];

type PicoProps = {
  size?: number;
  pose?: PicoPose;
  speech?: string;
  speechPosition?: 'top' | 'right' | 'bottom';
  interactive?: boolean;
  framed?: boolean;
  style?: ViewStyle;
  badge?: string;
};

/**
 * Pico — the friendly purple money mascot.
 * Renders high-quality transparent (no background) mascot illustrations,
 * with optional speech callouts and badges. Tapping Pico is intentionally
 * inert: any shown tip is chosen at random and never changes on tap.
 */
export function Pico({
  size = 120,
  pose = 'home_dashboard',
  speech,
  speechPosition = 'right',
  interactive = false,
  framed = false,
  style,
  badge,
}: PicoProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [failed, setFailed] = useState(false);
  const [tipIndex] = useState(() => Math.floor(Math.random() * PICO_QUOTES.length));

  // When no explicit speech is given, Pico shows a random tip. It is stable
  // for the lifetime of the component — tapping does not change it.
  const activeSpeech = speech ?? (interactive ? PICO_QUOTES[tipIndex] : undefined);
  const isHorizontal = speechPosition === 'right';
  const poseSource = PICO_POSES[pose] ?? PICO_POSES.home_dashboard;

  const mascotGraphic = (
    <View
      style={[
        styles.frame,
        framed && styles.framedBox,
        { width: size, height: size },
      ]}>
      {failed ? (
        <ThemedText style={[styles.fallback, { fontSize: size * 0.42 }]}>$</ThemedText>
      ) : (
        <Image
          source={poseSource}
          style={{ width: size, height: size }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      )}
      {badge ? (
        <View style={styles.badgePill}>
          <ThemedText style={styles.badgeText}>{badge}</ThemedText>
        </View>
      ) : null}
    </View>
  );

  if (!activeSpeech) {
    return (
      <View style={style}>
        {mascotGraphic}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isHorizontal ? styles.containerRow : styles.containerCol,
        style,
      ]}>
      {speechPosition === 'top' ? (
        <View style={[styles.bubble, styles.bubbleTop]}>
          <ThemedText style={styles.bubbleText}>{activeSpeech}</ThemedText>
        </View>
      ) : null}

      {mascotGraphic}

      {speechPosition === 'right' ? (
        <View style={[styles.bubble, styles.bubbleRight]}>
          <ThemedText style={styles.bubbleText}>{activeSpeech}</ThemedText>
        </View>
      ) : null}

      {speechPosition === 'bottom' ? (
        <View style={[styles.bubble, styles.bubbleBottom]}>
          <ThemedText style={styles.bubbleText}>{activeSpeech}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: 12,
    },
    containerRow: {
      flexDirection: 'row',
    },
    containerCol: {
      flexDirection: 'column',
    },
    frame: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    framedBox: {
      backgroundColor: palette.berrySoft,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: palette.skySoft,
    },
    fallback: {
      color: palette.berry,
      fontFamily: Fonts.monoBold,
    },
    bubble: {
      backgroundColor: palette.berrySoft,
      borderWidth: 1.5,
      borderColor: palette.outline,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxWidth: 240,
      shadowColor: palette.skyDeep,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    bubbleRight: {
      flex: 1,
      borderTopLeftRadius: 4,
    },
    bubbleTop: {
      borderBottomRightRadius: 4,
    },
    bubbleBottom: {
      borderTopLeftRadius: 4,
    },
    bubbleText: {
      fontSize: 15,
      lineHeight: 21,
      color: palette.ink,
      fontFamily: 'Inter_600SemiBold',
    },
    badgePill: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      backgroundColor: palette.leafDeep,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontFamily: Fonts.monoBold,
    },
  });
}


