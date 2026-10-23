import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { publicSupabaseSettings as config } from '../src/lib/public-supabase-settings.mjs';
const url = 'https://isolated.example.invalid';
// Synthetic unsigned fixtures only; never sent to a backend.
const jwt = role => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.fixture`;
const key = 'sb_publishable_synthetic_fixture';
test('missing/partial configuration fails with actionable variable names, without values', () => {
  for (const values of [[], [url], [undefined, key], [' ', key], [url, ' ']]) {
    assert.throws(() => config(...values), /NEXT_PUBLIC_SUPABASE_URL.*NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  }
});
test('only explicit public key shapes are accepted; no service-role, secret or whitespace', () => {
  assert.equal(config(url, jwt('anon')).publicKey, jwt('anon'));
  assert.equal(config(url, undefined, key).publicKey, key);
  for (const value of [jwt('service_role'), jwt('authenticated'), 'sb_secret_private_fixture', 'unknown', `${key} `]) {
    assert.throws(() => config(url, value), e => !e.message.includes(value) && /public anon/.test(e.message));
  }
});
test('ambiguous aliases fail rather than selecting an unintended backend key', () => {
  assert.throws(() => config(url, key, `${key}_other`), /only one/);
  assert.equal(config(url, key, key).url, url);
});
test('invalid URL and embedded credentials are rejected without reflecting inputs', () => {
  for (const value of ['private-value', 'https://user:private-password@isolated.example.invalid', `${url}/rest/v1`, `${url}?secret=private`, `${url}#private`, 'http://isolated.example.invalid']) {
    assert.throws(() => config(value, key), e => !e.message.includes(value));
  }
});
test('existing production exclusion remains; hosted builds reject loopback, local builds retain it', () => {
  assert.throws(() => config('https://qnozpurjtgkmwtvsrjoi.supabase.co', key), /excluded/);
  for (const local of ['http://127.0.0.1:54321', 'http://localhost:54321', 'http://[::1]:54321']) {
    assert.equal(config(local, jwt('anon')).url, local);
    assert.throws(() => config(local, key, undefined, true), /Hosted previews/);
  }
});
test('actual Next build with missing public settings fails before compile/page-data collection', () => {
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
  for (const name of Object.keys(env)) if (name.startsWith('NEXT_PUBLIC_SUPABASE_')) delete env[name];
  // Copy the actual config into a disposable root, without any operator .env files.
  const dir = mkdtempSync(join(tmpdir(), 'sr-missing-config-'));
  try {
    mkdirSync(join(dir, 'src/lib'), { recursive: true });
    for (const file of ['next.config.ts', 'package.json', 'src/lib/public-supabase-settings.mjs']) {
      copyFileSync(resolve(file), join(dir, file));
    }
    symlinkSync(resolve('node_modules'), join(dir, 'node_modules'), 'dir');
    const result = spawnSync(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'build'], { cwd: dir, env, encoding: 'utf8', timeout: 60000 });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    const log = result.stdout + result.stderr;
    assert.match(log, /Missing build configuration/);
    assert.doesNotMatch(log, /Compiled successfully|Collecting page data|Failed to collect page data/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
