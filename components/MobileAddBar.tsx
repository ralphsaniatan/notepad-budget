"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ShoppingBag, Landmark, Check, CreditCard } from "lucide-react";
import clsx from "clsx";
import { Spinner } from "@/components/ui/Spinner";
import { db } from "@/lib/db";
import { addCategory, addDebt } from "@/app/actions";

type TxType = 'expense' | 'income' | 'debt_payment';
type CatType = 'fixed' | 'needs' | 'wants';

export function MobileAddBar({ categories, debts, onAdd, isSubmitting }: {
    categories: { id: string, name: string }[],
    debts: { id: string, name: string }[],
    onAdd: (type: TxType, amount: string, targetId?: string, desc?: string) => void,
    isSubmitting: boolean
}) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const amountRef = useRef<HTMLInputElement>(null);

    // Form State
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [targetId, setTargetId] = useState("");
    const [categorySearch, setCategorySearch] = useState("");
    const [debtSearch, setDebtSearch] = useState("");
    const [type, setType] = useState<TxType>('expense');

    // Category Creation State
    const [newCatType, setNewCatType] = useState<CatType>('wants');
    const [newCatBudget, setNewCatBudget] = useState("");
    const [isPinned, setIsPinned] = useState(false);
    const [isTypeConfirmed, setIsTypeConfirmed] = useState(false);

    // Debt Creation State (simplified - no extra click needed)
    const [newDebtBalance, setNewDebtBalance] = useState("");

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const handleSubmit = async () => {
        let finalTargetId = targetId;
        const submitType = type;
        const currentAmount = amount;
        const currentDescription = description;
        const currentCategorySearch = categorySearch;
        const currentDebtSearch = debtSearch;
        const currentNewCatType = newCatType;
        const currentNewCatBudget = newCatBudget;
        const currentIsPinned = isPinned;
        const currentNewDebtBalance = newDebtBalance;

        // --- INSTANT UI: Close modal and reset immediately ---
        setAmount("");
        setDescription("");
        setTargetId("");
        setCategorySearch("");
        setDebtSearch("");
        setNewCatType('wants');
        setNewCatBudget("");
        setIsPinned(false);
        setIsTypeConfirmed(false);
        setNewDebtBalance("");
        setType('expense');
        setIsOpen(false);

        // --- BACKGROUND: Run all server operations async ---
        (async () => {
            // --- 1. Auto-create CATEGORY ---
            if (submitType === 'expense' && !finalTargetId && currentCategorySearch.trim()) {
                const existing = categories.find(c => c.name.toLowerCase() === currentCategorySearch.trim().toLowerCase());
                if (existing) {
                    finalTargetId = existing.id;
                } else {
                    const newCatId = crypto.randomUUID();
                    const newCatName = currentCategorySearch.trim();
                    const isFixed = currentNewCatType === 'fixed';
                    const budgetLimit = currentNewCatBudget ? parseFloat(currentNewCatBudget) : 0;

                    try {
                        await db.categories.add({
                            id: newCatId,
                            name: newCatName,
                            budget_limit: budgetLimit,
                            type: isFixed ? 'fixed' : 'variable',
                            is_pinned: currentIsPinned,
                            user_id: 'unknown',
                            sync_status: 'created'
                        });

                        let serverCommitmentType: 'fixed' | 'variable_fixed' | null = null;
                        if (currentNewCatType === 'fixed') serverCommitmentType = 'fixed';
                        if (currentNewCatType === 'needs') serverCommitmentType = 'variable_fixed';

                        // Background sync - don't await
                        addCategory(newCatName, serverCommitmentType, budgetLimit, currentIsPinned).catch(console.error);
                        finalTargetId = newCatId;
                    } catch (e) {
                        console.error("Failed to auto-create category", e);
                        return;
                    }
                }
            }

            // --- 2. Auto-create DEBT ---
            if (submitType === 'debt_payment' && !finalTargetId && currentDebtSearch.trim()) {
                const existing = debts.find(d => d.name.toLowerCase() === currentDebtSearch.trim().toLowerCase());
                if (existing) {
                    finalTargetId = existing.id;
                } else {
                    const name = currentDebtSearch.trim();
                    const balance = currentNewDebtBalance ? parseFloat(currentNewDebtBalance) : 0;

                    const res = await addDebt(name, balance, 0);

                    if (res && res.success && res.id) {
                        finalTargetId = res.id;
                    } else {
                        console.error("Failed to create debt", res);
                    }
                }
            }

            if (!finalTargetId && submitType !== 'income') return;

            onAdd(submitType, currentAmount, finalTargetId, currentDescription);

            // Background refresh - don't block
            router.refresh();
        })();
    };

    // Filter categories
    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
    const isCreatingNewCat = categorySearch && !targetId && filteredCategories.length === 0;

    // Filter debts
    const filteredDebts = debts.filter(d =>
        d.name.toLowerCase().includes(debtSearch.toLowerCase())
    );
    const isCreatingNewDebt = debtSearch && !targetId && filteredDebts.length === 0;

    const handleTypeSelect = (t: CatType) => {
        setNewCatType(t);
        setIsTypeConfirmed(true);
        setTimeout(() => { if (amountRef.current) amountRef.current.focus(); }, 50);
    };

    const handleTabChange = (t: TxType) => {
        setType(t);
        setTargetId("");
        setCategorySearch("");
        setDebtSearch("");
        setIsTypeConfirmed(false);
    };

    return (
        <>
            <div className="fixed bottom-6 right-6 z-40">
                <button onClick={handleOpen} className="bg-stone-900 text-white shadow-xl px-6 py-4 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-black transition-transform active:scale-95">
                    <Plus size={20} /> Add Transaction
                </button>
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">

                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-stone-900">New Transaction</h2>
                            <button onClick={handleClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500"><X size={20} /></button>
                        </div>

                        <div className="flex border-b border-stone-200">
                            {[{ id: 'expense', label: 'Expense' }, { id: 'income', label: 'Income' }, { id: 'debt_payment', label: 'Debt Pay' }].map(t => (
                                <button key={t.id} onClick={() => handleTabChange(t.id as TxType)} className={clsx("flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2", type === t.id ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600")}>{t.label}</button>
                            ))}
                        </div>

                        <div className="space-y-4">

                            {/* --- EXPENSE: Category --- */}
                            {type === 'expense' && (
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Category</label>
                                    <div className="relative">
                                        <input type="text" value={categorySearch} onChange={e => { setCategorySearch(e.target.value); setTargetId(""); setIsTypeConfirmed(false); }} placeholder="Select or type new category..." autoFocus className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900" />

                                        {categorySearch && !targetId && filteredCategories.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 bg-white border shadow-xl z-50 max-h-40 overflow-y-auto rounded-b-xl">
                                                {filteredCategories.map(c => (<div key={c.id} onClick={() => { setCategorySearch(c.name); setTargetId(c.id); setIsTypeConfirmed(false); }} className="p-3 hover:bg-stone-100 cursor-pointer font-bold text-stone-700 border-b border-stone-100 last:border-0">{c.name}</div>))}
                                            </div>
                                        )}

                                        {isCreatingNewCat && !isTypeConfirmed && (
                                            <div className="absolute top-full left-0 right-0 bg-stone-50 border-b border-x border-stone-200 p-4 z-50 rounded-b-xl shadow-lg space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400 mb-1"><Plus size={12} /> Create "{categorySearch}" as:</div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <button onClick={() => handleTypeSelect('fixed')} className="flex items-center gap-3 p-3 rounded-lg border bg-white border-stone-200 text-stone-500 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-95 text-left"><div className="p-2 rounded-full bg-stone-100 text-stone-400"><Landmark size={20} /></div><div><div className="font-bold text-sm text-stone-700">Fixed</div><div className="text-[10px] opacity-70 leading-tight">Rent, Utilities</div></div></button>
                                                    <button onClick={() => handleTypeSelect('needs')} className="flex items-center gap-3 p-3 rounded-lg border bg-white border-stone-200 text-stone-500 hover:border-purple-500 hover:bg-purple-50 transition-all active:scale-95 text-left"><div className="p-2 rounded-full bg-stone-100 text-stone-400"><ShoppingBag size={20} /></div><div><div className="font-bold text-sm text-stone-700">Needs</div><div className="text-[10px] opacity-70 leading-tight">Groceries</div></div></button>
                                                    <button onClick={() => handleTypeSelect('wants')} className="flex items-center gap-3 p-3 rounded-lg border bg-white border-stone-200 text-stone-500 hover:border-emerald-500 hover:bg-emerald-50 transition-all active:scale-95 text-left"><div className="p-2 rounded-full bg-stone-100 text-stone-400"><ShoppingBag size={20} /></div><div><div className="font-bold text-sm text-stone-700">Wants</div><div className="text-[10px] opacity-70 leading-tight">Fun, Shopping</div></div></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {isCreatingNewCat && isTypeConfirmed && (
                                        <div className="space-y-3 mt-2 animate-in slide-in-from-top-2">
                                            <div className="bg-white border border-stone-200 p-3 rounded-xl shadow-sm flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className={clsx("p-1.5 rounded-full", newCatType === 'fixed' ? "bg-blue-100 text-blue-700" : newCatType === 'needs' ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700")}>{newCatType === 'fixed' ? <Landmark size={14} /> : <ShoppingBag size={14} />}</div>
                                                    <div className="text-sm font-bold text-stone-700 capitalize">{newCatType}</div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsPinned(!isPinned); }} className="flex items-center gap-2 cursor-pointer select-none group">
                                                        <div className={clsx("w-4 h-4 rounded border flex items-center justify-center transition-colors", isPinned ? "bg-stone-900 border-stone-900" : "bg-white border-stone-300 group-hover:border-stone-400")}>{isPinned && <Check size={10} className="text-white" />}</div>
                                                        <span className="text-xs font-bold text-stone-500 group-hover:text-stone-700">Pin</span>
                                                    </div>
                                                    <button onClick={() => setIsTypeConfirmed(false)} className="text-xs font-bold text-blue-500 hover:text-blue-700">Change</button>
                                                </div>
                                            </div>
                                            {newCatType !== 'fixed' && (
                                                <div className="space-y-2">
                                                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Monthly Limit (AED)</label>
                                                    <input type="number" placeholder="0" value={newCatBudget} onChange={e => setNewCatBudget(e.target.value)} className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- DEBT PAY: Debt Select / Auto-Create --- */}
                            {type === 'debt_payment' && (
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Debt Account</label>
                                    <div className="relative">
                                        <input type="text" value={debtSearch} onChange={e => { setDebtSearch(e.target.value); setTargetId(""); }} placeholder="Select or type new debt..." autoFocus className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900" />

                                        {debtSearch && !targetId && filteredDebts.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 bg-white border shadow-xl z-50 max-h-40 overflow-y-auto rounded-b-xl">
                                                {filteredDebts.map(d => (<div key={d.id} onClick={() => { setDebtSearch(d.name); setTargetId(d.id); }} className="p-3 hover:bg-stone-100 cursor-pointer font-bold text-stone-700 border-b border-stone-100 last:border-0">{d.name}</div>))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Auto-show Total Balance for new debts (no click needed) */}
                                    {isCreatingNewDebt && (
                                        <div className="space-y-2 mt-2 animate-in slide-in-from-top-2">
                                            <div className="bg-white border border-stone-200 p-3 rounded-xl shadow-sm flex items-center gap-2">
                                                <div className="p-1.5 rounded-full bg-red-100 text-red-700"><CreditCard size={14} /></div>
                                                <div className="text-sm font-bold text-stone-700">New Debt: {debtSearch}</div>
                                            </div>
                                            <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Total Balance (AED)</label>
                                            <input type="number" placeholder="0" value={newDebtBalance} onChange={e => setNewDebtBalance(e.target.value)} className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Amount */}
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Amount (AED)</label>
                                <input ref={amountRef} type="number" placeholder="0.00" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-2xl font-mono font-bold outline-none focus:border-stone-900" />
                            </div>

                            {/* Detailed Description */}
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Description</label>
                                <input type="text" placeholder="e.g. Monthly Pay" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900" />
                            </div>
                        </div>

                        <button disabled={isSubmitting || !amount || (type === 'expense' && !categorySearch) || (type === 'debt_payment' && !debtSearch)} onClick={handleSubmit} className={clsx("w-full py-4 rounded-xl text-lg font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2", isCreatingNewDebt ? "bg-red-600 text-white" : "bg-stone-900 text-white")}>
                            {isSubmitting ? <><Spinner className="mr-1" /> Saving...</> : "Save Transaction"}
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
