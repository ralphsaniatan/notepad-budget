"use client";

import { signIn } from "@/app/auth/actions";
import { PaperCard } from "@/components/ui/PaperCard";
import { Lock } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
    const [error, setError] = useState("");

    const handleSubmit = async (formData: FormData) => {
        setError("");
        const res = await signIn(formData);
        if (res?.error) {
            setError(res.error);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4 bg-stone-100">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Notepad Budget</h1>
                    <p className="text-stone-400 text-sm font-mono">Family Access</p>
                </div>

                <PaperCard className="p-6 md:p-8">
                    <form action={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="text-red-600 text-xs font-bold uppercase tracking-widest bg-red-50 p-2 rounded text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold tracking-widest text-stone-500">Email</label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="family@budget.app"
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded text-sm outline-none focus:border-stone-900 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold tracking-widest text-stone-500">Password</label>
                            <input
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded text-sm outline-none focus:border-stone-900 transition-colors"
                            />
                        </div>

                        <button className="w-full bg-stone-900 text-white py-3 rounded text-sm font-bold hover:bg-stone-800 transition-all flex justify-center items-center gap-2">
                            <Lock size={16} /> Login
                        </button>
                    </form>
                </PaperCard>
            </div>
        </main>
    );
}
