export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'irregular';

export type BillFrequency = 'weekly' | 'biweekly' | 'monthly';

export type OnboardingBill = {
  id: string;
  label: string;
  amount: number;
  frequency: BillFrequency;
  /** ISO date yyyy-mm-dd */
  nextDue: string;
};

export type OnboardingProblem = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
};

export type OnboardingGoal = {
  id: string;
  icon: string;
  label: string;
};

export type OnboardingPlan = 'trial' | 'free' | null;

export type PlanPeriod = 'monthly' | 'yearly';

export type OnboardingState = {
  /** Current step index inside the onboarding wizard. */
  step: number;
  problem: string | null;
  goal: string | null;
  payFrequency: PayFrequency | null;
  income: number | null;
  nextPayday: string | null;
  bills: OnboardingBill[];
  savingsMonthly: number | null;
  savingsLabel: string | null;
  currencyCode: string;
  plan: OnboardingPlan;
  /** Billing period selected on the paywall ('monthly' | 'yearly'). */
  planPeriod: PlanPeriod;
  /** Transaction parsed during the natural-language demo, if confirmed. */
  demo: {
    parsed: {
      type: 'income' | 'expense';
      amount: number;
      date: string;
      category: string;
      note: string;
    } | null;
    logged: boolean;
  };
  completed: boolean;
};

export const PROBLEMS: OnboardingProblem[] = [
  {
    id: 'hate-budgeting',
    icon: '😩',
    title: 'I hate budgeting.',
    subtitle: 'Traditional budgeting feels like work.',
  },
  {
    id: 'overspend',
    icon: '💸',
    title: 'I spend too much without realizing it.',
    subtitle: 'I want to understand where my money goes.',
  },
  {
    id: 'run-low',
    icon: '😰',
    title: 'I run low before payday.',
    subtitle: 'I want to know how much I can safely spend.',
  },
  {
    id: 'save-more',
    icon: '🎯',
    title: 'I want to save more.',
    subtitle: 'I want to reach my goals without constantly thinking about money.',
  },
];

export const GOALS: OnboardingGoal[] = [
  { id: 'spend-smarter', icon: '💰', label: 'Spend smarter' },
  { id: 'save-more', icon: '🏦', label: 'Save more' },
  { id: 'stay-on-track', icon: '📊', label: 'Stay on track' },
  { id: 'all', icon: '✨', label: 'All of these' },
];

export const PAY_FREQUENCIES: { id: PayFrequency; label: string }[] = [
  { id: 'weekly', label: 'Every week' },
  { id: 'biweekly', label: 'Every 2 weeks' },
  { id: 'semimonthly', label: 'Twice a month' },
  { id: 'monthly', label: 'Once a month' },
  { id: 'irregular', label: 'Irregularly' },
];

export function payFrequencyLabel(frequency: PayFrequency): string {
  switch (frequency) {
    case 'weekly':
      return 'every week';
    case 'biweekly':
      return 'every 2 weeks';
    case 'semimonthly':
      return 'twice a month';
    case 'irregular':
      return 'as it comes in';
    default:
      return 'every month';
  }
}

export const QUICK_BILLS: { label: string; icon: string }[] = [
  { label: 'Rent', icon: '🏠' },
  { label: 'Utilities', icon: '💡' },
  { label: 'Phone', icon: '📱' },
  { label: 'Car', icon: '🚗' },
  { label: 'Insurance', icon: '🛡️' },
  { label: 'Loan', icon: '💳' },
];

export const SAVING_GOAL_LABELS: { label: string; icon: string }[] = [
  { label: 'Vacation', icon: '🏖' },
  { label: 'Car', icon: '🚗' },
  { label: 'Home', icon: '🏠' },
  { label: 'Something big', icon: '🎯' },
];

export function createDefaultOnboarding(): OnboardingState {
  return {
    step: 0,
    problem: null,
    goal: null,
    payFrequency: null,
    income: null,
    nextPayday: null,
    bills: [],
    savingsMonthly: null,
    savingsLabel: null,
    currencyCode: 'USD',
    plan: null,
    planPeriod: 'yearly',
    demo: { parsed: null, logged: false },
    completed: false,
  };
}

export const ONBOARDING_STEP_COUNT = 18;

export function formatNextPayday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });
}

export function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}