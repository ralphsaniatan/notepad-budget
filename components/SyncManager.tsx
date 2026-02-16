"use client";

import { useEffect, useState, useCallback } from "react";
import { getAllUserData, addTransaction, addCategory, updateCategory, addDebt, updateTransaction, updateDebt, bulkCreateTransactions, bulkCreateCategories, bulkCreateDebts } from "@/app/actions";
import { db } from "@/lib/db";
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
                const pendingTxIds = new Set((await db.transactions.where('sync_status').anyOf(['created', 'updated']).toArray()).map(t => t.id));
                const pendingCatIds = new Set((await db.categories.where('sync_status').anyOf(['created', 'updated']).toArray()).map(c => c.id));
                const pendingDebtIds = new Set((await db.debts.where('sync_status').anyOf(['created', 'updated']).toArray()).map(d => d.id));
                const pendingSavingsIds = new Set((await db.savings_goals.where('sync_status').anyOf(['created', 'updated']).toArray()).map(s => s.id));

                const serverTxIds = new Set((res.data.transactions || []).map((t: any) => t.id));
                const serverCatIds = new Set((res.data.categories || []).map((c: any) => c.id));
                const serverDebtIds = new Set((res.data.debts || []).map((d: any) => d.id));
                const serverSavingsIds = new Set((res.data.savings_goals || []).map((s: any) => s.id));

                // MERGE: Bulk Put
                const txsToPut = (res.data.transactions || []).filter((tx: any) => !pendingTxIds.has(tx.id)).map((tx: any) => ({ ...tx, sync_status: 'synced' }));
                if (txsToPut.length) await db.transactions.bulkPut(txsToPut);

                const catsToPut = (res.data.categories || []).filter((c: any) => !pendingCatIds.has(c.id)).map((c: any) => ({ ...c, sync_status: 'synced' }));
                if (catsToPut.length) await db.categories.bulkPut(catsToPut);

                const debtsToPut = (res.data.debts || []).filter((d: any) => !pendingDebtIds.has(d.id)).map((d: any) => ({ ...d, sync_status: 'synced' }));
                if (debtsToPut.length) await db.debts.bulkPut(debtsToPut);

                const savingsToPut = (res.data.savings_goals || []).filter((s: any) => !pendingSavingsIds.has(s.id)).map((s: any) => ({ ...s, sync_status: 'synced' }));
                if (savingsToPut.length) await db.savings_goals.bulkPut(savingsToPut);

                // DELETE: Bulk Delete
                const localSyncedTxs = await db.transactions.where('sync_status').equals('synced').toArray();
                const txIdsToDelete = localSyncedTxs.filter(tx => !serverTxIds.has(tx.id)).map(tx => tx.id);
                if (txIdsToDelete.length) await db.transactions.bulkDelete(txIdsToDelete);

                const localSyncedCats = await db.categories.where('sync_status').equals('synced').toArray();
                const catIdsToDelete = localSyncedCats.filter(c => !serverCatIds.has(c.id)).map(c => c.id);
                if (catIdsToDelete.length) await db.categories.bulkDelete(catIdsToDelete);

                const localSyncedDebts = await db.debts.where('sync_status').equals('synced').toArray();
                const debtIdsToDelete = localSyncedDebts.filter(d => !serverDebtIds.has(d.id)).map(d => d.id);
                if (debtIdsToDelete.length) await db.debts.bulkDelete(debtIdsToDelete);

                const localSyncedSavings = await db.savings_goals.where('sync_status').equals('synced').toArray();
                const savingIdsToDelete = localSyncedSavings.filter(s => !serverSavingsIds.has(s.id)).map(s => s.id);
                if (savingIdsToDelete.length) await db.savings_goals.bulkDelete(savingIdsToDelete);
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
            // 1. Bulk Transactions (Create)
            const pendingTxs = await db.transactions.where('sync_status').equals('created').toArray();
            if (pendingTxs.length > 0) {
                const res = await bulkCreateTransactions(pendingTxs.map(tx => ({
                    id: tx.id,
                    amount: tx.amount,
                    description: tx.description,
                    type: tx.type,
                    date: tx.date,
                    category_id: tx.category_id,
                    debt_id: tx.debt_id
                })));

                if (res.success) {
                    const ids = pendingTxs.map(tx => tx.id);
                    await db.transactions.where('id').anyOf(ids).modify({ sync_status: 'synced' });
                    synced += ids.length;
                } else {
                    failed += pendingTxs.length;
                    console.error("SyncManager: Bulk transaction sync failed", res.error);
                }
            }

            // 2. Bulk Categories (Create)
            const pendingCats = await db.categories.where('sync_status').equals('created').toArray();
            if (pendingCats.length > 0) {
                const res = await bulkCreateCategories(pendingCats.map(cat => ({
                    id: cat.id,
                    name: cat.name,
                    budget_limit: cat.budget_limit,
                    type: cat.type,
                    commitment_type: cat.commitment_type,
                    is_pinned: cat.is_pinned,
                    frequency_months: cat.frequency_months,
                    frequency_start: cat.frequency_start
                })));

                if (res.success) {
                    const ids = pendingCats.map(c => c.id);
                    await db.categories.where('id').anyOf(ids).modify({ sync_status: 'synced' });
                    synced += ids.length;
                } else {
                    failed += pendingCats.length;
                    console.error("SyncManager: Bulk category sync failed", res.error);
                }
            }

            // 2b. Categories (Update) - Keep Sequential
            const updatedCats = await db.categories.where('sync_status').equals('updated').toArray();
            for (const cat of updatedCats) {
                try {
                    const commitType = cat.type === 'fixed' ? 'fixed' : null;
                    const res = await updateCategory(cat.id, cat.name, commitType, cat.budget_limit, cat.is_pinned, cat.frequency_months, cat.frequency_start);
                    if (res.success) {
                        await db.categories.update(cat.id, { sync_status: 'synced' });
                        synced++;
                    } else {
                        failed++;
                        console.error("SyncManager: Failed to update category", cat.id, res.error);
                    }
                } catch (e) {
                    failed++;
                    console.error("SyncManager: Failed to sync category update", cat.id, e);
                }
            }

            // 3. Bulk Debts (Create)
            const pendingDebts = await db.debts.where('sync_status').equals('created').toArray();
            if (pendingDebts.length > 0) {
                const res = await bulkCreateDebts(pendingDebts.map(d => ({
                    id: d.id,
                    name: d.name,
                    total_balance: d.total_balance,
                    interest_rate: d.interest_rate
                })));

                if (res.success) {
                    const ids = pendingDebts.map(d => d.id);
                    await db.debts.where('id').anyOf(ids).modify({ sync_status: 'synced' });
                    synced += ids.length;
                } else {
                    failed += pendingDebts.length;
                    console.error("SyncManager: Bulk debt sync failed", res.error);
                }
            }

            // 4. Transactions (Update) - Keep Sequential
            const updatedTxs = await db.transactions.where('sync_status').equals('updated').toArray();
            for (const tx of updatedTxs) {
                try {
                    const res = await updateTransaction(tx.id, tx.amount, tx.description, tx.type, tx.category_id, tx.debt_id);
                    if (res.success) {
                        await db.transactions.update(tx.id, { sync_status: 'synced' });
                        synced++;
                    } else {
                        failed++;
                        console.error("SyncManager: Failed to update transaction", tx.id, res.error);
                    }
                } catch (e) {
                    failed++;
                    console.error("SyncManager: Failed to sync transaction update", tx.id, e);
                }
            }

            // 5. Debts (Update) - Keep Sequential
            const updatedDebts = await db.debts.where('sync_status').equals('updated').toArray();
            for (const debt of updatedDebts) {
                try {
                    const res = await updateDebt(debt.id, debt.name, debt.total_balance, debt.interest_rate);
                    if (res.success) {
                        await db.debts.update(debt.id, { sync_status: 'synced' });
                        synced++;
                    } else {
                        failed++;
                        console.error("SyncManager: Failed to update debt", debt.id, res.error);
                    }
                } catch (e) {
                    failed++;
                    console.error("SyncManager: Failed to sync debt update", debt.id, e);
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
