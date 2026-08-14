import { formatMoney } from '@/lib/format';
import { upcomingCommitments, type RecurringItem } from '@/lib/recurring';
import type { Transaction } from '@/lib/types';

export type BudgetSnapshot = {
  now: Date;
  /** Total cash on hand: all-time income minus all-time expenses. */
  balance: number;
  /** Income received this calendar month. */
  monthIncome: number;
  /** Expenses incurred this calendar month. */
  monthSpent: number;
  /** Investment transfers out this calendar month. */
  monthInvested: number;
  /** Bills + investments still coming up later this month. */
  reservedForBills: number;
  /** What you can safely spend: balance minus reserved commitments (never negative). */
  safeToSpend: number;
};

export type AffordVerdict = {
  cost: number;
  affordable: boolean;
  shortfall: number;
  afterSafeToSpend: number;
  safeToSpend: number;
  message: string;
};

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "yyyy-mm" prefix used to group transactions into calendar months. */
function toMonthKey(date: Date): string {
  return toIso(date).slice(0, 7);
}

/**
 * Deterministic money engine. No budgets to set — it just adds up.
 *  1. balance         = income - expense (all time)
 *  2. monthIncome     = income dated in the current calendar month
 *  3. monthSpent      = expenses dated in the current calendar month
 *  4. reservedForBills= recurring bills + investments still due this month
 *  5. safeToSpend     = max(0, balance - reservedForBills)
 */
export function computeBudget(
  transactions: Transaction[],
  now: Date = new Date(),
  recurring: RecurringItem[] = [],
): BudgetSnapshot {
  const monthKey = toMonthKey(now);

  let balance = 0;
  let monthIncome = 0;
  let monthSpent = 0;
  let monthInvested = 0;

  for (const t of transactions) {
    const signed = t.type === 'income' ? t.amount : -t.amount;
    balance += signed;
    if (t.date.startsWith(monthKey)) {
      if (t.type === 'income') monthIncome += t.amount;
      // Investments reduce cash but are not "spending".
      else if (t.isInvestment) monthInvested += t.amount;
      else monthSpent += t.amount;
    }
  }

  const reservedForBills = upcomingCommitments(recurring, now);

  return {
    now,
    balance,
    monthIncome,
    monthSpent,
    monthInvested,
    reservedForBills,
    safeToSpend: Math.max(0, balance - reservedForBills),
  };
}

export function canAfford(
  snapshot: BudgetSnapshot,
  cost: number,
  currency = '$',
): AffordVerdict {
  const safeToSpend = snapshot.safeToSpend;
  const affordable = cost <= safeToSpend;
  const shortfall = Math.max(0, cost - safeToSpend);
  const afterSafeToSpend = Math.max(0, safeToSpend - cost);

  let message: string;
  if (affordable) {
    message = `Yes — go for it. You'd still have ${formatMoney(afterSafeToSpend, currency)} after buying it.`;
  } else {
    message = `Not quite — you'd be ${formatMoney(shortfall, currency)} short with the money you have.`;
  }

  return {
    cost,
    affordable,
    shortfall,
    afterSafeToSpend,
    safeToSpend,
    message,
  };
}