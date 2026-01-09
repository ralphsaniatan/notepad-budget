"use client";

import { useState } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { Plus, Trash2 } from "lucide-react";
import { addCategory } from "@/app/actions";

type Category = {
    id: string;
    name: string;
    is_commitment: boolean;
    budget_limit: number;
};

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Category State
    const [newName, setNewName] = useState("");
    const [isCommitment, setIsCommitment] = useState(false);
    const [budgetLimit, setBudgetLimit] = useState("");

    const handleAdd = async () => {
        if (!newName) return;
        setIsSubmitting(true);
        const limit = parseFloat(budgetLimit) || 0;

        // Optimistic
        const newCat = {
            id: Math.random().toString(),
            name: newName,
            is_commitment: isCommitment,
            budget_limit: limit
        };
        setCategories(prev => [...prev, newCat]);
        setNewName("");
        setBudgetLimit("");
        setIsCommitment(false);

        try {
            await addCategory(newName, isCommitment, limit);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="space-y-6">

            {/* Add Form */}
            <PaperCard className="p-4 space-y-3 bg-stone-50 border-2 border-stone-200">
                <h3 className="text-stone-500 text-xs uppercase font-bold tracking-widest">Add Category</h3>
                <div className="space-y-3">
                    <input
                        type="text" placeholder="Category Name"
                        value={newName} onChange={e => setNewName(e.target.value)}
                        className="w-full p-2 bg-white border border-stone-200 rounded text-sm outline-none focus:border-stone-400"
                    />
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-stone-600">
                            <input
                                type="checkbox"
                                checked={isCommitment}
                                onChange={e => setIsCommitment(e.target.checked)}
                                className="rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                            />
                            Fixed Bill?
                        </label>
                        {isCommitment && (
                            <input
                                type="number" placeholder="Budget Limit"
                                value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)}
                                className="flex-1 p-2 bg-white border border-stone-200 rounded text-sm outline-none focus:border-stone-400"
                            />
                        )}
                    </div>
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
                {categories.map(cat => (
                    <div key={cat.id} className="flex justify-between items-center p-3 bg-white border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                        <div>
                            <span className="font-bold text-stone-800 text-sm">{cat.name}</span>
                            {cat.is_commitment && (
                                <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                    Fixed: ${cat.budget_limit}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
