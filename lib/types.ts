export type TransactionType = 'income' | 'expense';

export type Transaction = {
  id: string;
  type: TransactionType;
  /** Always a positive number; the sign is carried by `type`. */
  amount: number;
  /** ISO date string yyyy-mm-dd */
  date: string;
  /** Category id from `lib/categories.ts` */
  category: string;
  /** The original natural-language note. */
  note: string;
  /** True for transfers into an investment — reduces balance but is not spending. */
  isInvestment?: boolean;
};

export type ParsedTransaction = {
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  note: string;
  isInvestment?: boolean;
};
