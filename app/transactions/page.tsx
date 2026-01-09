import { getDashboardData } from "../actions";
import { TrackedBudgetList } from "@/components/TrackedBudgetList";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Plus } from "lucide-react";
import Link from "next/link";
import TransactionForm from "../components/TransactionForm"; // Keeping client form logic for now, or could refactor

// This is a Server Component
export default async function TransactionsPage() {
    const data = await getDashboardData();
    const transactions = data.recentTransactions;

    return (
        <main className="max-w-md mx-auto min-h-screen p-6 font-sans relative pb-20">
            {/* Header */}
            <header className="mb-6 pt-4 flex items-center justify-between">
                <Link href="/" className="text-stone-500 hover:text-stone-900 transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-xl font-bold tracking-tight text-stone-900">Transactions</h1>
                <div className="w-6"></div>
            </header>

            {/* Pinned Budgets (Envelopes) */}
            <TrackedBudgetList />

            {/* Transaction List */}
            <section className="space-y-4">
                {transactions.length === 0 ? (
                    <div className="text-center py-10 text-stone-400">
                        <p>No transactions this month.</p>
                    </div>
                ) : (
                    transactions.map((t) => (
                        <div key={t.id} className="flex items-center justify-between py-3 border-b border-stone-200/50">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-green-100 text-green-700' :
                                    t.type === 'debt_payment' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-stone-700'
                                    }`}>
                                    {t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                </div>
                                <div>
                                    <p className="font-medium text-stone-900">{t.description}</p>
                                    <p className="text-xs text-stone-500">
                                        {new Date(t.date).toLocaleDateString()}
                                        {t.category_name && <span className="ml-1 px-1.5 py-0.5 bg-stone-100 rounded-full text-[10px] uppercase font-bold tracking-wide">{t.category_name}</span>}
                                    </p>
                                </div>
                            </div>
                            <div className={`font-mono font-medium ${t.type === 'income' ? 'text-green-700' : 'text-stone-900'
                                }`}>
                                {t.type === 'income' ? '+' : '-'}AED {Math.abs(t.amount).toFixed(2)}
                            </div>
                        </div>
                    ))
                )}
            </section>

            {/* Floating Action Button - Reusing Dashboard's MobileAddBar is better, 
                but for now let's just keep the list view or link back to dashboard relative add?
                Actually, user will likely want to add here too. 
                For MVP speed, I will omit the Add Button here and assume they use the Dashboard 
                OR I can re-add the Clientside wrapper if needed.
                Let's stick to View-Only for this page to avoid duplicating the huge form logic 
                unless I exported it.
            */}
        </main>
    );
}
