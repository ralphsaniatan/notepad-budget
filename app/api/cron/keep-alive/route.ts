import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');

    // Verify the request is from Vercel Cron
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    // Service role key is preferred, fallback to anon key
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ success: false, error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 1. Insert a ping record to generate write activity
        const { error: insertError } = await supabase
            .from('keep_alive_logs')
            .insert({});

        if (insertError) {
            console.error('Keep-alive insert failed:', insertError);
            return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
        }

        // 2. Delete old records to keep the table clean (older than 5 minutes)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { error: deleteError } = await supabase
            .from('keep_alive_logs')
            .delete()
            .lt('created_at', fiveMinsAgo);

        if (deleteError) {
            console.error('Keep-alive cleanup failed:', deleteError);
            // Non-fatal, still continue and return success
        }

        return NextResponse.json({ success: true, message: 'Keep-alive ping successful.' });
    } catch (error: any) {
        console.error('Keep-alive error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
