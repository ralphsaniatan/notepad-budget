"use client";

import { useState, useMemo, useEffect } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { DollarSign, ArrowRight, Wallet, AlertCircle, Plus, Minus, CreditCard, ChevronDown } from "lucide-react";
import { addTransaction, addDebt } from "@/app/actions";

type DashboardData = {
    income: number;
    rollover: number;
    commitments: number;
    spent: number;
    debts: { id: string, name: string, total_balance: number, interest_rate: number }[];
};

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
    const [data, setData] = useState(initialData);

    // Sync state if initialData updates
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
    const [showAddDebt, setShowAddDebt] = useState(false);

    const handleQuickAdd = async (type: 'expense' | 'income', amountStr: string) => {
        if (!amountStr) return;
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return;

        setIsSubmitting(true);
        const oldData = { ...data };

        // Optimistic Update
        if (type === 'expense') {
            setData(prev => ({ ...prev, spent: prev.spent + amount }));
        } else {
            setData(prev => ({ ...prev, income: prev.income + amount }));
        }

        try {
            await addTransaction(amount, `Quick ${type}`, type);
        } catch (err) {
            setData(oldData);
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddDebt = async (name: string, balanceStr: string, rateStr: string) => {
        const balance = parseFloat(balanceStr);
        const rate = parseFloat(rateStr);
        if (!name || isNaN(balance)) return;

        setIsSubmitting(true);
        try {
            await addDebt(name, balance, isNaN(rate) ? 0 : rate);
            setShowAddDebt(false);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePayDebt = async (debtId: string, amountStr: string) => {
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return;

        setIsSubmitting(true);
        // Optimistic
        setData(prev => ({
            ...prev,
            spent: prev.spent + amount,
            debts: prev.debts.map(d => d.id === debtId ? { ...d, total_balance: d.total_balance - amount } : d)
        }));

        try {
            await addTransaction(amount, "Debt Payment", "debt_payment", debtId);
        } catch (err) {
            console.error(err);
            // Revert would be complex here, relying on revalidatePath usually covers it
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

            {/* Quick Actions */}
            <section className="space-y-4">
                <h3 className="text-stone-500 text-sm uppercase font-bold tracking-widest pl-1">Quick Add</h3>
                <QuickAddForm onAdd={handleQuickAdd} isSubmitting={isSubmitting} />
            </section>

            {/* Debts Section */}
            <section className="space-y-4">
                <div className="flex justify-between items-end px-1">
                    <h3 className="text-stone-500 text-sm uppercase font-bold tracking-widest">Debts</h3>
                    <button
                        onClick={() => setShowAddDebt(!showAddDebt)}
                        className="text-xs text-stone-400 underline hover:text-stone-600"
                    >
                        {showAddDebt ? "Cancel" : "+ Add Tracker"}
                    </button>
                </div>

                {showAddDebt && (
                    <AddDebtForm onAdd={handleAddDebt} isSubmitting={isSubmitting} />
                )}

                {data.debts.length === 0 && !showAddDebt && (
                    <PaperCard className="opacity-50 border-dashed">
                        <p className="text-center text-sm text-stone-400 py-2">No active debts tracked.</p>
                    </PaperCard>
                )}

                <div className="space-y-3">
                    {data.debts.map(debt => (
                        <PaperCard key={debt.id} className="relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-stone-800">{debt.name}</h4>
                                    <p className="text-xs text-stone-400">{debt.interest_rate}% APR</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-mono font-bold text-stone-800">{currency(debt.total_balance)}</div>
                                </div>
                            </div>
                            {/* Inline Pay Form */}
                            <PayDebtInline onPay={(amt) => handlePayDebt(debt.id, amt)} isSubmitting={isSubmitting} />
                        </PaperCard>
                    ))}
                </div>
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

function AddDebtForm({ onAdd, isSubmitting }: { onAdd: (n: string, b: string, r: string) => void, isSubmitting: boolean }) {
    const [name, setName] = useState("");
    const [balance, setBalance] = useState("");
    const [rate, setRate] = useState("");

    return (
        <PaperCard className="p-4 space-y-3 bg-stone-100/50">
            <input
                type="text" placeholder="Debt Name (e.g. Visa)"
                value={name} onChange={e => setName(e.target.value)}
                className="w-full p-2 bg-white border border-stone-200 rounded text-sm"
            />
            <div className="flex gap-2">
                <input
                    type="number" placeholder="Balance"
                    value={balance} onChange={e => setBalance(e.target.value)}
                    className="w-1/2 p-2 bg-white border border-stone-200 rounded text-sm"
                />
                <input
                    type="number" placeholder="APR %"
                    value={rate} onChange={e => setRate(e.target.value)}
                    className="w-1/2 p-2 bg-white border border-stone-200 rounded text-sm"
                />
            </div>
            <button
                onClick={() => onAdd(name, balance, rate)}
                disabled={isSubmitting}
                className="w-full bg-stone-900 text-white py-2 rounded text-sm font-bold hover:bg-stone-800 disabled:opacity-50"
            >
                Start Tracking
            </button>
        </PaperCard>
    )
}

function PayDebtInline({ onPay, isSubmitting }: { onPay: (a: string) => void, isSubmitting: boolean }) {
    const [amount, setAmount] = useState("");

    return (
        <div className="mt-4 pt-3 border-t border-stone-100 flex gap-2 items-center">
            <span className="text-xs font-bold text-stone-400">PAY</span>
            <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 bg-stone-50 text-right px-2 py-1 text-sm font-mono outline-none border-b border-stone-200 focus:border-stone-400"
            />
            <button
                disabled={isSubmitting || !amount}
                onClick={() => { onPay(amount); setAmount(""); }}
                className="bg-stone-200 text-stone-600 p-1.5 rounded hover:bg-stone-300 disabled:opacity-30"
            >
                <ArrowRight size={14} />
            </button>
        </div>
    )
}
