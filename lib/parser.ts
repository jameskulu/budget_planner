import { categorize, DEFAULT_EXPENSE_CATEGORY, DEFAULT_INCOME_CATEGORY } from '@/lib/categories';
import type { ParsedTransaction, TransactionType } from '@/lib/types';

export type ParseResult =
  | { ok: true; parsed: ParsedTransaction[] }
  | { ok: false; error: string };

const INCOME_WORDS = [
  'salary',
  'paycheck',
  'payday',
  'pay day',
  'wage',
  'income',
  'payroll',
  'received',
  'got paid',
  'paid me',
  'deposit',
  'bonus',
  'refund',
  'gift',
  'dividend',
  'interest',
  'freelance',
  'gig',
  'earned',
  'earn',
  'earning',
  'earns',
  'sold',
  'credited',
  'cash in',
  'money in',
  'incoming',
  'paycheck deposited',
  'payment received',
];

const EXPENSE_WORDS = [
  'spent',
  'spend',
  'spending',
  'spends',
  'bought',
  'buy',
  'paid',
  'purchased',
  'purchase',
  'cost',
  'used',
  'using',
  'paid for',
  'expense',
  'expenses',
  'withdrew',
  'withdraw',
  'charge',
  'charged',
  'bill',
  'bills',
  'outgoing',
  'outgo',
];

const INVESTMENT_WORDS = [
  'invest',
  'invested',
  'investing',
  'invests',
  'investment',
  'investments',
  'investor',
  'stocks',
  'stock',
  'shares',
  'share',
  'etf',
  'mutual fund',
  'index fund',
  'bonds',
  'bond',
  'crypto',
  'bitcoin',
  'retirement',
  '401k',
  'ira',
  'put into',
  'allocated',
  'contribution',
];

/**
 * Multi-word income phrases. Detected before expense verbs, so
 * "got paid 500 salary" is income even though it contains "paid".
 */
const STRONG_INCOME_PHRASES = ['got paid', 'paid me', 'cash in', 'money in', 'credited'];

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseAmount(text: string): number | null {
  const matches = text.match(/(?:[$€£₹]\s*)?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:usd|dollars?|bucks|euros?|pounds|quid)?\b/i);
  if (!matches) return null;
  const cleaned = matches[1].replace(/,/g, '');
  const amount = parseFloat(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

function parseDate(text: string, now: Date): Date {
  const lower = text.toLowerCase();
  if (lower.includes('yesterday')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }
  if (lower.includes('last week')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }

  const monthMatch = lower.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?/i);
  if (monthMatch) {
    const monthIdx = Math.max(MONTH_SHORT.indexOf(monthMatch[1].slice(0, 3)), 0);
    const day = parseInt(monthMatch[2], 10);
    const year = now.getFullYear();
    const candidate = new Date(year, monthIdx, day);
    if (day >= 1 && day <= 31) {
      return candidate;
    }
  }

  return new Date(now);
}

/**
 * Splits a free-form statement into separate clauses, so several transactions
 * can be logged in one go: "spent 20 on groceries, and got paid 500 salary".
 * Splits on punctuation, newlines, and standalone conjunctions (and/then/also/plus).
 * The period rule requires whitespace (or end) after it, so decimals like "20.50" survive.
 */
const CLAUSE_SPLIT = /\band\b|\bthen\b|\balso\b|\bplus\b|[,;!?]|\n|\.(?=\s|$)/i;

function splitClauses(text: string): string[] {
  return text
    .split(CLAUSE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseClause(raw: string, now: Date): ParsedTransaction | null {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text) return null;

  const amount = parseAmount(text);
  if (amount === null) return null;

  const lower = text.toLowerCase();
  const hasPlus = /^\s*\+/.test(text);
  const hasMinus = /^\s*-/.test(text);
  const hasStrongIncome = STRONG_INCOME_PHRASES.some((w) => lower.includes(w));
  const isIncomeWord = INCOME_WORDS.some((w) => lower.includes(w));
  const isExpenseWord = EXPENSE_WORDS.some((w) => lower.includes(w));
  const isInvestmentWord = INVESTMENT_WORDS.some((w) => lower.includes(w));

  let type: TransactionType;
  let isInvestment = false;
  if (hasPlus) {
    type = 'income';
  } else if (hasMinus) {
    type = 'expense';
  } else if (hasStrongIncome) {
    type = 'income';
  } else if (isInvestmentWord) {
    // Investing is money going out of your spendable balance, but it's not
    // "spending" — marked so it's excluded from spending reports.
    type = 'expense';
    isInvestment = true;
  } else if (isExpenseWord) {
    type = 'expense';
  } else if (isIncomeWord) {
    type = 'income';
  } else {
    type = 'expense';
  }

  const category = categorize(lower, type);
  const date = toIso(parseDate(lower, now));

  return { type, amount, date, category, note: text, isInvestment };
}

/**
 * Converts a free-form note like "spent 45 on groceries" or
 * "got paid 2500 salary yesterday" into structured transactions.
 *
 * Natural filler words ("I have spent $500 in groceries") are tolerated.
 * Statements can contain several transactions: "spent 500 on groceries,
 * earned 300 for a gig" becomes two transactions.
 *
 * Deterministic, rule-based — no external calls.
 */
export function parseNote(raw: string, now: Date = new Date()): ParseResult {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (!text) {
    return { ok: false, error: 'Write a short note like "spent 45 on groceries".' };
  }

  const parsed: ParsedTransaction[] = [];
  for (const clause of splitClauses(text)) {
    const one = parseClause(clause, now);
    if (one) parsed.push(one);
  }

  if (parsed.length === 0) {
    return { ok: false, error: "I couldn't find an amount. Try something like 'spent 45 on coffee'." };
  }

  return { ok: true, parsed };
}

export function parseAmountOnly(raw: string): number | null {
  return parseAmount(raw);
}

export const FALLBACK_CATEGORY_EXPENSE = DEFAULT_EXPENSE_CATEGORY;
export const FALLBACK_CATEGORY_INCOME = DEFAULT_INCOME_CATEGORY;