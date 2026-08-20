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
import { AppState } from 'react-native';

import { useAuth } from '@/lib/auth';
import { trackNoteParsed, trackRecurringAdded, trackRecurringDeleted, trackTransactionAdded, trackTransactionDeleted } from '@/lib/analytics';
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
const OUTBOX_PREFIX = 'budget-planner:outbox:v1:';
const CURRENCY_KEY = 'budget-planner:currency:v1';
const NOTIFS_KEY = 'budget-planner:notifications:v1';
const ONBOARDING_KEY = 'budget-planner:onboarding:v1';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for real Supabase user ids; false for the local guest ("test-user"). */
function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
const HAPTICS_KEY = 'budget-planner:haptics:v1';
const BIOMETRIC_KEY = 'budget-planner:biometric:v1';

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

/** Generates a v4-style UUID so offline rows can be inserted with a stable id. */
function createUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Pending server write that failed while offline, retried once back online. */
type OutboxOp =
  | { kind: 'insert-tx'; rows: TxRow[] }
  | { kind: 'delete-tx'; ids: string[] }
  | { kind: 'insert-rec'; rows: RecurringRow[] }
  | { kind: 'delete-rec'; ids: string[] };

function outboxKeyFor(userId: string): string {
  return `${OUTBOX_PREFIX}${userId}`;
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
  created_at?: string;
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
  created_at?: string;
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
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  addRecurring: (item: Omit<RecurringItem, 'id'>) => void;
  deleteRecurring: (id: string) => void;
  addNote: (note: string) => ParseResult;
  addTransaction: (parsed: ParsedTransaction, method?: 'note' | 'voice' | 'recurring' | 'ask') => string;
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
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const loadedRef = useRef(false);
  const outboxRef = useRef<OutboxOp[]>([]);
  const [outboxTick, setOutboxTick] = useState(0);

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
          const server = (data as TxRow[]).map(toTransaction);
          if (!cancelled) {
            // Merge rows that were added offline (pending in the outbox) so a
            // successful fetch doesn't wipe them out.
            const raw = await AsyncStorage.getItem(cacheKey);
            const cached = raw ? (JSON.parse(raw) as Transaction[]) : [];
            const serverIds = new Set(server.map((t) => t.id));
            const extras = Array.isArray(cached)
              ? cached.filter((t) => t.id && !serverIds.has(t.id))
              : [];
            setTransactions([...extras, ...server]);
          }
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
    if (!userId || !isSupabaseConfigured || !isUuid(userId)) return;
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
    if (!userId || !isSupabaseConfigured || !onboardingLoaded || !isUuid(userId)) return;
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(HAPTICS_KEY);
      if (raw === 'false' && !cancelled) setHapticsEnabledState(false);
      const bio = await AsyncStorage.getItem(BIOMETRIC_KEY);
      if (bio === 'true' && !cancelled) setBiometricEnabledState(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(HAPTICS_KEY, String(hapticsEnabled)).catch(() => {});
  }, [hapticsEnabled]);

  useEffect(() => {
    AsyncStorage.setItem(BIOMETRIC_KEY, String(biometricEnabled)).catch(() => {});
  }, [biometricEnabled]);

  const setNotificationPrefs = useCallback((prefs: NotificationPrefs) => {
    setNotificationPrefsState(prefs);
  }, []);

  const setHapticsEnabled = useCallback((enabled: boolean) => {
    setHapticsEnabledState(enabled);
  }, []);

  const setBiometricEnabled = useCallback((enabled: boolean) => {
    setBiometricEnabledState(enabled);
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

  // Load the pending-write outbox for this user from disk.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(outboxKeyFor(userId));
      if (raw && !cancelled) {
        try {
          const ops = JSON.parse(raw) as OutboxOp[];
          if (Array.isArray(ops)) {
            outboxRef.current = ops;
            setOutboxTick((t) => t + 1);
          }
        } catch {
          // ignore corrupt outbox payload
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const enqueueOps = useCallback((ops: OutboxOp[]) => {
    outboxRef.current = [...outboxRef.current, ...ops];
    setOutboxTick((t) => t + 1);
  }, []);

  // Persist the outbox whenever it changes.
  useEffect(() => {
    if (!user) return;
    AsyncStorage.setItem(
      outboxKeyFor(user.id),
      JSON.stringify(outboxRef.current),
    ).catch(() => {});
  }, [outboxTick, user]);

  // Retry pending writes once we have a connection. Runs on app start,
  // when the app returns to the foreground, and on a slow heartbeat.
  const flushOutbox = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    const pending = outboxRef.current;
    if (pending.length === 0) return;

    const remaining: OutboxOp[] = [];
    for (const op of pending) {
      try {
        if (op.kind === 'insert-tx') {
          const { error } = await supabase
            .from('transactions')
            .upsert(op.rows, { onConflict: 'id' });
          if (error) remaining.push(op);
        } else if (op.kind === 'delete-tx') {
          const { error } = await supabase.from('transactions').delete().in('id', op.ids);
          if (error) remaining.push(op);
        } else if (op.kind === 'insert-rec') {
          const { error } = await supabase
            .from('recurring')
            .upsert(op.rows, { onConflict: 'id' });
          if (error) remaining.push(op);
        } else if (op.kind === 'delete-rec') {
          const { error } = await supabase.from('recurring').delete().in('id', op.ids);
          if (error) remaining.push(op);
        }
      } catch {
        remaining.push(op);
      }
    }
    outboxRef.current = remaining;
    setOutboxTick((t) => t + 1);
  }, [user]);

  useEffect(() => {
    void flushOutbox();
  }, [loaded, user?.id, flushOutbox]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushOutbox();
    });
    const timer = setInterval(() => void flushOutbox(), 20_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [flushOutbox]);

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
      trackNoteParsed(result.ok, result.ok ? { count: result.parsed.length } : { error: result.error });
      if (!result.ok || !user) return result;

      const rows = result.parsed.map((p) => ({ id: createUuid(), ...toRow(user.id, p) }));
      const locals = rows.map((r) => toTransaction(r));
      for (const p of result.parsed) {
        trackTransactionAdded(p.type === 'income' ? 'income' : 'expense', {
          amount: p.amount,
          method: 'note',
        });
      }
      // Optimistic: show the transactions immediately, even offline.
      setTransactions((prev) => [...locals, ...prev]);

      if (!isSupabaseConfigured) return result;

      supabase
        .from('transactions')
        .upsert(rows, { onConflict: 'id' })
        .select()
        .then(({ data, error }) => {
          if (error) {
            enqueueOps([{ kind: 'insert-tx', rows }]);
            return;
          }
          const txs = (data as TxRow[]).map(toTransaction);
          setTransactions((prev) =>
            prev.map((t) => txs.find((s) => s.id === t.id) ?? t),
          );
        });
      return result;
    },
    [user, enqueueOps],
  );

  const addTransaction = useCallback(
    (parsed: ParsedTransaction, method: 'note' | 'voice' | 'recurring' | 'ask' = 'note'): string => {
      if (!user) return '';
      const id = createUuid();
      const row: TxRow = { id, ...toRow(user.id, parsed) };
      const local: Transaction = { id, ...parsed };
      trackTransactionAdded(parsed.type === 'income' ? 'income' : 'expense', {
        amount: parsed.amount,
        method,
      });
      // Optimistic: show the transaction immediately, even offline.
      setTransactions((prev) => [local, ...prev]);

      if (!isSupabaseConfigured) return id;

      supabase
        .from('transactions')
        .upsert(row, { onConflict: 'id' })
        .select()
        .then(({ data, error }) => {
          if (error) {
            enqueueOps([{ kind: 'insert-tx', rows: [row] }]);
            return;
          }
          const txs = (data as TxRow[]).map(toTransaction);
          if (txs[0]) {
            setTransactions((prev) => prev.map((t) => (t.id === id ? txs[0] : t)));
          }
        });
      return id;
    },
    [user, enqueueOps],
  );

  const deleteTransaction = useCallback((id: string) => {
    trackTransactionDeleted();
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (isSupabaseConfigured) {
      supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) enqueueOps([{ kind: 'delete-tx', ids: [id] }]);
        });
    }
  }, [enqueueOps]);

  const addRecurring = useCallback(
    (item: Omit<RecurringItem, 'id'>) => {
      const id = createUuid();
      const full: RecurringItem = { ...item, id };
      trackRecurringAdded(item.type);
      setRecurring((prev) => [...prev, full]);
      addTransaction(transactionFromRecurring(full, currentMonthKey()), 'recurring');
      if (user) {
        AsyncStorage.setItem(lastGenKeyFor(user.id), currentMonthKey()).catch(() => {});
        if (isSupabaseConfigured) {
          const row: RecurringRow = { id, ...toRecurringRow(user.id, item) };
          supabase
            .from('recurring')
            .upsert(row, { onConflict: 'id' })
            .select()
            .then(({ data, error }) => {
              if (error) {
                enqueueOps([{ kind: 'insert-rec', rows: [row] }]);
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
    [addTransaction, user, enqueueOps],
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
      trackRecurringDeleted(item?.type ?? 'unknown');
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
            if (error) enqueueOps([{ kind: 'delete-rec', ids: [id] }]);
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
    [recurring, user, enqueueOps],
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
        addTransaction(transactionFromRecurring(item, month), 'recurring');
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
      hapticsEnabled,
      setHapticsEnabled,
      biometricEnabled,
      setBiometricEnabled,
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
      hapticsEnabled,
      setHapticsEnabled,
      biometricEnabled,
      setBiometricEnabled,
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
