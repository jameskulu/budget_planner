export type CategoryKind = 'income' | 'expense';

export type Category = {
  id: string;
  label: string;
  kind: CategoryKind;
  /** Lowercased keywords used by the natural-language parser. */
  keywords: string[];
  color: string;
};

export const CATEGORIES: Category[] = [
  {
    id: 'groceries',
    label: 'Groceries',
    kind: 'expense',
    keywords: ['grocer', 'supermarket', 'super market', 'market', 'walmart', 'costco', 'tesco', 'whole foods', 'vegetable', 'produce'],
    color: '#2E7D32',
  },
  {
    id: 'dining',
    label: 'Food & Dining',
    kind: 'expense',
    keywords: ['coffee', 'lunch', 'dinner', 'breakfast', 'restaurant', 'cafe', 'pizza', 'burger', 'takeout', 'food', 'bar', 'drink', 'eat', 'sushi', 'sandwich'],
    color: '#EF6C00',
  },
  {
    id: 'transport',
    label: 'Transport',
    kind: 'expense',
    keywords: ['uber', 'lyft', 'taxi', 'bus', 'train', 'subway', 'metro', 'fuel', 'gas', 'petrol', 'parking', 'commute', 'ride', 'fare'],
    color: '#1976D2',
  },
  {
    id: 'housing',
    label: 'Housing & Bills',
    kind: 'expense',
    keywords: ['rent', 'mortgage', 'apartment', 'electric', 'water', 'internet', 'wifi', 'phone bill', 'utilities', 'utilit'],
    color: '#6A1B9A',
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    kind: 'expense',
    keywords: ['movie', 'netflix', 'spotify', 'concert', 'game', 'subscription', 'streaming', 'music', 'ticket', 'cinema', 'festival'],
    color: '#C2185B',
  },
  {
    id: 'shopping',
    label: 'Shopping',
    kind: 'expense',
    keywords: ['shirt', 'shoes', 'jacket', 'clothes', 'amazon', 'store', 'bought', 'buy', 'purchase', 'headphones', 'phone', 'laptop', 'tv', 'hoodie', 'sneaker'],
    color: '#00838F',
  },
  {
    id: 'health',
    label: 'Health',
    kind: 'expense',
    keywords: ['pharmacy', 'medicine', 'doctor', 'dentist', 'gym', 'hospital', 'health', 'vitamin', 'checkup'],
    color: '#D81B60',
  },
  {
    id: 'other',
    label: 'Other',
    kind: 'expense',
    keywords: [],
    color: '#546E7A',
  },
  {
    id: 'salary',
    label: 'Salary',
    kind: 'income',
    keywords: ['salary', 'paycheck', 'pay day', 'payday', 'wage', 'income', 'payroll', 'monthly pay', 'paid me'],
    color: '#2E7D32',
  },
  {
    id: 'side-income',
    label: 'Side Income',
    kind: 'income',
    keywords: ['freelance', 'gig', 'deposit', 'bonus', 'refund', 'gift', 'dividend', 'interest', 'sold', 'earned', 'cash', 'commission', 'reimburse'],
    color: '#558B2F',
  },
  {
    id: 'other-income',
    label: 'Other Income',
    kind: 'income',
    keywords: [],
    color: '#33691E',
  },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

export const DEFAULT_EXPENSE_CATEGORY = 'other';
export const DEFAULT_INCOME_CATEGORY = 'other-income';

export function categorize(text: string, kind: CategoryKind): string {
  const lower = text.toLowerCase();
  const pool = CATEGORIES.filter((c) => c.kind === kind);
  for (const category of pool) {
    if (category.keywords.some((kw) => lower.includes(kw))) {
      return category.id;
    }
  }
  return kind === 'income' ? DEFAULT_INCOME_CATEGORY : DEFAULT_EXPENSE_CATEGORY;
}