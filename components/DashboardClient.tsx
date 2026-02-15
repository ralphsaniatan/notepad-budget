"use client";

import { useState, useEffect } from "react";
import { signOut } from "@/app/auth/actions";
import { PaperCard } from "@/components/ui/PaperCard";
import clsx from "clsx";
import Link from "next/link";
import { MobileAddBar } from "@/components/MobileAddBar";
import { EditTransactionSheet } from "@/components/EditTransactionSheet";
import { Info, AlertTriangle, Loader2, Calendar, ChevronDown, Settings } from "lucide-react";
import { TrackedBudgetList } from "@/components/TrackedBudgetList";
import { closeMonth } from "@/app/actions";
import { Spinner } from "@/components/ui/Spinner";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { addTransaction } from "@/app/actions";

type DashboardData = {
    // Legacy props structure - used for default/context
    initialData?: any;
};

type TxType = 'expense' | 'income' | 'debt_payment';

export function DashboardClient({ initialData }: DashboardData) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingTx, setEditingTx] = useState<any>(null);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    // Live Query for Data
    const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray()) || [];
    const categories = useLiveQuery(() => db.categories.toArray()) || [];
    const debts = useLiveQuery(() => db.debts.toArray()) || [];

    // Pagination State (Client-side slicing of local data)
    const [limit, setLimit] = useState(10);

    // Date Logic
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const m = params.get('month');
        if (m) setCurrentDate(new Date(m));
        else setCurrentDate(new Date());
    }, []);

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
        const isoParams = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`;
        window.location.href = `/?month=${isoParams}`;
    };

    const handleLoadMore = () => {
        setLimit(prev => prev + 10);
    };

    const currentMonthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const isoMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;

    // --- Calculations (Client Side) ---
    // Filter transactions by month
    const currentMonthTransactions = transactions.filter(t => t.date.startsWith(isoMonthStr.substring(0, 7)));

    let safeToSpend = 0;
    let spent = 0;
    let income = 0;
    let rollover = 0;

    const breakdown = { income: 0, rollover: 0, commitments: 0, spent: 0 };

    // Use Server Data for "Base" values (Rollover) if available
    if (initialData?.breakdown) {
        rollover = initialData.breakdown.rollover;
        breakdown.rollover = rollover;
    }

    // Calculate Totals from Live Local Data
    // We need committed categories for "Safe to Spend"
    const committedCategories = categories.filter(c => c.type === 'fixed' || c.budget_limit > 0);
    const totalCommitments = committedCategories.reduce((acc, c) => acc + Number(c.budget_limit), 0);
    breakdown.commitments = totalCommitments;

    currentMonthTransactions.forEach(tx => {
        const amt = Number(tx.amount);
        if (tx.type === 'income') {
            income += amt;
            breakdown.income += amt;
        } else {
            spent += amt;
            breakdown.spent += amt;
        }
    });

    safeToSpend = (income + rollover) - totalCommitments - spent;

    // Disable closing for now in Local Mode until we build full month-management logic logic
    const canClose = false;

    const currency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(val);

    const handleQuickAdd = async (type: TxType, amountStr: string, targetId?: string, description?: string, debtId?: string) => {
        if (!amountStr) return;
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return;

        setIsSubmitting(true);
        const txId = crypto.randomUUID();

        try {
            // 1. Write to Local DB Immediately
            const newTx = {
                id: txId,
                description: description || (type === 'income' ? 'Income' : type === 'debt_payment' ? 'Debt Payment' : 'Expense'),
                amount,
                type,
                date: new Date().toISOString(),
                category_id: (type !== 'debt_payment' && targetId) ? targetId : undefined,
                debt_id: type === 'debt_payment' ? targetId : debtId, // Use debtId for CC expenses
                user_id: 'unknown',
                created_at: new Date().toISOString(),
                sync_status: 'created' as const
            };

            await db.transactions.add(newTx);

            // Optimistic update for Debt Balance (Credit Card Spending)
            if (type === 'expense' && debtId) {
                const debt = debts.find(d => d.id === debtId);
                if (debt) {
                    await db.debts.update(debtId, {
                        total_balance: Number(debt.total_balance) + amount,
                        sync_status: 'updated'
                    });
                }
            }

            // 2. Trigger Server Action (Hybrid Sync)
            const result = await addTransaction(amount, description || "", type, targetId, type === 'debt_payment' ? targetId : debtId);

            // 3. CRITICAL: Mark as synced to prevent SyncManager creating duplicate
            if (result?.success) {
                await db.transactions.update(txId, { sync_status: 'synced' });
            }

            toast.success("Transaction Added", {
                description: `${description || (type === 'income' ? 'Income' : 'Expense')} for ${currency(amount)} logged.`
            });

        } catch (err) {
            console.error(err);
            toast.error("Failed to save transaction");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Pull to Refresh State
    const [pullChange, setPullChange] = useState(0);
    const [touchStart, setTouchStart] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const onTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY === 0) setTouchStart(e.touches[0].clientY);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (touchStart === 0 || window.scrollY > 0) return;
        const diff = e.touches[0].clientY - touchStart;
        if (diff > 0) setPullChange(diff * 0.4);
    };

    const onTouchEnd = () => {
        if (pullChange > 100) {
            setIsRefreshing(true);
            window.location.reload();
        } else {
            setPullChange(0);
            setTouchStart(0);
        }
    };

    const handleCloseMonth = async () => {
        // Placeholder
        alert("Closing month must be done online for now.");
    };

    const displayTransactions = transactions.slice(0, limit);

    return (
        <>
            <main
                className="min-h-screen p-4 md:p-6 max-w-lg mx-auto space-y-6 pb-40 relative transition-transform duration-200 ease-out"
                style={{ transform: `translateY(${pullChange}px)` }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Refresh Indicator */}
                <div
                    className="absolute top-0 left-0 right-0 flex justify-center -mt-10 pointer-events-none"
                    style={{ opacity: Math.min(1, pullChange / 50) }}
                >
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
                        {isRefreshing ? "Refreshing..." : pullChange > 100 ? "Release to Refresh" : "Pull to Refresh"}
                    </span>
                </div>

                {/* App Header */}
                <header className="flex justify-between items-center mt-4">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Notepad Budget" className="h-8" />
                        <Link href="/profile" className="p-2 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors">
                            <Settings size={18} className="text-stone-400" />
                        </Link>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowMonthPicker(!showMonthPicker)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 transition-colors text-stone-700 font-bold text-sm"
                        >
                            <Calendar size={14} />
                            <span>{currentMonthName}</span>
                            <ChevronDown size={14} className={clsx("transition-transform", showMonthPicker && "rotate-180")} />
                        </button>
                        {showMonthPicker && (
                            <div className="absolute right-0 top-full mt-2 bg-white border border-stone-200 rounded-xl shadow-xl z-50 p-2 min-w-[200px]">
                                <div className="grid grid-cols-3 gap-1">
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const monthDate = new Date(currentDate.getFullYear(), i, 1);
                                        const isCurrentMonth = i === currentDate.getMonth();
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setCurrentDate(monthDate);
                                                    setShowMonthPicker(false);
                                                }}
                                                className={clsx(
                                                    "px-2 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                                    isCurrentMonth
                                                        ? "bg-stone-900 text-white"
                                                        : "hover:bg-stone-100 text-stone-600"
                                                )}
                                            >
                                                {monthDate.toLocaleDateString('en-US', { month: 'short' })}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex gap-1 mt-2 pt-2 border-t border-stone-100">
                                    <button
                                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))}
                                        className="flex-1 px-2 py-1 rounded text-xs font-bold text-stone-400 hover:bg-stone-100"
                                    >
                                        {currentDate.getFullYear() - 1}
                                    </button>
                                    <span className="flex-1 px-2 py-1 text-center text-xs font-bold text-stone-700">
                                        {currentDate.getFullYear()}
                                    </span>
                                    <button
                                        onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))}
                                        className="flex-1 px-2 py-1 rounded text-xs font-bold text-stone-400 hover:bg-stone-100"
                                    >
                                        {currentDate.getFullYear() + 1}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Hero Card - Compact */}
                <section>
                    <PaperCard className="bg-white text-stone-900 border-stone-200 shadow-lg relative">
                        {/* Info Icon */}
                        <button
                            onClick={() => setShowBreakdown(true)}
                            className="absolute top-3 right-3 text-stone-400 hover:text-stone-600 transition-all active:scale-90"
                        >
                            <Info size={16} />
                        </button>

                        <div className="flex flex-col items-center justify-center px-4 py-5">
                            <span className="text-stone-400 uppercase text-[9px] font-bold tracking-[0.2em] mb-2">
                                Safe to Spend
                            </span>
                            <div className={clsx("flex items-center justify-center gap-1 font-mono font-bold tracking-tighter", safeToSpend < 0 ? "text-red-600" : "text-stone-900")}>
                                <span className="text-base opacity-60">AED</span>
                                <span className="text-3xl md:text-4xl">
                                    {safeToSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            {spent > 0 && <div className="mt-2 bg-red-50 text-red-600 text-[10px] font-mono px-3 py-1 rounded-full font-bold">Spent: {currency(spent)}</div>}
                        </div>
                    </PaperCard>
                </section>

                {/* Tracked Budgets */}
                <div className="mt-8">
                    <TrackedBudgetList />
                </div>

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
                            {displayTransactions.length === 0 ? (
                                <p className="text-stone-300 text-sm p-8 text-center italic border-2 border-dashed border-stone-200 rounded-xl">
                                    No transactions yet.<br /><span className="text-xs">Tap + to add one.</span>
                                </p>
                            ) : (
                                <>
                                    {displayTransactions.map((tx) => {
                                        // Enrich Category Name
                                        const catName = categories.find(c => c.id === tx.category_id)?.name;
                                        // Enrich Debt Name (for payments OR credit card spends)
                                        const debtName = tx.debt_id ? debts.find(d => d.id === tx.debt_id)?.name : undefined;

                                        return (
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

                                                        {/* Badge for Credit Card Spending */}
                                                        {tx.type === 'expense' && tx.debt_id && (
                                                            <span className="bg-red-100 text-red-600 px-1 rounded ml-1 flex items-center gap-0.5">
                                                                Credit: {debtName || 'Debt'}
                                                            </span>
                                                        )}

                                                        {catName && tx.type !== 'debt_payment' ? <span className="text-stone-300">• {catName}</span> : ''}
                                                    </div>
                                                </div>
                                                <div className={clsx("font-mono font-bold text-sm", tx.type === 'income' ? "text-green-600" : "text-stone-900")}>
                                                    {tx.type === 'income' ? '+' : '-'}{currency(Number(tx.amount))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {transactions.length > limit && (
                                        <button
                                            onClick={handleLoadMore}
                                            className="w-full py-3 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-lg transition-colors border border-dashed border-stone-200 flex items-center justify-center gap-2 active:scale-98"
                                        >
                                            Load More
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* Savings & Debts Links - Sticky Note Style */}
                <section className="pt-4 border-t border-stone-200 border-dashed grid grid-cols-2 gap-4">
                    <Link href="/savings">
                        <div className="relative bg-amber-50 hover:bg-amber-100 border-l-4 border-amber-400 rounded-r-xl shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 p-4 h-full min-h-[100px]">
                            {/* Washi tape effect */}
                            <div className="absolute -top-1 left-4 w-8 h-3 bg-amber-300/70 rounded-sm transform -rotate-2"></div>
                            <h3 className="text-amber-700 text-[10px] uppercase font-bold tracking-widest mb-2">Money Goals</h3>
                            <div className="text-lg font-bold text-amber-900 flex items-center gap-1">
                                Planning &rarr;
                            </div>
                        </div>
                    </Link>

                    <Link href="/debts">
                        <div className="relative bg-rose-50 hover:bg-rose-100 border-l-4 border-rose-400 rounded-r-xl shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 p-4 h-full min-h-[100px]">
                            {/* Washi tape effect */}
                            <div className="absolute -top-1 left-4 w-8 h-3 bg-rose-300/70 rounded-sm transform rotate-2"></div>
                            <h3 className="text-rose-700 text-[10px] uppercase font-bold tracking-widest mb-2">Total Debt</h3>
                            <div className="text-lg font-mono font-bold text-rose-900 break-all leading-tight">
                                <span className="text-xs mr-1 opacity-60">AED</span>
                                {debts.reduce((acc, d) => acc + Number(d.total_balance), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </Link>
                </section>

                {/* Footer / Log Out */}
                <footer className="text-center py-8 space-y-4">
                    <div className="text-[10px] text-stone-300 font-mono select-all">
                        v{process.env.APP_VERSION}
                    </div>
                </footer>



            </main>

            {/* Persistent Mobile Add Bar */}
            <MobileAddBar
                categories={categories}
                debts={debts}
                onAdd={handleQuickAdd}
                isSubmitting={isSubmitting}
            />

            {/* Edit Sheet (Placeholder) */}
            {
                editingTx && (
                    <EditTransactionSheet
                        transaction={editingTx}
                        categories={categories}
                        debts={debts.filter(d => d.total_balance > 0)}
                        onClose={() => setEditingTx(null)}
                    />
                )
            }

            {/* Breakdown Popover */}
            {
                showBreakdown && breakdown && (
                    <div
                        onClick={() => setShowBreakdown(false)}
                        className="fixed inset-0 z-40 bg-transparent cursor-default"
                    >
                        {/* Backdrop for click-away */}
                    </div>
                )
            }

            {
                showBreakdown && breakdown && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-50 animate-in fade-in zoom-in duration-200 shadow-2xl rounded-2xl overflow-hidden ring-4 ring-stone-900/5">
                        <div className="bg-white p-6 space-y-4 text-stone-900">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-xs uppercase font-bold text-stone-400 tracking-widest">Budget Math</h4>
                            </div>

                            <div className="space-y-2 font-mono text-sm">
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Income</span>
                                    <span className="font-bold text-green-600">+{currency(breakdown.income)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Rollover</span>
                                    <span className={clsx("font-bold", breakdown.rollover >= 0 ? "text-green-600" : "text-red-600")}>
                                        {breakdown.rollover >= 0 ? '+' : ''}{currency(breakdown.rollover)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-stone-500">Fixed Bills</span>
                                    <span className="font-bold text-stone-700">-{currency(breakdown.commitments)}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-stone-100">
                                    <span className="text-stone-500">Spent</span>
                                    <span className="font-bold text-red-600">-{currency(breakdown.spent)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
