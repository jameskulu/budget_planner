import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { RecurringItem } from '@/lib/recurring';

export type NotificationPrefs = {
  /** Daily "safe to spend today" reminder. */
  dailyReminder: boolean;
  /** Reminder when a bill is due soon. */
  billReminders: boolean;
  /** How many days ahead of a due date bill reminders fire. */
  billAdvanceDays: number;
  /** Reminder when a recurring investment is due soon. */
  investmentReminders: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  dailyReminder: true,
  billReminders: true,
  billAdvanceDays: 3,
  investmentReminders: false,
};

export const ADVANCE_DAY_OPTIONS = [1, 3, 7] as const;

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

/** Clamps a day-of-month into 1..28 so monthly triggers always fire. */
function clampDay(day: number): number {
  if (Number.isFinite(day)) return Math.max(1, Math.min(28, Math.round(day)));
  return 1;
}

/**
 * Applies the current prefs to the OS: schedules (or cancels) the daily
 * reminder, per-recurring bill reminders, and per-recurring investment
 * reminders. Returns the new permission state.
 */
export async function syncNotifications(
  prefs: NotificationPrefs,
  recurring: RecurringItem[] = [],
): Promise<void> {
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
    const bills = recurring.filter((r) => r.type === 'expense');
    for (const bill of bills) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Pico 🐾 ${bill.label}`,
          body:
            prefs.billAdvanceDays > 0
              ? `Due in ${prefs.billAdvanceDays} day${prefs.billAdvanceDays === 1 ? '' : 's'} (${bill.label}). Make sure it's covered.`
              : `${bill.label} is due today. Make sure it's covered.`,
          data: { url: '/(tabs)' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
          day: clampDay(bill.day - prefs.billAdvanceDays),
          hour: 10,
          minute: 0,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      });
    }
  }

  if (prefs.investmentReminders) {
    const investments = recurring.filter((r) => r.type === 'investment');
    for (const inv of investments) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Pico 🐾 ${inv.label}`,
          body:
            prefs.billAdvanceDays > 0
              ? `Investment due in ${prefs.billAdvanceDays} day${prefs.billAdvanceDays === 1 ? '' : 's'} (${inv.label}).`
              : `${inv.label} is due today.`,
          data: { url: '/(tabs)' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
          day: clampDay(inv.day - prefs.billAdvanceDays),
          hour: 10,
          minute: 0,
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      });
    }
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
      const trigger = n.trigger as { type?: string; hour?: number; minute?: number; day?: number; channelId?: string };
      const hour = typeof trigger?.hour === 'number' ? trigger.hour : 9;
      const minute = typeof trigger?.minute === 'number' ? trigger.minute : 0;
      const day = typeof trigger?.day === 'number' ? trigger.day : null;
      const isMonthly = trigger.type === Notifications.SchedulableTriggerInputTypes.MONTHLY;
      return {
        id: n.identifier,
        title: n.content.title ?? 'Pico 🐾',
        body: n.content.body ?? '',
        schedule: isMonthly
          ? `day ${day} · monthly`
          : trigger.type === Notifications.SchedulableTriggerInputTypes.DAILY
            ? `${formatHour(hour, minute)} · daily`
            : 'scheduled',
      };
    });
  } catch {
    return [];
  }
}