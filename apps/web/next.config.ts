import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The invite protocol is shared with Supabase at the repository root.
  turbopack: { root: path.resolve(__dirname, "../..") },
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
};

export default nextConfig;
