"use client";

import { useEffect, useState, useCallback } from "react";
import { getAllUserData, addTransaction, addCategory, addDebt } from "@/app/actions";
import { db } from "@/lib/db";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";

export function SyncManager() {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [showIndicator, setShowIndicator] = useState(false);

    // Check pending items count
    const updatePendingCount = useCallback(async () => {
        const txCount = await db.transactions.where('sync_status').anyOf(['created', 'updated']).count();
        const catCount = await db.categories.where('sync_status').anyOf(['created', 'updated']).count();
        const debtCount = await db.debts.where('sync_status').anyOf(['created', 'updated']).count();
        const total = txCount + catCount + debtCount;
        setPendingCount(total);
        // Only show indicator when there's something to show (offline, syncing, or pending)
        // Hide when online with nothing pending
    }, []);

    // Initial Seed from Server - runs when local DB is empty
    useEffect(() => {
        async function seed() {
            // Check if local DB is empty (check all tables)
            const txCount = await db.transactions.count();
            const catCount = await db.categories.count();

            // If we have transactions and categories, assume seeded
            if (txCount > 0 && catCount > 0) {
                console.log("SyncManager: Local DB already has data, skipping seed");
                return;
            }

            console.log("SyncManager: Local DB is empty, seeding from server...");
            setIsSyncing(true);

            try {
                const res = await getAllUserData();
                if (res.success && res.data) {
                    // Clear existing to avoid duplicates then add
                    await db.transaction('rw', db.transactions, db.categories, db.debts, db.savings_goals, async () => {
                        await db.transactions.clear();
                        await db.categories.clear();
                        await db.debts.clear();
                        await db.savings_goals.clear();

                        if (res.data.transactions?.length) {
                            await db.transactions.bulkAdd(res.data.transactions.map((t: any) => ({ ...t, sync_status: 'synced' })));
                        }
                        if (res.data.categories?.length) {
                            await db.categories.bulkAdd(res.data.categories.map((c: any) => ({ ...c, sync_status: 'synced' })));
                        }
                        if (res.data.debts?.length) {
                            await db.debts.bulkAdd(res.data.debts.map((d: any) => ({ ...d, sync_status: 'synced' })));
                        }
                        if (res.data.savings_goals?.length) {
                            await db.savings_goals.bulkAdd(res.data.savings_goals.map((s: any) => ({ ...s, sync_status: 'synced' })));
                        }
                    });
                    console.log("SyncManager: Seed complete -", res.data.transactions?.length, "transactions,", res.data.categories?.length, "categories");
                } else {
                    console.log("SyncManager: No data returned from server");
                }
            } catch (e) {
                console.error("SyncManager: Seed failed", e);
            } finally {
                setIsSyncing(false);
                updatePendingCount();
            }
        }
        seed();
    }, []); // Empty deps - only run on mount

    // Push pending changes to server
    const pushChanges = useCallback(async () => {
        if (!navigator.onLine) return;

        setIsSyncing(true);
        let synced = 0;

        try {
            // 1. Sync Transactions
            const pendingTxs = await db.transactions.where('sync_status').equals('created').toArray();
            for (const tx of pendingTxs) {
                try {
                    const res = await addTransaction(tx.amount, tx.description, tx.type, tx.category_id, tx.debt_id);
                    if (res.success) {
                        await db.transactions.update(tx.id, { sync_status: 'synced' });
                        synced++;
                    }
                } catch (e) {
                    console.error("SyncManager: Failed to sync transaction", tx.id, e);
                }
            }

            // 2. Sync Categories
            const pendingCats = await db.categories.where('sync_status').equals('created').toArray();
            for (const cat of pendingCats) {
                try {
                    const commitType = cat.type === 'fixed' ? 'fixed' : null;
                    await addCategory(cat.name, commitType, cat.budget_limit, cat.is_pinned);
                    await db.categories.update(cat.id, { sync_status: 'synced' });
                    synced++;
                } catch (e) {
                    console.error("SyncManager: Failed to sync category", cat.id, e);
                }
            }

            // 3. Sync Debts
            const pendingDebts = await db.debts.where('sync_status').equals('created').toArray();
            for (const debt of pendingDebts) {
                try {
                    await addDebt(debt.name, debt.total_balance, debt.interest_rate);
                    await db.debts.update(debt.id, { sync_status: 'synced' });
                    synced++;
                } catch (e) {
                    console.error("SyncManager: Failed to sync debt", debt.id, e);
                }
            }

            if (synced > 0) {
                console.log(`SyncManager: Synced ${synced} items`);
            }
        } catch (e) {
            console.error("SyncManager: Push failed", e);
        } finally {
            setIsSyncing(false);
            updatePendingCount();
        }
    }, [updatePendingCount]);

    // Online/Offline detection
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            pushChanges(); // Auto-sync when back online
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [pushChanges]);

    // Periodic sync (every 30 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            updatePendingCount();
            if (navigator.onLine) pushChanges();
        }, 30000);
        return () => clearInterval(interval);
    }, [pushChanges, updatePendingCount]);

    // Initial check
    useEffect(() => {
        updatePendingCount();
    }, [updatePendingCount]);

    // Don't render if online with nothing pending and not syncing
    if (isOnline && pendingCount === 0 && !isSyncing) return null;

    return (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-xs font-bold ${!isOnline
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : isSyncing
                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                    : "bg-orange-100 text-orange-800 border border-orange-300"
                }`}>
                {!isOnline ? (
                    <>
                        <CloudOff size={14} />
                        <span>Offline</span>
                        {pendingCount > 0 && <span className="opacity-70">({pendingCount} pending)</span>}
                    </>
                ) : isSyncing ? (
                    <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Syncing...</span>
                    </>
                ) : (
                    <>
                        <Cloud size={14} />
                        <span>{pendingCount} pending</span>
                    </>
                )}
            </div>
        </div>
    );
}
