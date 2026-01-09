"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Plus } from "lucide-react";
import TransactionForm from "../components/TransactionForm";

type Transaction = {
    id: string;
    amount: number;
    type: "expense" | "income" | "debt_payment";
    description: string;
    date: string;
};

export default function TransactionsPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);

    // In real app: const transactions = useQuery... or passed as prop
    const [transactions] = useState<Transaction[]>([
        { id: "1", amount: 120, type: "expense", description: "Grocery Run", date: "2026-01-08" },
        { id: "2", amount: 450, type: "income", description: "Freelance Work", date: "2026-01-07" },
        { id: "3", amount: 50, type: "expense", description: "Coffee", date: "2026-01-07" },
    ]);

    return (
        <main className="max-w-md mx-auto min-h-screen p-6 font-sans relative pb-20">
            {/* Header */}
            <header className="mb-8 pt-4 flex items-center justify-between">
                <Link href="/" className="text-stone-500 hover:text-stone-900 transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-xl font-bold tracking-tight text-stone-900">Transactions</h1>
                <div className="w-6"></div> {/* Spacer for alignment */}
            </header>

            {/* Transaction List */}
            <section className="space-y-4">
                {transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-3 border-b border-stone-200/50">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-stone-700'
                                }`}>
                                {t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                            </div>
                            <div>
                                <p className="font-medium text-stone-900">{t.description}</p>
                                <p className="text-xs text-stone-500">{t.date}</p>
                            </div>
                        </div>
                        <div className={`font-mono font-medium ${t.type === 'income' ? 'text-green-700' : 'text-stone-900'
                            }`}>
                            {t.type === 'income' ? '+' : '-'}AED {Math.abs(t.amount).toFixed(2)}
                        </div>
                    </div>
                ))}
            </section>

            {/* Floating Action Button / Add Form Trigger */}
            <div className="fixed bottom-6 right-6">
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="h-14 w-14 bg-stone-900 text-stone-50 rounded-full shadow-lg flex items-center justify-center hover:bg-stone-800 transition-transform active:scale-90 peer z-10"
                >
                    <Plus size={24} />
                </button>
            </div>

            {/* Form Overlay */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animation-fade-in">
                    <div className="w-full animate-slide-up">
                        <TransactionForm onClose={() => setIsFormOpen(false)} />
                    </div>
                </div>
            )}
        </main>
    );
}
