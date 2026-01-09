import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://phrsgtxmsytujyjsuwte.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_wYfHqMW4lv8V2tjs6Vvazg_9JguqMbC';

// Placeholder - will function once env vars are set
export const supabase = createClient(supabaseUrl, supabaseKey);
