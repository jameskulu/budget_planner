import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts, type PaletteType } from '@/constants/theme';
import {
  getScheduledReminders,
  hasNotificationPermission,
  requestNotificationPermission,
  syncNotifications,
  type NotificationPrefs,
  type ScheduledReminder,
} from '@/lib/notifications';
import { useBudget } from '@/lib/store';
import { useAppTheme } from '@/lib/theme';

export default function NotificationsScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { notificationPrefs, setNotificationPrefs, recurring } = useBudget();
  const [reminders, setReminders] = useState<ScheduledReminder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [permission, setPermission] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const [list, granted] = await Promise.all([
      getScheduledReminders(),
      hasNotificationPermission(),
    ]);
    setReminders(list);
    setPermission(granted);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const togglePref = async (key: keyof NotificationPrefs, value: boolean) => {
    const next: NotificationPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setNotificationPrefs({ ...next, [key]: false });
        return;
      }
    }
    await syncNotifications(next, recurring);
    void refresh();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.chrome}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={palette.ink} />
        </Pressable>
        <ThemedText type="title">Notifications</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <ThemedText type="subtitle">Reminders</ThemedText>
          <ThemedText style={styles.hint}>
            Pico nudges you when it matters — no spreadsheets, no forgetting.
          </ThemedText>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <ThemedText style={styles.toggleLabel}>Daily reminder</ThemedText>
              <ThemedText style={styles.toggleHint}>Your safe-to-spend each morning</ThemedText>
            </View>
            <Switch
              value={notificationPrefs.dailyReminder}
              onValueChange={(v) => {
                void togglePref('dailyReminder', v);
              }}
              trackColor={{ true: palette.skyDeep, false: palette.outline }}
              thumbColor={palette.surface}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <ThemedText style={styles.toggleLabel}>Bill reminders</ThemedText>
              <ThemedText style={styles.toggleHint}>A nudge before bills are due</ThemedText>
            </View>
            <Switch
              value={notificationPrefs.billReminders}
              onValueChange={(v) => {
                void togglePref('billReminders', v);
              }}
              trackColor={{ true: palette.skyDeep, false: palette.outline }}
              thumbColor={palette.surface}
            />
          </View>
        </Card>

        <Card>
          <ThemedText type="subtitle">Scheduled</ThemedText>
          {!loaded ? (
            <ThemedText style={styles.hint}>Loading…</ThemedText>
          ) : permission === false ? (
            <ThemedText style={styles.hint}>
              Notifications are turned off for this app. Enable them in your device settings to
              receive reminders.
            </ThemedText>
          ) : reminders.length === 0 ? (
            <ThemedText style={styles.hint}>
              No reminders scheduled yet. Turn one on above and Pico will keep you posted.
            </ThemedText>
          ) : (
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
          )}
        </Card>

        {permission === false ? (
          <PrimaryButton
            title="Open device settings"
            onPress={() => {
              // @ts-ignore - Linking settings is available on native and no-ops on web.
              void import('react-native').then(({ Linking }) => Linking.openSettings());
            }}
          />
        ) : null}
      </ScrollView>
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
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.outline,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    lineHeight: 22,
    color: palette.ink,
  },
  toggleHint: {
    color: palette.inkSubtle,
    fontSize: 14,
    lineHeight: 18,
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