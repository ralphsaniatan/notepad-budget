"use server";

import { createClient } from "./supabase-server";

// Fallback Mock Data for when DB is not connected
const MOCK_DASHBOARD = {
    income: 5000,
    rollover: 350,
    commitments: 2200,
    spent: 850,
    debt: 12450
};

export async function getDashboardData() {
    const supabase = await createClient();

    try {
        // Try mock fetch first to see if connection works
        // In a real app we would query tables: months, transactions, debts
        // For now, we return mock data but "simulate" the structure

        // Check if we have env vars, if not return mock immediately
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            console.warn("Missing Supabase URL, returning mock data.");
            return MOCK_DASHBOARD;
        }

        // TODO: Implement actual SQL queries here once tables exist
        // const { data: month } = await supabase.from('months').select('*').single();

        return MOCK_DASHBOARD;
    } catch (error) {
        console.error("Supabase Error:", error);
        return MOCK_DASHBOARD;
    }
}

export async function addTransaction(amount: number, description: string, type: 'expense' | 'income') {
    const supabase = await createClient();

    // TODO: Insert into 'transactions' table
    console.log("Adding transaction (mock):", { amount, description, type });
    return { success: true };
}
