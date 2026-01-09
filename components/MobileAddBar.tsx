"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import clsx from "clsx";

type TxType = 'expense' | 'income' | 'debt_payment';

export function MobileAddBar({ categories, debts, onAdd, isSubmitting }: {
    categories: { id: string, name: string }[],
    debts: { id: string, name: string }[],
    onAdd: (type: TxType, amount: string, targetId?: string, desc?: string) => void,
    isSubmitting: boolean
}) {
    const [isOpen, setIsOpen] = useState(false);

    // Form State
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [targetId, setTargetId] = useState("");
    const [type, setType] = useState<TxType>('expense');

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const handleSubmit = () => {
        onAdd(type, amount, targetId, description);
        setAmount("");
        setDescription("");
        setTargetId("");
        setType('expense');
        setIsOpen(false);
    };

    return (
        <>
            {/* 1. Floating Pill Button (FAB) */}
            <div className="fixed bottom-6 right-6 z-40">
                <button
                    onClick={handleOpen}
                    className="bg-stone-900 text-white shadow-xl px-6 py-4 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-black transition-transform active:scale-95"
                >
                    <Plus size={20} /> Add Transaction
                </button>
            </div>

            {/* 2. Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">

                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-stone-900">New Transaction</h2>
                            <button onClick={handleClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Type Tabs */}
                        <div className="flex border-b border-stone-200">
                            {[
                                { id: 'expense', label: 'Expense' },
                                { id: 'income', label: 'Income' },
                                { id: 'debt_payment', label: 'Debt Pay' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => { setType(t.id as TxType); setTargetId(""); }}
                                    className={clsx(
                                        "flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2",
                                        type === t.id
                                            ? "border-stone-900 text-stone-900"
                                            : "border-transparent text-stone-400 hover:text-stone-600"
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {/* Amount (Moved to Top) */}
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Amount (AED)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    autoFocus
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-2xl font-mono font-bold outline-none focus:border-stone-900"
                                />
                            </div>

                            {/* Detailed Description */}
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Description</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Groceries"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                                />
                            </div>

                            {/* Category / Debt Selection */}
                            {type === 'expense' && (
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Category</label>
                                    <select
                                        value={targetId}
                                        onChange={e => setTargetId(e.target.value)}
                                        className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                                    >
                                        <option value="">Select Category...</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {type === 'debt_payment' && (
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Debt Account</label>
                                    <select
                                        value={targetId}
                                        onChange={e => setTargetId(e.target.value)}
                                        className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                                    >
                                        <option value="">Select Debt...</option>
                                        {debts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            disabled={isSubmitting || !amount}
                            onClick={handleSubmit}
                            className="w-full bg-stone-900 text-white py-4 rounded-xl text-lg font-bold shadow-lg transition-transform active:scale-95"
                        >
                            {isSubmitting ? "Saving..." : "Save Transaction"}
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
