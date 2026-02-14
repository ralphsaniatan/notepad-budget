"use client";

import { useState } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { Plus, Trash2, Info, X, Landmark, ShoppingBag, Check, Pencil } from "lucide-react";
import { addCategory, updateCategory, deleteCategory } from "@/app/actions";
import { toast } from "sonner";

// Currency helper
const currency = (amount: number) =>
    new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

type CatType = 'fixed' | 'needs' | 'wants';

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
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Category State (MobileAddBar style)
    const [searchValue, setSearchValue] = useState("");
    const [selectedType, setSelectedType] = useState<CatType | null>(null);
    const [budgetLimit, setBudgetLimit] = useState("");
    const [frequency, setFrequency] = useState(1);
    const [frequencyStart, setFrequencyStart] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [isPinned, setIsPinned] = useState(false);

    // Bulk Delete State
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Edit Sheet
    const [editingCat, setEditingCat] = useState<Category | null>(null);

    const isCreatingNew = searchValue.trim().length > 0;

    const handleTypeSelect = (type: CatType) => {
        setSelectedType(type);
    };

    const handleAdd = async () => {
        if (!searchValue.trim() || !selectedType) return;
        setIsSubmitting(true);

        const limit = parseFloat(budgetLimit) || 0;
        const name = searchValue.trim();

        // Map type to DB format
        const commitmentType = selectedType === 'fixed' ? 'fixed'
            : selectedType === 'needs' ? 'variable_fixed'
                : null;

        // Optimistic add
        const newCat: Category = {
            id: crypto.randomUUID(),
            name,
            commitment_type: commitmentType,
            is_commitment: !!commitmentType,
            budget_limit: limit / frequency, // Store monthly limit
            is_pinned: isPinned,
            frequency_months: frequency,
            frequency_start: frequency > 1 ? `${frequencyStart}-01` : undefined
        };
        setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));

        // Reset form
        setSearchValue("");
        setSelectedType(null);
        setBudgetLimit("");
        setFrequency(1);
        setFrequencyStart(() => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        });
        setIsPinned(false);

        try {
            await addCategory(name, commitmentType, limit / frequency, isPinned, frequency, frequency > 1 ? `${frequencyStart}-01` : undefined);
            toast.success("Category created");
        } catch (err) {
            console.error(err);
            toast.error("Failed to create category");
        } finally {
            setIsSubmitting(false);
        }
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
            {/* Add Form - MobileAddBar Style */}
            <PaperCard className="p-4 space-y-4 bg-stone-50 border-2 border-stone-200">
                <h3 className="text-stone-500 text-xs uppercase font-bold tracking-widest">Add Category</h3>

                <div className="space-y-3">
                    {/* Search/Type Input */}
                    <input
                        type="text"
                        placeholder="Type category name..."
                        value={searchValue}
                        onChange={e => { setSearchValue(e.target.value); setSelectedType(null); }}
                        className="w-full p-4 bg-white border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900 rounded-t-lg"
                    />

                    {/* Type Selector - shows when typing new name */}
                    {isCreatingNew && !selectedType && (
                        <div className="bg-white border border-stone-200 p-4 rounded-xl shadow-lg space-y-2 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400 mb-2">
                                <Plus size={12} /> Create "{searchValue}" as:
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <button onClick={() => handleTypeSelect('fixed')} className="flex items-center gap-3 p-3 rounded-lg border bg-white border-stone-200 text-stone-500 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-95 text-left">
                                    <div className="p-2 rounded-full bg-stone-100 text-stone-400"><Landmark size={20} /></div>
                                    <div>
                                        <div className="font-bold text-sm text-stone-700">Fixed</div>
                                        <div className="text-[10px] opacity-70 leading-tight">Rent, Utilities, Netflix</div>
                                    </div>
                                </button>
                                <button onClick={() => handleTypeSelect('needs')} className="flex items-center gap-3 p-3 rounded-lg border bg-white border-stone-200 text-stone-500 hover:border-purple-500 hover:bg-purple-50 transition-all active:scale-95 text-left">
                                    <div className="p-2 rounded-full bg-stone-100 text-stone-400"><ShoppingBag size={20} /></div>
                                    <div>
                                        <div className="font-bold text-sm text-stone-700">Needs</div>
                                        <div className="text-[10px] opacity-70 leading-tight">Groceries, Petrol</div>
                                    </div>
                                </button>
                                <button onClick={() => handleTypeSelect('wants')} className="flex items-center gap-3 p-3 rounded-lg border bg-white border-stone-200 text-stone-500 hover:border-emerald-500 hover:bg-emerald-50 transition-all active:scale-95 text-left">
                                    <div className="p-2 rounded-full bg-stone-100 text-stone-400"><ShoppingBag size={20} /></div>
                                    <div>
                                        <div className="font-bold text-sm text-stone-700">Wants</div>
                                        <div className="text-[10px] opacity-70 leading-tight">Fun, Shopping, Dining</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Selected Type Confirmation */}
                    {isCreatingNew && selectedType && (
                        <div className="space-y-3 animate-in slide-in-from-top-2">
                            <div className="bg-white border border-stone-200 p-3 rounded-xl shadow-sm flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-full ${selectedType === 'fixed' ? "bg-blue-100 text-blue-700" : selectedType === 'needs' ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"}`}>
                                        {selectedType === 'fixed' ? <Landmark size={14} /> : <ShoppingBag size={14} />}
                                    </div>
                                    <div className="text-sm font-bold text-stone-700 capitalize">{selectedType}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div onClick={() => setIsPinned(!isPinned)} className="flex items-center gap-2 cursor-pointer select-none group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isPinned ? "bg-stone-900 border-stone-900" : "bg-white border-stone-300 group-hover:border-stone-400"}`}>
                                            {isPinned && <Check size={10} className="text-white" />}
                                        </div>
                                        <span className="text-xs font-bold text-stone-500 group-hover:text-stone-700">Pin</span>
                                    </div>
                                    <button onClick={() => setSelectedType(null)} className="text-xs font-bold text-blue-500 hover:text-blue-700">Change</button>
                                </div>
                            </div>

                            {/* Budget Limit for non-fixed */}
                            {selectedType !== 'fixed' && (
                                <div className="space-y-2">
                                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Monthly Limit (AED)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={budgetLimit}
                                        onChange={e => setBudgetLimit(e.target.value)}
                                        className="w-full p-4 bg-white border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                                    />
                                </div>
                            )}

                            {(selectedType === 'fixed' || selectedType === 'needs') && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Frequency</label>
                                            {frequency > 1 && (
                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                    Monthly Cost: {currency((parseFloat(budgetLimit) || 0) / frequency)}
                                                </span>
                                            )}
                                        </div>
                                        <select
                                            value={frequency}
                                            onChange={e => setFrequency(Number(e.target.value))}
                                            className="w-full p-4 bg-white border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900 appearance-none"
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
                                                className="w-full p-4 bg-white border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                                            />
                                            <p className="text-[10px] text-stone-400">The month you first pay the full bill</p>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold tracking-widest text-stone-400">
                                            {frequency > 1 ? "Total Bill Amount (AED)" : (selectedType === 'fixed' ? "Fixed Amount (AED)" : "Monthly Limit (AED)")}
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={budgetLimit}
                                            onChange={e => setBudgetLimit(e.target.value)}
                                            className="w-full p-4 bg-white border-b-2 border-stone-200 text-lg font-bold outline-none focus:border-stone-900"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleAdd}
                    disabled={isSubmitting || !searchValue.trim() || !selectedType}
                    className="w-full bg-stone-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-stone-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={16} /> Add Category
                </button>
            </PaperCard>

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

                            <div onClick={() => !isEditMode && setEditingCat(cat)} className="flex-1 cursor-pointer">
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
                                <button onClick={() => setEditingCat(cat)} className="text-stone-300 hover:text-stone-600 px-2">
                                    <span className="text-xs uppercase font-bold tracking-widest">Edit</span>
                                </button>
                            )}
                        </div>
                    );
                })}

                {categories.length === 0 && (
                    <div className="p-8 text-center text-stone-400 text-sm">
                        No categories yet. Create one above!
                    </div>
                )}
            </div>

            {/* Edit Sheet */}
            {editingCat && (
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
            )}
        </section>
    );
}

function EditCategorySheet({ category, onClose, onUpdate, onDelete }: { category: Category, onClose: () => void, onUpdate: (c: Category) => void, onDelete: (id: string) => void }) {
    const [name, setName] = useState(category.name);
    const initialType = category.commitment_type || (category.is_commitment ? 'fixed' : null);
    const [commitmentType, setCommitmentType] = useState<'fixed' | 'variable_fixed' | null>(initialType);
    const [budgetLimit, setBudgetLimit] = useState((category.budget_limit * (category.frequency_months || 1)).toString());
    const [frequency, setFrequency] = useState(category.frequency_months || 1);
    const [frequencyStart, setFrequencyStart] = useState(() => {
        if (category.frequency_start) {
            const d = new Date(category.frequency_start);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [isPinned, setIsPinned] = useState(category.is_pinned || false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        setIsSubmitting(true);
        const limit = parseFloat(budgetLimit) || 0;
        const startVal = frequency > 1 ? `${frequencyStart}-01` : undefined;
        await updateCategory(category.id, name, commitmentType, limit / frequency, isPinned, frequency, startVal);
        onUpdate({
            ...category,
            name,
            commitment_type: commitmentType,
            is_commitment: !!commitmentType,
            budget_limit: limit / frequency,
            is_pinned: isPinned,
            frequency_months: frequency,
            frequency_start: startVal
        });
        toast.success("Category updated");
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!confirm("Delete this category? Transactions will become uncategorized.")) return;
        setIsSubmitting(true);
        await deleteCategory(category.id);
        onDelete(category.id);
        toast.success("Category deleted");
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                            )}

                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold tracking-widest text-stone-400">
                                    {frequency > 1 ? "Total Bill Amount (AED)" : (commitmentType === 'fixed' ? "Fixed Amount (AED)" : "Monthly Limit (AED)")}
                                </label>
                                <input
                                    type="number"
                                    value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)}
                                    className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono font-bold outline-none focus:border-stone-900"
                                />
                            </div>
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
        </div >
    );
}
