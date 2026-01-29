"use client";

import { useEffect, useState } from "react";
import { getAllUserData } from "@/app/actions"; // Server Action
import { db } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
// For now, let's use a simple console log or custom visual indicator if needed.

export function SyncManager() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Initial Seed
    useEffect(() => {
        async function seed() {
            const count = await db.transactions.count();
            if (count > 0) return; // Already seeded

            setIsSyncing(true);
            try {
                const res = await getAllUserData();
                if (res.success && res.data) {
                    await db.transaction('rw', db.transactions, db.categories, db.debts, db.savings_goals, async () => {
                        // Clear all first to be safe if partial seed happened? No, let's trust count check.

                        // Map and Bulk Add
                        await db.transactions.bulkAdd(res.data.transactions.map((t: any) => ({ ...t, sync_status: 'synced' })));
                        await db.categories.bulkAdd(res.data.categories.map((c: any) => ({ ...c, sync_status: 'synced' })));
                        await db.debts.bulkAdd(res.data.debts.map((d: any) => ({ ...d, sync_status: 'synced' })));
                        await db.savings_goals.bulkAdd(res.data.savings_goals.map((s: any) => ({ ...s, sync_status: 'synced' })));
                    });
                    setLastSync(new Date());
                    console.log("Initial Seed Complete");
                }
            } catch (e) {
                console.error("Seed failed", e);
            } finally {
                setIsSyncing(false);
            }
        }

        seed();
    }, []);

    // Upstream Sync (Push)
    useEffect(() => {
        const pushChanges = async () => {
            if (!navigator.onLine) return; // Simple check

            // 1. Get Pending Transactions
            const pendingTxs = await db.transactions.where('sync_status').equals('created').toArray();

            if (pendingTxs.length === 0) return;

            console.log(`SyncManager: Found ${pendingTxs.length} pending items. Syncing...`);
            setIsSyncing(true);

            for (const tx of pendingTxs) {
                try {
                    // Call Server Action (We already have addTransaction, but it expects specific args)
                    // We might need a purely "Sync" endpoint or reuse addTransaction.
                    // Let's reuse addTransaction for now, but ideally we'd have a `syncBatch` endpoint.
                    // For MVP, loop and send.
                    const res = await (await import("@/app/actions")).addTransaction(
                        tx.amount,
                        tx.description,
                        tx.type,
                        tx.category_id,
                        tx.debt_id
                    );

                    if (res.success) {
                        // Mark as synced locally
                        await db.transactions.update(tx.id, { sync_status: 'synced' });
                    } else {
                        console.error("Failed to sync item", tx.id, res.error);
                    }
                } catch (e) {
                    console.error("Sync Error", e);
                }
            }
            setIsSyncing(false);
            console.log("SyncManager: Push Complete");
        };

        // Run on mount and every 10 seconds
        pushChanges();
        const interval = setInterval(pushChanges, 10000);

        // Also listen for online event
        window.addEventListener('online', pushChanges);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', pushChanges);
        };
    }, []);

    return null; // Invisible component
}
