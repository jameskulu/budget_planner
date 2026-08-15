import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Card } from '@/components/card';
import { Pico } from '@/components/pico';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts, type PaletteType } from '@/constants/theme';
import { getScheduledReminders, type ScheduledReminder } from '@/lib/notifications';
import { useAppTheme } from '@/lib/theme';

export default function NotificationCenterScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const list = await getScheduledReminders();
    setReminders(list);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.chrome}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={palette.ink} />
        </Pressable>
        <ThemedText type="title">Notifications</ThemedText>
      </View>

      {!loaded ? (
        <View style={styles.center}>
          <ThemedText style={styles.hint}>Loading…</ThemedText>
        </View>
      ) : reminders.length === 0 ? (
        <View style={styles.center}>
          <Pico size={160} pose="showing_phone" />
          <ThemedText style={styles.emptyTitle}>No notifications yet</ThemedText>
          <ThemedText style={styles.hint}>
            You&apos;re all caught up! When Pico has something for you, it&apos;ll show up
            right here.
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <ThemedText type="subtitle">Your notifications</ThemedText>
            <View style={styles.list}>
              {reminders.map((r) => (
                <View key={r.id} style={styles.row}>
                  <View style={styles.rowIcon}>
                    <IconSymbol name="bell.fill" size={18} color={palette.skyDeep} />
                  </View>
                  <View style={styles.rowText}>
                    <ThemedText style={styles.rowTitle}>{r.body}</ThemedText>
                    <ThemedText style={styles.rowMeta}>{r.schedule}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(palette: PaletteType) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.background,
    },
    chrome: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 40,
      paddingBottom: 40,
    },
    content: {
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingBottom: 40,
      gap: 20,
    },
    hint: {
      color: palette.inkMuted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
    emptyTitle: {
      fontFamily: Fonts.bodyBold,
      fontSize: 20,
      lineHeight: 26,
      color: palette.ink,
      textAlign: 'center',
    },
    list: {
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.outline,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.skySoft,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      fontSize: 16,
      lineHeight: 22,
      color: palette.ink,
      fontFamily: Fonts.bodyBold,
    },
    rowMeta: {
      fontSize: 14,
      lineHeight: 18,
      color: palette.inkSubtle,
    },
  });
}