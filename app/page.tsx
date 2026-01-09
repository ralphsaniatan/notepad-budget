"use client";

import { useState, useMemo } from "react";
import { PaperCard } from "@/components/ui/PaperCard";
import { DollarSign, ArrowRight, Wallet, AlertCircle } from "lucide-react";

export default function Home() {
  // Mock Data / State
  const [income, setIncome] = useState<number>(5000);
  const [rollover, setRollover] = useState<number>(250);
  const [commitments, setCommitments] = useState<number>(2000); // Rent, Bills
  const [spentVariable, setSpentVariable] = useState<number>(850); // Groceries, etc.

  // "Safe to Spend" Formula: (Income + Rollover) - (Commitments) - (Spent Variable)
  // Wait, the prompt says: (Income + Rollover) - (Unpaid Commitments) - (Variable Expenses)
  // Let's refine. "Safe to Spend" usually means "What I have left for variable spending".
  // So: Total Available = Income + Rollover.
  // Less: Commitments (Fixed bills).
  // Less: Already Spent Variable.
  // Result: Remaining Safe to Spend.

  // Prompt definition: (Income + Rollover) - (Unpaid Commitments) - (Variable Expenses)
  // I will interpret "Unpaid Commitments" as "Total Commitments" for the month (assuming I need to reserve that money).
  // The logic is: "Available Cash" - "Money needed for bills" - "Money already spent".

  const safeToSpend = useMemo(() => {
    return (income + rollover) - commitments - spentVariable;
  }, [income, rollover, commitments, spentVariable]);

  const currency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <header className="text-center space-y-2 mt-8">
        <h1 className="text-4xl font-extrabold text-stone-900 tracking-tight">
          Notepad Budget
        </h1>
        <p className="text-stone-500 font-mono text-sm">January 2026</p>
      </header>

      {/* Safe to Spend Hero */}
      <section className="relative">
        <PaperCard className="bg-yellow-50/50 border-yellow-200">
          <div className="flex flex-col items-center justify-center p-4">
            <span className="text-stone-500 uppercase text-xs font-bold tracking-widest mb-2">
              Safe to Spend
            </span>
            <div className="text-5xl font-mono font-bold text-stone-900 tracking-tighter">
              {currency(safeToSpend)}
            </div>
            <p className="text-stone-400 text-xs mt-2 italic">
              (Income + Rollover) - Commitments - Spent
            </p>
          </div>
        </PaperCard>
      </section>

      {/* Inputs Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PaperCard title="Income">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-stone-400" />
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
              className="w-full text-lg font-bold outline-none text-stone-800 border-b border-dashed border-stone-300 focus:border-stone-500 focus:bg-white/50 transition-colors"
            />
          </div>
        </PaperCard>

        <PaperCard title="Rollover">
          <div className="flex items-center space-x-2">
            <ArrowRight className="w-4 h-4 text-stone-400" />
            <input
              type="number"
              value={rollover}
              onChange={(e) => setRollover(Number(e.target.value))}
              className="w-full text-lg font-bold outline-none text-stone-800 border-b border-dashed border-stone-300 focus:border-stone-500 focus:bg-white/50 transition-colors"
            />
          </div>
        </PaperCard>

        <PaperCard title="Commitments">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-stone-400" />
            <input
              type="number"
              value={commitments}
              onChange={(e) => setCommitments(Number(e.target.value))}
              className="w-full text-lg font-bold outline-none text-stone-800 border-b border-dashed border-stone-300 focus:border-stone-500 focus:bg-white/50 transition-colors"
            />
          </div>
          <p className="text-xs text-stone-400 mt-2">Rent, Utilities, Subscriptions</p>
        </PaperCard>

        <PaperCard title="Variable Spent">
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-stone-400" />
            <input
              type="number"
              value={spentVariable}
              onChange={(e) => setSpentVariable(Number(e.target.value))}
              className="w-full text-lg font-bold outline-none text-stone-800 border-b border-dashed border-stone-300 focus:border-stone-500 focus:bg-white/50 transition-colors"
            />
          </div>
          <p className="text-xs text-stone-400 mt-2">Groceries, Dining, Fun</p>
        </PaperCard>
      </section>

      {/* Debug Info */}
      <section className="opacity-50 text-xs font-mono text-center">
        <p>Mock Data Implementation - Backend Disconnected</p>
      </section>
    </main>
  );
}
