"use client";

import { useEffect, useState, useCallback } from "react";
import { getAllUserData, addTransaction, addCategory, addDebt } from "@/app/actions";
import { db, LocalTransaction, LocalCategory, LocalDebt, LocalSavingsGoal } from "@/lib/db";
import { Cloud, CloudOff, RefreshCw, Check, Download, Upload, AlertCircle } from "lucide-react";

export function SyncManager() {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastPull, setLastPull] = useState<Date | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);

    // Check pending items count
    const updatePendingCount = useCallback(async () => {
        const txCount = await db.transactions.where('sync_status').anyOf(['created', 'updated']).count();
        const catCount = await db.categories.where('sync_status').anyOf(['created', 'updated']).count();
        const debtCount = await db.debts.where('sync_status').anyOf(['created', 'updated']).count();
        const total = txCount + catCount + debtCount;
        setPendingCount(total);
    }, []);

    // Global error handler for ChunkLoadError (new deployments)
    useEffect(() => {
        const handleChunkError = (event: ErrorEvent) => {
            const isChunkError = /Loading chunk [\d]+ failed/.test(event.message) || /Unexpected token/.test(event.message);
            if (isChunkError) {
                console.log("ChunkLoadError detected, reloading...");
                window.location.reload();
            }
        };
        window.addEventListener('error', handleChunkError);
        return () => window.removeEventListener('error', handleChunkError);
    }, []);

    // Pull Data from Server (Merge Strategy)
    const pullFromServer = useCallback(async () => {
        if (!navigator.onLine) return;

        setIsPulling(true);
        setSyncError(null);
        console.log("SyncManager: Pulling data from server...");

        try {
            const res = await getAllUserData();
            if (!res.success || !res.data) {
                throw new Error("Failed to fetch data from server");
            }

            await db.transaction('rw', db.transactions, db.categories, db.debts, db.savings_goals, async () => {
                // Get IDs of pending local items (don't overwrite or delete these)
                const pendingTxIds = (await db.transactions.where('sync_status').anyOf(['created', 'updated']).toArray()).map(t => t.id);
                const pendingCatIds = (await db.categories.where('sync_status').anyOf(['created', 'updated']).toArray()).map(c => c.id);
                const pendingDebtIds = (await db.debts.where('sync_status').anyOf(['created', 'updated']).toArray()).map(d => d.id);
                const pendingSavingsIds = (await db.savings_goals.where('sync_status').anyOf(['created', 'updated']).toArray()).map(s => s.id);

                // Get server IDs for comparison
                const serverTxIds = new Set((res.data.transactions as Partial<LocalTransaction>[] || []).map((t) => t.id));
                const serverCatIds = new Set((res.data.categories as Partial<LocalCategory>[] || []).map((c) => c.id));
                const serverDebtIds = new Set((res.data.debts as Partial<LocalDebt>[] || []).map((d) => d.id));
                const serverSavingsIds = new Set((res.data.savings_goals as Partial<LocalSavingsGoal>[] || []).map((s) => s.id));

                // MERGE: For each server item, update local if not pending
                const txsToSync = (res.data.transactions as Partial<LocalTransaction>[] || [])
                    .filter((tx) => tx.id && !pendingTxIds.includes(tx.id))
                    .map((tx) => ({ ...tx, sync_status: 'synced' } as LocalTransaction));
                if (txsToSync.length > 0) {
                    await db.transactions.bulkPut(txsToSync);
                }

                const catsToSync = (res.data.categories as Partial<LocalCategory>[] || [])
                    .filter((cat) => cat.id && !pendingCatIds.includes(cat.id))
                    .map((cat) => ({ ...cat, sync_status: 'synced' } as LocalCategory));
                if (catsToSync.length > 0) {
                    await db.categories.bulkPut(catsToSync);
                }

                const debtsToSync = (res.data.debts as Partial<LocalDebt>[] || [])
                    .filter((debt) => debt.id && !pendingDebtIds.includes(debt.id))
                    .map((debt) => ({ ...debt, sync_status: 'synced' } as LocalDebt));
                if (debtsToSync.length > 0) {
                    await db.debts.bulkPut(debtsToSync);
                }

                const goalsToSync = (res.data.savings_goals as Partial<LocalSavingsGoal>[] || [])
                    .filter((goal) => goal.id && !pendingSavingsIds.includes(goal.id))
                    .map((goal) => ({ ...goal, sync_status: 'synced' } as LocalSavingsGoal));
                if (goalsToSync.length > 0) {
                    await db.savings_goals.bulkPut(goalsToSync);
                }

                // DELETE: Remove local synced items that no longer exist on server
                const localSyncedTxs = await db.transactions.where('sync_status').equals('synced').toArray();
                for (const tx of localSyncedTxs) {
                    if (!serverTxIds.has(tx.id)) {
                        await db.transactions.delete(tx.id);
                        console.log("SyncManager: Removed deleted transaction", tx.id);
                    }
                }

                const localSyncedCats = await db.categories.where('sync_status').equals('synced').toArray();
                for (const cat of localSyncedCats) {
                    if (!serverCatIds.has(cat.id)) {
                        await db.categories.delete(cat.id);
                        console.log("SyncManager: Removed deleted category", cat.id);
                    }
                }

                const localSyncedDebts = await db.debts.where('sync_status').equals('synced').toArray();
                for (const debt of localSyncedDebts) {
                    if (!serverDebtIds.has(debt.id)) {
                        await db.debts.delete(debt.id);
                        console.log("SyncManager: Removed deleted debt", debt.id);
                    }
                }

                const localSyncedSavings = await db.savings_goals.where('sync_status').equals('synced').toArray();
                for (const goal of localSyncedSavings) {
                    if (!serverSavingsIds.has(goal.id)) {
                        await db.savings_goals.delete(goal.id);
                        console.log("SyncManager: Removed deleted savings goal", goal.id);
                    }
                }
            });

            setLastPull(new Date());
            console.log("SyncManager: Pull complete");
        } catch (e: any) {
            console.error("SyncManager: Pull failed", e);
            setSyncError(e.message || "Pull failed");
        } finally {
            setIsPulling(false);
            updatePendingCount();
        }
    }, [updatePendingCount]);

    // Initial Seed from Server - runs when local DB is completely empty
    useEffect(() => {
        async function seed() {
            const txCount = await db.transactions.count();
            const catCount = await db.categories.count();

            if (txCount > 0 || catCount > 0) {
                console.log("SyncManager: Local DB has data, triggering background pull instead of seed");
                // Still pull to get latest updates
                pullFromServer();
                return;
            }

            console.log("SyncManager: Local DB is empty, seeding from server...");
            setIsSyncing(true);

            try {
                const res = await getAllUserData();
                if (res.success && res.data) {
                    await db.transaction('rw', db.transactions, db.categories, db.debts, db.savings_goals, async () => {
                        await db.transactions.clear();
                        await db.categories.clear();
                        await db.debts.clear();
                        await db.savings_goals.clear();

                        if (res.data.transactions?.length) {
                            await db.transactions.bulkAdd((res.data.transactions as Partial<LocalTransaction>[]).map((t) => ({ ...t, sync_status: 'synced' } as LocalTransaction)));
                        }
                        if (res.data.categories?.length) {
                            await db.categories.bulkAdd((res.data.categories as Partial<LocalCategory>[]).map((c) => ({ ...c, sync_status: 'synced' } as LocalCategory)));
                        }
                        if (res.data.debts?.length) {
                            await db.debts.bulkAdd((res.data.debts as Partial<LocalDebt>[]).map((d) => ({ ...d, sync_status: 'synced' } as LocalDebt)));
                        }
                        if (res.data.savings_goals?.length) {
                            await db.savings_goals.bulkAdd((res.data.savings_goals as Partial<LocalSavingsGoal>[]).map((s) => ({ ...s, sync_status: 'synced' } as LocalSavingsGoal)));
                        }
                    });
                    setLastPull(new Date());
                    console.log("SyncManager: Seed complete");
                }
            } catch (e) {
                console.error("SyncManager: Seed failed", e);
            } finally {
                setIsSyncing(false);
                updatePendingCount();
            }
        }
        seed();
    }, [pullFromServer, updatePendingCount]);

    // Push pending changes to server
    const pushChanges = useCallback(async () => {
        if (!navigator.onLine) return;

        setIsSyncing(true);
        setSyncError(null);
        let synced = 0;
        let failed = 0;

        try {
            // 1. Sync Transactions
            const pendingTxs = await db.transactions.where('sync_status').equals('created').toArray();
            for (const tx of pendingTxs) {
                try {
                    // Pass the original transaction date to preserve correct dating
                    const res = await addTransaction(tx.amount, tx.description, tx.type, tx.category_id, tx.debt_id, tx.date);
                    if (res.success && res.transactionId) {
                        // Delete the local temp record and add with server ID
                        await db.transactions.delete(tx.id);
                        await db.transactions.put({
                            ...tx,
                            id: res.transactionId, // Use server's ID
                            sync_status: 'synced'
                        });
                        synced++;
                    } else if (res.success) {
                        // Fallback if ID not returned
                        await db.transactions.update(tx.id, { sync_status: 'synced' });
                        synced++;
                    } else {
                        failed++;
                        console.error("SyncManager: Transaction sync returned error", tx.id, res.error);
                    }
                } catch (e) {
                    failed++;
                    console.error("SyncManager: Failed to sync transaction", tx.id, e);
                }
            }

            // 2. Sync Categories
            const pendingCats = await db.categories.where('sync_status').equals('created').toArray();
            for (const cat of pendingCats) {
                try {
                    const commitType = cat.type === 'fixed' ? 'fixed' : null;
                    const res = await addCategory(cat.name, commitType, cat.budget_limit, cat.is_pinned);
                    if (res.success) {
                        await db.categories.update(cat.id, { sync_status: 'synced' });
                        synced++;
                    } else {
                        failed++;
                    }
                } catch (e) {
                    failed++;
                    console.error("SyncManager: Failed to sync category", cat.id, e);
                }
            }

            // 3. Sync Debts
            const pendingDebts = await db.debts.where('sync_status').equals('created').toArray();
            for (const debt of pendingDebts) {
                try {
                    const res = await addDebt(debt.name, debt.total_balance, debt.interest_rate);
                    if (res.success) {
                        await db.debts.update(debt.id, { sync_status: 'synced' });
                        synced++;
                    } else {
                        failed++;
                    }
                } catch (e) {
                    failed++;
                    console.error("SyncManager: Failed to sync debt", debt.id, e);
                }
            }

            if (synced > 0) {
                console.log(`SyncManager: Synced ${synced} items`);
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            }

            if (failed > 0) {
                setSyncError(`${failed} items failed to sync`);
            }
        } catch (e: any) {
            console.error("SyncManager: Push failed", e);
            setSyncError(e.message || "Push failed");
        } finally {
            setIsSyncing(false);
            updatePendingCount();
        }
    }, [updatePendingCount]);

    // Force Full Sync (Pull + Push)
    const forceSync = useCallback(async () => {
        setSyncError(null);
        await pushChanges();
        await pullFromServer();
    }, [pushChanges, pullFromServer]);

    // Online/Offline detection
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            forceSync();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOnline(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [forceSync]);

    // Periodic sync (every 60 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            updatePendingCount();
            if (navigator.onLine) {
                pushChanges();
                // Pull less frequently (every 2 minutes)
                if (!lastPull || (new Date().getTime() - lastPull.getTime() > 120000)) {
                    pullFromServer();
                }
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [pushChanges, pullFromServer, updatePendingCount, lastPull]);

    // Initial check
    useEffect(() => {
        updatePendingCount();
    }, [updatePendingCount]);

    // Success Banner
    if (showSuccess) {
        return (
            <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                    <Check size={14} />
                    <span>Synced!</span>
                </div>
            </div>
        );
    }

    // Don't render if online with nothing pending and not syncing
    const isActive = !isOnline || pendingCount > 0 || isSyncing || isPulling || syncError;
    if (!isActive) return null;

    return (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-xs font-bold ${syncError
                ? "bg-red-100 text-red-800 border border-red-300"
                : !isOnline
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : (isSyncing || isPulling)
                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                        : "bg-orange-100 text-orange-800 border border-orange-300"
                }`}>
                {syncError ? (
                    <>
                        <AlertCircle size={14} />
                        <span>Sync Error</span>
                        <button
                            onClick={forceSync}
                            className="ml-1 p-1 rounded-full hover:bg-red-200 transition-colors"
                            title="Retry Sync"
                        >
                            <RefreshCw size={12} />
                        </button>
                    </>
                ) : !isOnline ? (
                    <>
                        <CloudOff size={14} />
                        <span>Offline</span>
                        {pendingCount > 0 && <span className="opacity-70">({pendingCount} pending)</span>}
                    </>
                ) : (isSyncing || isPulling) ? (
                    <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>{isPulling ? "Pulling..." : "Syncing..."}</span>
                    </>
                ) : (
                    <>
                        <Cloud size={14} />
                        <span>{pendingCount} pending</span>
                        <button
                            onClick={forceSync}
                            className="ml-1 p-1 rounded-full hover:bg-orange-200 transition-colors"
                            title="Force Sync"
                        >
                            <RefreshCw size={12} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
