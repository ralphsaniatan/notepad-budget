"use client";

import { PaperCard } from "@/components/ui/PaperCard";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LocalCategory } from "@/lib/db";
import { useState, useEffect } from "react";
import { updateCategory } from "@/app/actions";
import { X, Save, Plus, Minus, Divide, Equal } from "lucide-react";
import { toast } from "sonner";

export function TrackedBudgetList() {
    // 1. Get Pinned Categories
    const categories = useLiveQuery(() =>
        db.categories.filter(c => c.is_pinned === true).toArray()
    );

    const [currentDate, setCurrentDate] = useState(new Date());
    const [collapsed, setCollapsed] = useState(false);
    const [editingBudget, setEditingBudget] = useState<LocalCategory | null>(null);
    const [editLimit, setEditLimit] = useState("");
    const [isSaving, setIsSaving] = useState(false);

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

    const handleOpenEdit = (budget: typeof budgets[0]) => {
        setEditingBudget(budget);
        setEditLimit(budget.budget_limit.toFixed(2));
    };

    // Math Expression Evaluator
    const evaluateMathExpression = (expr: string): number | null => {
        try {
            const sanitized = expr.replace(/[^0-9+\-*/.() ]/g, '');
            if (!sanitized) return null;
            const result = new Function('return ' + sanitized)();
            return typeof result === 'number' && isFinite(result) ? result : null;
        } catch {
            return null;
        }
    };

    const computeAndSetLimit = () => {
        const result = evaluateMathExpression(editLimit);
        if (result !== null) {
            setEditLimit(result.toFixed(2));
        }
    };

    const handleSave = async () => {
        if (!editingBudget) return;
        setIsSaving(true);

        const newLimit = parseFloat(editLimit) || 0;

        try {
            // Update local DB first (optimistic)
            await db.categories.update(editingBudget.id, { budget_limit: newLimit });

            // Sync to server
            const res = await updateCategory(
                editingBudget.id,
                editingBudget.name,
                editingBudget.type === 'fixed' ? 'fixed' : null,
                newLimit,
                editingBudget.is_pinned
            );

            if (res.success) {
                toast.success(`${editingBudget.name} updated to AED ${newLimit}`);
            } else {
                toast.error(res.error || "Failed to save");
            }
        } catch (e) {
            console.error("Save error", e);
            toast.error("Failed to save");
        } finally {
            setIsSaving(false);
            setEditingBudget(null);
        }
    };

    return (
        <>
            <section className="mb-8">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex justify-between items-center w-full px-1 mb-3 group"
                >
                    <h2 className="text-xs uppercase font-bold tracking-widest text-stone-400 group-hover:text-stone-600 transition-colors">
                        Pinned Budgets ({budgets.length})
                    </h2>
                    <svg
                        className={`w-4 h-4 text-stone-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {!collapsed && (
                    <div className="flex flex-col gap-3">
                        {budgets.map(b => (
                            <button
                                key={b.id}
                                onClick={() => handleOpenEdit(b)}
                                className="block w-full text-left"
                            >
                                <PaperCard className="p-3 space-y-2 border-l-4 border-l-stone-900 transition-all hover:bg-stone-50 active:scale-[0.98] cursor-pointer">
                                    <div className="flex justify-between items-end">
                                        <h3 className="font-bold text-stone-900 text-sm">{b.name}</h3>
                                        <div className="text-right font-mono text-xs font-bold">
                                            <span className={getStatusColor(b.status)}>
                                                AED {Math.abs(b.remaining).toFixed(0)}
                                            </span>
                                            <span className="text-stone-300"> / {b.budget_limit.toFixed(2)}</span>
                                            <span className="ml-1 text-[9px] uppercase text-stone-400 tracking-wider">
                                                {b.status === 'over' ? 'Over' : 'Left'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(b.status, b.percent)}`}
                                            style={{ width: `${Math.min(100, b.percent)}%` }}
                                        />
                                    </div>
                                </PaperCard>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            {editingBudget && (
                <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-t-2xl p-6 pb-10 space-y-6">
                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-stone-900">Edit Budget</h2>
                            <button onClick={() => setEditingBudget(null)} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Category Name */}
                        <div className="text-center">
                            <span className="text-stone-400 text-xs uppercase tracking-widest">{editingBudget.name}</span>
                        </div>

                        {/* Budget Limit Input */}
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold tracking-widest text-stone-400">
                                Monthly Limit (AED)
                            </label>
                            <input
                                type="text"
                                inputMode="text"
                                value={editLimit}
                                onChange={e => setEditLimit(e.target.value)}
                                onBlur={computeAndSetLimit}
                                placeholder="0.00 or 100+50"
                                autoFocus
                                className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-3xl font-mono font-bold outline-none focus:border-stone-900 text-center"
                            />
                            {/* Math Operator Buttons */}
                            <div className="flex justify-center gap-2 pt-2">
                                {['+', '-', '×', '÷'].map(op => (
                                    <button
                                        key={op}
                                        type="button"
                                        onClick={() => {
                                            const symbol = op === '×' ? '*' : op === '÷' ? '/' : op;
                                            setEditLimit(prev => prev + symbol);
                                        }}
                                        className="w-10 h-10 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-lg transition-colors"
                                    >
                                        {op}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={computeAndSetLimit}
                                    className="w-10 h-10 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-bold text-lg transition-colors"
                                >
                                    =
                                </button>
                            </div>
                        </div>

                        {/* Spent Info */}
                        <div className="text-center text-sm text-stone-400">
                            Spent this month: <span className="font-bold text-stone-700">AED {budgets.find(b => b.id === editingBudget.id)?.spent.toFixed(2) || '0.00'}</span>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
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

