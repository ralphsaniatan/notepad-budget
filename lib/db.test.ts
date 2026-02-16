import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import { NotepadBudgetDB, LocalCategory } from './db';

describe('NotepadBudgetDB Schema', () => {
    let db: NotepadBudgetDB;

    beforeEach(async () => {
        // Ensure we start with a fresh database
        await Dexie.delete('NotepadBudgetDB');
        db = new NotepadBudgetDB();
    });

    afterEach(async () => {
        // Clean up
        if (db) {
            db.close();
        }
    });

    it('should have the correct tables defined', () => {
        const tableNames = db.tables.map(table => table.name);
        expect(tableNames).toContain('transactions');
        expect(tableNames).toContain('categories');
        expect(tableNames).toContain('debts');
        expect(tableNames).toContain('savings_goals');
    });

    it('should have the correct schema for transactions', () => {
        const schema = db.transactions.schema;
        expect(schema.primKey.name).toBe('id');

        const indexes = schema.indexes.map(index => index.name);
        expect(indexes).toContain('date');
        expect(indexes).toContain('type');
        expect(indexes).toContain('category_id');
        expect(indexes).toContain('debt_id');
        expect(indexes).toContain('sync_status');
        expect(indexes).toContain('user_id');
        expect(indexes).toContain('created_at');
    });

    it('should have the correct schema for categories', () => {
        const schema = db.categories.schema;
        expect(schema.primKey.name).toBe('id');

        const indexes = schema.indexes.map(index => index.name);
        expect(indexes).toContain('name');
        expect(indexes).toContain('type');
        expect(indexes).toContain('is_pinned');
        expect(indexes).toContain('sync_status');
        expect(indexes).toContain('user_id');
    });

    it('should have the correct schema for debts', () => {
        const schema = db.debts.schema;
        expect(schema.primKey.name).toBe('id');

        const indexes = schema.indexes.map(index => index.name);
        expect(indexes).toContain('name');
        expect(indexes).toContain('sync_status');
        expect(indexes).toContain('user_id');
    });

    it('should have the correct schema for savings_goals', () => {
        const schema = db.savings_goals.schema;
        expect(schema.primKey.name).toBe('id');

        const indexes = schema.indexes.map(index => index.name);
        expect(indexes).toContain('name');
        expect(indexes).toContain('target_date');
        expect(indexes).toContain('sync_status');
        expect(indexes).toContain('user_id');
    });

    it('should allow adding and retrieving a category', async () => {
        const category: LocalCategory = {
            id: 'test-cat-1',
            name: 'Groceries',
            budget_limit: 500,
            type: 'variable',
            is_commitment: false,
            is_pinned: false,
            user_id: 'user-123',
            sync_status: 'created'
        };

        await db.categories.add(category);
        const retrieved = await db.categories.get('test-cat-1');

        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe('Groceries');
        expect(retrieved?.id).toBe('test-cat-1');
    });
});
