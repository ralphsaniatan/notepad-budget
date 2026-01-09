"use client";

import { useState, useEffect } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { DollarSign, ArrowRight, Wallet, AlertCircle, Plus, Minus, CreditCard, List, Archive } from "lucide-react";
import { addTransaction, addDebt, closeMonth } from "@/app/actions";
import clsx from "clsx";
import Link from "next/link";

type DashboardData = {
    safeToSpend: number;
    spent: number;
    debts: { id: string, name: string, total_balance: number, interest_rate: number }[];
    recentTransactions: { id: string, description: string, amount: number, type: 'income' | 'expense' | 'debt_payment', date: string, category_name?: string }[];
    categories: { id: string, name: string }[];
};

type TxType = 'expense' | 'income' | 'debt_payment';

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
    const [data, setData] = useState(initialData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const currency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    const handleQuickAdd = async (type: TxType, amountStr: string, targetId?: string, description?: string) => {
        if (!amountStr) return;
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return;

        setIsSubmitting(true);

        // Determine Type-Specific IDs
        const categoryId = type !== 'debt_payment' ? targetId : undefined;
        const debtId = type === 'debt_payment' ? targetId : undefined;

        // Optimistic Update
        const newTx = {
            id: Math.random().toString(),
            description: description || (type === 'income' ? 'Income' : type === 'debt_payment' ? 'Debt Payment' : 'Expense'),
            amount,
            type,
            date: new Date().toISOString(),
            category_name: type === 'debt_payment'
                ? `To: ${data.debts.find(d => d.id === debtId)?.name}`
                : data.categories.find(c => c.id === categoryId)?.name
        };

        const newData = { ...data };
        if (type === 'expense') {
            newData.safeToSpend -= amount;
            newData.spent += amount;
        } else if (type === 'income') {
            newData.safeToSpend += amount;
        } else if (type === 'debt_payment') {
            newData.safeToSpend -= amount;
            newData.spent += amount;
            if (debtId) {
                newData.debts = newData.debts.map(d => d.id === debtId ? { ...d, total_balance: Math.max(0, Number(d.total_balance) - amount) } : d);
            }
        }
        newData.recentTransactions = [newTx, ...newData.recentTransactions];

        setData(newData);

        try {
            await addTransaction(amount, description || "", type, categoryId, debtId);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseMonth = async () => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        if (!confirm("Are you sure? This should be done at the END of the month.")) return;

        setIsSubmitting(true);
        try {
            const res = await closeMonth();
            if (res.success) {
                alert("Month Closed and Rolled Over!");
            } else {
                alert("Error: " + res.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen p-4 md:p-6 max-w-lg mx-auto space-y-6 pb-32">
            {/* App Header */}
            <header className="flex justify-between items-center mt-4">
                <h1 className="font-bold text-stone-900 tracking-tight">Notepad Budget</h1>
                <span className="text-xs font-mono text-stone-400">{new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
            </header>

            {/* Hero Card */}
            <section>
                <PaperCard className="bg-stone-900 text-stone-50 border-stone-800 shadow-xl">
                    <div className="flex flex-col items-center justify-center p-6 py-8">
                        <span className="text-stone-400 uppercase text-[10px] font-bold tracking-[0.2em] mb-3">
                            Safe to Spend
                        </span>
                        <div className="text-5xl font-mono font-bold tracking-tighter">
                            {currency(data.safeToSpend)}
                        </div>
                    </div>
                </PaperCard>
            </section>

            {/* Quick Add */}
            <section className="space-y-4">
                <QuickAddForm
                    categories={data.categories}
                    debts={data.debts}
                    onAdd={handleQuickAdd}
                    isSubmitting={isSubmitting}
                />
            </section>

            {/* Transactions List */}
            <section className="space-y-2">
                <div className="flex justify-between items-end px-1">
                    <h3 className="text-stone-500 text-xs uppercase font-bold tracking-widest">Recent Transactions</h3>
                    <Link href="/categories" className="text-[10px] text-stone-400 underline hover:text-stone-600">
                        Manage Categories
                    </Link>
                </div>

                <div className="relative">
                    <div className="space-y-2">
                        {data.recentTransactions.length === 0 ? (
                            <p className="text-stone-300 text-sm p-4 text-center italic">No transactions yet.</p>
                        ) : (
                            data.recentTransactions.map(tx => (
                                <div key={tx.id} className="flex justify-between items-center p-3 border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors">
                                    <div>
                                        <div className="font-bold text-stone-800 text-sm">{tx.description}</div>
                                        <div className="text-[10px] text-stone-400 font-mono uppercase">
                                            {new Date(tx.date).toLocaleDateString()}
                                            {tx.type === 'debt_payment' && ' • Debt Pmt'}
                                            {tx.category_name && tx.type !== 'debt_payment' ? ` • ${tx.category_name}` : ''}
                                        </div>
                                    </div>
                                    <div className={clsx("font-mono font-bold text-sm", tx.type === 'income' ? "text-green-600" : "text-stone-900")}>
                                        {tx.type === 'income' ? '+' : '-'}{currency(tx.amount)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Debts Summary Link */}
            <section className="pt-4 border-t border-stone-200 border-dashed">
                <Link href="/debts">
                    <PaperCard className="bg-stone-50 hover:bg-white transition-colors border border-stone-200 group cursor-pointer">
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <h3 className="text-stone-500 text-xs uppercase font-bold tracking-widest mb-1">Total Debt</h3>
                                <p className="text-stone-400 text-[10px] group-hover:text-stone-600 transition-colors">Manage {data.debts.length} Trackers &rarr;</p>
                            </div>
                            <div className="text-2xl font-mono font-bold text-stone-800">
                                {currency(data.debts.reduce((acc, d) => acc + Number(d.total_balance), 0))}
                            </div>
                        </div>
                    </PaperCard>
                </Link>
            </section>

            {/* Footer / Rollover */}
            <section className="pt-8 opacity-50 hover:opacity-100 transition-opacity">
                <button
                    onClick={handleCloseMonth}
                    disabled={isSubmitting}
                    className="w-full py-3 border border-stone-200 text-xs text-stone-400 font-bold uppercase tracking-widest hover:bg-stone-50 disabled:opacity-50"
                >
                    Close Current Month
                </button>
            </section>
        </main>
    );
}

function QuickAddForm({ categories, debts, onAdd, isSubmitting }: {
    categories: { id: string, name: string }[],
    debts: { id: string, name: string }[],
    onAdd: (type: TxType, amount: string, targetId?: string, desc?: string) => void,
    isSubmitting: boolean
}) {
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [targetId, setTargetId] = useState("");
    const [type, setType] = useState<TxType>('expense');

    const handleSubmit = () => {
        onAdd(type, amount, targetId, description);
        setAmount("");
        setDescription("");
        setTargetId("");
        setType('expense');
    };

    return (
        <PaperCard className="p-4 space-y-3">
            {/* Amount Input */}
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xl">$</span>
                <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-transparent border-b-2 border-stone-100 text-3xl font-mono font-bold text-stone-900 placeholder:text-stone-200 outline-none focus:border-stone-900 transition-colors"
                />
            </div>

            {/* Type Selection */}
            <div className="flex gap-2 text-xs">
                <button
                    onClick={() => { setType('expense'); setTargetId(""); }}
                    className={clsx("px-3 py-1 rounded-full border transition-colors", type === 'expense' ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50")}
                >Expense</button>
                <button
                    onClick={() => { setType('income'); setTargetId(""); }}
                    className={clsx("px-3 py-1 rounded-full border transition-colors", type === 'income' ? "bg-green-100 text-green-700 border-green-200 font-bold" : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50")}
                >Income</button>
                <button
                    onClick={() => { setType('debt_payment'); setTargetId(""); }}
                    className={clsx("px-3 py-1 rounded-full border transition-colors", type === 'debt_payment' ? "bg-blue-100 text-blue-700 border-blue-200 font-bold" : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50")}
                >Pay Debt</button>
            </div>

            {/* Details Row */}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Note (optional)"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="flex-1 bg-stone-50 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-stone-200 transition-shadow focus:border-stone-300 border border-transparent"
                />

                {/* Dynamic Dropdown based on Type */}
                {type === 'expense' && (
                    <select
                        value={targetId}
                        onChange={e => setTargetId(e.target.value)}
                        className="flex-1 bg-stone-50 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-stone-200 text-stone-600 appearance-none bg-no-repeat bg-[right_0.5rem_center] cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
                    >
                        <option value="">Category...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}

                {type === 'debt_payment' && (
                    <select
                        value={targetId}
                        onChange={e => setTargetId(e.target.value)}
                        className="flex-1 bg-blue-50 rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-200 text-blue-800 appearance-none font-bold cursor-pointer"
                    >
                        <option value="">Select Debt...</option>
                        {debts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                )}

                {type === 'income' && <div className="flex-1"></div>}
            </div>

            {/* Action Button */}
            <div className="pt-2">
                <button
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className={clsx(
                        "w-full py-3 rounded font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2",
                        type === 'expense' ? "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-800" :
                            type === 'income' ? "bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800" :
                                "bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800"
                    )}
                >
                    {type === 'expense' && <Minus size={16} />}
                    {type === 'income' && <Plus size={16} />}
                    {type === 'debt_payment' && <ArrowRight size={16} />}

                    {type === 'expense' ? "Add Expense" : type === 'income' ? "Add Income" : "Record Payment"}
                </button>
            </div>
        </PaperCard>
    )
}
