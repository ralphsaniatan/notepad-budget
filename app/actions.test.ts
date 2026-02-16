import { addDebt } from './actions';
import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// Mock the dependencies
jest.mock('@/lib/supabase-server');
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('addDebt', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            auth: {
                getUser: jest.fn(),
            },
            from: jest.fn(() => ({
                insert: jest.fn(() => ({
                    select: jest.fn(() => ({
                        single: jest.fn(),
                    })),
                })),
            })),
        };

        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    test('should return { success: false } if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

        const result = await addDebt('Test Debt', 1000, 5);

        expect(result).toEqual({ success: false });
        expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    test('should insert debt and return success when authenticated', async () => {
        const userId = 'user-123';
        const debtName = 'Test Debt';
        const debtBalance = 1000;
        const debtRate = 5;
        const debtId = 'debt-123';

        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } } });

        // Mock the chain properly
        const singleMock = jest.fn().mockResolvedValue({ data: { id: debtId }, error: null });
        const selectMock = jest.fn().mockReturnValue({ single: singleMock });
        const insertMock = jest.fn().mockReturnValue({ select: selectMock });
        const fromMock = jest.fn().mockReturnValue({ insert: insertMock });

        mockSupabase.from = fromMock;

        const result = await addDebt(debtName, debtBalance, debtRate);

        expect(result).toEqual({ success: true, id: debtId });
        expect(mockSupabase.auth.getUser).toHaveBeenCalled();
        expect(fromMock).toHaveBeenCalledWith('debts');
        expect(insertMock).toHaveBeenCalledWith({
            user_id: userId,
            name: debtName,
            total_balance: debtBalance,
            interest_rate: debtRate,
        });
        expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
        expect(revalidatePath).toHaveBeenCalledWith('/debts');
    });

    test('should handle database insertion errors gracefully', async () => {
        const userId = 'user-123';
        const errorMsg = 'Database error';

        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } } });

        const singleMock = jest.fn().mockResolvedValue({ data: null, error: { message: errorMsg } });
        const selectMock = jest.fn().mockReturnValue({ single: singleMock });
        const insertMock = jest.fn().mockReturnValue({ select: selectMock });
        const fromMock = jest.fn().mockReturnValue({ insert: insertMock });

        mockSupabase.from = fromMock;

        // Spy on console.error to avoid cluttering test output
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = await addDebt('Test Debt', 1000, 5);

        expect(result).toEqual({ success: false, id: undefined });
        expect(consoleSpy).toHaveBeenCalledWith('Add Debt Error:', { message: errorMsg });
        expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
        expect(revalidatePath).toHaveBeenCalledWith('/debts');

        consoleSpy.mockRestore();
    });
});
