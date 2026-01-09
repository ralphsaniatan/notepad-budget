"use client";

import { useState, useEffect } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { addTransaction, closeMonth } from "@/app/actions";
import clsx from "clsx";
import Link from "next/link";
import { MobileAddBar } from "@/components/MobileAddBar";
import { EditTransactionSheet } from "@/components/EditTransactionSheet";
import { Info, X } from "lucide-react";

type DashboardData = {
    safeToSpend: number;
    spent: number;
    debts: { id: string, name: string, total_balance: number, interest_rate: number }[];
    recentTransactions: { id: string, description: string, amount: number, type: 'income' | 'expense' | 'debt_payment', date: string, category_name?: string, category_id?: string, debt_id?: string }[];
    categories: { id: string, name: string }[];
    breakdown?: { income: number, rollover: number, commitments: number, spent: number };
};

type TxType = 'expense' | 'income' | 'debt_payment';

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
    const [data, setData] = useState(initialData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingTx, setEditingTx] = useState<any>(null);
    const [showBreakdown, setShowBreakdown] = useState(false);

    // Date Logic
    // Use the date from the first transaction or today if empty vs URL param... 
    // Actually simpler: we can infer the "Viewed Month" from the passed-in props? 
    // But for now let's just use url param or today.
    // Ideally passed from server, but we can reconstruct from query params if we had them.
    // Let's rely on a client-side parsed date for the header display.
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const m = params.get('month');
        if (m) setCurrentDate(new Date(m));
        else setCurrentDate(new Date());

        setData(initialData);
    }, [initialData]);

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
        const isoParams = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`;
        window.location.href = `/?month=${isoParams}`; // Standard nav to refresh server data
    };

    const currentMonthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const isFuture = false; // logic placeholder

    // Check if we are viewing the *real* current month to allow closing
    const realNow = new Date();
    const isCurrentRealMonth = realNow.getMonth() === currentDate.getMonth() && realNow.getFullYear() === currentDate.getFullYear();

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    // Only allow closing if it's the *Current Real Month* and it's over, OR if we are looking at a past active month? 
    // Actually "Close Month" button should probably only appear if we are on the current active month.
    const canClose = isCurrentRealMonth && realNow.getDate() >= daysInMonth;

    const currency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(val);

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
            id: Math.random().toString(), // Temp ID
            description: description || (type === 'income' ? 'Income' : type === 'debt_payment' ? 'Debt Payment' : 'Expense'),
            amount,
            type,
            date: new Date().toISOString(),
            category_name: type === 'debt_payment'
                ? `To: ${data.debts.find(d => d.id === debtId)?.name}`
                : data.categories.find(c => c.id === categoryId)?.name,
            category_id: categoryId,
            debt_id: debtId
        };

        const newData = { ...data };
        if (type === 'expense') {
            newData.safeToSpend -= amount;
            newData.spent += amount;
            if (newData.breakdown) newData.breakdown.spent += amount;
        } else if (type === 'income') {
            newData.safeToSpend += amount;
            if (newData.breakdown) newData.breakdown.income += amount;
        } else if (type === 'debt_payment') {
            newData.safeToSpend -= amount;
            newData.spent += amount;
            if (newData.breakdown) newData.breakdown.spent += amount;
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

    return (
        <main className="min-h-screen p-4 md:p-6 max-w-lg mx-auto space-y-6 pb-40">
            {/* App Header */}
            <header className="flex justify-between items-center mt-4">
                <h1 className="font-bold text-stone-900 tracking-tight text-xl">Notepad Budget</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => changeMonth(-1)} className="text-stone-400 hover:text-stone-900 text-lg font-bold px-2 py-1">&larr;</button>
                    <span className="text-sm font-bold font-mono text-stone-900 bg-yellow-200 px-2 py-1 transform -rotate-2 shadow-sm">
                        {currentMonthName}
                    </span>
                    <button onClick={() => changeMonth(1)} className="text-stone-400 hover:text-stone-900 text-lg font-bold px-2 py-1">&rarr;</button>
                </div>
            </header>

            {/* Hero Card */}
            <section>
                <PaperCard className="bg-stone-900 text-stone-50 border-stone-800 shadow-xl transition-transform hover:scale-[1.01] relative">
                    {/* Info Icon */}
                    <button
                        onClick={() => setShowBreakdown(true)}
                        className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 transition-colors"
                    >
                        <Info size={20} />
                    </button>

                    <div className="flex flex-col items-center justify-center p-6 py-10">
                        <span className="text-stone-400 uppercase text-[10px] font-bold tracking-[0.2em] mb-4">
                            Safe to Spend
                        </span>
                        <div className={clsx("flex items-center justify-center gap-2 font-mono font-bold tracking-tighter", data.safeToSpend < 0 ? "text-red-500" : "text-white")}>
                            <span className="text-xl md:text-2xl opacity-80">AED</span>
                            <span className="text-5xl md:text-6xl">
                                {data.safeToSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        {data.spent > 0 && <div className="mt-4 bg-red-600 border border-red-700 text-white text-xs font-mono px-4 py-2 rounded-full font-bold shadow-sm">Spent: {currency(data.spent)}</div>}
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
                                <div
                                    key={tx.id}
                                    onClick={() => setEditingTx(tx)}
                                    className="flex justify-between items-center p-3 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors rounded-lg cursor-pointer active:bg-stone-100"
                                >
                                    <div>
                                        <div className="font-bold text-stone-800 text-sm capitalize">{tx.description}</div>
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
                debts={data.debts.filter(d => d.total_balance > 0)}
                onAdd={handleQuickAdd}
                isSubmitting={isSubmitting}
            />

            {/* Edit Sheet */}
            {editingTx && (
                <EditTransactionSheet
                    transaction={editingTx}
                    categories={data.categories}
                    debts={data.debts.filter(d => d.total_balance > 0)}
                    onClose={() => setEditingTx(null)}
                />
            )}

            {/* Breakdown Sheet */}
            {showBreakdown && data.breakdown && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-stone-900">Calculated Budget</h2>
                            <button onClick={() => setShowBreakdown(false)} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm border-b border-stone-100 pb-2">
                                <span className="text-stone-500">Monthly Income</span>
                                <span className="font-mono font-bold text-green-600">+{currency(data.breakdown.income)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-stone-100 pb-2">
                                <span className="text-stone-500">Rollover from Prev. Month</span>
                                <span className={clsx("font-mono font-bold", data.breakdown.rollover >= 0 ? "text-green-600" : "text-red-600")}>
                                    {data.breakdown.rollover >= 0 ? '+' : ''}{currency(data.breakdown.rollover)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-stone-100 pb-2">
                                <span className="text-stone-500">Fixed Bills (Commitments)</span>
                                <span className="font-mono font-bold text-stone-800">-{currency(data.breakdown.commitments)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-stone-100 pb-2 mb-4">
                                <span className="text-stone-500">Variable Spent</span>
                                <span className="font-mono font-bold text-red-600">-{currency(data.breakdown.spent)}</span>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t-2 border-stone-900">
                                <span className="font-bold text-stone-900 text-lg">Safe to Spend</span>
                                <span className={clsx("font-mono font-bold text-xl", data.safeToSpend < 0 ? "text-red-600" : "text-stone-900")}>
                                    {currency(data.safeToSpend)}
                                </span>
                            </div>
                        </div>

                        <p className="text-[10px] text-stone-400 text-center px-8">
                            This is your "Safe to Spend" amount after setting aside money for fixed bills and accounting for what you've already spent.
                        </p>
                    </div>
                </div>
            )}
        </main>
    );
}
