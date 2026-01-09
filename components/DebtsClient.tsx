"use client";

import { useState } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { Plus, X, Pencil } from "lucide-react";
import { addDebt } from "@/app/actions";
import clsx from "clsx";

type Debt = {
    id: string;
    name: string;
    total_balance: number;
    interest_rate: number;
};

export function DebtsClient({ initialDebts }: { initialDebts: Debt[] }) {
    const [debts, setDebts] = useState<Debt[]>(initialDebts);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

    const currency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(val);

    const handleAddDebt = async (name: string, balanceStr: string) => {
        const balance = parseFloat(balanceStr);
        if (!name || isNaN(balance)) return;

        setIsSubmitting(true);
        // Optimistic
        const newDebt = {
            id: Math.random().toString(),
            name,
            total_balance: balance,
            interest_rate: 0
        };
        setDebts(prev => [newDebt, ...prev]);
        setShowAddForm(false);

        try {
            await addDebt(name, balance, 0);
        } catch (err) {
            console.error("Failed to add debt", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="space-y-6 pb-32">
            {/* List */}
            {debts.length === 0 && !showAddForm && (
                <PaperCard className="opacity-50 border-dashed p-8 text-center bg-stone-50/50">
                    <p className="text-stone-400 text-sm">No debts tracked. Freedom!</p>
                </PaperCard>
            )}

            <div className="space-y-4">
                {debts.map(debt => (
                    <PaperCard key={debt.id} className="relative group p-6 hover:shadow-md cursor-pointer transition-shadow" >
                        <div className="flex justify-between items-center" onClick={() => setEditingDebt(debt)}>
                            <div>
                                <h4 className={clsx("font-bold text-stone-900 text-xl", debt.total_balance <= 0 && "line-through decoration-red-600 decoration-4 -rotate-2 opacity-60")}>{debt.name}</h4>
                            </div>
                            <div className="text-right flex items-center gap-4">
                                <div>
                                    <div className={clsx("text-2xl font-mono font-bold", debt.total_balance <= 0 ? "text-stone-300" : "text-stone-800")}>{currency(debt.total_balance)}</div>
                                    <div className="text-[10px] text-stone-300 uppercase tracking-widest mt-1">Outstanding</div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setEditingDebt(debt); }} className="p-2 text-stone-300 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors">
                                    <Pencil size={18} />
                                </button>
                            </div>
                        </div>
                    </PaperCard>
                ))}
            </div>

            {/* Persistent Floating Add Button (Pill Style) */}
            {!showAddForm && !editingDebt && (
                <div className="fixed bottom-6 right-6 z-40">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-stone-900 text-white shadow-xl px-6 py-4 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-black transition-transform active:scale-95"
                    >
                        <Plus size={20} /> Add Debt
                    </button>
                </div>
            )}

            {/* Add Form Sheet */}
            {showAddForm && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <AddDebtForm onAdd={handleAddDebt} onClose={() => setShowAddForm(false)} isSubmitting={isSubmitting} />
                </div>
            )}

            {/* Edit Sheet */}
            {editingDebt && (
                <EditDebtSheet
                    debt={editingDebt}
                    onClose={() => setEditingDebt(null)}
                    onUpdate={(updated) => {
                        setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
                        setEditingDebt(null);
                    }}
                    onDelete={(id) => {
                        setDebts(prev => prev.filter(d => d.id !== id));
                        setEditingDebt(null);
                    }}
                />
            )}
        </section>
    );
}

function AddDebtForm({ onAdd, onClose, isSubmitting }: { onAdd: (n: string, b: string) => void, onClose: () => void, isSubmitting: boolean }) {
    const [name, setName] = useState("");
    const [balance, setBalance] = useState("");

    return (
        <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-stone-900">Track New Debt</h2>
                <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                    <X size={20} />
                </button>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Card / Loan Name</label>
                    <input
                        type="text" placeholder="e.g. Visa Signature"
                        autoFocus
                        value={name} onChange={e => setName(e.target.value)}
                        className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Current Balance</label>
                    <input
                        type="number" placeholder="0.00"
                        value={balance} onChange={e => setBalance(e.target.value)}
                        className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono font-bold outline-none focus:border-stone-900"
                    />
                </div>
            </div>

            <button
                onClick={() => onAdd(name, balance)}
                disabled={isSubmitting || !name || !balance}
                className="w-full bg-stone-900 text-white py-4 rounded-xl text-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
                Start Tracking
            </button>
            <div className="h-8"></div>
        </div>
    )
}

import { updateDebt, deleteDebt } from "@/app/actions";

function EditDebtSheet({ debt, onClose, onUpdate, onDelete }: { debt: Debt, onClose: () => void, onUpdate: (d: Debt) => void, onDelete: (id: string) => void }) {
    const [name, setName] = useState(debt.name);
    const [balance, setBalance] = useState(debt.total_balance.toString());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        setIsSubmitting(true);
        const b = parseFloat(balance) || 0;
        await updateDebt(debt.id, name, b, 0); // Always 0 rate
        onUpdate({ ...debt, name, total_balance: b, interest_rate: 0 });
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!confirm("Stop tracking this debt? History will remain but it will be removed from this list.")) return;
        setIsSubmitting(true);
        await deleteDebt(debt.id);
        onDelete(debt.id);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-stone-900">Edit Debt</h2>
                    <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Card / Loan Name</label>
                        <input
                            type="text" value={name} onChange={e => setName(e.target.value)}
                            className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Current Balance</label>
                        <input
                            type="number" value={balance} onChange={e => setBalance(e.target.value)}
                            className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono font-bold outline-none focus:border-stone-900"
                        />
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        onClick={handleDelete}
                        disabled={isSubmitting}
                        className="flex-1 bg-red-50 text-red-600 py-4 rounded-xl text-lg font-bold hover:bg-red-100 transition-colors"
                    >
                        Delete
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="flex-[2] bg-stone-900 text-white py-4 rounded-xl text-lg font-bold shadow-lg transition-transform active:scale-95"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
