"use client";

import { useState, useEffect } from "react";
import { signOut, getUser } from "@/app/auth/actions";
import { useRouter } from "next/navigation";
import { LogOut, ChevronLeft, User, Bell, Database, Shield } from "lucide-react";
import { PaperCard } from "@/components/ui/PaperCard";
import { Spinner } from "@/components/ui/Spinner";
import { db } from "@/lib/db";
import { toast } from "sonner";

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<{ email?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isClearingData, setIsClearingData] = useState(false);

    useEffect(() => {
        // Fetch user info
        getUser().then(res => {
            setUser(res.user);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

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
                <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
            </header>

            {/* User Info Card */}
            <section className="mb-6">
                <PaperCard className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center">
                        <User size={24} className="text-stone-500" />
                    </div>
                    <div>
                        <p className="font-bold text-stone-900">{user?.email || 'Guest User'}</p>
                        <p className="text-xs text-stone-400">Notepad Budget Account</p>
                    </div>
                </PaperCard>
            </section>

            {/* Settings List */}
            <section className="space-y-3">
                <h2 className="text-xs uppercase font-bold tracking-widest text-stone-400 px-1">Preferences</h2>

                {/* Future Features Placeholders */}
                <PaperCard className="p-4 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                        <Bell size={20} className="text-stone-400" />
                        <div>
                            <span className="font-bold text-stone-600">Notifications</span>
                            <span className="ml-2 text-[10px] uppercase bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full">Coming Soon</span>
                        </div>
                    </div>
                </PaperCard>

                <PaperCard className="p-4 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-stone-400" />
                        <div>
                            <span className="font-bold text-stone-600">Export Data</span>
                            <span className="ml-2 text-[10px] uppercase bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full">Coming Soon</span>
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
                        <span className="font-bold text-stone-800">
                            {isClearingData ? "Clearing..." : "Clear Local Data"}
                        </span>
                    </button>
                </PaperCard>

                {/* Logout */}
                <PaperCard className="p-4 border-red-100">
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
                <p className="text-xs text-stone-300">Notepad Budget v1.24.0</p>
            </footer>
        </main>
    );
}
