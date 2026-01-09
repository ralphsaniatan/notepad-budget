"use client";

import { signIn, signUp, loginAsGuest } from "@/app/auth/actions";
import { PaperCard } from "@/components/ui/PaperCard";
import { Lock, ArrowRight, User, Plus, LogIn, Sparkles, X, UserPlus, ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";

type StoredUser = { name: string, email: string };
type ViewMode = 'SELECT' | 'LOGIN' | 'SIGNUP';

export default function LoginPage() {
    // State
    const [view, setView] = useState<ViewMode>('LOGIN'); // Default to LOGIN until hydrating
    const [knownUsers, setKnownUsers] = useState<StoredUser[]>([]);

    // Form State
    const [email, setEmail] = useState("");
    const [name, setName] = useState(""); // Display Name
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Initial Load
    useEffect(() => {
        const stored = localStorage.getItem('budget_users');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setKnownUsers(parsed);
                    setView('SELECT');
                }
            } catch (e) { console.error("Failed to parse users", e); }
        }
    }, []);

    // Save User Helper
    const saveUserToLocal = (uName: string, uEmail: string) => {
        const newUser = { name: uName, email: uEmail };
        // Remove existing if any (update)
        const others = knownUsers.filter(u => u.email !== uEmail);
        const updated = [newUser, ...others];
        setKnownUsers(updated);
        localStorage.setItem('budget_users', JSON.stringify(updated));
    };

    // Handlers
    const handleLogin = async (formData: FormData) => {
        setError("");
        setLoading(true);
        const res = await signIn(formData);
        if (res?.error) {
            setError(res.error);
            setLoading(false);
        } else {
            // Success! (Note: Redirect happens on server, but we can optimistically save)
            // We can't guarantee name here if it's a fresh login, but if we have it in state/local, great.
            // If they are logging in via form and we don't know the name, we just store Email as name temporarily or don't update name.
            // For simple "Recent Users", saving Email is enough key.
            const knownName = knownUsers.find(u => u.email === email)?.name || "User";
            saveUserToLocal(knownName, email);
        }
    };

    const handleSignUp = async (formData: FormData) => {
        setError("");
        setLoading(true);
        const res = await signUp(formData);
        if (res?.error) {
            setError(res.error);
            setLoading(false);
        } else {
            saveUserToLocal(name, email);
        }
    };

    const handleGuest = async () => {
        setLoading(true);
        const res = await loginAsGuest();
        if (res?.error) {
            setError(res.error);
            setLoading(false);
        }
    };

    const selectUser = (u: StoredUser) => {
        setEmail(u.email);
        setName(u.name);
        setView('LOGIN');
    };

    // Views
    const renderUserSelection = () => (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Welcome Back</h1>
                <p className="text-xs text-stone-400 font-bold uppercase tracking-widest">Who is crunching numbers?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {knownUsers.map(u => (
                    <button
                        key={u.email}
                        onClick={() => selectUser(u)}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-white border-2 border-transparent hover:border-stone-200 shadow-lg hover:shadow-xl rounded-2xl transition-all group"
                    >
                        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                            <span className="text-2xl font-bold">{u.name[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-bold text-stone-700 text-sm">{u.name}</span>
                    </button>
                ))}

                {/* Add Account Button */}
                <button
                    onClick={() => { setEmail(""); setName(""); setView('LOGIN'); }}
                    className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-stone-200 hover:border-stone-400 rounded-2xl transition-all group"
                >
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center text-stone-300 group-hover:text-stone-500 transition-colors">
                        <Plus size={24} />
                    </div>
                    <span className="font-bold text-stone-400 text-xs uppercase tracking-widest">Add Account</span>
                </button>
            </div>

            <button onClick={handleGuest} className="w-full py-3 text-stone-400 text-xs font-bold hover:text-stone-600 transition-colors flex items-center justify-center gap-2">
                <Sparkles size={14} /> Try Guest Mode
            </button>
        </div>
    );

    const renderForm = () => (
        <PaperCard className="p-8 shadow-2xl border-stone-200 animate-in slide-in-from-right duration-300">
            {knownUsers.length > 0 && (
                <button onClick={() => setView('SELECT')} className="mb-6 text-stone-400 hover:text-stone-900 flex items-center gap-1 text-xs font-bold uppercase tracking-widest transition-colors">
                    <ChevronLeft size={14} /> Back to Users
                </button>
            )}

            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-stone-900">
                    {view === 'SIGNUP' ? "Create Account" : (name ? `Hello, ${name}` : "Log In")}
                </h2>
            </div>

            <form action={view === 'SIGNUP' ? handleSignUp : handleLogin} className="space-y-5">
                {error && (
                    <div className="text-red-600 text-xs font-bold uppercase tracking-widest bg-red-50 p-3 rounded text-center border border-red-100">
                        {error}
                    </div>
                )}

                {view === 'SIGNUP' && (
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Your Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                            <input
                                name="displayName"
                                type="text"
                                required
                                placeholder="e.g. Ralph"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-stone-50 border-b-2 border-stone-200 text-base font-bold text-stone-900 outline-none focus:border-stone-900 transition-colors placeholder:text-stone-300"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Email Address</label>
                    <input
                        name="email"
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full p-4 bg-stone-50 border-b-2 border-stone-200 text-lg font-bold text-stone-900 outline-none focus:border-stone-900 transition-colors placeholder:text-stone-300"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold tracking-widest text-stone-400">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                        <input
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••"
                            className="w-full pl-10 pr-4 py-3 bg-stone-50 border-b-2 border-stone-200 text-lg font-mono text-stone-900 outline-none focus:border-stone-900 transition-colors placeholder:text-stone-300"
                        />
                    </div>
                </div>

                <button
                    disabled={loading}
                    className="w-full bg-stone-900 text-stone-50 py-4 rounded-xl text-sm font-bold hover:bg-black transition-all flex justify-center items-center gap-2 group disabled:opacity-50 shadow-lg"
                >
                    {loading ? "Crunching..." : (view === 'SIGNUP' ? "Create Account" : "Access Budget")}
                    {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                </button>
            </form>

            <div className="mt-6 pt-6 border-t border-stone-100 flex justify-center gap-4 text-xs">
                {view === 'LOGIN' ? (
                    <button type="button" onClick={() => setView('SIGNUP')} className="text-stone-400 hover:text-stone-900 font-bold transition-colors">
                        New here? Create Account
                    </button>
                ) : (
                    <button type="button" onClick={() => setView('LOGIN')} className="text-stone-400 hover:text-stone-900 font-bold transition-colors">
                        Already have an account? Log In
                    </button>
                )}
            </div>

            {view === 'LOGIN' && knownUsers.length === 0 && (
                <div className="text-center mt-4">
                    <button onClick={handleGuest} className="text-stone-300 hover:text-stone-500 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1 mx-auto">
                        <Sparkles size={10} /> Try Guest Mode
                    </button>
                </div>
            )}
        </PaperCard>
    );

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-100/50">
            <div className="w-full max-w-sm space-y-6">
                {view === 'SELECT' ? renderUserSelection() : renderForm()}

                <p className="text-center text-[10px] text-stone-300 font-mono">
                    v1.20 | Secure & Private
                </p>
            </div>
        </main>
    );
}
