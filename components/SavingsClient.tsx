"use client";

import { useState } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { Plus, X, TrendingUp, PiggyBank } from "lucide-react";
import { addSavingsGoal, contributeToSavings, SavingsGoal } from "@/app/actions";
import clsx from "clsx";
import Link from "next/link";

export function SavingsClient({ initialGoals }: { initialGoals: SavingsGoal[] }) {
    const [goals, setGoals] = useState<SavingsGoal[]>(initialGoals);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);

    const currency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(val);

    const handleAddGoal = async (name: string, targetAmountStr: string, targetDateStr: string) => {
        const targetAmount = parseFloat(targetAmountStr);
        if (!name || isNaN(targetAmount) || !targetDateStr) return;

        setIsSubmitting(true);
        try {
            const res = await addSavingsGoal(name, targetAmount, targetDateStr);
            if (res.success) {
                window.location.reload(); // Simple reload to refresh data
            } else {
                alert("Error: " + res.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContribute = async (amountStr: string) => {
        if (!contributeGoal) return;
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return;

        setIsSubmitting(true);
        try {
            const res = await contributeToSavings(contributeGoal.id, amount, contributeGoal.name);
            if (res.success) {
                window.location.reload();
            } else {
                alert("Error: " + res.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate suggestion
    const getSuggestion = (g: SavingsGoal) => {
        const now = new Date();
        const target = new Date(g.target_date);
        const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
        const remaining = g.target_amount - g.current_amount;
        if (remaining <= 0) return "Goal Reached!";
        if (months <= 0) return "Due Now!";
        return `Save ~${currency(remaining / months)}/mo`;
    };

    return (
        <main className="min-h-screen p-4 md:p-6 max-w-lg mx-auto space-y-6 pb-40">
            {/* Header */}
            <header className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-2">
                    <Link href="/" className="text-stone-400 hover:text-stone-900 text-lg font-bold px-2 py-1">&larr;</Link>
                    <h1 className="font-bold text-stone-900 tracking-tight text-xl">Future Savings</h1>
                </div>
            </header>

            {/* List */}
            <div className="space-y-4">
                {goals.length === 0 ? (
                    <PaperCard className="opacity-50 border-dashed p-8 text-center bg-stone-50/50">
                        <PiggyBank className="mx-auto mb-2 text-stone-300" size={32} />
                        <p className="text-stone-400 text-sm">No savings goals yet.<br />Plan for the future!</p>
                    </PaperCard>
                ) : (
                    goals.map(g => {
                        const progress = Math.min(100, (g.current_amount / g.target_amount) * 100);
                        return (
                            <PaperCard key={g.id} className="p-6 relative overflow-hidden group">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-stone-900 text-lg">{g.name}</h3>
                                        <p className="text-xs text-stone-400 font-mono font-bold">
                                            Target: {new Date(g.target_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono font-bold text-stone-900">{currency(g.current_amount)}</div>
                                        <div className="text-[10px] text-stone-400 uppercase tracking-widest">of {currency(g.target_amount)}</div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden mb-3">
                                    <div
                                        className="h-full bg-stone-800 transition-all duration-500 rounded-full"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-stone-500 font-bold bg-yellow-100 px-2 py-1 rounded transform -rotate-1">
                                        {getSuggestion(g)}
                                    </span>
                                    <button
                                        onClick={() => setContributeGoal(g)}
                                        className="bg-stone-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-black transition-colors"
                                    >
                                        + Contribute
                                    </button>
                                </div>
                            </PaperCard>
                        );
                    })
                )}
            </div>

            {/* Floating Add Button */}
            <div className="fixed bottom-6 right-6 z-40">
                <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-stone-900 text-white shadow-xl p-4 rounded-full hover:bg-black transition-transform active:scale-95"
                >
                    <Plus size={24} />
                </button>
            </div>

            {/* Add Goal Form */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <AddGoalForm onAdd={handleAddGoal} onClose={() => setShowAddForm(false)} isSubmitting={isSubmitting} />
                </div>
            )}

            {/* Contribute Form */}
            {contributeGoal && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <ContributeForm
                        goal={contributeGoal}
                        onContribute={handleContribute}
                        onClose={() => setContributeGoal(null)}
                        isSubmitting={isSubmitting}
                    />
                </div>
            )}
        </main>
    );
}

function AddGoalForm({ onAdd, onClose, isSubmitting }: { onAdd: (n: string, a: string, d: string) => void, onClose: () => void, isSubmitting: boolean }) {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState("");

    return (
        <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-stone-900">New Savings Goal</h2>
                <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                    <X size={20} />
                </button>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Goal Name</label>
                    <input
                        type="text" placeholder="e.g. Visa Renewal"
                        autoFocus
                        value={name} onChange={e => setName(e.target.value)}
                        className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Target Amount (AED)</label>
                    <input
                        type="number" placeholder="5000"
                        value={amount} onChange={e => setAmount(e.target.value)}
                        className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono font-bold outline-none focus:border-stone-900"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Target Date</label>
                    <input
                        type="date"
                        value={date} onChange={e => setDate(e.target.value)}
                        className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono font-bold outline-none focus:border-stone-900"
                    />
                </div>
            </div>

            <button
                onClick={() => onAdd(name, amount, date)}
                disabled={isSubmitting || !name || !amount || !date}
                className="w-full bg-stone-900 text-white py-4 rounded-xl text-lg font-bold shadow-lg transition-transform active:scale-95"
            >
                Create Goal
            </button>
        </div>
    )
}

function ContributeForm({ goal, onContribute, onClose, isSubmitting }: { goal: SavingsGoal, onContribute: (a: string) => void, onClose: () => void, isSubmitting: boolean }) {
    const [amount, setAmount] = useState("");

    return (
        <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-stone-900">Contribute to {goal.name}</h2>
                <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                    <X size={20} />
                </button>
            </div>

            <p className="text-sm text-stone-500">
                This will be recorded as an <strong className="text-stone-900">Expense</strong> for the current month, reducing your Safe-to-Spend.
            </p>

            <div className="space-y-2">
                <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Amount to Save (AED)</label>
                <input
                    type="number" placeholder="0.00"
                    autoFocus
                    value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono font-bold outline-none focus:border-stone-900"
                />
            </div>

            <button
                onClick={() => onContribute(amount)}
                disabled={isSubmitting || !amount}
                className="w-full bg-stone-900 text-white py-4 rounded-xl text-lg font-bold shadow-lg transition-transform active:scale-95"
            >
                Confirm Contribution
            </button>
        </div>
    )
}
