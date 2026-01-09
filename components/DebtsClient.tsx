"use client";

import { useState } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { Plus, X } from "lucide-react";
import { addDebt } from "@/app/actions";
import clsx from "clsx";

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
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(val);

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
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="space-y-6 pb-32">
            {/* List */}
            {debts.length === 0 && !showAddForm && (
                <PaperCard className="opacity-50 border-dashed p-8 text-center bg-stone-50/50">
                    <p className="text-stone-400 text-sm">No debts tracked. Freedom!</p>
                </PaperCard>
            )}

            <div className="space-y-4">
                {debts.map(debt => (
                    <PaperCard key={debt.id} className="relative group p-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className={clsx("font-bold text-stone-900 text-xl", debt.total_balance <= 0 && "line-through decoration-red-600 decoration-4 -rotate-2 opacity-60")}>{debt.name}</h4>
                                <p className="text-xs text-stone-400 font-mono mt-1 font-bold">{debt.interest_rate}% APR</p>
                            </div>
                            <div className="text-right">
                                <div className={clsx("text-2xl font-mono font-bold", debt.total_balance <= 0 ? "text-stone-300" : "text-stone-800")}>{currency(debt.total_balance)}</div>
                                <div className="text-[10px] text-stone-300 uppercase tracking-widest mt-1">Outstanding</div>
                            </div>
                        </div>
                    </PaperCard>
                ))}
            </div>

            {/* Persistent Add Button */}
            {!showAddForm && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-8 z-40">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full bg-stone-900 text-white shadow-xl py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 hover:bg-black transition-transform active:scale-95"
                    >
                        <Plus size={20} /> Add New Debt
                    </button>
                </div>
            )}

            {/* Add Form Sheet */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <AddDebtForm onAdd={handleAddDebt} onClose={() => setShowAddForm(false)} isSubmitting={isSubmitting} />
                </div>
            )}
        </section>
    );
}

function AddDebtForm({ onAdd, onClose, isSubmitting }: { onAdd: (n: string, b: string, r: string) => void, onClose: () => void, isSubmitting: boolean }) {
    const [name, setName] = useState("");
    const [balance, setBalance] = useState("");
    const [rate, setRate] = useState("");

    return (
        <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-stone-900">Track New Debt</h2>
                <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                    <X size={20} />
                </button>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Card / Loan Name</label>
                    <input
                        type="text" placeholder="e.g. Visa Signature"
                        autoFocus
                        value={name} onChange={e => setName(e.target.value)}
                        className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                    />
                </div>

                <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                        <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Current Balance</label>
                        <input
                            type="number" placeholder="0.00"
                            value={balance} onChange={e => setBalance(e.target.value)}
                            className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono font-bold outline-none focus:border-stone-900"
                        />
                    </div>
                    <div className="space-y-2 w-1/3">
                        <label className="text-xs uppercase font-bold tracking-widest text-stone-400">APR %</label>
                        <input
                            type="number" placeholder="0.0"
                            value={rate} onChange={e => setRate(e.target.value)}
                            className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono font-bold outline-none focus:border-stone-900"
                        />
                    </div>
                </div>
            </div>

            <button
                onClick={() => onAdd(name, balance, rate)}
                disabled={isSubmitting || !name || !balance}
                className="w-full bg-stone-900 text-white py-4 rounded-xl text-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
                Start Tracking
            </button>
            <div className="h-8"></div>
        </div>
    )
}
