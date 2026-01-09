"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

// Type definitions matching our schema
type DashboardData = {
    income: number;
    rollover: number;
    commitments: number;
    spent: number;
    debt: number;
};

// Fallback for initial state or error
const DEFAULT_DASHBOARD: DashboardData = {
    income: 0,
    rollover: 0,
    commitments: 0,
    spent: 0,
    debt: 0
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

        // If month doesn't exist, we might return zeros. 
        // In a real flow, we'd auto-create it, but let's just ready the data if it exists.

        // 2. Aggregate Transactions for this month
        // We need to sum:
        // - 'income' -> dashboard.income (plus base income from month table if we had that, but here we just sum transactions + separate month.income field?)
        // Let's assume for this MVP:
        // - Income = Sum of transactions type='income' + month.income (if any)
        // - Spent = Sum of transactions type='expense' where category.is_commitment = false
        // - Commitments = Sum of categories.budget_limit where is_commitment = true 
        //   (This is "Planned Commitments", prompt said "Unpaid Commitments" for Safe-to-Spend. 
        //    Let's stick to simple: Commitments = Total Fixed Costs Budgeted)

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
                // If it's a committed category (bill), we don't count it as "Variable Spent" 
                // because we subtract the WHOLE commitment budget from Safe-to-Spend anyway.
                // Wait, if I pay a bill, does it reduce my cash? Yes.
                // Safe-to-Spend formula: (Income + Rollover) - (Total Commitments) - (Variable Spent).
                // If I pay a bill, it shouldn't change Safe-to-Spend (money was already "gone").
                // So "Variable Spent" should ONLY be expenses where is_commitment is FALSE (or null).
                const isCommitment = tx.categories?.is_commitment;
                if (!isCommitment) {
                    spentVariable += Number(tx.amount);
                }
            }
        });

        // 3. Get Commitments (Total Budgeted for Fixed Bills)
        const { data: committedCategories } = await supabase
            .from('categories')
            .select('budget_limit')
            .eq('user_id', user.id)
            .eq('is_commitment', true);

        const totalCommitments = committedCategories?.reduce((sum, cat) => sum + Number(cat.budget_limit), 0) || 0;

        return {
            income,
            rollover,
            commitments: totalCommitments,
            spent: spentVariable,
            debt: 0 // TODO: Implement debt sum
        };

    } catch (error) {
        console.error("Supabase Error:", error);
        return DEFAULT_DASHBOARD;
    }
}

export async function addTransaction(amount: number, description: string, type: 'expense' | 'income' | 'debt_payment') {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Get current month ID
    const now = new Date();
    const isoMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // We need a month record to link transaction. For MVP, ensure it exists or create.
    let { data: month } = await supabase.from('months').select('id').eq('user_id', user.id).eq('iso_month', isoMonth).single();

    if (!month) {
        const { data: newMonth, error: createError } = await supabase
            .from('months')
            .insert({ user_id: user.id, iso_month: isoMonth })
            .select()
            .single();

        if (createError || !newMonth) {
            console.error("Failed to create month:", createError);
            return { success: false, error: "Could not initialize month" };
        }
        month = newMonth;
    }

    const { error } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            month_id: month!.id,
            amount,
            description,
            type
        });

    if (error) {
        console.error("Insert Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/');
    return { success: true };
}
