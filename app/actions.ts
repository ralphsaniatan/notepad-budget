"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

// Type definitions matching our schema
type DashboardData = {
    income: number;
    rollover: number;
    commitments: number;
    spent: number;
    debts: { id: string, name: string, total_balance: number, interest_rate: number }[];
};

// Fallback for initial state or error
const DEFAULT_DASHBOARD: DashboardData = {
    income: 0,
    rollover: 0,
    commitments: 0,
    spent: 0,
    debts: []
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

        // 2. Aggregate Transactions for this month
        let income = month?.income || 0;
        const rollover = month?.rollover || 0;

        // Get Transactions
        const { data: transactions } = await supabase
            .from('transactions')
            .select(`
                amount,
                type,
                categories (
                    is_commitment
                )
            `)
            .eq('user_id', user.id)
            .gte('date', isoMonth); // Simple date filter for now

        let spentVariable = 0;

        transactions?.forEach((tx: any) => {
            if (tx.type === 'income') {
                income += Number(tx.amount);
            } else if (tx.type === 'expense') {
                const isCommitment = tx.categories?.is_commitment;
                if (!isCommitment) {
                    spentVariable += Number(tx.amount);
                }
            }
            // Note: Debt payments are NOT "Variable Spent" (they are transfers to debt), 
            // nor "Income". They reduce cash, but we track them separately if needed.
            // For Safe-to-Spend: (Income+Rollover) - Commitments - (Variable Spent) - (Debt Payments)?
            // Usually, allocated money for debt is separate. 
            // Let's assume for MVP: Debt Payments reduce Safe-to-Spend immediately (like an expense).
            else if (tx.type === 'debt_payment') {
                spentVariable += Number(tx.amount);
            }
        });

        // 3. Get Commitments (Total Budgeted for Fixed Bills)
        const { data: committedCategories } = await supabase
            .from('categories')
            .select('budget_limit')
            .eq('user_id', user.id)
            .eq('is_commitment', true);

        const totalCommitments = committedCategories?.reduce((sum, cat) => sum + Number(cat.budget_limit), 0) || 0;

        // 4. Get Debts
        const { data: debts } = await supabase
            .from('debts')
            .select('*')
            .eq('user_id', user.id)
            .order('total_balance', { ascending: false });

        return {
            income,
            rollover,
            commitments: totalCommitments,
            spent: spentVariable,
            debts: debts || []
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
    debtId?: string
) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Get current month ID
    const now = new Date();
    const isoMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // We need a month record to link transaction.
    let { data: month } = await supabase.from('months').select('id').eq('user_id', user.id).eq('iso_month', isoMonth).single();

    if (!month) {
        // Auto-create month if missing
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
            month_id: month!.id, // Non-null asserted
            amount,
            description,
            type,
            debt_id: type === 'debt_payment' ? debtId : null
        });

    if (error) {
        console.error("Insert Error:", error);
        return { success: false, error: error.message };
    }

    // 2. If Debt Payment, Decrement Debt Balance
    if (type === 'debt_payment' && debtId) {
        // We use an RPC or just raw update. Since we don't have an RPC for decrement, we fetch-update or assume concurrency isn't high for personal app.
        // Better: Postgres `update debts set total_balance = total_balance - X`
        // Supabase-js doesn't support relative updates easily without RPC, but we can do it via a quick RPC or just reading first.
        // Let's read-then-write for MVP simplicity (postgres is fast enough for 1 user).

        const { data: debt } = await supabase.from('debts').select('total_balance').eq('id', debtId).single();
        if (debt) {
            const newBalance = Number(debt.total_balance) - amount;
            await supabase.from('debts').update({ total_balance: newBalance }).eq('id', debtId);
        }
    }

    revalidatePath('/');
    return { success: true };
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

    if (error) console.error(error);
    revalidatePath('/');
    return { success: !error };
}
