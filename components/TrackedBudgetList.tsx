"use client";

import { useEffect, useState } from "react";
import { getTrackedBudgets, TrackedBudget } from "@/app/actions";
import { PaperCard } from "@/components/ui/PaperCard";

export function TrackedBudgetList() {
    const [budgets, setBudgets] = useState<TrackedBudget[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await getTrackedBudgets();
                setBudgets(data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        }
        load();

        // Subscribe to changes? 
        // For MVP, simple load is fine.
    }, []);

    if (isLoading) return <div className="h-24 animate-pulse bg-stone-100 rounded-xl mb-6"></div>;
    if (budgets.length === 0) return null;

    return (
        <section className="mb-8">
            <h2 className="text-xs uppercase font-bold tracking-widest text-stone-400 mb-3 px-1">Pinned Budgets</h2>
            <div className="flex flex-col gap-4">
                {budgets.map(b => (
                    <div key={b.id} className="w-full">
                        <PaperCard className="p-4 space-y-3 border-l-4 border-l-stone-900">
                            <div className="flex justify-between items-end mb-1">
                                <h3 className="font-bold text-stone-900">{b.name}</h3>
                                <div className="text-right font-mono text-sm font-bold">
                                    <span className={getStatusColor(b.status)}>
                                        AED {Math.abs(b.remaining).toFixed(0)}
                                    </span>
                                    <span className="text-stone-300"> / {b.limit}</span>
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

function getStatusColor(status: TrackedBudget['status']) {
    if (status === 'over') return "text-red-600";
    if (status === 'warning') return "text-yellow-600";
    return "text-green-600";
}

function getProgressBarColor(status: TrackedBudget['status'], percent: number) {
    if (status === 'over') return "bg-red-500";
    if (percent > 85) return "bg-yellow-500";
    return "bg-green-500";
}
