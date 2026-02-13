import Dexie, { Table } from 'dexie';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

// Define types
export type SyncStatus = 'synced' | 'created' | 'updated' | 'deleted';

export interface LocalTransaction {
    id: string; // UUID from Supabase or temp UUID
    amount: number;
    description: string;
    date: string;
    type: 'income' | 'expense' | 'debt_payment';
    category_id?: string;
    debt_id?: string;
    created_at: string;
    user_id: string;
    sync_status: SyncStatus;
}

// Minimal DB for benchmark
class BenchmarkDB extends Dexie {
    transactions!: Table<LocalTransaction>;

    constructor(name: string) {
        super(name, { indexedDB: indexedDB, IDBKeyRange: IDBKeyRange });
        this.version(1).stores({
            transactions: 'id, date, type, category_id, debt_id, sync_status, user_id, created_at',
        });
    }
}

// Generate mock data
const generateTransactions = (count: number): LocalTransaction[] => {
    return Array.from({ length: count }, (_, i) => ({
        id: `tx-${i}`,
        amount: Math.random() * 1000,
        description: `Transaction ${i}`,
        date: new Date().toISOString(),
        type: 'expense',
        created_at: new Date().toISOString(),
        user_id: 'user-1',
        sync_status: 'synced'
    }));
};

async function benchmark() {
    console.log("Starting benchmark...");
    const count = 5000;
    const transactions = generateTransactions(count);
    const pendingTxIds: string[] = [];

    // 1. Serial Put (Current Implementation)
    const dbSerial = new BenchmarkDB('SerialDB');
    await dbSerial.open();
    await dbSerial.transactions.clear();

    const startSerial = performance.now();
    await dbSerial.transaction('rw', dbSerial.transactions, async () => {
        // Mocking the loop from SyncManager
        for (const tx of transactions) {
            if (!pendingTxIds.includes(tx.id)) {
                await dbSerial.transactions.put({ ...tx, sync_status: 'synced' });
            }
        }
    });
    const endSerial = performance.now();
    console.log(`Serial Put (${count} items): ${(endSerial - startSerial).toFixed(2)}ms`);

    await dbSerial.delete(); // Clean up

    // 2. Bulk Put (Optimized Implementation)
    const dbBulk = new BenchmarkDB('BulkDB');
    await dbBulk.open();
    await dbBulk.transactions.clear();

    const startBulk = performance.now();
    await dbBulk.transaction('rw', dbBulk.transactions, async () => {
        const txToPut = transactions
            .filter(tx => !pendingTxIds.includes(tx.id))
            .map(tx => ({ ...tx, sync_status: 'synced' }));

        if (txToPut.length > 0) {
            await dbBulk.transactions.bulkPut(txToPut);
        }
    });
    const endBulk = performance.now();
    console.log(`Bulk Put (${count} items): ${(endBulk - startBulk).toFixed(2)}ms`);

    await dbBulk.delete(); // Clean up

    const improvement = ((endSerial - startSerial) / (endBulk - startBulk)).toFixed(2);
    console.log(`Improvement: ${improvement}x faster`);
}

benchmark().catch(console.error);
