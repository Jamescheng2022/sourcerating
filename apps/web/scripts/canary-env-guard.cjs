// Runs in the actual Next child before its entrypoint; log key names only.
const assert = require('node:assert/strict');
const keys = Object.keys(process.env).sort();
assert.deepEqual(keys, ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_TELEMETRY_DISABLED', 'PATH']);
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:54321');
assert.equal(process.env.NEXT_TELEMETRY_DISABLED, '1');
console.log('CANARY_CHILD_ENV ' + JSON.stringify(keys));
