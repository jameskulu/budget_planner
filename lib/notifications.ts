import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationPrefs = {
  /** Daily "safe to spend today" reminder. */
  dailyReminder: boolean;
  /** Reminder when a bill is due soon. */
  billReminders: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  dailyReminder: true,
  billReminders: true,
};

export const NOTIFICATION_CHANNEL_ID = 'budget-planner-reminders';

/** Decides whether foreground notifications are shown. */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/** Requests permission; resolves with whether notifications are allowed. */
export async function requestNotificationPermission(): Promise<boolean> {
  await ensureChannel();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

/** True when the app is already allowed to show notifications. */
export async function hasNotificationPermission(): Promise<boolean> {
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
}

/**
 * Applies the current prefs to the OS: schedules (or cancels) the daily
 * reminder. Returns the new permission state.
 */
export async function syncNotifications(prefs: NotificationPrefs): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (prefs.dailyReminder) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pico 🐾',
        body: 'Here is your safe-to-spend for today.',
        data: { url: '/(tabs)' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });
  }

  if (prefs.billReminders) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pico 🐾',
        body: 'A bill is due soon. Make sure it is covered.',
        data: { url: '/(tabs)' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });
  }
}

export type ScheduledReminder = {
  id: string;
  title: string;
  body: string;
  /** Human-readable trigger, e.g. "9:00 AM · daily". */
  schedule: string;
};

function formatHour(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** Lists the reminders currently scheduled with the OS. Empty on web. */
export async function getScheduledReminders(): Promise<ScheduledReminder[]> {
  if (Platform.OS === 'web') return [];
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.map((n) => {
      const trigger = n.trigger as { type?: string; hour?: number; minute?: number; channelId?: string };
      const hour = typeof trigger?.hour === 'number' ? trigger.hour : 9;
      const minute = typeof trigger?.minute === 'number' ? trigger.minute : 0;
      return {
        id: n.identifier,
        title: n.content.title ?? 'Pico 🐾',
        body: n.content.body ?? '',
        schedule: trigger.type === Notifications.SchedulableTriggerInputTypes.DAILY
          ? `${formatHour(hour, minute)} · daily`
          : 'scheduled',
      };
    });
  } catch {
    return [];
  }
}
