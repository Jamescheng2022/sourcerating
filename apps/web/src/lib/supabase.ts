import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config';
export { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Next can preload this client while the recovery page is open. Only the
    // isolated recovery client may consume that page's callback credentials.
    detectSessionInUrl: typeof window === 'undefined' || !/^\/reset-password\/?$/.test(window.location.pathname),
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sr_p1_supabase_auth',
  },
});
