"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { addCategory } from "@/app/actions";
import { toast } from "sonner";
import { Category } from "./types";

// Currency helper
const currency = (amount: number) =>
    new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

export type { Category };

interface CategorySheetProps {
    onClose: () => void;
    onSave: (c: Category) => void;
    // Keeping this optional to avoid breaking callers immediately, though it will be ignored
    category?: Category;
    allCategories?: Category[];
    onDelete?: (id: string) => void;
}

export function CategorySheet({
    onClose,
    onSave
}: CategorySheetProps) {
    // -- Details State --
    const [name, setName] = useState("");
    const [commitmentType, setCommitmentType] = useState<'fixed' | 'variable_fixed' | null>(null);

    // Limits with Math Support
    const [budgetLimit, setBudgetLimit] = useState("");

    const computeAndSetLimit = () => {
        try {
            // Allow basic math (sanitized)
            // eslint-disable-next-line no-useless-escape
            const sanitized = budgetLimit.replace(/[^0-9\+\-\*\/\.]/g, '');
            if (!sanitized) return;
            // eslint-disable-next-line no-eval
            const result = eval(sanitized);
            if (isFinite(result) && result >= 0) {
                setBudgetLimit(parseFloat(result).toFixed(2));
            }
        } catch (e) {
            // Ignore invalid math
            console.error("Math error", e);
        }
    };

    const [frequency, setFrequency] = useState(1);
    const [frequencyStart, setFrequencyStart] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [isPinned, setIsPinned] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        computeAndSetLimit(); // Ensure math is resolved
        setIsSubmitting(true);

        const limit = parseFloat(budgetLimit) || 0;
        const startVal = frequency > 1 ? `${frequencyStart}-01` : undefined;
        const finalLimit = limit / frequency; // Monthly limit stored in DB

        try {
            // Create
            const newId = crypto.randomUUID();
            await addCategory(name, commitmentType, finalLimit, isPinned, frequency, startVal);
            onSave({
                id: newId,
                name,
                commitment_type: commitmentType,
                is_commitment: !!commitmentType,
                budget_limit: finalLimit,
                is_pinned: isPinned,
                frequency_months: frequency,
                frequency_start: startVal,
                balance: 0
            });
            toast.success("Category created");
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-stone-900">New Category</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Name */}
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Category Name"
                            className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                            autoFocus
                        />

                        {/* Type Selection */}
                        <div className="space-y-2">
                            <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">Type</div>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setCommitmentType(null)}
                                    className={`p-3 rounded-lg border text-center transition-all ${commitmentType === null ? "bg-stone-900 text-white border-stone-900" : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"}`}
                                >
                                    <div className="text-sm font-bold">Standard</div>
                                </button>
                                <button
                                    onClick={() => setCommitmentType('fixed')}
                                    className={`p-3 rounded-lg border text-center transition-all ${commitmentType === 'fixed' ? "bg-blue-600 text-white border-blue-600" : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"}`}
                                >
                                    <div className="text-sm font-bold">Fixed</div>
                                </button>
                                <button
                                    onClick={() => setCommitmentType('variable_fixed')}
                                    className={`p-3 rounded-lg border text-center transition-all ${commitmentType === 'variable_fixed' ? "bg-purple-600 text-white border-purple-600" : "bg-white border-stone-200 text-stone-600 hover:border-stone-400"}`}
                                >
                                    <div className="text-sm font-bold">Needs</div>
                                </button>
                            </div>
                        </div>

                        {/* Calculator Budget Input */}
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold tracking-widest text-stone-400">
                                {frequency > 1 ? "Total Bill Amount (AED)" : (commitmentType === 'fixed' ? "Fixed Amount (AED)" : "Monthly Limit (AED)")}
                            </label>
                            <input
                                type="text"
                                inputMode="text"
                                value={budgetLimit}
                                onChange={e => setBudgetLimit(e.target.value)}
                                onBlur={computeAndSetLimit}
                                placeholder="0.00"
                                className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono font-bold outline-none focus:border-stone-900"
                            />
                            <div className="flex gap-2 justify-end">
                                {['+', '-', '×', '÷'].map(op => (
                                    <button
                                        key={op}
                                        type="button"
                                        onClick={() => {
                                            const symbol = op === '×' ? '*' : op === '÷' ? '/' : op;
                                            setBudgetLimit(prev => prev + symbol);
                                        }}
                                        className="w-8 h-8 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold"
                                    >
                                        {op}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={computeAndSetLimit}
                                    className="w-8 h-8 rounded bg-stone-800 text-white font-bold"
                                >
                                    =
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Pin Toggle */}
                    <label className="flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-100 rounded-lg cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isPinned}
                            onChange={e => setIsPinned(e.target.checked)}
                            className="rounded text-stone-900 focus:ring-stone-900"
                        />
                        <span className="text-xs font-bold text-stone-600 uppercase tracking-wide">Pin to Main Budget</span>
                    </label>

                    {/* Frequency Logic */}
                    {(commitmentType === 'fixed' || commitmentType === 'variable_fixed') && (
                        <div className="space-y-4 animate-in slide-in-from-top-1 fade-in duration-200 pt-2 border-t border-stone-100">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Frequency</label>
                                    {frequency > 1 && (
                                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                            Monthly: {currency((parseFloat(budgetLimit) || 0) / frequency)}
                                        </span>
                                    )}
                                </div>
                                <select
                                    value={frequency}
                                    onChange={e => setFrequency(Number(e.target.value))}
                                    className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900 appearance-none"
                                >
                                    <option value={1}>Monthly</option>
                                    <option value={2}>Every 2 Months</option>
                                    <option value={3}>Every 3 Months (Quarterly)</option>
                                    <option value={6}>Every 6 Months</option>
                                    <option value={12}>Yearly</option>
                                </select>
                            </div>
                            {frequency > 1 && (
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Payment Starts</label>
                                    <input
                                        type="month"
                                        value={frequencyStart}
                                        onChange={e => setFrequencyStart(e.target.value)}
                                        className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                                    />
                                    <p className="text-[10px] text-stone-400">The month you first pay the full bill</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting || !name.trim()}
                            className="w-full bg-stone-900 text-white py-4 rounded-xl text-lg font-bold shadow-lg transition-transform active:scale-95"
                        >
                            Create Category
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
