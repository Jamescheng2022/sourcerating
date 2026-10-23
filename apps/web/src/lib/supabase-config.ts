import { publicSupabaseSettings } from './public-supabase-settings.mjs';

// Literal references are required for Next's build-time browser substitution.
// No fallback, service key, or module-time network request.
const config = publicSupabaseSettings(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
export const SUPABASE_URL: string = config.url;
export const SUPABASE_ANON_KEY: string = config.publicKey;
