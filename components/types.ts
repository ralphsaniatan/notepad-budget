export type Category = {
    id: string;
    name: string;
    commitment_type: 'fixed' | 'variable_fixed' | null;
    is_commitment: boolean;
    budget_limit: number;
    balance?: number;
    is_pinned?: boolean;
    frequency_months?: number;
    frequency_start?: string;
};
