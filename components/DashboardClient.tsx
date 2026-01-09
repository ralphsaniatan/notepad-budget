"use client";

import { useState, useEffect } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { addTransaction, closeMonth } from "@/app/actions";
import clsx from "clsx";
import Link from "next/link";
import { MobileAddBar } from "@/components/MobileAddBar";

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

    // Date Logic for UI
    const now = new Date();
    const currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const isEndOfMonth = now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    // Simplistic Logic: Show close button only if today is arguably "after" the budget month, or strictly near end.
    // For this app, let's say we only show it if the user visits in a new month but the "Old" month is still active (which isn't tracked here client side easily without props),
    // OR simply allow it only on the last few days? 
    // User asked: "only if its the end of the month or weve passed the month".
    // Let's check against daysInMonth.
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const canClose = now.getDate() >= daysInMonth;

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
        if (!confirm("Are you sure? This will Archive the current month and start fresh.")) return;

        setIsSubmitting(true);
        try {
            const res = await closeMonth();
            if (res.success) {
                alert("Month Closed Successfully!");
                window.location.reload(); // Force full reload to get new month data
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
        <main className="min-h-screen p-4 md:p-6 max-w-lg mx-auto space-y-6 pb-40">
            {/* App Header */}
            <header className="flex justify-between items-center mt-4">
                <h1 className="font-bold text-stone-900 tracking-tight text-xl">Notepad Budget</h1>
                <span className="text-sm font-bold font-mono text-stone-900 bg-yellow-200 px-2 py-1 transform -rotate-2 shadow-sm">
                    {currentMonthName}
                </span>
            </header>

            {/* Hero Card */}
            <section>
                <PaperCard className="bg-stone-900 text-stone-50 border-stone-800 shadow-xl transition-transform hover:scale-[1.01]">
                    <div className="flex flex-col items-center justify-center p-6 py-10">
                        <span className="text-stone-400 uppercase text-[10px] font-bold tracking-[0.2em] mb-4">
                            Safe to Spend
                        </span>
                        <div className="text-6xl font-mono font-bold tracking-tighter">
                            {currency(data.safeToSpend)}
                        </div>
                        {data.spent > 0 && <div className="mt-4 text-stone-500 text-xs font-mono bg-stone-800 px-3 py-1 rounded-full">Spent: {currency(data.spent)}</div>}
                    </div>
                </PaperCard>
            </section>

            {/* Transactions List */}
            <section className="space-y-3">
                <div className="flex justify-between items-end px-2">
                    <h3 className="text-stone-500 text-xs uppercase font-bold tracking-widest">Recent Transactions</h3>
                    <Link href="/categories" className="text-[10px] text-stone-400 underline hover:text-stone-600 font-mono">
                        Manage Categories
                    </Link>
                </div>

                <div className="relative">
                    <div className="space-y-2">
                        {data.recentTransactions.length === 0 ? (
                            <p className="text-stone-300 text-sm p-8 text-center italic border-2 border-dashed border-stone-200 rounded-xl">
                                No transactions yet.<br /><span className="text-xs">Tap + to add one.</span>
                            </p>
                        ) : (
                            data.recentTransactions.map(tx => (
                                <div key={tx.id} className="flex justify-between items-center p-3 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors rounded-lg">
                                    <div>
                                        <div className="font-bold text-stone-800 text-sm">{tx.description}</div>
                                        <div className="text-[10px] text-stone-400 font-mono uppercase flex items-center gap-1">
                                            <span>{new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            {tx.type === 'debt_payment' && <span className="bg-blue-100 text-blue-600 px-1 rounded ml-1">Debt Pmt</span>}
                                            {tx.category_name && tx.type !== 'debt_payment' ? <span className="text-stone-300">• {tx.category_name}</span> : ''}
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
                    <PaperCard className="bg-stone-50 hover:bg-white transition-colors border border-stone-200 group cursor-pointer hover:shadow-md">
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

            {/* Footer / Rollover - Only Show if End of Month */}
            {canClose && (
                <section className="pt-8 opacity-70 hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleCloseMonth}
                        disabled={isSubmitting}
                        className="w-full py-4 border-2 border-stone-200 text-xs text-stone-500 font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 rounded-xl"
                    >
                        Close & Roll Over to Next Month
                    </button>
                </section>
            )}

            {/* Persistent Mobile Add Bar */}
            <MobileAddBar
                categories={data.categories}
                debts={data.debts}
                onAdd={handleQuickAdd}
                isSubmitting={isSubmitting}
            />
        </main>
    );
}
