"use client";

import { useState, useMemo, useEffect } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { DollarSign, ArrowRight, Wallet, AlertCircle, Plus, Minus, Receipt } from "lucide-react";
import { addTransaction } from "@/app/actions";

type DashboardData = {
    income: number;
    rollover: number;
    commitments: number;
    spent: number;
    debt: number;
};

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
    const [data, setData] = useState(initialData);

    // Sync state if initialData updates (e.g. after revalidatePath)
    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    // "Safe to Spend" Formula
    const safeToSpend = useMemo(() => {
        return (data.income + data.rollover) - data.commitments - data.spent;
    }, [data]);

    const currency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    // Quick Action State
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleQuickAdd = async (type: 'expense' | 'income', amountStr: string) => {
        if (!amountStr) return;
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return;

        setIsSubmitting(true);
        // Optimistic Update
        const oldData = { ...data };
        if (type === 'expense') {
            setData(prev => ({ ...prev, spent: prev.spent + amount }));
        } else {
            setData(prev => ({ ...prev, income: prev.income + amount }));
        }

        try {
            await addTransaction(amount, `Quick ${type}`, type);
        } catch (err) {
            // Revert on error
            setData(oldData);
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto space-y-8 pb-32">
            {/* Header */}
            <header className="text-center space-y-2 mt-8">
                <h1 className="text-4xl font-extrabold text-stone-900 tracking-tight">
                    Notepad Budget
                </h1>
                <p className="text-stone-500 font-mono text-sm">January 2026</p>
            </header>

            {/* Safe to Spend Hero */}
            <section className="relative">
                <PaperCard className="bg-yellow-50/50 border-yellow-200">
                    <div className="flex flex-col items-center justify-center p-4">
                        <span className="text-stone-500 uppercase text-xs font-bold tracking-widest mb-2">
                            Safe to Spend
                        </span>
                        <div className="text-5xl font-mono font-bold text-stone-900 tracking-tighter">
                            {currency(safeToSpend)}
                        </div>
                        <p className="text-stone-400 text-xs mt-2 italic">
                            (Income + Rollover) - Commitments - Spent
                        </p>
                    </div>
                </PaperCard>
            </section>

            {/* Stats Grid */}
            <section className="grid grid-cols-2 gap-4">
                <PaperCard title="Income">
                    <div className="text-2xl font-mono text-stone-700">{currency(data.income)}</div>
                </PaperCard>
                <PaperCard title="Rollover">
                    <div className="text-2xl font-mono text-stone-700">{currency(data.rollover)}</div>
                </PaperCard>
                <PaperCard title="Fixed Bills">
                    <div className="text-xl font-mono text-stone-500">{currency(data.commitments)}</div>
                    <div className="text-xs text-stone-400 mt-1">Planned Commitments</div>
                </PaperCard>
                <PaperCard title="Variable Spent">
                    <div className="text-2xl font-mono text-red-700">-{currency(data.spent)}</div>
                </PaperCard>
            </section>

            {/* Quick Actions (Floating or Inline) */}
            <section className="space-y-4">
                <h3 className="text-stone-500 text-sm uppercase font-bold tracking-widest pl-1">Quick Add</h3>
                <QuickAddForm onAdd={handleQuickAdd} isSubmitting={isSubmitting} />
            </section>

            {/* Debug Info */}
            <section className="opacity-30 text-xs font-mono text-center pt-8">
                <p>Syncing with Supabase</p>
            </section>
        </main>
    );
}

function QuickAddForm({ onAdd, isSubmitting }: { onAdd: (type: 'expense' | 'income', amount: string) => void, isSubmitting: boolean }) {
    const [amount, setAmount] = useState("");

    return (
        <PaperCard className="flex items-center gap-2 p-3">
            <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">$</span>
                <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full pl-7 pr-4 py-2 bg-stone-50 rounded-md font-mono text-lg outline-none focus:ring-2 focus:ring-stone-200"
                />
            </div>
            <button
                disabled={isSubmitting}
                onClick={() => { onAdd('expense', amount); setAmount(""); }}
                className="p-3 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
            >
                <Minus size={20} />
            </button>
            <button
                disabled={isSubmitting}
                onClick={() => { onAdd('income', amount); setAmount(""); }}
                className="p-3 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
            >
                <Plus size={20} />
            </button>
        </PaperCard>
    )
}
