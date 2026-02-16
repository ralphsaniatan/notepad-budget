"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Check } from "lucide-react";
import { deleteCategory } from "@/app/actions";
import { toast } from "sonner";
import { CategorySheet, Category } from "@/components/CategorySheet";
import { EditCategorySheet } from "@/components/EditCategorySheet";

// Currency helper
const currency = (amount: number) =>
    new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

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
                        No categories yet. Click &quot;Add Category&quot; to start.
                    </div>
                )}
            </div>

            {/* Shared Sheet for Add/Edit */}
            {isSheetOpen && !editingCat && (
                <CategorySheet
                    onClose={closeSheet}
                    onSave={(savedCat) => {
                        // Create
                        setCategories((prev: Category[]) => [...prev, savedCat].sort((a, b) => a.name.localeCompare(b.name)));
                    }}
                />
            )}
            {isSheetOpen && editingCat && (
                <EditCategorySheet
                    category={editingCat}
                    allCategories={categories}
                    onClose={closeSheet}
                    onUpdate={(savedCat) => {
                        // Update
                        setCategories((prev: Category[]) => prev.map(c => c.id === savedCat.id ? savedCat : c));
                    }}
                    onDelete={(id) => {
                        setCategories((prev: Category[]) => prev.filter(c => c.id !== id));
                        closeSheet();
                    }}
                />
            )}
        </section>
    );
}
