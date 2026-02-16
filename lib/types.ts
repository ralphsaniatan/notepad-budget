
export type TrackedBudget = {
    id: string;
    name: string;
    limit: number;
    spent: number;
    remaining: number;
    status: 'ok' | 'warning' | 'over';
    percent: number;
    frequency_months?: number;
    frequency_start?: string;
    balance?: number;
    target_total?: number;
    is_payment_month?: boolean;
};

export type SavingsGoal = {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    target_date: string;
};

export type DashboardData = {
    safeToSpend: number;
    spent: number;
    debts: { id: string, name: string, total_balance: number, interest_rate: number }[];
    recentTransactions: { id: string, description: string, amount: number, type: 'income' | 'expense' | 'debt_payment', date: string, category_name?: string }[];
    categories: { id: string, name: string }[];
    breakdown?: { income: number, rollover: number, commitments: number, spent: number };
    userId?: string;
    email?: string;
};
