"use client";

import { useState } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { ArrowRight, Plus } from "lucide-react";
import { addDebt, addTransaction } from "@/app/actions";

type Debt = {
    id: string;
    name: string;
    total_balance: number;
    interest_rate: number;
};

export function DebtsClient({ initialDebts }: { initialDebts: Debt[] }) {
    const [debts, setDebts] = useState<Debt[]>(initialDebts);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const currency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    const handleAddDebt = async (name: string, balanceStr: string, rateStr: string) => {
        const balance = parseFloat(balanceStr);
        const rate = parseFloat(rateStr);
        if (!name || isNaN(balance)) return;

        setIsSubmitting(true);
        // Optimistic
        const newDebt = {
            id: Math.random().toString(),
            name,
            total_balance: balance,
            interest_rate: isNaN(rate) ? 0 : rate
        };
        setDebts(prev => [newDebt, ...prev]);
        setShowAddForm(false);

        try {
            await addDebt(name, balance, isNaN(rate) ? 0 : rate);
        } catch (err) {
            console.error("Failed to add debt", err);
            // Revert optimistic update? For now, we rely on revalidation or refresh.
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePayDebt = async (debtId: string, amountStr: string) => {
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return;

        setIsSubmitting(true);

        setDebts(prev => prev.map(d =>
            d.id === debtId ? { ...d, total_balance: d.total_balance - amount } : d
        ));

        try {
            await addTransaction(amount, "Debt Payment", "debt_payment", undefined, debtId);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 bg-stone-100 px-3 py-2 rounded"
                >
                    <Plus size={14} /> Add Debt
                </button>
            </div>

            {showAddForm && (
                <AddDebtForm onAdd={handleAddDebt} isSubmitting={isSubmitting} />
            )}

            {debts.length === 0 && !showAddForm && (
                <PaperCard className="opacity-50 border-dashed p-8 text-center">
                    <p className="text-stone-400 text-sm">No debts tracked. You're free!</p>
                </PaperCard>
            )}

            <div className="space-y-4">
                {debts.map(debt => (
                    <PaperCard key={debt.id} className="relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-stone-900 text-lg">{debt.name}</h4>
                                <p className="text-xs text-stone-400 font-mono mt-1">{debt.interest_rate}% APR</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-mono font-bold text-stone-800">{currency(debt.total_balance)}</div>
                                <div className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">Balance</div>
                            </div>
                        </div>
                        <PayDebtInline onPay={(amt) => handlePayDebt(debt.id, amt)} isSubmitting={isSubmitting} />
                    </PaperCard>
                ))}
            </div>
        </section>
    );
}

function AddDebtForm({ onAdd, isSubmitting }: { onAdd: (n: string, b: string, r: string) => void, isSubmitting: boolean }) {
    const [name, setName] = useState("");
    const [balance, setBalance] = useState("");
    const [rate, setRate] = useState("");

    return (
        <PaperCard className="p-4 space-y-4 bg-stone-50 border-2 border-stone-200">
            <h3 className="text-stone-500 text-xs uppercase font-bold tracking-widest">New Debt Tracker</h3>
            <div className="space-y-3">
                <input
                    type="text" placeholder="Card Name (e.g. Visa)"
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-200 rounded text-sm outline-none focus:border-stone-400"
                />
                <div className="flex gap-2">
                    <input
                        type="number" placeholder="Current Balance"
                        value={balance} onChange={e => setBalance(e.target.value)}
                        className="w-1/2 p-2 bg-white border border-stone-200 rounded text-sm outline-none focus:border-stone-400"
                    />
                    <input
                        type="number" placeholder="APR %"
                        value={rate} onChange={e => setRate(e.target.value)}
                        className="w-1/2 p-2 bg-white border border-stone-200 rounded text-sm outline-none focus:border-stone-400"
                    />
                </div>
            </div>
            <button
                onClick={() => onAdd(name, balance, rate)}
                disabled={isSubmitting}
                className="w-full bg-stone-900 text-white py-3 rounded text-sm font-bold hover:bg-stone-800 disabled:opacity-50 transition-all"
            >
                Start Tracking
            </button>
        </PaperCard>
    )
}

function PayDebtInline({ onPay, isSubmitting }: { onPay: (a: string) => void, isSubmitting: boolean }) {
    const [amount, setAmount] = useState("");

    return (
        <div className="pt-3 border-t border-stone-100 flex gap-2 items-center">
            <span className="text-[10px] font-bold text-stone-400">PAY OFF</span>
            <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 bg-transparent text-right px-2 py-1 text-sm font-mono outline-none border-b border-stone-200 focus:border-stone-900 transition-colors"
            />
            <button
                disabled={isSubmitting || !amount}
                onClick={() => { onPay(amount); setAmount(""); }}
                className="bg-stone-100 text-stone-600 p-2 rounded hover:bg-stone-200 disabled:opacity-30 transition-colors"
            >
                <ArrowRight size={16} />
            </button>
        </div>
    )
}
