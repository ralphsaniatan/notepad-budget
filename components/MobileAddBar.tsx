"use client";

import { useState } from "react";
import { Plus, X, Minus, ArrowRight } from "lucide-react";
import { PaperCard } from "@/components/ui/PaperCard";
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
            {/* 1. Persistent Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-8 z-40">
                <button
                    onClick={handleOpen}
                    className="w-full bg-stone-900 text-white shadow-xl py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 hover:bg-black transition-transform active:scale-95"
                >
                    <Plus size={20} /> Add Transaction
                </button>
            </div>

            {/* 2. Modal Overlay / Bottom Sheet */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-stone-100 rounded-t-2xl p-4 pb-8 space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">

                        {/* Header */}
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-lg font-bold text-stone-900">New Transaction</h2>
                            <button onClick={handleClose} className="p-2 bg-stone-200 rounded-full hover:bg-stone-300 text-stone-600">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Amount - BIG INPUT */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-200 text-center space-y-2">
                            <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">Amount</div>
                            <div className="relative inline-block">
                                <span className="absolute -left-10 top-1/2 -translate-y-1/2 text-xl text-stone-400 font-mono font-bold">AED</span>
                                <input
                                    type="number"
                                    autoFocus
                                    placeholder="0"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-40 text-center text-5xl font-bold font-mono text-stone-900 outline-none placeholder:text-stone-200"
                                />
                            </div>
                        </div>

                        {/* Type Toggles - BIG BUTTONS */}
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => { setType('expense'); setTargetId(""); }} className={clsx("py-3 rounded-lg font-bold text-sm border-2 transition-colors", type === 'expense' ? "border-stone-900 bg-stone-900 text-white" : "border-transparent bg-white text-stone-400")}>Expense</button>
                            <button onClick={() => { setType('income'); setTargetId(""); }} className={clsx("py-3 rounded-lg font-bold text-sm border-2 transition-colors", type === 'income' ? "border-green-600 bg-green-50 text-green-700" : "border-transparent bg-white text-stone-400")}>Income</button>
                            <button onClick={() => { setType('debt_payment'); setTargetId(""); }} className={clsx("py-3 rounded-lg font-bold text-sm border-2 transition-colors", type === 'debt_payment' ? "border-blue-600 bg-blue-50 text-blue-700" : "border-transparent bg-white text-stone-400")}>Pay Debt</button>
                        </div>

                        {/* Details */}
                        <div className="space-y-3 bg-white p-4 rounded-xl border border-stone-200">
                            <input
                                type="text"
                                placeholder="Note (e.g. Dinner, Rent)"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full text-lg border-b border-stone-100 py-2 outline-none"
                            />

                            {type === 'expense' && (
                                <select
                                    value={targetId}
                                    onChange={e => setTargetId(e.target.value)}
                                    className="w-full py-3 bg-stone-50 rounded-lg px-3 text-stone-800 font-bold outline-none"
                                >
                                    <option value="">Select Category...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            )}

                            {type === 'debt_payment' && (
                                <select
                                    value={targetId}
                                    onChange={e => setTargetId(e.target.value)}
                                    className="w-full py-3 bg-blue-50 rounded-lg px-3 text-blue-800 font-bold outline-none"
                                >
                                    <option value="">Select Debt to Pay...</option>
                                    {debts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            )}
                        </div>

                        {/* Submit - HUGE BUTTON */}
                        <button
                            disabled={isSubmitting || !amount}
                            onClick={handleSubmit}
                            className={clsx(
                                "w-full py-4 rounded-xl text-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2",
                                type === 'expense' ? "bg-stone-900 text-white" :
                                    type === 'income' ? "bg-green-600 text-white" :
                                        "bg-blue-600 text-white"
                            )}
                        >
                            {isSubmitting ? "Saving..." : "Save Transaction"}
                        </button>

                        <div className="h-8"></div> {/* Spacer for safe area */}
                    </div>
                </div>
            )}
        </>
    )
}
