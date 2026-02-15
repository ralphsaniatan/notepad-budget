"use client";

import { useState } from "react";
import { Plus, Trash2, X, Landmark, ShoppingBag, Check, Pencil } from "lucide-react";
import { addCategory, updateCategory, deleteCategory } from "@/app/actions";
import { toast } from "sonner";

// Currency helper
const currency = (amount: number) =>
    new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

type Category = {
    id: string;
    name: string;
    commitment_type: 'fixed' | 'variable_fixed' | null;
    is_commitment: boolean;
    budget_limit: number;
    is_pinned?: boolean;
    frequency_months?: number;
    frequency_start?: string;
};

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
    const [categories, setCategories] = useState<Category[]>(initialCategories);

    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editingCat, setEditingCat] = useState<Category | undefined>(undefined);

    // Bulk Delete State
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const openAddSheet = () => {
        setEditingCat(undefined);
        setIsSheetOpen(true);
    };

    const openEditSheet = (cat: Category) => {
        setEditingCat(cat);
        setIsSheetOpen(true);
    };

    const closeSheet = () => {
        setIsSheetOpen(false);
        setEditingCat(undefined);
    };

    // Bulk Delete
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const selectAll = () => {
        setSelectedIds(new Set(categories.map(c => c.id)));
    };

    const deselectAll = () => {
        setSelectedIds(new Set());
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} categories? Transactions will become uncategorized.`)) return;

        setIsSubmitting(true);
        const idsToDelete = Array.from(selectedIds);

        // Optimistic delete
        setCategories(prev => prev.filter(c => !selectedIds.has(c.id)));
        setSelectedIds(new Set());
        setIsEditMode(false);

        try {
            await Promise.all(idsToDelete.map(id => deleteCategory(id)));
            toast.success(`Deleted ${idsToDelete.length} categories`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete some categories");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-stone-900">Categories</h2>
                <button
                    onClick={openAddSheet}
                    className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-stone-800 transition-all flex items-center gap-2"
                >
                    <Plus size={16} /> Add Category
                </button>
            </div>

            {/* Category List Header */}
            <div className="flex justify-between items-center px-1">
                <h3 className="text-stone-500 text-xs uppercase font-bold tracking-widest">
                    Active Categories ({categories.length})
                </h3>
                <button
                    onClick={() => { setIsEditMode(!isEditMode); setSelectedIds(new Set()); }}
                    className={`text-xs font-bold uppercase tracking-widest transition-colors ${isEditMode ? "text-blue-600" : "text-stone-400 hover:text-stone-600"}`}
                >
                    {isEditMode ? "Done" : <><Pencil size={12} className="inline mr-1" />Edit</>}
                </button>
            </div>

            {/* Bulk Delete Bar */}
            {isEditMode && (
                <div className="flex items-center justify-between bg-stone-100 p-3 rounded-lg animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                        <button onClick={selectAll} className="text-xs font-bold text-stone-500 hover:text-stone-700">Select All</button>
                        <button onClick={deselectAll} className="text-xs font-bold text-stone-500 hover:text-stone-700">Deselect</button>
                    </div>
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            disabled={isSubmitting}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-2"
                        >
                            <Trash2 size={14} /> Delete ({selectedIds.size})
                        </button>
                    )}
                </div>
            )}

            {/* Category List */}
            <div className="space-y-1 bg-white rounded-xl border border-stone-200 overflow-hidden">
                {categories.map(cat => {
                    const type = cat.commitment_type || (cat.is_commitment ? 'fixed' : null);

                    return (
                        <div
                            key={cat.id}
                            className="flex items-center p-3 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors"
                        >
                            {/* Checkbox in edit mode */}
                            {isEditMode && (
                                <div
                                    onClick={() => toggleSelection(cat.id)}
                                    className={`w-5 h-5 mr-3 rounded border flex items-center justify-center cursor-pointer transition-colors ${selectedIds.has(cat.id) ? "bg-red-500 border-red-500" : "bg-white border-stone-300 hover:border-stone-400"}`}
                                >
                                    {selectedIds.has(cat.id) && <Check size={12} className="text-white" />}
                                </div>
                            )}

                            <div onClick={() => !isEditMode && openEditSheet(cat)} className="flex-1 cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-stone-800 text-sm">{cat.name}</span>
                                    {cat.is_pinned && (
                                        <span className="text-[10px] bg-stone-100 text-stone-500 px-1 py-0.5 rounded border border-stone-200 font-bold uppercase tracking-wider">Pinned</span>
                                    )}
                                </div>
                                {type === 'fixed' && (
                                    <span className="inline-block mt-1 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                        Fixed: {currency(cat.budget_limit)}
                                        {cat.frequency_months && cat.frequency_months > 1 && ` / mo (Every ${cat.frequency_months}m)`}
                                    </span>
                                )}
                                {type === 'variable_fixed' && (
                                    <span className="inline-block mt-1 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                        Set Aside: ~{currency(cat.budget_limit)}
                                    </span>
                                )}
                            </div>

                            {!isEditMode && (
                                <button onClick={() => openEditSheet(cat)} className="text-stone-300 hover:text-stone-600 px-2">
                                    <span className="text-xs uppercase font-bold tracking-widest">Edit</span>
                                </button>
                            )}
                        </div>
                    );
                })}

                {categories.length === 0 && (
                    <div className="p-8 text-center text-stone-400 text-sm">
                        No categories yet. Click "Add Category" to start.
                    </div>
                )}
            </div>

            {/* Shared Sheet for Add/Edit */}
            {isSheetOpen && (
                <CategorySheet
                    category={editingCat}
                    onClose={closeSheet}
                    onSave={(savedCat) => {
                        if (editingCat) {
                            // Update
                            setCategories(prev => prev.map(c => c.id === savedCat.id ? savedCat : c));
                        } else {
                            // Create
                            setCategories(prev => [...prev, savedCat].sort((a, b) => a.name.localeCompare(b.name)));
                        }
                        closeSheet();
                    }}
                    onDelete={(id) => {
                        setCategories(prev => prev.filter(c => c.id !== id));
                        closeSheet();
                    }}
                />
            )}
        </section>
    );
}

function CategorySheet({
    category,
    onClose,
    onSave,
    onDelete
}: {
    category?: Category,
    onClose: () => void,
    onSave: (c: Category) => void,
    onDelete?: (id: string) => void
}) {
    // If category (edit mode), use values. If undefined (add mode), use defaults.
    const isEditing = !!category;

    const [name, setName] = useState(category?.name || "");
    const initialType = category?.commitment_type || (category?.is_commitment ? 'fixed' : null);
    const [commitmentType, setCommitmentType] = useState<'fixed' | 'variable_fixed' | null>(initialType);

    // Limits
    const defaultLimit = category?.budget_limit ? category.budget_limit * (category.frequency_months || 1) : 0;
    const [budgetLimit, setBudgetLimit] = useState(defaultLimit > 0 ? defaultLimit.toString() : "");

    const [frequency, setFrequency] = useState(category?.frequency_months || 1);
    const [frequencyStart, setFrequencyStart] = useState(() => {
        if (category?.frequency_start) {
            const d = new Date(category.frequency_start);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [isPinned, setIsPinned] = useState(category?.is_pinned || false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSubmitting(true);

        const limit = parseFloat(budgetLimit) || 0;
        const startVal = frequency > 1 ? `${frequencyStart}-01` : undefined;
        const finalLimit = limit / frequency; // Monthly limit stored in DB

        try {
            if (isEditing && category) {
                // Update
                await updateCategory(category.id, name, commitmentType, finalLimit, isPinned, frequency, startVal);
                onSave({
                    ...category,
                    name,
                    commitment_type: commitmentType,
                    is_commitment: !!commitmentType,
                    budget_limit: finalLimit,
                    is_pinned: isPinned,
                    frequency_months: frequency,
                    frequency_start: startVal
                });
                toast.success("Category updated");
            } else {
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
                    frequency_start: startVal
                });
                toast.success("Category created");
            }
        } catch (error) {
            console.error(error);
            toast.error(isEditing ? "Failed to update" : "Failed to create");
            setIsSubmitting(false); // Only stop submitting on error, otherwise we close sheet
        }
    };

    const handleDelete = async () => {
        if (!isEditing || !category || !onDelete) return;
        if (!confirm("Delete this category? Transactions will become uncategorized.")) return;

        setIsSubmitting(true);
        try {
            await deleteCategory(category.id);
            onDelete(category.id);
            toast.success("Category deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-t-2xl p-6 pb-12 space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-stone-900">{isEditing ? "Edit Category" : "New Category"}</h2>
                    <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 text-stone-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Category Name"
                        className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                        autoFocus={!isEditing}
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

                    {commitmentType && (
                        <div className="space-y-4 animate-in slide-in-from-top-1 fade-in duration-200">
                            {/* Frequency Selector */}
                            {(commitmentType === 'fixed' || commitmentType === 'variable_fixed') && (
                                <>
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

                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold tracking-widest text-stone-400">
                                            {frequency > 1 ? "Total Bill Amount (AED)" : (commitmentType === 'fixed' ? "Fixed Amount (AED)" : "Monthly Limit (AED)")}
                                        </label>
                                        <input
                                            type="number"
                                            value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)}
                                            placeholder="0"
                                            className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono font-bold outline-none focus:border-stone-900"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-4 pt-4">
                    {isEditing && onDelete && (
                        <button
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            className="flex-1 bg-red-50 text-red-600 py-4 rounded-xl text-lg font-bold hover:bg-red-100 transition-colors"
                        >
                            Delete
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSubmitting || !name.trim()}
                        className={`flex-[2] bg-stone-900 text-white py-4 rounded-xl text-lg font-bold shadow-lg transition-transform active:scale-95 ${!isEditing ? "w-full flex-none" : ""}`}
                    >
                        {isEditing ? "Save Changes" : "Create Category"}
                    </button>
                </div>
            </div>
        </div>
    );
}
