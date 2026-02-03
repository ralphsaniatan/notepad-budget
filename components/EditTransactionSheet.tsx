"use client";

import { useState, useEffect } from "react";
import { Save, X, Trash2, Loader2 } from "lucide-react";
import clsx from "clsx";
import { updateTransaction, deleteTransaction } from "@/app/actions";
import { db } from "@/lib/db";
import { toast } from "sonner";

type TxType = 'expense' | 'income' | 'debt_payment';

export function EditTransactionSheet({
    transaction,
    categories,
    debts,
    onClose
}: {
    transaction: any,
    categories: { id: string, name: string }[],
    debts: { id: string, name: string }[],
    onClose: () => void
}) {
    const [amount, setAmount] = useState(Number(transaction.amount).toFixed(2));
    const [description, setDescription] = useState(transaction.description);
    const [targetId, setTargetId] = useState(
        transaction.type === 'expense' ? transaction.category_id :
            transaction.type === 'debt_payment' ? transaction.debt_id : ""
    );

    const [type, setType] = useState<TxType>(transaction.type);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdate = async () => {
        const newAmount = parseFloat(amount);
        const categoryId = type !== 'debt_payment' ? targetId : undefined;
        const debtId = type === 'debt_payment' ? targetId : undefined;

        // Close immediately for instant UX
        onClose();

        // Update local DB first (optimistic)
        try {
            await db.transactions.update(transaction.id, {
                amount: newAmount,
                description,
                type,
                category_id: categoryId,
                debt_id: debtId,
                sync_status: 'updated'
            });
        } catch (e) {
            console.error("Local update failed", e);
        }

        // Sync to server in background
        updateTransaction(transaction.id, newAmount, description, type, categoryId, debtId)
            .then(() => toast.success("Transaction updated"))
            .catch(console.error);
    };

    const handleDelete = async () => {
        if (!confirm("Delete this transaction?")) return;

        // Close immediately for instant UX
        onClose();

        // Delete from local DB first (optimistic)
        try {
            await db.transactions.delete(transaction.id);
        } catch (e) {
            console.error("Local delete failed", e);
        }

        // Sync to server - MUST await to prevent refresh bringing back deleted tx
        try {
            await deleteTransaction(transaction.id);
            toast.success("Transaction deleted");
        } catch (e) {
            console.error("Server delete failed", e);
            toast.error("Failed to sync delete");
        }
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

    const computeAndSetAmount = () => {
        const result = evaluateMathExpression(amount);
        if (result !== null) {
            setAmount(result.toFixed(2));
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-stone-900">Edit Transaction</h2>
                    <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Amount */}
                <div className="text-center space-y-2">
                    <input
                        type="text"
                        inputMode="text"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        onBlur={computeAndSetAmount}
                        placeholder="0.00 or 50+20"
                        className="w-48 text-center text-4xl font-bold font-mono text-stone-900 outline-none border-b-2 border-stone-200 focus:border-stone-900 transition-colors bg-transparent"
                    />
                    {/* Math Operator Buttons */}
                    <div className="flex justify-center gap-2">
                        {['+', '-', '×', '÷'].map(op => (
                            <button
                                key={op}
                                type="button"
                                onClick={() => {
                                    const symbol = op === '×' ? '*' : op === '÷' ? '/' : op;
                                    setAmount(prev => prev + symbol);
                                }}
                                className="w-10 h-10 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-lg transition-colors"
                            >
                                {op}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={computeAndSetAmount}
                            className="w-10 h-10 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-bold text-lg transition-colors"
                        >
                            =
                        </button>
                    </div>
                </div>

                {/* Type Toggles */}
                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setType('expense')} className={clsx("py-2 rounded font-bold text-xs border transition-colors", type === 'expense' ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-400 border-stone-200")}>Expense</button>
                    <button onClick={() => setType('income')} className={clsx("py-2 rounded font-bold text-xs border transition-colors", type === 'income' ? "bg-green-100 text-green-700 border-green-200" : "bg-white text-stone-400 border-stone-200")}>Income</button>
                    <button onClick={() => setType('debt_payment')} className={clsx("py-2 rounded font-bold text-xs border transition-colors", type === 'debt_payment' ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-white text-stone-400 border-stone-200")}>Pay Debt</button>
                </div>

                {/* Details */}
                <div className="space-y-3">
                    <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full text-lg border-b border-stone-100 py-2 outline-none font-bold text-stone-700"
                    />

                    {type === 'expense' && (
                        <select
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            className="w-full py-3 bg-stone-50 rounded px-3 text-stone-800 font-bold outline-none"
                        >
                            <option value="">(No Category)</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}

                    {type === 'debt_payment' && (
                        <select
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            className="w-full py-3 bg-blue-50 rounded px-3 text-blue-800 font-bold outline-none"
                        >
                            <option value="">Select Debt...</option>
                            {debts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        disabled={isSubmitting}
                        onClick={handleDelete}
                        className="flex-1 py-4 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                    >
                        <Trash2 size={18} /> Delete
                    </button>
                    <button
                        disabled={isSubmitting}
                        onClick={handleUpdate}
                        className="flex-[2] py-4 bg-stone-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
                    >
                        <Save size={18} /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    )
}
