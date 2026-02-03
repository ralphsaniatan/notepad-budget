"use client";

import { useState, useEffect } from "react";
import { signOut, getUser } from "@/app/auth/actions";
import { useRouter } from "next/navigation";
import { Moon, Sun, LogOut, ChevronLeft, User, Bell, Database, Shield } from "lucide-react";
import { PaperCard } from "@/components/ui/PaperCard";
import { Spinner } from "@/components/ui/Spinner";
import { db } from "@/lib/db";
import { toast } from "sonner";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<{ email?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [isClearingData, setIsClearingData] = useState(false);

    useEffect(() => {
        // Check for saved dark mode preference
        const saved = localStorage.getItem('darkMode');
        if (saved === 'true') {
            setDarkMode(true);
            document.documentElement.classList.add('dark');
        }

        // Fetch user info
        getUser().then(res => {
            setUser(res.user);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const toggleDarkMode = () => {
        const newValue = !darkMode;
        setDarkMode(newValue);
        localStorage.setItem('darkMode', String(newValue));

        if (newValue) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const handleLogout = async () => {
        if (!confirm("Are you sure you want to log out?")) return;
        await signOut();
        router.push('/login');
    };

    const handleClearLocalData = async () => {
        if (!confirm("Clear all local data? This will remove cached transactions and categories. You'll need to sync again.")) return;

        setIsClearingData(true);
        try {
            await db.transactions.clear();
            await db.categories.clear();
            await db.debts.clear();
            await db.savings_goals.clear();
            toast.success("Local data cleared");
            router.push('/');
        } catch (e) {
            console.error(e);
            toast.error("Failed to clear data");
        } finally {
            setIsClearingData(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner />
            </div>
        );
    }

    return (
        <main className="min-h-screen pb-24 px-4 max-w-lg mx-auto">
            {/* Header */}
            <header className="pt-8 pb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-4"
                >
                    <ChevronLeft size={20} />
                    <span className="text-sm font-bold">Back</span>
                </button>
                <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Settings</h1>
            </header>

            {/* User Info Card */}
            <section className="mb-6">
                <PaperCard className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center">
                        <User size={24} className="text-stone-500 dark:text-stone-400" />
                    </div>
                    <div>
                        <p className="font-bold text-stone-900 dark:text-stone-100">{user?.email || 'Guest User'}</p>
                        <p className="text-xs text-stone-400">Notepad Budget Account</p>
                    </div>
                </PaperCard>
            </section>

            {/* Settings List */}
            <section className="space-y-3">
                <h2 className="text-xs uppercase font-bold tracking-widest text-stone-400 px-1">Preferences</h2>

                {/* Dark Mode Toggle */}
                <PaperCard className="p-4">
                    <button
                        onClick={toggleDarkMode}
                        className="w-full flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            {darkMode ? <Moon size={20} className="text-indigo-500" /> : <Sun size={20} className="text-amber-500" />}
                            <span className="font-bold text-stone-800 dark:text-stone-200">Dark Mode</span>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-indigo-500' : 'bg-stone-200'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </button>
                </PaperCard>

                {/* Future Features Placeholders */}
                <PaperCard className="p-4 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                        <Bell size={20} className="text-stone-400" />
                        <div>
                            <span className="font-bold text-stone-600 dark:text-stone-400">Notifications</span>
                            <span className="ml-2 text-[10px] uppercase bg-stone-100 dark:bg-stone-700 text-stone-400 px-2 py-0.5 rounded-full">Coming Soon</span>
                        </div>
                    </div>
                </PaperCard>

                <PaperCard className="p-4 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-stone-400" />
                        <div>
                            <span className="font-bold text-stone-600 dark:text-stone-400">Export Data</span>
                            <span className="ml-2 text-[10px] uppercase bg-stone-100 dark:bg-stone-700 text-stone-400 px-2 py-0.5 rounded-full">Coming Soon</span>
                        </div>
                    </div>
                </PaperCard>
            </section>

            {/* Danger Zone */}
            <section className="mt-8 space-y-3">
                <h2 className="text-xs uppercase font-bold tracking-widest text-stone-400 px-1">Account</h2>

                {/* Clear Local Data */}
                <PaperCard className="p-4">
                    <button
                        onClick={handleClearLocalData}
                        disabled={isClearingData}
                        className="w-full flex items-center gap-3"
                    >
                        <Database size={20} className="text-amber-500" />
                        <span className="font-bold text-stone-800 dark:text-stone-200">
                            {isClearingData ? "Clearing..." : "Clear Local Data"}
                        </span>
                    </button>
                </PaperCard>

                {/* Logout */}
                <PaperCard className="p-4 border-red-100 dark:border-red-900/30">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 text-red-600"
                    >
                        <LogOut size={20} />
                        <span className="font-bold">Log Out</span>
                    </button>
                </PaperCard>
            </section>

            {/* Version */}
            <footer className="mt-12 text-center">
                <p className="text-xs text-stone-300 dark:text-stone-600">Notepad Budget v1.24.0</p>
            </footer>
        </main>
    );
}
