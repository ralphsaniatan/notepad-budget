"use client";

import { PaperCard } from "@/components/ui/PaperCard";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState, useEffect } from "react";

export function TrackedBudgetList() {
    // 1. Get Pinned Categories
    const categories = useLiveQuery(() =>
        db.categories.filter(c => c.is_pinned === true).toArray()
    );

    // 2. Get Transactions for Current Month to calculate spending
    // We need current month context. For MVP, we use "Actual Current Month".
    // If we want to support "viewing past months" this needs to accept a date prop.
    // Let's assume global current month behavior for now or infer from URL?
    // Dashboard passes date context usually, but this component is standalone?
    // Let's assume "Current Real Month" for budgets? No, budgets should follow the view.
    // But `TrackedBudgetList` is currently inside Dashboard, inside a date context.
    // Ideally we pass `monthIso` as a prop. But to keep refactor simple, let's use URL or Today.

    const [currentDate, setCurrentDate] = useState(new Date());

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
            .filter(t => t.category_id === cat.id && (t.type === 'expense' || t.type === 'debt_payment')) // Budgets track outflows
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const limit = Number(cat.budget_limit);
        const remaining = limit - spent;
        const percent = limit > 0 ? (spent / limit) * 100 : 0;

        let status: 'ok' | 'warning' | 'over' = 'ok';
        if (remaining < 0) status = 'over';
        else if (percent > 85) status = 'warning';

        return {
            ...cat,
            spent,
            remaining,
            percent,
            status
        };
    });

    return (
        <section className="mb-8">
            <h2 className="text-xs uppercase font-bold tracking-widest text-stone-400 mb-3 px-1">Pinned Budgets</h2>
            <div className="flex flex-col gap-4">
                {budgets.map(b => (
                    <div key={b.id} className="w-full">
                        <PaperCard className="p-4 space-y-3 border-l-4 border-l-stone-900 transition-transform hover:scale-[1.01] active:scale-98 cursor-default">
                            <div className="flex justify-between items-end mb-1">
                                <h3 className="font-bold text-stone-900">{b.name}</h3>
                                <div className="text-right font-mono text-sm font-bold">
                                    <span className={getStatusColor(b.status)}>
                                        AED {Math.abs(b.remaining).toFixed(0)}
                                    </span>
                                    <span className="text-stone-300"> / {b.budget_limit}</span>
                                    <span className="ml-1 text-[10px] uppercase text-stone-400 tracking-wider">
                                        {b.status === 'over' ? 'Over' : 'Left'}
                                    </span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(b.status, b.percent)}`}
                                    style={{ width: `${Math.min(100, b.percent)}%` }}
                                />
                            </div>
                        </PaperCard>
                    </div>
                ))}
            </div>
        </section>
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
