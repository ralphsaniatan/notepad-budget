"use client";

import { useState } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { Plus, Trash2, Info, X } from "lucide-react";
import { addCategory, updateCategory, deleteCategory } from "@/app/actions";

type Category = {
    id: string;
    name: string;
    commitment_type: 'fixed' | 'variable_fixed' | null;
    is_commitment: boolean; // Legacy/Compat
    budget_limit: number;
    is_pinned?: boolean;
};

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Category State
    const [newName, setNewName] = useState("");
    const [commitmentType, setCommitmentType] = useState<'fixed' | 'variable_fixed' | null>(null);
    const [budgetLimit, setBudgetLimit] = useState("");
    const [isPinned, setIsPinned] = useState(false);
    const [editingCat, setEditingCat] = useState<Category | null>(null);

    // Help Toggles
    const [showFixedHelp, setShowFixedHelp] = useState(false);
    const [showVarFixedHelp, setShowVarFixedHelp] = useState(false);

    // Close help when clicking outside
    const closeHelp = () => {
        setShowFixedHelp(false);
        setShowVarFixedHelp(false);
    };

    const handleAdd = async () => {
        if (!newName) return;
        setIsSubmitting(true);
        const limit = parseFloat(budgetLimit) || 0;

        // Optimistic
        const newCat: Category = {
            id: Math.random().toString(),
            name: newName,
            commitment_type: commitmentType,
            is_commitment: !!commitmentType,
            budget_limit: limit,
            is_pinned: isPinned
        };
        setCategories(prev => [...prev, newCat]);
        setNewName("");
        setBudgetLimit("");
        setCommitmentType(null);
        setIsPinned(false);
        closeHelp();

        try {
            await addCategory(newName, commitmentType, limit, isPinned);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="space-y-6">
            {/* Backdrop for Help Popups */}
            {(showFixedHelp || showVarFixedHelp) && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={closeHelp} />
            )}

            {/* Add Form */}
            <PaperCard className="p-4 space-y-4 bg-stone-50 border-2 border-stone-200">
                <h3 className="text-stone-500 text-xs uppercase font-bold tracking-widest">Add Category</h3>

                <div className="space-y-3">
                    <input
                        type="text" placeholder="Category Name"
                        value={newName} onChange={e => setNewName(e.target.value)}
                        className="w-full p-2 bg-white border border-stone-200 rounded text-sm outline-none focus:border-stone-400"
                    />

                    {/* Type Selection */}
                    <div className="space-y-2">
                        <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">Type</div>

                        {/* Standard */}
                        <label className="flex items-center gap-2 p-3 bg-white border border-stone-100 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                            <input
                                type="radio"
                                name="catType"
                                checked={commitmentType === null}
                                onChange={() => setCommitmentType(null)}
                                className="text-stone-900 focus:ring-stone-900"
                            />
                            <span className="text-sm font-bold text-stone-700">Standard</span>
                            <span className="text-xs text-stone-400 ml-auto">(Groceries, Dining)</span>
                        </label>

                        {/* Fixed */}
                        <div className={`relative ${showFixedHelp ? 'z-50' : 'z-0'}`}>
                            <label className="flex items-center gap-2 p-3 bg-white border border-stone-100 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                                <input
                                    type="radio"
                                    name="catType"
                                    checked={commitmentType === 'fixed'}
                                    onChange={() => { setCommitmentType('fixed'); closeHelp(); }}
                                    className="text-stone-900 focus:ring-stone-900"
                                />
                                <span className="text-sm font-bold text-stone-700">Fixed Expense</span>
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFixedHelp(!showFixedHelp); setShowVarFixedHelp(false); }} className="p-1 text-stone-300 hover:text-stone-600 ml-auto">
                                    <Info size={14} />
                                </button>
                            </label>
                            {showFixedHelp && (
                                <div className="absolute top-full right-0 mt-1 w-64 bg-stone-800 text-white text-xs p-3 rounded shadow-xl animate-in fade-in zoom-in duration-200">
                                    <strong>Fixed Expense:</strong> A bill that is the same amount every month (e.g. Rent, Netflix).
                                </div>
                            )}
                        </div>

                        {/* Variable Fixed */}
                        <div className={`relative ${showVarFixedHelp ? 'z-50' : 'z-0'}`}>
                            <label className="flex items-center gap-2 p-3 bg-white border border-stone-100 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                                <input
                                    type="radio"
                                    name="catType"
                                    checked={commitmentType === 'variable_fixed'}
                                    onChange={() => { setCommitmentType('variable_fixed'); closeHelp(); }}
                                    className="text-stone-900 focus:ring-stone-900"
                                />
                                <span className="text-sm font-bold text-stone-700">Variable Fixed</span>
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowVarFixedHelp(!showVarFixedHelp); setShowFixedHelp(false); }} className="p-1 text-stone-300 hover:text-stone-600 ml-auto">
                                    <Info size={14} />
                                </button>
                            </label>
                            {showVarFixedHelp && (
                                <div className="absolute top-full right-0 mt-1 w-64 bg-stone-800 text-white text-xs p-3 rounded shadow-xl animate-in fade-in zoom-in duration-200">
                                    <strong>Variable Fixed:</strong> You want to set aside money for this (e.g. Petrol), but the actual spend varies month-to-month.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pin Toggle for Variable Fixed */}
                    {commitmentType === 'variable_fixed' && (
                        <div className="animate-in slide-in-from-top-1 fade-in duration-200">
                            <label className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPinned}
                                    onChange={e => setIsPinned(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-600"
                                />
                                <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">Pin to Main Budget</span>
                            </label>
                        </div>
                    )}

                    {commitmentType && (
                        <div className="animate-in slide-in-from-top-1 fade-in duration-200 pb-2">
                            <input
                                type="number" placeholder="Monthly Limit / Goal"
                                value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)}
                                className="w-full p-2 bg-white border border-stone-200 rounded text-sm outline-none focus:border-stone-400 font-mono font-bold"
                            />
                        </div>
                    )}

                </div>
                <button
                    onClick={handleAdd}
                    disabled={isSubmitting || !newName}
                    className="w-full bg-stone-900 text-white py-2 rounded text-sm font-bold hover:bg-stone-800 disabled:opacity-50 transition-all"
                >
                    Add Category
                </button>
            </PaperCard>

            <div className="space-y-2">
                <h3 className="text-stone-500 text-xs uppercase font-bold tracking-widest px-1">Active Categories</h3>
                {categories.map(cat => {
                    // Logic to infer type from legacy data if needed
                    const type = cat.commitment_type || (cat.is_commitment ? 'fixed' : null);

                    return (
                        <div key={cat.id} className="flex justify-between items-center p-3 bg-white border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors group">
                            <div onClick={() => setEditingCat(cat)} className="flex-1 cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-stone-800 text-sm">{cat.name}</span>
                                    {cat.is_pinned && (
                                        <span className="text-[10px] bg-stone-100 text-stone-500 px-1 py-0.5 rounded border border-stone-200 font-bold uppercase tracking-wider">Pinned</span>
                                    )}
                                </div>
                                {type === 'fixed' && (
                                    <span className="inline-block mt-1 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                        Fixed: ${cat.budget_limit}
                                    </span>
                                )}
                                {type === 'variable_fixed' && (
                                    <span className="inline-block mt-1 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                        Set Aside: ~${cat.budget_limit}
                                    </span>
                                )}
                            </div>
                            <button onClick={() => setEditingCat(cat)} className="text-stone-300 hover:text-stone-600 px-2">
                                <span className="text-xs uppercase font-bold tracking-widest">Edit</span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Edit Sheet */}
            {
                editingCat && (
                    <EditCategorySheet
                        category={editingCat}
                        onClose={() => setEditingCat(null)}
                        onUpdate={(updated) => {
                            setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
                            setEditingCat(null);
                        }}
                        onDelete={(id) => {
                            setCategories(prev => prev.filter(c => c.id !== id));
                            setEditingCat(null);
                        }}
                    />
                )
            }
        </section >
    );
}

function EditCategorySheet({ category, onClose, onUpdate, onDelete }: { category: Category, onClose: () => void, onUpdate: (c: Category) => void, onDelete: (id: string) => void }) {
    const [name, setName] = useState(category.name);
    // Infer initial state
    const initialType = category.commitment_type || (category.is_commitment ? 'fixed' : null);

    const [commitmentType, setCommitmentType] = useState<'fixed' | 'variable_fixed' | null>(initialType);
    const [budgetLimit, setBudgetLimit] = useState(category.budget_limit.toString());
    const [isPinned, setIsPinned] = useState(category.is_pinned || false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Help Toggles (local to sheet)
    const [showFixedHelp, setShowFixedHelp] = useState(false);
    const [showVarFixedHelp, setShowVarFixedHelp] = useState(false);

    // Close help when clicking outside
    const closeHelp = () => {
        setShowFixedHelp(false);
        setShowVarFixedHelp(false);
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        const limit = parseFloat(budgetLimit) || 0;
        await updateCategory(category.id, name, commitmentType, limit, isPinned);
        onUpdate({
            ...category,
            name,
            commitment_type: commitmentType,
            is_commitment: !!commitmentType,
            budget_limit: limit,
            is_pinned: isPinned
        });
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!confirm("Delete this category? Transactions will become uncategorized.")) return;
        setIsSubmitting(true);
        await deleteCategory(category.id);
        onDelete(category.id);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop for Help Popups in Sheet */}
            {(showFixedHelp || showVarFixedHelp) && (
                <div className="fixed inset-0 z-[70] bg-transparent" onClick={closeHelp} />
            )}
            <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-stone-900">Edit Category</h2>
                    <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <input
                        type="text" value={name} onChange={e => setName(e.target.value)}
                        className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                    />

                    {/* Type Selection */}
                    <div className="space-y-2">
                        <div className="text-xs font-bold text-stone-400 uppercase tracking-widest">Type</div>

                        {/* Standard */}
                        <label className="flex items-center gap-2 p-3 bg-white border border-stone-100 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                            <input
                                type="radio"
                                name="editCatType"
                                checked={commitmentType === null}
                                onChange={() => setCommitmentType(null)}
                                className="text-stone-900 focus:ring-stone-900"
                            />
                            <span className="text-sm font-bold text-stone-700">Standard</span>
                        </label>

                        {/* Fixed */}
                        <div className="relative z-50">
                            <label className="flex items-center gap-2 p-3 bg-white border border-stone-100 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                                <input
                                    type="radio"
                                    name="editCatType"
                                    checked={commitmentType === 'fixed'}
                                    onChange={() => { setCommitmentType('fixed'); closeHelp(); }}
                                    className="text-stone-900 focus:ring-stone-900"
                                />
                                <span className="text-sm font-bold text-stone-700">Fixed Expense</span>
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFixedHelp(!showFixedHelp); setShowVarFixedHelp(false); }} className="p-1 text-stone-300 hover:text-stone-600 ml-auto">
                                    <Info size={14} />
                                </button>
                            </label>
                            {showFixedHelp && (
                                <div className="absolute top-full right-0 mt-1 z-50 w-64 bg-stone-800 text-white text-xs p-3 rounded shadow-xl animate-in fade-in zoom-in duration-200">
                                    <strong>Fixed Expense:</strong> A bill that is the same amount every month (e.g. Rent, Netflix).
                                </div>
                            )}
                        </div>

                        {/* Variable Fixed */}
                        <div className="relative z-50">
                            <label className="flex items-center gap-2 p-3 bg-white border border-stone-100 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors">
                                <input
                                    type="radio"
                                    name="editCatType"
                                    checked={commitmentType === 'variable_fixed'}
                                    onChange={() => { setCommitmentType('variable_fixed'); closeHelp(); }}
                                    className="text-stone-900 focus:ring-stone-900"
                                />
                                <span className="text-sm font-bold text-stone-700">Variable Fixed</span>
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowVarFixedHelp(!showVarFixedHelp); setShowFixedHelp(false); }} className="p-1 text-stone-300 hover:text-stone-600 ml-auto">
                                    <Info size={14} />
                                </button>
                            </label>
                            {showVarFixedHelp && (
                                <div className="absolute top-full right-0 mt-1 z-50 w-64 bg-stone-800 text-white text-xs p-3 rounded shadow-xl animate-in fade-in zoom-in duration-200">
                                    <strong>Variable Fixed:</strong> You want to set aside money for this (e.g. Petrol), but the actual spend varies month-to-month.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pin Toggle for Variable Fixed (Edit) */}
                    {commitmentType === 'variable_fixed' && (
                        <div className="animate-in slide-in-from-top-1 fade-in duration-200">
                            <label className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPinned}
                                    onChange={e => setIsPinned(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-600"
                                />
                                <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">Pin to Main Budget</span>
                            </label>
                        </div>
                    )}

                    {commitmentType && (
                        <div className="space-y-2 animate-in slide-in-from-top-1 fade-in duration-200">
                            <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Budget Limit</label>
                            <input
                                type="number"
                                value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)}
                                className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono font-bold outline-none focus:border-stone-900"
                            />
                        </div>
                    )}
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
