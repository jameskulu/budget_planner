import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/lib/auth';
import { computeBudget, type BudgetSnapshot } from '@/lib/budget';
import { categorize } from '@/lib/categories';
import { DEFAULT_CURRENCY_CODE, getCurrency, type Currency } from '@/lib/currency';
import { formatMoney } from '@/lib/format';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from '@/lib/notifications';
import {
  createDefaultOnboarding,
  ONBOARDING_STEP_COUNT,
  type OnboardingState,
} from '@/lib/onboarding';
import { parseNote, type ParseResult } from '@/lib/parser';
import {
  computeMonthlyEstimate,
  type MonthlyEstimate,
  type RecurringItem,
} from '@/lib/recurring';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { ParsedTransaction, Transaction } from '@/lib/types';

const CACHE_PREFIX = 'budget-planner:v1:';
const RECURRING_PREFIX = 'budget-planner:recurring:v1:';
const LAST_GEN_PREFIX = 'budget-planner:lastgen:v1:';
const CURRENCY_KEY = 'budget-planner:currency:v1';
const NOTIFS_KEY = 'budget-planner:notifications:v1';
const ONBOARDING_KEY = 'budget-planner:onboarding:v1';

function cacheKeyFor(userId: string): string {
  return `${CACHE_PREFIX}${userId}`;
}

function recurringCacheKeyFor(userId: string): string {
  return `${RECURRING_PREFIX}${userId}`;
}

function lastGenKeyFor(userId: string): string {
  return `${LAST_GEN_PREFIX}${userId}`;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function recurringNote(label: string): string {
  return `${label} · every month`;
}

/** Turns a recurring item into a real transaction dated in the given month. */
function transactionFromRecurring(item: RecurringItem, monthKey: string): ParsedTransaction {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(item.day, 1), lastDay);
  // Investments move money out of your spendable balance, so they're logged
  // as expenses; isInvestment keeps them out of "spending" reports/categories.
  const isInvestment = item.type === 'investment';
  const type: Transaction['type'] =
    isInvestment ? 'expense' : (item.type as Exclude<RecurringItem['type'], 'investment'>);
  return {
    type,
    amount: item.amount,
    date: `${monthKey}-${String(day).padStart(2, '0')}`,
    category: categorize(item.label, type),
    note: recurringNote(item.label),
    isInvestment,
  };
}

function createId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

type TxRow = {
  id: string;
  user_id: string;
  type: Transaction['type'];
  amount: number;
  date: string;
  category: string;
  note: string;
  is_investment: boolean;
  created_at: string;
};

function toTransaction(row: TxRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    date: row.date,
    category: row.category,
    note: row.note,
    isInvestment: row.is_investment ?? false,
  };
}

function toRow(userId: string, parsed: ParsedTransaction) {
  return {
    user_id: userId,
    type: parsed.type,
    amount: parsed.amount,
    date: parsed.date,
    category: parsed.category,
    note: parsed.note,
    is_investment: parsed.isInvestment ?? false,
  };
}

type RecurringRow = {
  id: string;
  user_id: string;
  type: RecurringItem['type'];
  amount: number;
  label: string;
  day: number;
  created_at: string;
};

function toRecurring(row: RecurringRow): RecurringItem {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    label: row.label,
    day: row.day,
  };
}

function toRecurringRow(userId: string, item: Omit<RecurringItem, 'id'>) {
  return {
    user_id: userId,
    type: item.type,
    amount: item.amount,
    label: item.label,
    day: item.day,
  };
}

type StoreContextValue = {
  loaded: boolean;
  transactions: Transaction[];
  snapshot: BudgetSnapshot;
  recurring: RecurringItem[];
  monthly: MonthlyEstimate;
  currency: Currency;
  setCurrency: (code: string) => void;
  /** Formats an amount with the selected currency symbol. */
  money: (amount: number) => string;
  onboarding: OnboardingState;
  onboardingLoaded: boolean;
  updateOnboarding: (patch: Partial<OnboardingState>) => void;
  resetOnboarding: () => void;
  notificationPrefs: NotificationPrefs;
  setNotificationPrefs: (prefs: NotificationPrefs) => void;
  addRecurring: (item: Omit<RecurringItem, 'id'>) => void;
  deleteRecurring: (id: string) => void;
  addNote: (note: string) => ParseResult;
  addTransaction: (parsed: ParsedTransaction) => string;
  deleteTransaction: (id: string) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringItem[]>([]);
  const [recurringLoaded, setRecurringLoaded] = useState(false);
  const [currencyCode, setCurrencyCode] = useState<string>(DEFAULT_CURRENCY_CODE);
  const [onboarding, setOnboarding] = useState<OnboardingState>(createDefaultOnboarding());
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [notificationPrefs, setNotificationPrefsState] = useState<NotificationPrefs>(
    DEFAULT_NOTIFICATION_PREFS,
  );
  const loadedRef = useRef(false);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;
    loadedRef.current = false;
    setLoaded(false);
    const cacheKey = cacheKeyFor(userId);

    (async () => {
      try {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (!cancelled) setTransactions((data as TxRow[]).map(toTransaction));
        } else {
          throw new Error('supabase not configured');
        }
      } catch {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (raw && !cancelled) {
          const data = JSON.parse(raw) as Transaction[];
          if (Array.isArray(data)) setTransactions(data);
        }
      } finally {
        if (!cancelled) {
          loadedRef.current = true;
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!loadedRef.current || !user) return;
    AsyncStorage.setItem(cacheKeyFor(user.id), JSON.stringify(transactions)).catch(() => {});
  }, [transactions, user]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('recurring')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          if (!cancelled) setRecurring((data as RecurringRow[]).map(toRecurring));
        } else {
          throw new Error('supabase not configured');
        }
      } catch {
        const raw = await AsyncStorage.getItem(recurringCacheKeyFor(userId));
        if (raw && !cancelled) {
          const data = JSON.parse(raw) as RecurringItem[];
          if (Array.isArray(data)) setRecurring(data);
        }
      } finally {
        if (!cancelled) setRecurringLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(CURRENCY_KEY);
      if (raw && !cancelled) setCurrencyCode(raw);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(CURRENCY_KEY, currencyCode).catch(() => {});
  }, [currencyCode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (raw && !cancelled) {
        try {
          const stored = JSON.parse(raw) as OnboardingState;
          setOnboarding({ ...createDefaultOnboarding(), ...stored });
        } catch {
          // ignore corrupt onboarding payload
        }
      }
      if (!cancelled) setOnboardingLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Server-side source of truth: once the user signs in, their profile's
  // onboarding_completed flag (from any device) wins over the local state.
  useEffect(() => {
    const userId = user?.id;
    if (!userId || !isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_completed, onboarding')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) return;
      setOnboarding((prev) => {
        const merged = data.onboarding
          ? { ...createDefaultOnboarding(), ...(data.onboarding as Partial<OnboardingState>) }
          : prev;
        return {
          ...merged,
          completed: Boolean(data.onboarding_completed),
          step: data.onboarding_completed ? ONBOARDING_STEP_COUNT - 1 : merged.step,
        };
      });
      if (data.onboarding_completed) setOnboardingLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Persist the completion flag + full state so it follows the account.
  useEffect(() => {
    if (!onboardingLoaded) return;
    AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(onboarding)).catch(() => {});
  }, [onboarding, onboardingLoaded]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId || !isSupabaseConfigured || !onboardingLoaded) return;
    const timer = setTimeout(() => {
      supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          onboarding_completed: onboarding.completed,
          onboarding: onboarding,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.warn('profile upsert failed:', error.message);
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [onboarding, onboardingLoaded, user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(NOTIFS_KEY);
      if (raw && !cancelled) {
        try {
          const stored = JSON.parse(raw) as Partial<NotificationPrefs>;
          setNotificationPrefsState({ ...DEFAULT_NOTIFICATION_PREFS, ...stored });
        } catch {
          // ignore corrupt payload
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(notificationPrefs)).catch(() => {});
  }, [notificationPrefs]);

  const setNotificationPrefs = useCallback((prefs: NotificationPrefs) => {
    setNotificationPrefsState(prefs);
  }, []);

  /**
   * Auto-log recurring items as real transactions once per month, so salary
   * credits and bill debits appear in History, the balance, and the monthly
   * stats without manual entry.
   */
  useEffect(() => {
    if (!user) return;
    AsyncStorage.setItem(
      recurringCacheKeyFor(user.id),
      JSON.stringify(recurring),
    ).catch(() => {});
  }, [recurring, user]);

  const currency = getCurrency(currencyCode);
  const setCurrency = useCallback((code: string) => {
    setCurrencyCode(getCurrency(code).code);
  }, []);
  const money = useCallback(
    (amount: number) => formatMoney(amount, currency.symbol),
    [currency.symbol],
  );
  const updateOnboarding = useCallback((patch: Partial<OnboardingState>) => {
    setOnboarding((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setOnboarding(createDefaultOnboarding());
  }, []);

  const snapshot = useMemo(
    () => computeBudget(transactions, new Date(), recurring),
    [transactions, recurring],
  );
  const monthly = useMemo(() => computeMonthlyEstimate(recurring), [recurring]);

  const addNote = useCallback(
    (note: string): ParseResult => {
      const result = parseNote(note);
      if (!result.ok || !user) return result;

      const rows = result.parsed.map((p) => toRow(user.id, p));

      if (isSupabaseConfigured) {
        supabase
          .from('transactions')
          .insert(rows)
          .select()
          .then(({ data, error }) => {
            if (error) {
              const locals = rows.map((r) => ({ id: createId('tx'), ...r }));
              setTransactions((prev) => [...locals, ...prev]);
              return;
            }
            const txs = (data as TxRow[]).map(toTransaction);
            setTransactions((prev) => [...txs, ...prev]);
          });
      } else {
        const locals = rows.map((r) => ({ id: createId('tx'), ...r }));
        setTransactions((prev) => [...locals, ...prev]);
      }
      return result;
    },
    [user],
  );

  const addTransaction = useCallback(
    (parsed: ParsedTransaction): string => {
      if (!user) return '';
      const row = toRow(user.id, parsed);
      const local: Transaction = { id: createId('tx'), ...parsed };

      if (isSupabaseConfigured) {
        supabase
          .from('transactions')
          .insert(row)
          .select()
          .then(({ data, error }) => {
            if (error) {
              setTransactions((prev) => [local, ...prev]);
              return;
            }
            const txs = (data as TxRow[]).map(toTransaction);
            setTransactions((prev) => [...txs, ...prev]);
          });
      } else {
        setTransactions((prev) => [local, ...prev]);
      }
      return local.id;
    },
    [user],
  );

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (isSupabaseConfigured) {
      supabase.from('transactions').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('delete failed:', error.message);
      });
    }
  }, []);

  const addRecurring = useCallback(
    (item: Omit<RecurringItem, 'id'>) => {
      const full: RecurringItem = { ...item, id: createId('rec') };
      setRecurring((prev) => [...prev, full]);
      addTransaction(transactionFromRecurring(full, currentMonthKey()));
      if (user) {
        AsyncStorage.setItem(lastGenKeyFor(user.id), currentMonthKey()).catch(() => {});
        if (isSupabaseConfigured) {
          supabase
            .from('recurring')
            .insert(toRecurringRow(user.id, item))
            .select()
            .then(({ data, error }) => {
              if (error) {
                console.warn('recurring insert failed:', error.message);
                return;
              }
              const rows = (data as RecurringRow[]).map(toRecurring);
              setRecurring((prev) =>
                prev.map((r) => (r.id === full.id ? (rows[0] ?? r) : r)),
              );
            });
        }
      }
    },
    [addTransaction, user],
  );

  // One-time import: when onboarding completes, promote the income and bills
  // the user entered into real recurring items so the dashboard reflects them.
  const onboardingImportedRef = useRef(false);
  useEffect(() => {
    if (onboardingImportedRef.current) return;
    if (!onboarding.completed) return;
    if (onboarding.income == null && onboarding.bills.length === 0) return;

    onboardingImportedRef.current = true;

    const dayFromIso = (iso: string | null): number => {
      if (!iso) return 1;
      const day = Number(iso.split('-')[2]);
      return Number.isFinite(day) && day >= 1 && day <= 31 ? day : 1;
    };

    const items: Omit<RecurringItem, 'id'>[] = [];
    if (onboarding.income != null && onboarding.income > 0) {
      items.push({
        type: 'income',
        label: 'Salary',
        amount: onboarding.income,
        day: dayFromIso(onboarding.nextPayday),
      });
    }
    for (const bill of onboarding.bills) {
      items.push({
        type: 'expense',
        label: bill.label,
        amount: bill.amount,
        day: dayFromIso(bill.nextDue),
      });
    }
    for (const item of items) addRecurring(item);
  }, [onboarding.completed, onboarding.income, onboarding.bills, onboarding.nextPayday, addRecurring]);

  const deleteRecurring = useCallback(
    (id: string) => {
      const item = recurring.find((r) => r.id === id);
      setRecurring((prev) => prev.filter((r) => r.id !== id));
      if (!item || !user) return;

      const month = currentMonthKey();
      const note = recurringNote(item.label);
      setTransactions((prev) =>
        prev.filter(
          (t) =>
            !(
              t.date.startsWith(month) &&
              t.type === item.type &&
              t.amount === item.amount &&
              t.note === note
            ),
        ),
      );
      if (isSupabaseConfigured) {
        supabase
          .from('recurring')
          .delete()
          .eq('id', id)
          .then(({ error }) => {
            if (error) console.warn('recurring delete failed:', error.message);
          });
        supabase
          .from('transactions')
          .delete()
          .eq('user_id', user.id)
          .eq('note', note)
          .eq('type', item.type)
          .eq('amount', item.amount)
          .gte('date', `${month}-01`)
          .lte('date', `${month}-31`)
          .then(({ error }) => {
            if (error) console.warn('recurring cleanup failed:', error.message);
          });
      }
    },
    [recurring, user],
  );

  /**
   * Auto-log recurring items as real transactions once per month, so salary
   * credits and bill debits appear in History, the balance, and the monthly
   * stats without manual entry.
   */
  useEffect(() => {
    if (!user || !recurringLoaded || recurring.length === 0) return;
    const month = currentMonthKey();
    const key = lastGenKeyFor(user.id);
    (async () => {
      const last = await AsyncStorage.getItem(key);
      if (last === month) return;
      for (const item of recurring) {
        addTransaction(transactionFromRecurring(item, month));
      }
      await AsyncStorage.setItem(key, month).catch(() => {});
    })();
  }, [user, recurring, recurringLoaded, addTransaction]);

  const value = useMemo<StoreContextValue>(
    () => ({
      loaded,
      transactions,
      snapshot,
      recurring,
      monthly,
      currency,
      setCurrency,
      money,
      onboarding,
      onboardingLoaded,
      updateOnboarding,
      resetOnboarding,
      notificationPrefs,
      setNotificationPrefs,
      addRecurring,
      deleteRecurring,
      addNote,
      addTransaction,
      deleteTransaction,
    }),
    [
      loaded,
      transactions,
      snapshot,
      recurring,
      monthly,
      currency,
      setCurrency,
      money,
      onboarding,
      onboardingLoaded,
      updateOnboarding,
      resetOnboarding,
      notificationPrefs,
      setNotificationPrefs,
      addRecurring,
      deleteRecurring,
      addNote,
      addTransaction,
      deleteTransaction,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useBudget(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return ctx;
}
