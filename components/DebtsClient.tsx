"use client";

import { useState } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { Plus, X, Pencil, CreditCard } from "lucide-react";
import { addDebt, addTransaction, updateDebt, deleteDebt } from "@/app/actions";
import clsx from "clsx";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toast } from "sonner";

type Debt = {
    id: string;
    name: string;
    total_balance: number;
    interest_rate: number;
};

export function DebtsClient({ initialDebts }: { initialDebts: Debt[] }) {
    // 1. Live Query for Real-time Updates
    const debts = useLiveQuery(() => db.debts.toArray()) || initialDebts;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
    const [payDebt, setPayDebt] = useState<Debt | null>(null);

    const currency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(val);

    const handleAddDebt = async (name: string, balanceStr: string) => {
        const balance = parseFloat(balanceStr);
        if (!name || isNaN(balance)) return;

        setIsSubmitting(true);
        try {
            // Local
            const newDebt = {
                id: crypto.randomUUID(),
                name,
                total_balance: balance,
                interest_rate: 0,
                user_id: 'unknown',
                sync_status: 'created' as const
            };
            await db.debts.add(newDebt);
            setShowAddForm(false);

            // Server
            await addDebt(name, balance, 0);
        } catch (err) {
            console.error("Failed to add debt", err);
            toast.error("Failed to add debt");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePay = async (amountStr: string) => {
        if (!payDebt) return;
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return;

        setIsSubmitting(true);
        try {
            // 1. Local Transaction
            const tx = {
                id: crypto.randomUUID(),
                description: `Payment for ${payDebt.name}`,
                amount: amount,
                type: 'debt_payment' as const,
                debt_id: payDebt.id,
                date: new Date().toISOString(),
                user_id: 'unknown',
                created_at: new Date().toISOString(),
                sync_status: 'created' as const
            };
            await db.transactions.add(tx);

            // 2. Local Debt Update
            const newBalance = payDebt.total_balance - amount;
            await db.debts.update(payDebt.id, {
                total_balance: newBalance,
                sync_status: 'updated'
            });

            setPayDebt(null);
            toast.success(`Paid ${currency(amount)} to ${payDebt.name}`);

            // 3. Server Action
            // addTransaction handles the debt balance update on server too
            await addTransaction(amount, `Payment for ${payDebt.name}`, 'debt_payment', undefined, payDebt.id);

        } catch (err) {
            console.error("Pay Error", err);
            toast.error("Failed to record payment");
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <section className="space-y-6 pb-32">
            {/* List */}
            {debts.length === 0 && !showAddForm && (
                <PaperCard className="opacity-50 border-dashed p-8 text-center bg-stone-50/50">
                    <CreditCard className="mx-auto mb-2 text-stone-300" size={32} />
                    <p className="text-stone-400 text-sm">No debts tracked. Freedom!</p>
                </PaperCard>
            )}

            <div className="space-y-4">
                {debts.map(debt => (
                    <PaperCard key={debt.id} className="relative group p-6 hover:shadow-md transition-all" >
                        <div className="flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <h4 className={clsx("font-bold text-stone-900 text-xl break-words max-w-[70%]", debt.total_balance <= 0 && "line-through decoration-red-600 decoration-4 -rotate-2 opacity-60")}>{debt.name}</h4>
                                <button onClick={() => setEditingDebt(debt)} className="text-stone-300 hover:text-stone-600 px-2 py-1 rounded hover:bg-stone-50 transition-colors">
                                    <span className="text-xs uppercase font-bold tracking-widest">Edit</span>
                                </button>
                            </div>

                            {/* Balance Display */}
                            <div className="flex justify-between items-end">
                                <div className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mb-1">Outstanding Balance</div>
                                <div className={clsx("text-3xl font-mono font-bold", debt.total_balance <= 0 ? "text-stone-300" : "text-stone-800")}>
                                    {currency(debt.total_balance)}
                                </div>
                            </div>

                            {/* Action Bar */}
                            {debt.total_balance > 0 && (
                                <div className="pt-2">
                                    <button
                                        onClick={() => setPayDebt(debt)}
                                        className="w-full bg-stone-900 text-white text-xs font-bold px-4 py-3 rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CreditCard size={14} /> Pay / Reduce Balance
                                    </button>
                                </div>
                            )}
                        </div>
                    </PaperCard>
                ))}
            </div>

            {/* Persistent Floating Add Button */}
            {!showAddForm && !editingDebt && !payDebt && (
                <div className="fixed bottom-6 right-6 z-40">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-stone-900 text-white shadow-xl px-6 py-4 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-black transition-transform active:scale-95"
                    >
                        <Plus size={20} /> Metric Debt
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
                    onUpdate={async (updated) => {
                        // Local update triggered by component, but we should do it cleanly
                        // Actually EditDebtSheet below handles the action, we just close
                        setEditingDebt(null);
                    }}
                    onDelete={(id) => {
                        setEditingDebt(null);
                    }}
                />
            )}

            {/* Pay Modal */}
            {payDebt && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <PayDebtForm
                        debt={payDebt}
                        onPay={handlePay}
                        onClose={() => setPayDebt(null)}
                        isSubmitting={isSubmitting}
                    />
                </div>
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

function PayDebtForm({ debt, onPay, onClose, isSubmitting }: { debt: Debt, onPay: (a: string) => void, onClose: () => void, isSubmitting: boolean }) {
    const [amount, setAmount] = useState("");

    return (
        <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-stone-900">Pay {debt.name}</h2>
                <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                    <X size={20} />
                </button>
            </div>

            <p className="text-sm text-stone-500">
                This will record a <strong>Debt Payment</strong> transaction and reduce your outstanding balance.
            </p>

            <div className="space-y-2">
                <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Payment Amount (AED)</label>
                <input
                    type="number" placeholder="0.00"
                    autoFocus
                    value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono font-bold outline-none focus:border-stone-900"
                />
            </div>

            <button
                onClick={() => onPay(amount)}
                disabled={isSubmitting || !amount}
                className="w-full bg-stone-900 text-white py-4 rounded-xl text-lg font-bold shadow-lg transition-transform active:scale-95"
            >
                Confirm Payment
            </button>
        </div>
    )
}


function EditDebtSheet({ debt, onClose, onUpdate, onDelete }: { debt: Debt, onClose: () => void, onUpdate: (d: Debt) => void, onDelete: (id: string) => void }) {
    const [name, setName] = useState(debt.name);
    const [balance, setBalance] = useState(debt.total_balance.toString());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        setIsSubmitting(true);
        const b = parseFloat(balance) || 0;

        // Local Update
        await db.debts.update(debt.id, {
            name,
            total_balance: b,
            sync_status: 'updated'
        });

        // Server Update
        await updateDebt(debt.id, name, b, 0);

        onUpdate({ ...debt, name, total_balance: b, interest_rate: 0 });
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!confirm("Stop tracking this debt? History will remain but it will be removed from this list.")) return;
        setIsSubmitting(true);

        // Local Delete
        await db.debts.delete(debt.id);

        // Server Delete
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
