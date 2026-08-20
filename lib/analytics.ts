import { Platform } from 'react-native';
import type { FirebaseAnalyticsTypes } from '@react-native-firebase/analytics';

type Analytics = FirebaseAnalyticsTypes.Module;

let cachedNative: typeof import('@react-native-firebase/analytics') | null | undefined;
let cachedAnalytics: Analytics | null | undefined;
let gtagInjected = false;

/**
 * Lazy-loads the native Firebase Analytics module so importing this file
 * never crashes in Expo Go, on web, or in dev builds without the Firebase
 * config files. Returns null when analytics is unavailable; every public
 * helper in this module is a safe no-op in that case.
 */
async function getAnalytics(): Promise<{ mod: typeof import('@react-native-firebase/analytics'); analytics: Analytics } | null> {
  if (cachedNative !== undefined) return cachedNative === null ? null : { mod: cachedNative, analytics: cachedAnalytics! };
  if (Platform.OS === 'web') {
    cachedNative = null;
    return null;
  }
  try {
    const mod = await import('@react-native-firebase/analytics');
    const analytics = mod.getAnalytics();
    cachedNative = mod;
    cachedAnalytics = analytics;
    return { mod, analytics };
  } catch {
    cachedNative = null;
    return null;
  }
}

/** GA4 measurement id from the environment, used for web gtag only. */
const GA_MEASUREMENT_ID = process.env.EXPO_PUBLIC_GA4_MEASUREMENT_ID;

function ensureGtag(): boolean {
  if (!GA_MEASUREMENT_ID) return false;
  if (typeof window === 'undefined') return false;
  if (gtagInjected) return true;
  const win = window as unknown as {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  if (!win.dataLayer) win.dataLayer = [];
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
  win.gtag = function (...args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (win.dataLayer as any[]).push(args);
  };
  win.gtag('js', new Date());
  win.gtag('config', GA_MEASUREMENT_ID);
  gtagInjected = true;
  return true;
}

/**
 * Core event emitter. Fire-and-forget: failures are swallowed so analytics
 * can never break app behavior. Native uses Firebase Analytics; web uses a
 * gtag snippet when EXPO_PUBLIC_GA4_MEASUREMENT_ID is set.
 */
export async function track(
  event: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<void> {
  if (Platform.OS === 'web') {
    if (!ensureGtag()) return;
    try {
      const win = window as unknown as { gtag?: (...args: unknown[]) => void };
      win.gtag?.('event', event, params ?? {});
    } catch {
      // Ignore.
    }
    return;
  }
  try {
    const native = await getAnalytics();
    if (!native) return;
    native.mod.logEvent<string>(native.analytics, event, params as { [key: string]: unknown });
  } catch {
    // Ignore.
  }
}

/** Associates analytics events with the signed-in user (no PII beyond the id). */
export async function setAnalyticsUserId(userId: string | null): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const native = await getAnalytics();
    if (!native) return;
    if (userId) native.mod.setUserId(native.analytics, userId);
    else native.mod.setUserId(native.analytics, null);
  } catch {
    // Ignore.
  }
}

/** Tracks a screen view using the native logScreenView event. */
export async function trackScreenView(
  screenName: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): Promise<void> {
  if (Platform.OS === 'web') {
    await track('screen_view', { screen_name: screenName, ...params });
    return;
  }
  try {
    const native = await getAnalytics();
    if (!native) return;
    native.mod.logScreenView(native.analytics, {
      screen_name: screenName,
      ...(params ?? {}),
    });
  } catch {
    // Ignore.
  }
}

type Params = Record<string, string | number | boolean | null | undefined>;

function fire(name: string, params?: Params): void {
  void track(name, params);
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

export function trackAppOpen(): void {
  fire('app_open');
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function trackAuthSignIn(method: 'google' | 'apple' | 'email' | 'guest'): void {
  fire('sign_in', { method });
}

export function trackAuthSignUp(method: 'google' | 'apple' | 'email'): void {
  fire('sign_up', { method });
}

export function trackAuthSignOut(): void {
  fire('sign_out');
}

export function trackAccountDeleted(): void {
  fire('account_deleted');
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export function trackOnboardingStep(step: number): void {
  fire('onboarding_step', { step });
}

export function trackOnboardingCompleted(): void {
  fire('onboarding_completed');
}

export function trackPaywallViewed(): void {
  fire('paywall_viewed');
}

export function trackTrialStarted(): void {
  fire('trial_started');
}

export function trackPurchase(
  status: 'started' | 'completed' | 'cancelled' | 'failed',
  plan: 'monthly' | 'yearly',
): void {
  fire(`purchase_${status}`, { plan });
}

export function trackRestore(success: boolean): void {
  fire('purchase_restore', { success });
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export function trackNoteParsed(ok: boolean, info: { count?: number; error?: string }): void {
  if (ok) fire('note_parsed', { ok: true, count: info.count ?? 0 });
  else fire('note_parsed', { ok: false, error: info.error ?? 'unknown' });
}

export function trackTransactionAdded(
  type: 'income' | 'expense',
  info: { amount: number; method: 'note' | 'voice' | 'recurring' | 'ask' },
): void {
  fire('transaction_added', { type, amount: info.amount, method: info.method });
}

export function trackTransactionDeleted(): void {
  fire('transaction_deleted');
}

// ---------------------------------------------------------------------------
// Voice recording
// ---------------------------------------------------------------------------

export function trackVoiceStarted(): void {
  fire('voice_started');
}

export function trackVoiceError(kind: string): void {
  fire('voice_error', { kind });
}

// ---------------------------------------------------------------------------
// Plan (recurring)
// ---------------------------------------------------------------------------

export function trackRecurringAdded(type: string): void {
  fire('recurring_added', { type });
}

export function trackRecurringDeleted(type: string): void {
  fire('recurring_deleted', { type });
}

// ---------------------------------------------------------------------------
// Ask ("Can I afford it?")
// ---------------------------------------------------------------------------

export function trackAffordCheck(affordable: boolean, amount: number): void {
  fire('afford_check', { affordable, amount });
}

export function trackAffordLogPurchase(amount: number): void {
  fire('afford_log_purchase', { amount });
}

// ---------------------------------------------------------------------------
// Settings / preferences
// ---------------------------------------------------------------------------

export function trackCurrencyChanged(code: string): void {
  fire('currency_changed', { code });
}

export function trackThemeChanged(mode: string): void {
  fire('theme_changed', { mode });
}

export function trackBiometricToggled(enabled: boolean): void {
  fire('biometric_toggled', { enabled });
}

export function trackHapticsToggled(enabled: boolean): void {
  fire('haptics_toggled', { enabled });
}

export function trackNotificationPrefChanged(
  key: string,
  value: string | number | boolean,
): void {
  fire('notification_pref_changed', { key, value });
}

export function trackRateApp(): void {
  fire('rate_app');
}

export function trackReferFriend(): void {
  fire('refer_friend');
}