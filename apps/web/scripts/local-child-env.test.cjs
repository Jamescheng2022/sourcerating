const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { pathOnlyEnv, canaryServerEnv } = require('./local-child-env.cjs');
const guard = require('node:path').join(__dirname, 'canary-env-guard.cjs');
test('Only PATH is selected, without reading unrelated parent values', () => {
  const parent = new Proxy({}, { get: (_, name) => { assert.equal(name, 'PATH'); return '/synthetic/bin'; } });
  assert.deepEqual(pathOnlyEnv(parent), { PATH: '/synthetic/bin' });
});
test('Real Node child excludes unknown credentials and startup hooks', () => {
  const parent = { PATH: process.env.PATH, UNEXPECTED_FUTURE_CREDENTIAL: 'synthetic-not-a-credential',
    AWS_SESSION_TOKEN: 'synthetic-not-a-credential', OIDC_CLIENT_SECRET: 'synthetic-not-a-credential',
    NODE_OPTIONS: '--require /synthetic/this-hook-must-never-load.cjs', HOME: '/synthetic',
    DATABASE_URL: 'synthetic-not-a-credential', HTTPS_PROXY: 'synthetic-not-a-credential' };
  const result = execFileSync(process.execPath, ['-e', 'console.log(JSON.stringify(Object.keys(process.env).sort()))'], { env: pathOnlyEnv(parent), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(result), ['PATH']);
});
test('Actual server startup guard accepts only explicit local fixture settings', () => {
  const env = canaryServerEnv({ API_URL: 'http://127.0.0.1:54321', ANON_KEY: 'synthetic-unit-probe' });
  const good = spawnSync(process.execPath, ['--require', guard, '-e', ''], { env, encoding: 'utf8' });
  assert.equal(good.status, 0); assert.match(good.stdout, /^CANARY_CHILD_ENV /);
  const bad = spawnSync(process.execPath, ['--require', guard, '-e', ''], { env: { ...env, UNEXPECTED_FUTURE_CREDENTIAL: 'synthetic-not-a-credential' }, encoding: 'utf8' });
  assert.notEqual(bad.status, 0); assert(!bad.stdout.includes('CANARY_CHILD_ENV'));
});
test('Missing PATH and hosted targets fail before child launch', () => {
  assert.throws(() => pathOnlyEnv({}));
  assert.throws(() => canaryServerEnv({ API_URL: 'https://synthetic.invalid', ANON_KEY: 'synthetic-unit-probe' }));
});
