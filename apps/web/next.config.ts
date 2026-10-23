import type { NextConfig } from "next";
import path from "node:path";

import { publicSupabaseSettings } from './src/lib/public-supabase-settings.mjs';

// Next loads .env* before this file. Fail before compilation/page data collection.
publicSupabaseSettings(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  process.env.VERCEL === '1',
);

const nextConfig: NextConfig = {
  // The invite protocol is shared with Supabase at the repository root.
  turbopack: { root: path.resolve(__dirname, "../..") },
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
};

export default nextConfig;
