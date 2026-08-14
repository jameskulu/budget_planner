import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

/** The RevenueCat entitlement granted by any paid plan. */
export const PREMIUM_ENTITLEMENT_ID = 'premium';

/**
 * True once a real RevenueCat key is present. Without a key (or on web,
 * where native IAP is unavailable) we keep the paywall's local mock mode.
 */
export const isPurchasesConfigured = Boolean(API_KEY);

/**
 * Native IAP requires a development build — RevenueCat's SDK automatically
 * runs in "Preview API Mode" inside Expo Go, mocking native calls so the
 * paywall UI still works but no real purchase happens.
 */
export const canPurchase = Platform.OS !== 'web' && isPurchasesConfigured;

let configured = false;

/** Configure RevenueCat once with the app's public SDK key. */
export function configurePurchases(): void {
  if (!isPurchasesConfigured || configured) return;
  configured = true;
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: API_KEY as string });
}

/** Link the RevenueCat user to the app's user id after sign-in. */
export async function identifyPurchasesUser(appUserID: string): Promise<void> {
  if (!isPurchasesConfigured) return;
  try {
    await Purchases.logIn(appUserID);
  } catch {
    // Ignore — an anonymous user is still functional.
  }
}

/** Detach the RevenueCat user on sign-out. */
export async function resetPurchasesUser(): Promise<void> {
  if (!isPurchasesConfigured) return;
  try {
    await Purchases.logOut();
  } catch {
    // Ignore.
  }
}

export function hasActiveEntitlement(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
}

/** True when any entitlement or subscription is currently active. */
function hasAnyActiveAccess(info: CustomerInfo): boolean {
  return (
    hasActiveEntitlement(info) ||
    Object.keys(info.entitlements.active).length > 0 ||
    info.activeSubscriptions.length > 0
  );
}

/** True when the current RevenueCat user already has an active entitlement. */
export async function isPremium(): Promise<boolean> {
  if (!isPurchasesConfigured) return false;
  try {
    return hasAnyActiveAccess(await Purchases.getCustomerInfo());
  } catch {
    return false;
  }
}

/** URL to manage the active subscription in the store, if one exists. */
export async function getManagementUrl(): Promise<string | null> {
  if (!isPurchasesConfigured) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    return info.managementURL;
  } catch {
    return null;
  }
}

export type SubscriptionDetails = {
  active: boolean;
  /** Product identifier of the active subscription, if any. */
  productId: string | null;
  /** Display name of the active subscription (e.g. "Annual"), if known. */
  planName: string | null;
  /** ISO date the subscription expires, if any. */
  expiresAt: string | null;
  /** Whether the subscription is set to renew. */
  willRenew: boolean;
};

/**
 * Human-readable details about the current subscription. Entitlement ids like
 * "Monthly", "Yearly" and "Lifetime" are treated as display names.
 */
export async function getSubscriptionDetails(): Promise<SubscriptionDetails> {
  if (!isPurchasesConfigured) return { active: false, productId: null, planName: null, expiresAt: null, willRenew: false };
  try {
    const info = await Purchases.getCustomerInfo();
    const active = hasAnyActiveAccess(info);

    const entitlement = Object.values(info.entitlements.active)[0];
    const subscription = info.activeSubscriptions.length > 0
      ? info.subscriptionsByProductIdentifier[info.activeSubscriptions[0]]
      : undefined;

    const planName =
      entitlement?.productIdentifier ??
      subscription?.displayName ??
      null;
    const expiresAt =
      entitlement?.expirationDate ??
      subscription?.expiresDate ??
      info.latestExpirationDate ??
      null;
    const willRenew = entitlement?.willRenew ?? subscription?.willRenew ?? false;

    return {
      active,
      productId: info.activeSubscriptions[0] ?? entitlement?.productIdentifier ?? null,
      planName,
      expiresAt,
      willRenew,
    };
  } catch {
    return { active: false, productId: null, planName: null, expiresAt: null, willRenew: false };
  }
}

export type AvailablePlans = {
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
};

/** Fetch the current offering's monthly/annual packages (null in mock mode). */
export async function getAvailablePlans(): Promise<AvailablePlans> {
  if (!isPurchasesConfigured) return { monthly: null, annual: null };
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    return {
      monthly: current?.monthly ?? null,
      annual: current?.annual ?? null,
    };
  } catch {
    return { monthly: null, annual: null };
  }
}

export type PurchaseOutcome =
  | { status: 'purchased' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** Purchase a package and report the result. */
export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    await Purchases.purchasePackage(pkg);
    const fresh = await Purchases.getCustomerInfo();
    const confirmed =
      hasAnyActiveAccess(fresh) ||
      fresh.activeSubscriptions.includes(pkg.product.identifier);
    return confirmed
      ? { status: 'purchased' }
      : { status: 'error', message: 'Your purchase could not be confirmed. Try again.' };
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === '1' /* PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR */) {
      return { status: 'cancelled' };
    }
    return {
      status: 'error',
      message:
        code === '10'
          ? 'No connection. Check your network and try again.'
          : 'The purchase could not be completed. Try again.',
    };
  }
}

/** Attempt to restore prior purchases; resolves true when entitlement is active. */
export async function restorePurchases(): Promise<boolean> {
  if (!isPurchasesConfigured) return false;
  try {
    return hasAnyActiveAccess(await Purchases.restorePurchases());
  } catch {
    return false;
  }
}

export function subscribeToCustomerInfo(
  listener: (info: CustomerInfo) => void,
): () => void {
  if (!isPurchasesConfigured) return () => {};
  try {
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => Purchases.removeCustomerInfoUpdateListener(listener);
  } catch {
    return () => {};
  }
}
