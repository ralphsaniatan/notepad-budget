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
};

// Fallback for initial state or error
const DEFAULT_DASHBOARD: DashboardData = {
    safeToSpend: 0,
    spent: 0,
    debts: [],
    recentTransactions: [],
    categories: []
};

export async function getDashboardData(): Promise<DashboardData> {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return DEFAULT_DASHBOARD;

        // 1. Get Current Month
        const now = new Date();
        const isoMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        // Fetch or Create Month
        let { data: month } = await supabase
            .from('months')
            .select('*')
            .eq('user_id', user.id)
            .eq('iso_month', isoMonth)
            .single();

        // 2. Data Aggregation
        let income = month?.income || 0;
        const rollover = month?.rollover || 0;

        // Get recent transactions for the list
        const { data: allTransactions } = await supabase
            .from('transactions')
            .select(`
                *,
                categories ( name, is_commitment )
            `)
            .eq('user_id', user.id)
            .gte('date', isoMonth) // Only current month transactions for calculations
            .order('date', { ascending: false });

        const transactions = allTransactions || [];

        let spentVariable = 0;

        transactions.forEach((tx: any) => {
            if (tx.type === 'income') {
                income += Number(tx.amount);
            } else if (tx.type === 'expense') {
                const isCommitment = tx.categories?.is_commitment;
                if (!isCommitment) {
                    spentVariable += Number(tx.amount);
                }
            }
            else if (tx.type === 'debt_payment') {
                spentVariable += Number(tx.amount);
            }
        });

        // 3. Get Commitments
        const { data: committedCategories } = await supabase
            .from('categories')
            .select('budget_limit')
            .eq('user_id', user.id)
            .eq('is_commitment', true);

        const totalCommitments = committedCategories?.reduce((sum, cat) => sum + Number(cat.budget_limit), 0) || 0;
        const safeToSpend = (income + rollover) - totalCommitments - spentVariable;

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
            .eq('is_commitment', false)
            .order('name');

        // Map transactions for UI
        const recentTransactions = transactions.slice(0, 20).map((tx: any) => ({
            id: tx.id,
            description: tx.description || (tx.categories?.name) || 'Untitled',
            amount: tx.amount,
            type: tx.type,
            date: tx.date || new Date().toISOString(),
            category_name: tx.categories?.name
        }));

        return {
            safeToSpend,
            spent: spentVariable,
            debts: debts || [],
            recentTransactions,
            categories: categories || []
        };

    } catch (error) {
        console.error("Supabase Error:", error);
        return DEFAULT_DASHBOARD;
    }
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

    // 1. Insert Transaction
    const { error } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            month_id: month!.id,
            amount,
            description,
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

        // Calculate Remaining Logic
        let income = month.income || 0;
        const rollover = month.rollover || 0;

        const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, type, categories(is_commitment)')
            .eq('month_id', month.id);

        let spentVariable = 0;
        transactions?.forEach((tx: any) => {
            if (tx.type === 'income') income += Number(tx.amount);
            else if (tx.type === 'expense' && !tx.categories?.is_commitment) spentVariable += Number(tx.amount);
            else if (tx.type === 'debt_payment') spentVariable += Number(tx.amount);
        });

        const { data: committedCategories } = await supabase
            .from('categories')
            .select('budget_limit')
            .eq('user_id', user.id)
            .eq('is_commitment', true);

        const totalCommitments = committedCategories?.reduce((sum, cat) => sum + Number(cat.budget_limit), 0) || 0;
        const remaining = (income + rollover) - totalCommitments - spentVariable;

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

export async function addCategory(name: string, is_commitment: boolean, budget_limit: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
        .from('categories')
        .insert({
            user_id: user.id,
            name,
            is_commitment,
            budget_limit
        });

    if (error) {
        console.error("Add Category Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}
