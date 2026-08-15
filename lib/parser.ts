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
  'put into savings',
  'into savings',
  'into investments',
  'into stocks',
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

/** Reject amounts above this sanity cap to avoid overflow / typos like 999999999999. */
const MAX_AMOUNT = 1_000_000_000;

function parseAmount(text: string): number | null {
  const matches = text.match(
    /(?:[$€£₹]\s*)?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(thousand|grand|hundred|million|k)?\s*(?:usd|dollars?|bucks|euros?|pounds|quid)?\b(?!\s*(?:day|week|month|year)s?\s+ago)/i,
  );
  if (matches) {
    const cleaned = matches[1].replace(/,/g, '');
    let amount = parseFloat(cleaned);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return null;
    const unit = (matches[2] ?? '').toLowerCase();
    if (unit === 'thousand' || unit === 'grand') amount *= 1000;
    else if (unit === 'hundred') amount *= 100;
    else if (unit === 'million') amount *= 1_000_000;
    else if (unit === 'k') amount *= 1000;
    if (amount > MAX_AMOUNT) return null;
    return amount;
  }
  return parseWordAmount(text);
}

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
  million: 1_000_000,
  billion: 1_000_000_000,
};

const TENS_WORDS = new Set(['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']);

const AMOUNT_PHRASES: Record<string, number> = {
  'a couple': 2,
  'a few': 3,
  couple: 2,
  few: 3,
};

/** Parses spelled-out amounts like "ten thousand", "forty five", "twelve fifty" (=12.50). */
function parseWordAmount(text: string): number | null {
  const lower = text.toLowerCase();
  for (const phrase of Object.keys(AMOUNT_PHRASES)) {
    if (new RegExp(`\\b${phrase}\\b`).test(lower)) return AMOUNT_PHRASES[phrase];
  }

  const tokens = lower.split(/[^a-z]+/).filter((t) => NUMBER_WORDS[t] !== undefined);
  if (tokens.length === 0) return null;

  // "twelve fifty" = 12.50 (dollar shorthand).
  if (
    tokens.length === 2 &&
    NUMBER_WORDS[tokens[0]] < 20 &&
    TENS_WORDS.has(tokens[1])
  ) {
    const amount = NUMBER_WORDS[tokens[0]] + NUMBER_WORDS[tokens[1]] / 100;
    return amount > 0 && amount <= MAX_AMOUNT ? amount : null;
  }

  let total = 0;
  let current = 0;
  for (const token of tokens) {
    const value = NUMBER_WORDS[token];
    if (value >= 100) {
      if (current === 0) current = 1;
      current *= value;
      if (value >= 1000) {
        total += current;
        current = 0;
      }
    } else {
      current += value;
    }
  }
  const amount = total + current;
  return amount > 0 && amount <= MAX_AMOUNT ? amount : null;
}

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/** Adds an offset like "2 days", "3 weeks", "1 month" to a date (going back). */
function parseRelativeOffset(lower: string): number | null {
  const match = lower.match(/(\d+|[a-z\s]+?)\s*(day|week|month)s?\s+ago/i);
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit === 'day') return n;
  if (unit === 'week') return n * 7;
  if (unit === 'month') return n * 30;
  return null;
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

  const ago = parseRelativeOffset(lower);
  if (ago !== null) {
    const d = new Date(now);
    d.setDate(d.getDate() - ago);
    return d;
  }

  // "last monday", "on friday" → most recent occurrence of that weekday.
  const dayIdx = WEEKDAYS.findIndex((w) => lower.includes(w));
  if (dayIdx >= 0) {
    const diff = (now.getDay() - dayIdx + 7) % 7;
    const d = new Date(now);
    d.setDate(d.getDate() - diff);
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

/** "and" between two number words (e.g. "two hundred and thirty") must not split clauses. */
const NUMBER_WORD_AND = /(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion)\s+and\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion)/i;

function splitClauses(text: string): string[] {
  const protectedAnd = text.replace(
    NUMBER_WORD_AND,
    (_m, a: string, b: string, offset: number, full: string) => {
      const before = offset > 0 && /\s/.test(full[offset - 1]) ? ' ' : '';
      const after =
        offset + _m.length < full.length && /\s/.test(full[offset + _m.length]) ? ' ' : '';
      return `${a}${before}__AND__${after}${b}`;
    },
  );
  return protectedAnd
    .split(CLAUSE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.replace(/__AND__/g, 'and'));
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