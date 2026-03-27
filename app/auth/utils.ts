import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves an email address from a username or returns the input if it's already an email.
 *
 * @param supabase The Supabase client instance.
 * @param emailOrUsername The input string which could be an email or a username.
 * @returns The resolved email address, or null if the username was not found.
 */
export async function resolveEmail(
    supabase: SupabaseClient,
    emailOrUsername: string
): Promise<string | null> {
    // If it looks like an email, return it as is.
    if (emailOrUsername.includes('@')) {
        return emailOrUsername;
    }

    // Otherwise, assume it's a username and try to look up the email.
    const { data } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', emailOrUsername)
        .single();

    return data?.email || null;
}
