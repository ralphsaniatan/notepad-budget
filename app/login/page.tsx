"use client";

import { signIn } from "@/app/auth/actions";
import { PaperCard } from "@/components/ui/PaperCard";
import { Lock, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setError("");
        setLoading(true);
        const res = await signIn(formData);
        if (res?.error) {
            setError(res.error);
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-100/50">
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-stone-900 tracking-tighter">Notepad Budget</h1>
                    <div className="inline-block bg-stone-200 text-stone-500 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">Family Access</div>
                </div>

                <PaperCard className="p-8 shadow-2xl border-stone-200">
                    <form action={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="text-red-600 text-xs font-bold uppercase tracking-widest bg-red-50 p-3 rounded text-center border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Enter Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    autoFocus
                                    placeholder="Enter budget123"
                                    className="w-full pl-10 pr-4 py-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono text-stone-900 outline-none focus:border-stone-900 transition-colors placeholder:text-stone-300"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-stone-900 text-stone-50 py-4 rounded-lg text-sm font-bold hover:bg-black transition-all flex justify-center items-center gap-2 group disabled:opacity-50"
                        >
                            {loading ? "Unlocking..." : "Unlock Budget"} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                </PaperCard>

                <p className="text-center text-xs text-stone-400">
                    Secure, Private, Simple.
                </p>
            </div>
        </main>
    );
}
