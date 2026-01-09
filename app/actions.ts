"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

// Type definitions matching our schema
type DashboardData = {
    safeToSpend: number;
    spent: number;
    debts: { id: string, name: string, total_balance: number, interest_rate: number }[];
    recentTransactions: { id: string, description: string, amount: number, type: 'income' | 'expense' | 'debt_payment', date: string, category_name?: string }[];
    categories: { id: string, name: string }[];
    breakdown?: { income: number, rollover: number, commitments: number, spent: number };
    userId?: string;
    email?: string;
};

// Fallback for initial state or error
const DEFAULT_DASHBOARD: DashboardData = {
    safeToSpend: 0,
    spent: 0,
    debts: [],
    recentTransactions: [],
    categories: []
};

export async function getDashboardData(targetDate?: string): Promise<DashboardData> {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return DEFAULT_DASHBOARD;

        // 1. Get Current Month (or Target)
        const now = targetDate ? new Date(targetDate) : new Date();
        // Ensure valid date
        if (isNaN(now.getTime())) throw new Error("Invalid Date");

        const isoMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        // Fetch or Create Month
        let { data: month } = await supabase
            .from('months')
            .select('*')
            .eq('user_id', user.id)
            .eq('iso_month', isoMonth)
            .single();

        // Safety Helper
        const safeNum = (val: any) => {
            const n = Number(val);
            return isNaN(n) ? 0 : n;
        };

        // 2. Data Aggregation
        let income = safeNum(month?.income);
        const rollover = safeNum(month?.rollover);

        // Get recent transactions for the list
        const { data: allTransactions } = await supabase
            .from('transactions')
            .select(`
                *,
                categories ( name, is_commitment, commitment_type ),
                debts ( name )
            `)
            .eq('user_id', user.id)
            .gte('date', isoMonth) // Only current month transactions for calculations
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        const transactions = allTransactions || [];

        let spentVariable = 0;
        let overspend = 0;
        const commitmentSpending: Record<string, number> = {};

        transactions.forEach((tx: any) => {
            const amount = safeNum(tx.amount);
            if (tx.type === 'income') {
                income += amount;
            } else if (tx.type === 'expense') {
                // Check if it's a commitment
                const cat = tx.categories;
                const isCommitment = cat?.commitment_type || cat?.is_commitment;

                if (isCommitment) {
                    // Track spending for commitments to check overspend
                    if (cat?.name) { // relying on name/id, ideally ID but name is consistent in this scope
                        // We need the category ID to track accurately. 
                        // The transaction query returns category_id.
                        const catId = tx.category_id || 'unknown';
                        commitmentSpending[catId] = (commitmentSpending[catId] || 0) + amount;
                    }
                } else {
                    spentVariable += amount;
                }
            }
            else if (tx.type === 'debt_payment') {
                spentVariable += amount;
            }
        });

        // 3. Get Commitments & Calculate Overspend
        const { data: committedCategories } = await supabase
            .from('categories')
            .select('id, budget_limit, is_pinned') // Fetch ID for matching
            .eq('user_id', user.id)
            .or('commitment_type.eq.fixed,commitment_type.eq.variable_fixed,is_commitment.eq.true');

        let totalCommitments = 0;

        committedCategories?.forEach(cat => {
            const limit = safeNum(cat.budget_limit);
            totalCommitments += limit;

            // Calculate Overspend: Max(0, Actual - Limit)
            const actual = commitmentSpending[cat.id] || 0;
            const excess = Math.max(0, actual - limit);
            overspend += excess;
        });

        // Safe To Spend = (Income + Rollover) - Total Commitments (Envelopes) - Variable Spent - Overspend Penalty
        // Notice: 'Overspend' is the amount EXCEEDING the envelope. 
        // The first 'limit' amount was already deducted via 'totalCommitments'.
        const safeToSpend = (income + rollover) - totalCommitments - spentVariable - overspend;

        // 4. Get Debts
        const { data: debts } = await supabase
            .from('debts')
            .select('*')
            .eq('user_id', user.id)
            .order('total_balance', { ascending: false });

        // 5. Get Categories for Dropdown (non-commitment)
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name')
            .eq('user_id', user.id)
            .order('name');

        // Map transactions for UI
        const recentTransactions = transactions.map((tx: any) => {
            let cleanDescription = tx.description;
            if (tx.type === 'debt_payment' && tx.debts?.name) {
                if (!cleanDescription || cleanDescription === 'Debt Payment') {
                    cleanDescription = tx.debts.name;
                }
            }
            if (!cleanDescription && tx.categories?.name) cleanDescription = tx.categories.name;
            if (!cleanDescription) cleanDescription = "Untitled";

            return {
                id: tx.id,
                description: cleanDescription,
                amount: tx.amount,
                type: tx.type,
                date: tx.date || new Date().toISOString(),
                category_name: tx.categories?.name,
                category_id: tx.category_id,
                debt_id: tx.debt_id
            };
        });

        return {
            safeToSpend,
            spent: spentVariable + overspend,
            debts: debts || [],
            recentTransactions: recentTransactions.slice(0, 10), // Limit initial load
            categories: categories || [],
            breakdown: {
                income,
                rollover,
                commitments: totalCommitments,
                spent: spentVariable + overspend
            },
            userId: user.id,
            email: user.email
        };


    } catch (error) {
        console.error("Supabase Error:", error);
        return DEFAULT_DASHBOARD;
    }
}

export async function getTransactions(offset: number = 0, limit: number = 10, monthIso?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
        .from('transactions')
        .select(`
            *,
            categories ( id, name ),
            debts ( name )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (monthIso) {
        // Stick to "Current Month" consistency if param provided
        query = query.gte('date', monthIso);
    }

    const { data } = await query;
    if (!data) return [];

    return data.map((tx: any) => {
        let cleanDescription = tx.description;
        if (tx.type === 'debt_payment' && tx.debts?.name) {
            if (!cleanDescription || cleanDescription === 'Debt Payment') {
                cleanDescription = tx.debts.name;
            }
        }
        if (!cleanDescription && tx.categories?.name) cleanDescription = tx.categories.name;

        return {
            id: tx.id,
            description: cleanDescription || 'Untitled',
            amount: Number(tx.amount),
            type: tx.type,
            date: tx.date,
            category_name: cleanDescription,
            category_id: tx.categories?.id,
            debt_id: tx.debt_id
        };
    });
}



export type TrackedBudget = {
    id: string;
    name: string;
    limit: number;
    spent: number;
    remaining: number;
    status: 'ok' | 'warning' | 'over';
    percent: number;
};

export async function getTrackedBudgets(): Promise<TrackedBudget[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const now = new Date();
    const isoMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // 1. Get Pinned Categories
    const { data: categories } = await supabase
        .from('categories')
        .select('id, name, budget_limit')
        .eq('user_id', user.id)
        .eq('is_pinned', true);

    if (!categories || categories.length === 0) return [];

    // 2. Get Spending for these categories in current month
    // We need the month ID first
    const { data: month } = await supabase
        .from('months')
        .select('id')
        .eq('user_id', user.id)
        .eq('iso_month', isoMonth)
        .single();

    if (!month) return categories.map(c => ({
        id: c.id, name: c.name, limit: Number(c.budget_limit), spent: 0, remaining: Number(c.budget_limit), status: 'ok', percent: 0
    }));

    const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .eq('month_id', month.id)
        .in('category_id', categories.map(c => c.id));

    // 3. Calculate
    const spendingMap: Record<string, number> = {};
    transactions?.forEach((tx: any) => {
        spendingMap[tx.category_id] = (spendingMap[tx.category_id] || 0) + Number(tx.amount);
    });

    return categories.map(c => {
        const limit = Number(c.budget_limit);
        const spent = spendingMap[c.id] || 0;
        const remaining = limit - spent;
        const percent = Math.min(100, (spent / limit) * 100);

        let status: 'ok' | 'warning' | 'over' = 'ok';
        if (remaining < 0) status = 'over';
        else if (percent > 85) status = 'warning';

        return {
            id: c.id,
            name: c.name,
            limit,
            spent,
            remaining, // Can be negative
            status,
            percent
        };
    });
}

export async function addTransaction(
    amount: number,
    description: string,
    type: 'expense' | 'income' | 'debt_payment',
    categoryId?: string,
    debtId?: string
) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Get current month ID
    const now = new Date();
    const isoMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // We need a month record.
    let { data: month } = await supabase.from('months').select('id').eq('user_id', user.id).eq('iso_month', isoMonth).single();

    if (!month) {
        const { data: newMonth } = await supabase
            .from('months')
            .insert({ user_id: user.id, iso_month: isoMonth })
            .select()
            .single();
        month = newMonth;
    }

    // Validation
    if (!amount || amount <= 0 || !isFinite(amount)) return { success: false, error: "Invalid amount" };
    if (description.length > 100) return { success: false, error: "Description too long (max 100 chars)" };

    // 1. Insert Transaction
    const { error } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            month_id: month!.id,
            amount: Number(amount),
            description: description.trim(),
            type,
            category_id: categoryId || null,
            debt_id: type === 'debt_payment' ? debtId : null
        });

    if (error) {
        console.error("Insert Error:", error);
        return { success: false, error: error.message };
    }

    // 2. If Debt Payment, Decrement Debt Balance
    if (type === 'debt_payment' && debtId) {
        const { data: debt } = await supabase.from('debts').select('total_balance').eq('id', debtId).single();
        if (debt) {
            const newBalance = Number(debt.total_balance) - amount;
            await supabase.from('debts').update({ total_balance: newBalance }).eq('id', debtId);
        }
    }

    revalidatePath('/', 'layout'); // Global refresh
    return { success: true };
}

export async function closeMonth() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    try {
        const now = new Date();
        const isoMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        const { data: month } = await supabase
            .from('months')
            .select('*')
            .eq('user_id', user.id)
            .eq('iso_month', isoMonth)
            .single();

        if (!month) return { success: false, error: "Current month not found" };

        // Strict Check: Cannot close current month until next month starts
        const [y, m] = isoMonth.split('-');
        if (now.getMonth() + 1 === parseInt(m) && now.getFullYear() === parseInt(y)) {
            return { success: false, error: "Cannot close month until it has ended." };
        }

        // Calculate Rollover: Income - Total Actual Spending
        // We do NOT deduct limits. We use strict cash flow.

        let income = month.income || 0;
        const rollover = month.rollover || 0;
        let totalSpent = 0;

        const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('month_id', month.id);

        transactions?.forEach((tx: any) => {
            if (tx.type === 'income') income += Number(tx.amount);
            else if (tx.type === 'expense' || tx.type === 'debt_payment') totalSpent += Number(tx.amount);
        });

        // Remaining = (Previous Rollover + Income) - ALL Outflows
        const remaining = (income + rollover) - totalSpent;

        await supabase.from('months').update({ status: 'closed' }).eq('id', month.id);

        let nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextIsoMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

        const { error } = await supabase
            .from('months')
            .insert({
                user_id: user.id,
                iso_month: nextIsoMonth,
                rollover: remaining,
                status: 'active'
            });

        if (error) throw error;

        revalidatePath('/', 'layout');
        return { success: true };

    } catch (e: any) {
        console.error("Close Month Error", e);
        return { success: false, error: e.message };
    }
}

export async function addDebt(name: string, balance: number, rate: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const { error } = await supabase
        .from('debts')
        .insert({
            user_id: user.id,
            name,
            total_balance: balance,
            interest_rate: rate
        });

    if (error) console.error("Add Debt Error:", error);
    revalidatePath('/', 'layout');
    return { success: !error };
}

export async function addCategory(
    name: string,
    commitment_type: 'fixed' | 'variable_fixed' | null,
    budget_limit: number,
    is_pinned: boolean = false
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
        .from('categories')
        .insert({
            user_id: user.id,
            name,
            commitment_type,
            is_commitment: !!commitment_type, // Maintain legacy compat
            budget_limit,
            is_pinned
        });

    if (error) {
        console.error("Add Category Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}

export async function updateTransaction(
    id: string,
    amount: number,
    description: string,
    type: 'expense' | 'income' | 'debt_payment',
    categoryId?: string,
    debtId?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
        .from('transactions')
        .update({
            amount,
            description,
            type,
            category_id: categoryId || null,
            debt_id: type === 'debt_payment' ? debtId : null
        })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error("Update Transaction Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}

// ... existing code ...

export async function deleteTransaction(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error("Delete Transaction Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}

// --- Savings Goals Actions ---

export type SavingsGoal = {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    target_date: string;
};

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('target_date', { ascending: true });

    return data || [];
}

export async function addSavingsGoal(name: string, targetAmount: number, targetDate: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
        .from('savings_goals')
        .insert({
            user_id: user.id,
            name,
            target_amount: targetAmount,
            target_date: targetDate,
            current_amount: 0
        });

    if (error) {
        console.error("Add Savings Goal Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/savings');
    return { success: true };
}

export async function contributeToSavings(goalId: string, amount: number, goalName: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // 1. Log as Expense (reduces Safe to Spend)
    // We will treat this as a "Savings Contribution" expense.
    // Ideally we might want a 'savings' category or type, but 'expense' works for now to reduce safe-to-spend.
    const description = `Saved for ${goalName}`;
    const txRes = await addTransaction(amount, description, 'expense', undefined, undefined);

    if (!txRes.success) return txRes;

    // 2. Update Goal Current Amount
    // We need to fetch current first to be safe or use increment if supabase supported it easily in js client (rpc)
    // Simple fetch and update for now.
    const { data: goal } = await supabase.from('savings_goals').select('current_amount').eq('id', goalId).single();
    if (!goal) return { success: false, error: "Goal not found" };

    const newAmount = Number(goal.current_amount) + amount;

    const { error } = await supabase
        .from('savings_goals')
        .update({ current_amount: newAmount })
        .eq('id', goalId);

    if (error) {
        console.error("Update Goal Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/savings');
    revalidatePath('/', 'layout'); // Update dashboard safe-to-spend
    return { success: true };
}

export async function updateSavingsGoal(id: string, name: string, targetAmount: number, targetDate: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
        .from('savings_goals')
        .update({
            name,
            target_amount: targetAmount,
            target_date: targetDate
        })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/savings');
    return { success: true };
}

export async function deleteSavingsGoal(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/savings');
    return { success: true };
}

// --- Category Management ---

export async function updateCategory(
    id: string,
    name: string,
    commitment_type: 'fixed' | 'variable_fixed' | null,
    budget_limit: number,
    is_pinned: boolean = false
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
        .from('categories')
        .update({
            name,
            commitment_type,
            is_commitment: !!commitment_type,
            budget_limit,
            is_pinned
        })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/', 'layout');
    revalidatePath('/categories');
    return { success: true };
}

export async function deleteCategory(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Check usage? Ideally yes, but for MVP we might just let foreign keys handle it (set null or cascade)
    // Our schema: category_id references categories(id) on delete set null. So transactions become "uncategorized".
    // Safe to delete.

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/', 'layout');
    revalidatePath('/categories');
    return { success: true };
}

// --- Debt Management ---

export async function updateDebt(id: string, name: string, balance: number, rate: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
        .from('debts')
        .update({ name, total_balance: balance, interest_rate: rate })
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/', 'layout');
    revalidatePath('/debts');
    return { success: true };
}

export async function deleteDebt(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/', 'layout');
    revalidatePath('/debts');
    return { success: true };
}
