"use client";

import { useState, useEffect } from "react";
import { Save, X, Trash2 } from "lucide-react";
import clsx from "clsx";
import { updateTransaction, deleteTransaction } from "@/app/actions";

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
    const [amount, setAmount] = useState(transaction.amount.toString());
    const [description, setDescription] = useState(transaction.description);
    const [targetId, setTargetId] = useState(
        transaction.type === 'expense' ? transaction.category_id :
            transaction.type === 'debt_payment' ? transaction.debt_id : ""
    ); // Note: We might need to fetch the raw tx object including ids if not passed. 
    // Currently `recentTransactions` in DashboardData might not have raw category_id/debt_id.
    // Let's assume for now we might need to pass partial data or handle it roughly.
    // If DashboardData only provides proper names, we can't easily pre-select the ID without fuzzy matching or creating a Map.
    // BETTER: Update getDashboardData to return category_id and debt_id in recentTransactions.

    const [type, setType] = useState<TxType>(transaction.type);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdate = async () => {
        setIsSubmitting(true);
        const categoryId = type !== 'debt_payment' ? targetId : undefined;
        const debtId = type === 'debt_payment' ? targetId : undefined;

        await updateTransaction(transaction.id, parseFloat(amount), description, type, categoryId, debtId);
        setIsSubmitting(false);
        onClose();
        window.location.reload(); // Simple reload to reflect changes
    };

    const handleDelete = async () => {
        if (!confirm("Delete this transaction?")) return;
        setIsSubmitting(true);
        await deleteTransaction(transaction.id);
        setIsSubmitting(false);
        onClose();
        window.location.reload();
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-stone-900">Edit Transaction</h2>
                    <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Amount */}
                <div className="text-center">
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-40 text-center text-4xl font-bold font-mono text-stone-900 outline-none border-b border-stone-200 focus:border-stone-900 transition-colors"
                    />
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
