import { CategorySheet } from "./CategorySheet";
import { LocalCategory } from "@/lib/db";

// ... imports ...
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ShoppingBag, Landmark, Check, Calculator, Tag, Banknote } from "lucide-react";
import clsx from "clsx";
import { Spinner } from "@/components/ui/Spinner";
import { db } from "@/lib/db";
import { addCategory } from "@/app/actions";

type TxType = 'expense' | 'income';

// Safe math expression evaluator (handles +, -, *, /)
function evaluateMathExpression(expr: string): number | null {
    const cleaned = expr.replace(/\s/g, '');
    if (/^[\d.]+$/.test(cleaned)) return parseFloat(cleaned);
    if (!/^[\d.+\-*/()]+$/.test(cleaned)) return null;
    try {
        const result = new Function(`return (${cleaned})`)();
        if (typeof result === 'number' && isFinite(result) && result >= 0) return Math.round(result * 100) / 100;
        return null;
    } catch { return null; }
}

export function MobileAddBar({ categories, debts, onAdd, isSubmitting }: {
    categories: LocalCategory[],
    debts: { id: string, name: string }[],
    onAdd: (type: TxType, amount: string, targetId?: string, desc?: string, debtId?: string) => void,
    isSubmitting: boolean
}) {
    const router = useRouter();
    const [mode, setMode] = useState<'closed' | 'menu' | 'transaction' | 'category'>('closed');
    const amountRef = useRef<HTMLInputElement>(null);

    // Form State (Transaction)
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [targetId, setTargetId] = useState("");
    const [categorySearch, setCategorySearch] = useState("");
    const [type, setType] = useState<TxType>('expense');

    // Category Creation State (for pre-filling)
    const [initialCatName, setInitialCatName] = useState("");

    // Payment Source State
    const [paymentSource, setPaymentSource] = useState<'cash' | 'debt'>('cash');
    const [selectedDebtId, setSelectedDebtId] = useState("");

    const handleOpenMenu = () => setMode('menu');
    const handleClose = () => {
        setMode('closed');
        // Reset specific states if needed
    };

    const openTransaction = () => {
        setMode('transaction');
        setTimeout(() => amountRef.current?.focus(), 100);
    };

    const openCategory = () => {
        setInitialCatName("");
        setMode('category');
    };

    const openCategoryWithSearch = () => {
        setInitialCatName(categorySearch);
        setMode('category');
    };

    const handleSubmitTx = async () => {
        const finalDebtId = (type === 'expense' && paymentSource === 'debt') ? selectedDebtId : undefined;
        onAdd(type, amount, targetId, description, finalDebtId);

        // Reset & Close
        setAmount("");
        setDescription("");
        setTargetId("");
        setCategorySearch("");
        setType('expense');
        setPaymentSource('cash');
        setSelectedDebtId("");
        setMode('closed');
        router.refresh(); // Background refresh
    };

    // Filter categories for Transaction Modal
    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
    const showCreateOption = categorySearch && !targetId && filteredCategories.length === 0;

    const handleTabChange = (t: TxType) => {
        setType(t);
        setTargetId("");
        setCategorySearch("");
        setPaymentSource('cash');
        setSelectedDebtId("");
    };

    return (
        <>
            {/* --- FAB / MENU TRIGGER --- */}
            <div className="fixed bottom-6 right-6 z-[60]">
                {mode === 'closed' ? (
                    <button onClick={handleOpenMenu} className="bg-stone-900 text-white shadow-xl px-5 py-4 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-black transition-transform active:scale-95">
                        <Plus size={24} /> <span className="sr-only">Add</span>
                    </button>
                ) : (
                    <button onClick={handleClose} className="bg-stone-200 text-stone-600 shadow-xl p-4 rounded-full hover:bg-stone-300 transition-transform active:scale-95">
                        <X size={24} />
                    </button>
                )}
            </div>

            {/* --- MENU OVERLAY --- */}
            {mode === 'menu' && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleClose}>
                    <div className="absolute bottom-24 right-6 flex flex-col gap-3 items-end" onClick={e => e.stopPropagation()}>

                        {/* New Category Button */}
                        <button
                            onClick={openCategory}
                            className="bg-white text-stone-900 shadow-xl p-4 rounded-2xl flex items-center gap-3 w-48 hover:bg-stone-50 active:scale-95 transition-all animate-in slide-in-from-bottom-2 duration-200"
                        >
                            <div className="bg-stone-100 p-2 rounded-full">
                                <Tag size={20} />
                            </div>
                            <span className="font-bold text-sm">New Category</span>
                        </button>

                        {/* New Transaction Button */}
                        <button
                            onClick={openTransaction}
                            className="bg-stone-900 text-white shadow-xl p-4 rounded-2xl flex items-center gap-3 w-48 hover:bg-black active:scale-95 transition-all animate-in slide-in-from-bottom-2 duration-200"
                        >
                            <div className="bg-stone-800 p-2 rounded-full">
                                <Banknote size={20} />
                            </div>
                            <span className="font-bold text-sm">New Transaction</span>
                        </button>
                    </div>
                </div>
            )}

            {/* --- TRANSACTION MODAL --- */}
            {mode === 'transaction' && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-2xl p-6 pb-24 space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold text-stone-900">New Transaction</h2>
                            <button onClick={handleClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500"><X size={20} /></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-stone-200">
                            {[{ id: 'expense', label: 'Expense' }, { id: 'income', label: 'Income' }].map(t => (
                                <button key={t.id} onClick={() => handleTabChange(t.id as TxType)} className={clsx("flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2", type === t.id ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600")}>{t.label}</button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {/* Amount */}
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold tracking-widest text-stone-400 flex items-center gap-2">
                                    Amount (AED)
                                    {/[+\-*/]/.test(amount) && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Calculator size={10} /> Math</span>}
                                </label>
                                <input
                                    ref={amountRef}
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    onBlur={() => {
                                        if (/[+\-*/]/.test(amount)) {
                                            const result = evaluateMathExpression(amount);
                                            if (result !== null) setAmount(result.toFixed(2));
                                        }
                                    }}
                                    className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-2xl font-mono font-bold outline-none focus:border-stone-900"
                                />
                                {/* Math Buttons */}
                                <div className="flex gap-2 pt-1">
                                    {['+', '-', '×', '÷'].map(op => (
                                        <button key={op} type="button" onClick={() => { const s = op === '×' ? '*' : op === '÷' ? '/' : op; setAmount(p => p + s); amountRef.current?.focus(); }} className="flex-1 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-lg transition-colors">{op}</button>
                                    ))}
                                    <button type="button" onClick={() => { const res = evaluateMathExpression(amount); if (res !== null) setAmount(res.toFixed(2)); }} className="flex-1 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-lg transition-colors">=</button>
                                </div>
                            </div>

                            {/* Expense Category & Source */}
                            {type === 'expense' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Category</label>
                                        <div className="relative">
                                            <input type="text" value={categorySearch} onChange={e => { setCategorySearch(e.target.value); setTargetId(""); }} placeholder="Select category..." className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900" />

                                            {categorySearch && !targetId && filteredCategories.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 bg-white border shadow-xl z-50 max-h-40 overflow-y-auto rounded-b-xl">
                                                    {filteredCategories.map(c => (<div key={c.id} onClick={() => { setCategorySearch(c.name); setTargetId(c.id); }} className="p-3 hover:bg-stone-100 cursor-pointer font-bold text-stone-700 border-b border-stone-100 last:border-0">{c.name}</div>))}
                                                </div>
                                            )}

                                            {/* CREATE CATEGORY BUTTON */}
                                            {showCreateOption && (
                                                <div className="absolute top-full left-0 right-0 p-2 z-50">
                                                    <button
                                                        onClick={openCategoryWithSearch}
                                                        className="w-full bg-stone-900 text-white p-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-black transition-transform active:scale-95"
                                                    >
                                                        <Plus size={16} /> Create Category "{categorySearch}"
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Source */}
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Payment Source</label>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPaymentSource('cash')} className={clsx("flex-1 py-2 rounded-lg font-bold text-sm border transition-all active:scale-95", paymentSource === 'cash' ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-500 border-stone-200")}>Cash / Bank</button>
                                            <button onClick={() => setPaymentSource('debt')} className={clsx("flex-1 py-2 rounded-lg font-bold text-sm border transition-all active:scale-95", paymentSource === 'debt' ? "bg-red-600 text-white border-red-600" : "bg-white text-stone-500 border-stone-200")}>Credit Card</button>
                                        </div>
                                        {paymentSource === 'debt' && (
                                            <select value={selectedDebtId} onChange={e => setSelectedDebtId(e.target.value)} className="w-full p-3 bg-red-50 border-b-2 border-red-200 text-red-900 font-bold outline-none focus:border-red-600 rounded-lg">
                                                <option value="">Select Card...</option>
                                                {debts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Description</label>
                                <input type="text" maxLength={255} placeholder="e.g. Lunch" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900" />
                            </div>
                        </div>

                        <button disabled={isSubmitting || !amount} onClick={handleSubmitTx} className={clsx("w-full py-4 rounded-xl text-lg font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2", "bg-stone-900 text-white")}>
                            {isSubmitting ? <><Spinner className="mr-1" /> Saving...</> : "Save Transaction"}
                        </button>
                    </div>
                </div>
            )}

            {/* --- CATEGORY MODAL (SHEET) --- */}
            {mode === 'category' && (
                <CategorySheet
                    initialName={initialCatName}
                    allCategories={categories as any}
                    onClose={handleClose}
                    onSave={() => {
                        // After save, user might want to go back to transaction?
                        // For now, let's close everything or maybe go back to Transaction if there was an amount?
                        // User request: "separate so that they are separate".
                        // So let's just close.
                        // However, if we came from Transaction flow (Create Option), maybe we want to reopen Transaction? 
                        // But that's complicated state management. Let's stick to simple Close.
                        handleClose();
                        router.refresh();
                    }}
                // Note: CategorySheet usually renders inside a Portal at root. 
                // Since MobileAddBar behaves like a root overlay, this is fine.
                />
            )}
        </>
    )
}
