// Disposable local test harness; never connects to a hosted service.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

const root = process.cwd();
const tool = path.resolve(root,'.localdb');
const require = createRequire(path.join(tool,'local-runner.cjs'));
const { Client } = require('pg');
const EmbeddedPostgres = (await import(pathToFileURL(path.join(tool,'node_modules/embedded-postgres/dist/index.js')))).default;
const ext = path.join(tool,'node_modules/@embedded-postgres/windows-x64/native/share/extension');
for (const name of ['pg_net','pg_cron']) {
  await fs.writeFile(path.join(ext,name+'.control'),"comment = 'local test stub'\ndefault_version = '1.0'\nrelocatable = true\n");
  await fs.writeFile(path.join(ext,name+'--1.0.sql'),'-- local test stub; functionality is provided by local-supabase-shim.sql\n');
}
const port = 55439;
const password = randomBytes(20).toString('hex');
const pg = new EmbeddedPostgres({databaseDir:path.join(tool,'data-'+randomBytes(6).toString('hex')),user:'postgres',password,port,persistent:true,
  postgresFlags:['-c','listen_addresses=127.0.0.1'],onLog:()=>{},onError:x=>console.error(String(x))});
let started = false;
let db;
try {
  await pg.initialise();
  await pg.start();
  started = true;
  await pg.createDatabase('sr_lineage_test_local');
  db = new Client({host:'127.0.0.1',port,user:'postgres',password,database:'sr_lineage_test_local'});
  await db.connect();
  await db.query('set search_path = public, extensions');
  db.on('notice', n => { if (n.message.includes('PASS')) console.log('NOTICE '+n.message); });
  const load = async f => fs.readFile(path.join(root,f),'utf8');
  await db.query(await load('supabase/tests/local-supabase-shim.sql'));
  const migrations = (await fs.readdir(path.join(root,'supabase/migrations'))).filter(f=>f.endsWith('.sql') && f < '202611150001').sort();
  for (const f of migrations) {
    try { await db.query(await load('supabase/migrations/'+f)); console.log('APPLIED '+f); }
    catch (e) { throw Error('Migration '+f+': '+e.message); }
  }
  const migration = await load('supabase/migrations/202611150001_room_file_lineage_and_reason.sql');
  await db.query('begin');
  await db.query(await load('supabase/tests/room_lineage_fork_fixture.sql'));
  let forkError = '';
  try { await db.query(migration); } catch (e) { forkError=e.message; }
  await db.query('rollback');
  if (!forkError.includes('room_file_lineage_requires_reconciliation')) throw Error('fork preflight did not fail as expected: '+forkError);
  console.log('PASS pre-existing cross-org fork rejected; transaction rolled back');
  await db.query(migration);
  console.log('APPLIED 202611150001_room_file_lineage_and_reason.sql');
  await db.query(await load('supabase/migrations/202611150002_room_review_idempotency.sql'));
  console.log('APPLIED 202611150002_room_review_idempotency.sql');
  await db.query(await load('supabase/tests/room_core_generalization.test.sql'));
  console.log('PASS room_core_generalization.test.sql');
  await db.end();
  db = null;
  const result = await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['supabase/tests/room_lineage_concurrency.cjs'],{
      cwd:root,stdio:'inherit',env:{...process.env,SR_LINEAGE_NODE_MODULES:path.join(tool,'node_modules'),
        SR_LINEAGE_TEST_DATABASE_URL:'postgresql://postgres:'+password+'@127.0.0.1:'+port+'/sr_lineage_test_local'}});
    child.on('error',reject); child.on('exit',code=>resolve(code));
  });
  if (result!==0) throw Error('concurrency regression exit '+result);
  console.log('LOCAL SHIM REGRESSIONS COMPLETE');
} finally {
  if (db) await db.end().catch(()=>{});
  if (started) await pg.stop();
}
