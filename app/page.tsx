"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Minus, Calculator, Wallet, Receipt, CreditCard } from "lucide-react";

export default function Home() {
  // Mock State
  const [income] = useState(5000);
  const [rollover] = useState(350);
  const [commitments] = useState(2200); // Fixed bills
  const [spent, setSpent] = useState(850); // Variable expenses already spent
  const [debt] = useState(12450);

  // Core Logic: (Income + Rollover) - (Unpaid Commitments) - (Variable Expenses)
  // Assuming 'commitments' are total monthly commitments.
  // In a real app we'd track 'unpaid' commitments specifically, but for now:
  // Safe to Spend = (Total Income + Rollover) - Total Commitments - Already Spent
  const safeToSpend = (income + rollover) - commitments - spent;

  const handleSpend = (amount: number) => {
    setSpent((prev) => prev + amount);
  };

  return (
    <main className="max-w-md mx-auto min-h-screen p-6 font-sans relative pb-20">
      {/* Header */}
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Notepad Budget</h1>
        <p className="text-stone-500 font-medium">January 2026</p>
      </header>

      {/* Hero: Safe to Spend */}
      <section className="mb-10 text-center">
        <div className="inline-block relative">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 mb-1">
            Safe to Spend
          </h2>
          <div className="text-6xl font-bold tracking-tighter font-mono text-stone-900">
            AED {safeToSpend.toFixed(2)}
          </div>
          {/* Underline for emphasis */}
          <div className="h-1 w-full bg-stone-900 mt-2 rounded-full opacity-80 decoration-wavy"></div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-6 mb-10">
        <div className="space-y-1">
          <span className="flex items-center gap-2 text-sm text-stone-500 font-medium">
            <CreditCard size={16} /> Debt Balance
          </span>
          <div className="text-2xl font-mono font-semibold text-red-700">
            -AED {debt.toLocaleString()}
          </div>
        </div>
        <div className="space-y-1">
          <span className="flex items-center gap-2 text-sm text-stone-500 font-medium">
            <Wallet size={16} /> Month Rollover
          </span>
          <div className="text-2xl font-mono font-semibold text-green-700">
            +AED {rollover.toLocaleString()}
          </div>
        </div>
      </section>

      {/* Breakdown (Handwritten style list) */}
      <section className="space-y-0 relative">
        {/* Vertical margin line (simulated) */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-red-200" style={{ left: '-1rem' }}></div>

        <div className="flex justify-between items-baseline py-2.5 border-b border-transparent leading-10">
          <span className="text-stone-600">Income</span>
          <span className="font-mono font-medium">AED {income}</span>
        </div>
        <div className="flex justify-between items-baseline py-2.5 border-b border-transparent leading-10">
          <span className="text-stone-600">Fixed Bills</span>
          <span className="font-mono font-medium">-AED {commitments}</span>
        </div>
        <div className="flex justify-between items-baseline py-2.5 border-b border-transparent leading-10">
          <span className="text-stone-600">Spent So Far</span>
          <span className="font-mono font-medium">-AED {spent}</span>
        </div>
      </section>

      {/* Interactive Test */}
      <section className="mt-12 p-4 border-2 border-stone-900 border-dashed rounded-lg bg-stone-100/50 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-stone-900 flex items-center gap-2">
            <Calculator size={20} />
            Quick Transaction
          </h3>
          <Link href="/transactions" className="text-sm font-medium text-stone-600 hover:text-stone-900 underline underline-offset-4">
            View All
          </Link>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSpend(50)}
            className="flex-1 bg-stone-900 text-stone-50 py-3 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-stone-800 transition-transform active:scale-95"
          >
            <Minus size={16} /> Spend AED 50
          </button>
          <button
            onClick={() => handleSpend(-50)}
            className="flex-1 border-2 border-stone-900 text-stone-900 py-3 rounded-md font-medium flex items-center justify-center gap-2 hover:bg-stone-200 transition-transform active:scale-95"
          >
            <Plus size={16} /> Refund AED 50
          </button>
        </div>
      </section>

    </main>
  );
}
