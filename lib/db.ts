import Dexie, { Table } from 'dexie';

export type SyncStatus = 'synced' | 'created' | 'updated' | 'deleted';

export interface LocalTransaction {
    id: string; // UUID from Supabase or temp UUID
    amount: number;
    description: string;
    date: string;
    type: 'income' | 'expense' | 'debt_payment';
    category_id?: string;
    debt_id?: string;
    created_at: string;
    user_id: string;
    sync_status: SyncStatus;
}

export interface LocalCategory {
    id: string;
    name: string;
    budget_limit: number;
    type: 'variable' | 'fixed'; // Deprecated in favor of commitment_type
    commitment_type?: 'fixed' | 'variable_fixed' | null;
    is_commitment: boolean;
    is_pinned: boolean; // boolean in local, might be boolean in supabase
    user_id: string;
    sync_status: SyncStatus;
    frequency_months?: number; // 1 = monthly
    frequency_start?: string; // ISO date string, e.g. '2026-02-01' — which month the cycle starts (payment month)
    balance?: number; // Accumulated surplus
}

export interface LocalDebt {
    id: string;
    name: string;
    total_balance: number;
    interest_rate: number; // Keeping for compatibility, though hidden in UI
    user_id: string;
    sync_status: SyncStatus;
}

export interface LocalSavingsGoal {
    id: string;
    name: string;
    target_amount: number;
    target_date: string;
    current_amount: number;
    user_id: string;
    sync_status: SyncStatus;
}

export class NotepadBudgetDB extends Dexie {
    transactions!: Table<LocalTransaction>;
    categories!: Table<LocalCategory>;
    debts!: Table<LocalDebt>;
    savings_goals!: Table<LocalSavingsGoal>;

    constructor() {
        super('NotepadBudgetDB');

        // Schema definition
        // ++id is NOT used because we want to use UUIDs to match Supabase
        this.version(1).stores({
            transactions: 'id, date, type, category_id, debt_id, sync_status, user_id, created_at',
            categories: 'id, name, type, is_pinned, sync_status, user_id',
            debts: 'id, name, sync_status, user_id',
            savings_goals: 'id, name, target_date, sync_status, user_id'
        });
    }
}

export const db = new NotepadBudgetDB();
