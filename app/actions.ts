"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from "next/cache";

// Helper: Determine if the current month is a payment month for a frequency category
function isPaymentMonth(frequencyStart: string | null | undefined, frequencyMonths: number, currentIsoMonth: string): boolean {
    if (!frequencyStart || frequencyMonths <= 1) return true; // Monthly = always a payment month
    const startDate = new Date(frequencyStart);
    const currentDate = new Date(currentIsoMonth);
    const monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + (currentDate.getMonth() - startDate.getMonth());
    return monthsDiff >= 0 && monthsDiff % frequencyMonths === 0;
}

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
    noStore(); // Disable all caching for this data
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
                    // Start with variable spending
                    // CRITICAL: If paid via Debt (Credit Card), it does NOT reduce Safe-to-Spend (Cash).
                    // Only count if debt_id is NULL.
                    if (!tx.debt_id) {
                        spentVariable += amount;
                    }
                }
            }
            else if (tx.type === 'debt_payment') {
                spentVariable += amount;
            }
        });

        // 3. Get Commitments & Calculate Overspend
        const { data: committedCategories } = await supabase
            .from('categories')
            .select('id, budget_limit, is_pinned, balance, frequency_months, frequency_start')
            .eq('user_id', user.id)
            .or('commitment_type.eq.fixed,commitment_type.eq.variable_fixed,is_commitment.eq.true,budget_limit.gt.0');

        let totalCommitments = 0;
        let reservedBalance = 0;

        committedCategories?.forEach(cat => {
            const limit = safeNum(cat.budget_limit);
            const balance = safeNum(cat.balance);
            const freq = safeNum(cat.frequency_months) || 1;
            const paymentMonth = isPaymentMonth(cat.frequency_start, freq, isoMonth);

            if (freq > 1) {
                if (paymentMonth) {
                    // Payment month: full bill is due. Commitment = limit * freq.
                    // Balance is being used to pay, not reserved.
                    totalCommitments += limit * freq;
                } else {
                    // Accumulation month: set aside per-month allocation.
                    totalCommitments += limit;
                    // Balance is reserved (being saved for payment month).
                    reservedBalance += balance;
                }
            } else {
                totalCommitments += limit;
            }

            // Calculate Overspend
            const available = freq > 1
                ? (paymentMonth ? (limit * freq + balance) : limit)
                : limit;

            const actual = commitmentSpending[cat.id] || 0;
            const excess = Math.max(0, actual - available);
            overspend += excess;
        });

        // Safe To Spend = (Income + Rollover) - Total Commitments (Envelopes) - Variable Spent - Overspend Penalty - Reserved Balances
        // Notice: 'Overspend' is the amount EXCEEDING the (limit + balance).
        const safeToSpend = (income + rollover) - totalCommitments - spentVariable - overspend - reservedBalance;

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
    frequency_months?: number;
    frequency_start?: string;
    balance?: number;
    target_total?: number;
    is_payment_month?: boolean;
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
        .select('id, name, budget_limit, frequency_months, frequency_start, balance')
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
        const balance = Number(c.balance || 0);
        const freq = Number(c.frequency_months || 1);
        const paymentMonth = isPaymentMonth(c.frequency_start, freq, isoMonth);

        // Payment month logic for frequency categories
        let effectiveLimit = limit;
        if (freq > 1) {
            effectiveLimit = paymentMonth ? limit * freq : limit;
        }

        // Fix: Always include balance (carryover + transfers) in available funds
        const totalAvailable = effectiveLimit + balance;
        const remaining = totalAvailable - spent;
        const percent = totalAvailable > 0 ? Math.min(100, (spent / totalAvailable) * 100) : 0;

        let status: 'ok' | 'warning' | 'over' = 'ok';
        if (remaining < 0) status = 'over';
        else if (percent > 85) status = 'warning';

        return {
            id: c.id,
            name: c.name,
            limit: effectiveLimit,
            spent,
            remaining,
            status,
            percent,
            frequency_months: freq,
            frequency_start: c.frequency_start,
            balance,
            target_total: limit * freq,
            is_payment_month: paymentMonth
        };
    });
}

export async function addTransaction(
    amount: number,
    description: string,
    type: 'expense' | 'income' | 'debt_payment',
    categoryId?: string,
    debtId?: string,
    customDate?: string // Optional: ISO date string from offline sync
) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Determine which month this transaction belongs to
    const txDate = customDate ? new Date(customDate) : new Date();
    const isoMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-01`;

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
    if (description.length > 255) return { success: false, error: "Description too long (max 255 chars)" };

    // 1. Insert Transaction and return the new ID
    const { data: newTx, error } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            month_id: month!.id,
            amount: Number(amount),
            description: description.trim(),
            type,
            category_id: categoryId || null,
            debt_id: debtId || null, // Handles both payments and credit card expenses
            date: customDate || new Date().toISOString() // Use custom date if provided
        })
        .select('id')
        .single();

    if (error) {
        console.error("Insert Error:", error);
        return { success: false, error: error.message };
    }

    // 2. Handle Debt Balances
    if (debtId) {
        const { data: debt } = await supabase.from('debts').select('total_balance').eq('id', debtId).single();
        if (debt) {
            let newBalance = Number(debt.total_balance);

            if (type === 'debt_payment') {
                // Payment REDUCES debt
                newBalance -= amount;
            } else if (type === 'expense') {
                // Spending INCREASES debt
                newBalance += amount;
            }

            await supabase.from('debts').update({ total_balance: newBalance }).eq('id', debtId);
        }
    }

    revalidatePath('/', 'layout'); // Global refresh
    return { success: true, transactionId: newTx?.id };
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

        // NOTE: Removed strict date check to allow early rollover
        // Users can now close a month early if they receive salary before month end

        // Calculate Rollover: Income - Total Actual Spending
        // We do NOT deduct limits. We use strict cash flow.

        let income = month.income || 0;
        const rollover = month.rollover || 0;
        let totalSpent = 0;
        const spendingMap: Record<string, number> = {};

        const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, type, category_id')
            .eq('month_id', month.id);

        transactions?.forEach((tx: any) => {
            const amt = Number(tx.amount);
            if (tx.type === 'income') income += amt;
            else if (tx.type === 'expense' || tx.type === 'debt_payment') {
                totalSpent += amt;
                if (tx.category_id) {
                    spendingMap[tx.category_id] = (spendingMap[tx.category_id] || 0) + amt;
                }
            }
        });

        // --- Update Frequency Category Balances ---
        const { data: categories } = await supabase
            .from('categories')
            .select('id, budget_limit, frequency_months, frequency_start, balance')
            .eq('user_id', user.id)
            .gt('frequency_months', 1); // Only those with frequency

        if (categories && categories.length > 0) {
            const updates = categories.map(async (cat: any) => {
                const limit = Number(cat.budget_limit);
                const currentBalance = Number(cat.balance || 0);
                const freq = Number(cat.frequency_months);
                const spent = spendingMap[cat.id] || 0;
                const paymentMonth = isPaymentMonth(cat.frequency_start, freq, isoMonth);

                let newBalance: number;
                if (paymentMonth) {
                    // Payment month: the full bill was due.
                    // Available was (limit * freq) + balance.
                    // After spending, remaining balance = max(0, (limit*freq + balance) - spent)
                    // But we reset the fund since the cycle is complete.
                    // Any overspend is already handled via dashboard overspend penalty.
                    // Start fresh accumulation from 0.
                    newBalance = 0;
                } else {
                    // Accumulation month: Surplus = per-month limit - spent.
                    const surplus = limit - spent;
                    newBalance = Math.max(0, currentBalance + surplus);
                }

                if (newBalance !== currentBalance) {
                    return supabase.from('categories').update({ balance: newBalance }).eq('id', cat.id);
                }
            });
            await Promise.all(updates);
        }

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

    const { data, error } = await supabase
        .from('debts')
        .insert({
            user_id: user.id,
            name,
            total_balance: balance,
            interest_rate: rate
        })
        .select()
        .single();

    if (error) console.error("Add Debt Error:", error);
    revalidatePath('/', 'layout');
    revalidatePath('/debts');
    return { success: !error, id: data?.id };
}

export async function addCategory(
    name: string,
    commitment_type: 'fixed' | 'variable_fixed' | null,
    budget_limit: number,
    is_pinned: boolean = false,
    frequency_months: number = 1,
    frequency_start?: string
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
            is_pinned,
            frequency_months,
            frequency_start: frequency_months > 1 ? (frequency_start || null) : null,
            balance: 0 // Initialize balance
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

    const { data: newGoal, error } = await supabase
        .from('savings_goals')
        .insert({
            user_id: user.id,
            name,
            target_amount: targetAmount,
            target_date: targetDate,
            current_amount: 0
        })
        .select()
        .single();

    if (error) {
        console.error("Add Savings Goal Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/savings');
    return { success: true, goalId: newGoal.id };
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
    is_pinned: boolean = false,
    frequency_months: number = 1,
    frequency_start?: string
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
            is_pinned,
            frequency_months,
            frequency_start: frequency_months > 1 ? (frequency_start || null) : null
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

    // Check usage before deletion
    const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id)
        .eq('user_id', user.id);

    if (countError) {
        console.error("Check Usage Error:", countError);
        return { success: false, error: "Failed to check usage" };
    }

    if (count && count > 0) {
        return { success: false, error: `Cannot delete: Category used in ${count} transactions` };
    }

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

export async function transferCategoryBalance(sourceId: string, targetId: string, amount: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    if (amount <= 0) return { success: false, error: "Invalid amount" };

    // 1. Get current balances (and verify ownership)
    const { data: categories, error: fetchError } = await supabase
        .from('categories')
        .select('id, balance, name')
        .in('id', [sourceId, targetId])
        .eq('user_id', user.id);

    if (fetchError || !categories || categories.length !== 2) {
        return { success: false, error: "Invalid categories or permission denied" };
    }

    const source = categories.find(c => c.id === sourceId);
    const target = categories.find(c => c.id === targetId);

    if (!source || !target) return { success: false, error: "Categories not found" };

    // 2. Perform Transfer (Sequential updates)

    // Update Source
    const { error: sourceError } = await supabase
        .from('categories')
        .update({ balance: Number(source.balance || 0) - amount })
        .eq('id', sourceId);

    if (sourceError) return { success: false, error: "Failed to deduct from source" };

    // Update Target
    const { error: targetError } = await supabase
        .from('categories')
        .update({ balance: Number(target.balance || 0) + amount })
        .eq('id', targetId);

    if (targetError) {
        // Attempt rollback
        await supabase.from('categories').update({ balance: source.balance }).eq('id', sourceId);
        return { success: false, error: "Failed to add to target (rolled back)" };
    }

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
// --- Sync / Seeding Actions ---

export async function getAllUserData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Get Months (for context)
    const { data: months } = await supabase.from('months').select('*').eq('user_id', user.id);

    // Get Components
    const { data: transactions } = await supabase.from('transactions').select('*').eq('user_id', user.id);
    const { data: categories } = await supabase.from('categories').select('*').eq('user_id', user.id);
    const { data: debts } = await supabase.from('debts').select('*').eq('user_id', user.id);
    const { data: savings_goals } = await supabase.from('savings_goals').select('*').eq('user_id', user.id);

    return {
        success: true,
        data: {
            user_id: user.id,
            transactions: transactions || [],
            categories: categories || [],
            debts: debts || [],
            savings_goals: savings_goals || [],
            months: months || []
        }
    };
}

export async function resetUserData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    try {
        // Delete all data for this user
        // Note: constraint cascades might handle some, but explicit is safer for logic
        await supabase.from('transactions').delete().eq('user_id', user.id);
        await supabase.from('categories').delete().eq('user_id', user.id);
        await supabase.from('debts').delete().eq('user_id', user.id);
        await supabase.from('savings_goals').delete().eq('user_id', user.id);
        await supabase.from('months').delete().eq('user_id', user.id);

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (e: any) {
        console.error("Reset Data Error:", e);
        return { success: false, error: e.message };
    }
}
