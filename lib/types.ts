export interface Month {
  id: string;
  user_id: string;
  iso_month: string;
  status: 'active' | 'closed';
  income: number;
  rollover: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  is_commitment: boolean;
  commitment_type?: 'fixed' | 'variable_fixed' | null;
  budget_limit: number;
  is_pinned?: boolean;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  total_balance: number;
  interest_rate: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  month_id: string;
  category_id?: string | null;
  debt_id?: string | null;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'debt_payment';
  date: string;
  created_at: string;
  categories?: {
    name: string;
    is_commitment?: boolean;
    commitment_type?: 'fixed' | 'variable_fixed' | null;
    id?: string;
  } | null;
  debts?: {
    name: string;
  } | null;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  created_at?: string;
}

export interface DashboardData {
  safeToSpend: number;
  spent: number;
  debts: Debt[];
  recentTransactions: DashboardTransaction[];
  categories: { id: string; name: string }[];
  breakdown?: {
    income: number;
    rollover: number;
    commitments: number;
    spent: number;
  };
  userId?: string;
  email?: string;
}

export interface DashboardTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'debt_payment';
  date: string;
  category_name?: string;
  category_id?: string | null;
  debt_id?: string | null;
}
