import { describe, it, expect, vi } from 'vitest';
import { resolveEmail } from './utils';
import { SupabaseClient } from '@supabase/supabase-js';

describe('resolveEmail', () => {
    it('should return the input if it is an email', async () => {
        const mockSupabase = {} as unknown as SupabaseClient;
        const result = await resolveEmail(mockSupabase, 'test@example.com');
        expect(result).toBe('test@example.com');
    });

    it('should resolve username to email', async () => {
        const mockFrom = vi.fn().mockReturnThis();
        const mockSelect = vi.fn().mockReturnThis();
        const mockIlike = vi.fn().mockReturnThis();
        const mockSingle = vi.fn().mockResolvedValue({ data: { email: 'resolved@example.com' }, error: null });

        const mockSupabase = {
            from: mockFrom,
            select: mockSelect,
            ilike: mockIlike,
            single: mockSingle
        };

        const result = await resolveEmail(mockSupabase as unknown as SupabaseClient, 'username');
        expect(result).toBe('resolved@example.com');

        expect(mockFrom).toHaveBeenCalledWith('profiles');
        expect(mockSelect).toHaveBeenCalledWith('email');
        expect(mockIlike).toHaveBeenCalledWith('username', 'username');
        expect(mockSingle).toHaveBeenCalled();
    });

    it('should return null if username not found', async () => {
         const mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
        } as unknown as SupabaseClient;

        const result = await resolveEmail(mockSupabase, 'nonexistent');
        expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
         const mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } })
        } as unknown as SupabaseClient;

        const result = await resolveEmail(mockSupabase, 'erroruser');
        expect(result).toBeNull();
    });
});
