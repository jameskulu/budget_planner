export type RecurringType = 'income' | 'expense' | 'investment';

export type RecurringItem = {
  id: string;
  type: RecurringType;
  /** Always positive; sign carried by `type`. */
  amount: number;
  /** e.g. "Rent", "Salary", "Netflix". */
  label: string;
  /** Day of month it lands on (1-31). Used to auto-log transactions. */
  day: number;
};

export type MonthlyEstimate = {
  recurringIncome: number;
  recurringExpense: number;
  recurringInvestment: number;
  /** What's left after the fixed monthly bills and investments. */
  savingsEstimate: number;
};

export function computeMonthlyEstimate(items: RecurringItem[]): MonthlyEstimate {
  const recurringIncome = items
    .filter((i) => i.type === 'income')
    .reduce((sum, i) => sum + i.amount, 0);
  const recurringExpense = items
    .filter((i) => i.type === 'expense')
    .reduce((sum, i) => sum + i.amount, 0);
  const recurringInvestment = items
    .filter((i) => i.type === 'investment')
    .reduce((sum, i) => sum + i.amount, 0);
  return {
    recurringIncome,
    recurringExpense,
    recurringInvestment,
    savingsEstimate: recurringIncome - recurringExpense - recurringInvestment,
  };
}

/**
 * Recurring commitments still coming up later this month — bills and
 * investments whose day hasn't passed yet. These should be reserved before
 * declaring anything "safe to spend".
 */
export function upcomingCommitments(items: RecurringItem[], now: Date): number {
  const today = now.getDate();
  return items
    .filter((i) => i.type !== 'income' && i.day >= today)
    .reduce((sum, i) => sum + i.amount, 0);
}
