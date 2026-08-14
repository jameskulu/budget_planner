import type { Transaction } from '@/lib/types';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function iso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysFrom(now: Date, offset: number): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return iso(d);
}

function onMonthDay(now: Date, day: number): string {
  const d = new Date(now.getFullYear(), now.getMonth(), day);
  return iso(d);
}

function inPreviousMonth(now: Date, day: number): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, day);
  return iso(d);
}

let seedCounter = 0;
function nextId(prefix: string): string {
  seedCounter += 1;
  return `${prefix}-seed-${seedCounter}`;
}

export function createSeedData(now: Date = new Date()): Transaction[] {
  const t = (
    type: Transaction['type'],
    amount: number,
    date: string,
    category: string,
    note: string,
  ): Transaction => ({ id: nextId('tx'), type, amount, date, category, note });

  const transactions: Transaction[] = [
    // Previous month — gives the balance some history.
    t('income', 3500, inPreviousMonth(now, 1), 'salary', 'Salary for last month'),
    t('expense', 1200, inPreviousMonth(now, 2), 'housing', 'Paid rent'),
    t('expense', 210, inPreviousMonth(now, 6), 'groceries', 'Weekly groceries'),
    t('expense', 45, inPreviousMonth(now, 9), 'dining', 'Dinner with friends'),
    t('expense', 90, inPreviousMonth(now, 15), 'transport', 'Car fuel and parking'),
    t('expense', 300, inPreviousMonth(now, 20), 'shopping', 'New jacket'),

    // This month.
    t('income', 3500, onMonthDay(now, 1), 'salary', 'Monthly salary'),
    t('expense', 1200, onMonthDay(now, 1), 'housing', 'Paid rent'),
    t('expense', 60, onMonthDay(now, 5), 'housing', 'Internet bill'),
    t('expense', 96, daysFrom(now, -3), 'groceries', 'Groceries at supermarket'),
    t('expense', 5.5, daysFrom(now, -2), 'dining', 'Coffee'),
    t('expense', 12, daysFrom(now, -2), 'transport', 'Subway fare'),
    t('expense', 34, daysFrom(now, -1), 'dining', 'Lunch out'),
    t('income', 250, daysFrom(now, 0), 'side-income', 'Freelance design gig'),
    t('expense', 64, daysFrom(now, 0), 'shopping', 'Bought headphones'),
  ];

  return transactions;
}