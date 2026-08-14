import type { OnboardingBill, PayFrequency } from '@/lib/onboarding';

export type SafeSpendInput = {
  income: number;
  payFrequency: PayFrequency;
  /** ISO date yyyy-mm-dd */
  nextPayday: string;
  bills: OnboardingBill[];
  /** Monthly savings goal, 0 when none. */
  savingsMonthly: number;
  /** Expenses already incurred this period. */
  spentThisPeriod: number;
  today?: Date;
};

export type SafeSpendResult = {
  daysUntilPayday: number;
  /** Total bill amounts due between today and the next payday. */
  billsDue: number;
  /** The slice of the monthly savings goal owed before the next payday. */
  savingsSlice: number;
  /** income − billsDue − savingsSlice (what the period allows). */
  availableForPeriod: number;
  /** availableForPeriod − spentThisPeriod (what's actually left). */
  remainingForPeriod: number;
  /** remainingForPeriod ÷ daysUntilPayday. */
  dailyAllowance: number;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isoFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns an ISO date `days` days from today. */
export function isoDaysFromToday(days: number, today: Date = new Date()): string {
  const d = startOfDay(today);
  d.setDate(d.getDate() + days);
  return isoFromDate(d);
}

/** Whole days between today and the given ISO date (never negative). */
export function daysUntil(iso: string, today: Date = new Date()): number {
  const a = startOfDay(today).getTime();
  const b = parseIso(iso).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

/**
 * Deterministic safe-to-spend engine. No AI, no randomness.
 *
 * Safe to spend today = (income − bills due before next payday − savings
 * slice − already spent) ÷ days until next payday.
 */
export function computeSafeToSpend(input: SafeSpendInput): SafeSpendResult {
  const today = startOfDay(input.today ?? new Date());
  const payday = parseIso(input.nextPayday);
  const daysUntilPayday = Math.max(1, Math.round((payday.getTime() - today.getTime()) / 86400000));

  const billsDue = input.bills
    .filter((b) => {
      const due = parseIso(b.nextDue);
      return due >= today && due <= payday;
    })
    .reduce((sum, b) => sum + b.amount, 0);

  const savingsSlice = (input.savingsMonthly / 30) * daysUntilPayday;
  const availableForPeriod = Math.max(0, input.income - billsDue - savingsSlice);
  const remainingForPeriod = Math.max(0, availableForPeriod - input.spentThisPeriod);
  const dailyAllowance = remainingForPeriod / daysUntilPayday;

  return {
    daysUntilPayday,
    billsDue,
    savingsSlice,
    availableForPeriod,
    remainingForPeriod,
    dailyAllowance,
  };
}

export function canAffordPurchase(
  input: SafeSpendInput,
  cost: number,
): SafeSpendResult & { affordable: boolean } {
  const result = computeSafeToSpend(input);
  return { ...result, affordable: cost <= result.remainingForPeriod };
}