"use client";

import { useState } from "react";
import { Plus, Minus, Loader2, ArrowUpRight, ArrowDownLeft, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { addTransaction } from "@/app/actions";

export default function TransactionForm({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<"expense" | "income" | "debt_payment">("expense");
  
  // Form States
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    
    setIsSubmitting(true);
    
    try {
        await addTransaction(Number(amount), description, type);
        
        // Reset and Refresh
        setAmount("");
        setDescription("");
        router.refresh();
        if (onClose) onClose();
        
    } catch (error) {
        console.error("Failed to add transaction", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-t-2xl sm:rounded-2xl border border-stone-200 shadow-xl max-w-md w-full mx-auto">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-stone-900">New Entry</h2>
          {onClose && (
              <button 
                onClick={onClose}
                className="p-1 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
                type="button"
              >
                  <X size={20} />
              </button>
          )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Toggle */}
        <div className="flex p-1 bg-stone-100 rounded-lg">
            <button
                type="button"
                onClick={() => setType("expense")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                    type === "expense" ? "bg-white text-red-700 shadow-sm" : "text-stone-500 hover:text-stone-700"
                }`}
            >
                <ArrowUpRight size={16} /> Expense
            </button>
            <button
                type="button"
                onClick={() => setType("income")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                    type === "income" ? "bg-white text-green-700 shadow-sm" : "text-stone-500 hover:text-stone-700"
                }`}
            >
                <ArrowDownLeft size={16} /> Income
            </button>
        </div>

        {/* Amount */}
        <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Amount (AED)
            </label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono">AED</span>
                <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border-b-2 border-stone-200 focus:border-stone-900 outline-none text-2xl font-mono font-bold text-stone-900 placeholder:text-stone-300 transition-colors"
                    required
                />
            </div>
        </div>

        {/* Description */}
        <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                Description
            </label>
            <input 
                type="text" 
                placeholder="What was this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-0 py-2 bg-transparent border-b border-stone-200 focus:border-stone-900 outline-none text-lg text-stone-900 placeholder:text-stone-300 transition-colors"
                required
            />
        </div>

        {/* Submit */}
        <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-stone-900 text-stone-50 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-stone-800 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
            {isSubmitting ? (
                <>
                    <Loader2 size={20} className="animate-spin" />
                    Saving...
                </>
            ) : (
                <>
                    <Plus size={20} />
                    Add Transaction
                </>
            )}
        </button>
      </form>
    </div>
  );
}
