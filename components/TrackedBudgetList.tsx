"use client";

import { PaperCard } from "@/components/ui/PaperCard";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LocalCategory } from "@/lib/db";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { CategorySheet, Category } from "@/components/CategorySheet";

// Helper: Determine if the current month is a payment month for a frequency category
function isPaymentMonth(frequencyStart: string | null | undefined, frequencyMonths: number, currentIsoMonth: string): boolean {
    if (!frequencyStart || frequencyMonths <= 1) return true;
    const startDate = new Date(frequencyStart);
    const currentDate = new Date(currentIsoMonth);
    const monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + (currentDate.getMonth() - startDate.getMonth());
    return monthsDiff >= 0 && monthsDiff % frequencyMonths === 0;
}

export function TrackedBudgetList() {
    // 1. Get Pinned Categories
    const categories = useLiveQuery(() =>
        db.categories.filter(c => c.is_pinned === true).toArray()
    );

    const [currentDate, setCurrentDate] = useState(new Date());
    const [collapsed, setCollapsed] = useState(false);
    const [editingBudget, setEditingBudget] = useState<LocalCategory | null>(null);
    const [showDepleted, setShowDepleted] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const m = params.get('month');
        if (m) setCurrentDate(new Date(m));
    }, []);

    const isoMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;

    const transactions = useLiveQuery(() =>
        db.transactions.filter(t => t.date.startsWith(isoMonthStr.substring(0, 7))).toArray()
    );

    if (!categories || !transactions) return <div className="h-24 animate-pulse bg-stone-100 rounded-xl mb-6"></div>;
    if (categories.length === 0) return null;

    // 3. Calculate Logic
    const budgets = categories.map(cat => {
        const spent = transactions
            .filter(t => t.category_id === cat.id && (t.type === 'expense' || t.type === 'debt_payment'))
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const limit = Number(cat.budget_limit);
        const freq = cat.frequency_months || 1;
        const balance = cat.balance || 0;
        const paymentMonth = isPaymentMonth(cat.frequency_start, freq, isoMonthStr);

        // Payment month logic
        let effectiveLimit = limit;
        if (freq > 1) {
            effectiveLimit = paymentMonth ? limit * freq : limit;
        }

        // Fix: Always include balance (carryover + transfers) in available funds
        const totalAvailable = effectiveLimit + balance;
        const remaining = totalAvailable - spent;
        const percent = totalAvailable > 0 ? (spent / totalAvailable) * 100 : 0;

        let status: 'ok' | 'warning' | 'over' = 'ok';
        if (remaining < 0) status = 'over';
        else if (percent > 85) status = 'warning';

        return {
            ...cat,
            spent,
            remaining,
            percent,
            status,
            totalAvailable,
            effectiveLimit,
            isPaymentMonth: paymentMonth
        };
    });

    // Sort: Positive remaining first, then zero/negative
    // Sort: Positive remaining first, then zero/negative
    budgets.sort((a: any, b: any) => {
        const aZero = a.remaining <= 0;
        const bZero = b.remaining <= 0;
        if (aZero && !bZero) return 1;
        if (!aZero && bZero) return -1;
        return 0;
    });

    const handleOpenEdit = (budget: typeof budgets[0]) => {
        setEditingBudget(budget);
    };



    return (
        <>
            <section className="mb-8">
                <div className="flex justify-between items-center w-full px-1 mb-3">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="flex items-center gap-2 group"
                    >
                        <h2 className="text-xs uppercase font-bold tracking-widest text-stone-400 group-hover:text-stone-600 transition-colors">
                            Pinned Budgets ({budgets.length})
                        </h2>
                    </button>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowDepleted(!showDepleted)}
                            className="text-stone-400 hover:text-stone-600 transition-colors p-1"
                            title={showDepleted ? "Hide Completed" : "Show Completed"}
                        >
                            {showDepleted ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>

                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="text-stone-400 hover:text-stone-600 transition-colors p-1"
                        >
                            <svg
                                className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {!collapsed && (
                    <div className="flex flex-col gap-3">
                        {budgets
                            .filter(b => showDepleted || b.remaining > 0)
                            .map(b => {
                                const isDepleted = b.remaining <= 0;
                                return (
                                    <button
                                        key={b.id}
                                        onClick={() => handleOpenEdit(b)}
                                        className="block w-full text-left"
                                    >
                                        <PaperCard className={`border-l-4 transition-all hover:bg-stone-50 active:scale-[0.98] cursor-pointer ${isDepleted
                                            ? "border-l-stone-200 bg-stone-50/50 grayscale opacity-60 p-2"
                                            : "border-l-stone-900 p-3 space-y-2"
                                            }`}>
                                            <div className="flex justify-between items-end">
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`font-bold ${isDepleted ? "text-xs text-stone-500" : "text-sm text-stone-900"}`}>{b.name}</h3>
                                                    {b.frequency_months && b.frequency_months > 1 && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${b.isPaymentMonth
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-blue-50 text-blue-600'
                                                            }`}>
                                                            {b.isPaymentMonth ? 'DUE' : `Every ${b.frequency_months}m`}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right font-mono text-xs font-bold">
                                                    <span className={isDepleted ? "text-stone-400" : getStatusColor(b.status)}>
                                                        AED {Math.abs(b.remaining).toFixed(2)}
                                                    </span>
                                                    <span className="ml-1 text-[9px] uppercase text-stone-400 tracking-wider">
                                                        {b.status === 'over' ? 'Over' : 'Left'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress Bar - Only show if not depleted */}
                                            {!isDepleted && (
                                                <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(b.status, b.percent)}`}
                                                        style={{ width: `${Math.min(100, b.percent)}%` }}
                                                    />
                                                </div>
                                            )}
                                        </PaperCard>
                                    </button>
                                );
                            })}
                    </div>
                )}
            </section>

            {/* Standardized CategorySheet */}
            {editingBudget && (
                <CategorySheet
                    category={{
                        ...editingBudget,
                        commitment_type: editingBudget.type === 'fixed' ? 'fixed' : null,
                        is_commitment: editingBudget.type === 'fixed',
                    } as Category}
                    allCategories={categories.map(c => ({
                        ...c,
                        commitment_type: c.type === 'fixed' ? 'fixed' : null,
                        is_commitment: c.type === 'fixed'
                    } as Category))}
                    onClose={() => setEditingBudget(null)}
                    onSave={() => setEditingBudget(null)}
                />
            )}
        </>
    );
}

function getStatusColor(status: 'ok' | 'warning' | 'over') {
    if (status === 'over') return "text-red-600";
    if (status === 'warning') return "text-yellow-600";
    return "text-green-600";
}

function getProgressBarColor(status: 'ok' | 'warning' | 'over', percent: number) {
    if (status === 'over') return "bg-red-500";
    if (percent > 85) return "bg-yellow-500";
    return "bg-green-500";
}

