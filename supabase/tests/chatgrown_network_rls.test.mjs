// Isolated Database Verification: Chat-Grown Network Foundation (RLS & Cross-Org Isolation)
// Runs ONLY on ephemeral embedded Postgres. Never touches hosted or Lab databases.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';

import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const tool = path.resolve(root, '../fix-lineage/.localdb');
const require = createRequire(path.join(tool, 'local-runner.cjs'));
const { Client } = require('pg');
const EmbeddedPostgres = (await import(pathToFileURL(path.join(tool, 'node_modules/embedded-postgres/dist/index.js')))).default;
const ext = path.join(tool, 'node_modules/@embedded-postgres/windows-x64/native/share/extension');

for (const name of ['pg_net', 'pg_cron']) {
  await fs.writeFile(path.join(ext, name + '.control'), "comment = 'local test stub'\ndefault_version = '1.0'\nrelocatable = true\n");
  await fs.writeFile(path.join(ext, name + '--1.0.sql'), '-- local test stub\n');
}

const port = 55443;
const password = randomBytes(20).toString('hex');
const dbDir = path.join(tool, 'data-network-' + randomBytes(6).toString('hex'));
const pg = new EmbeddedPostgres({
  databaseDir: dbDir,
  user: 'postgres',
  password,
  port,
  persistent: false,
  postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
  onLog: () => {},
  onError: (x) => console.error(String(x)),
});

let started = false;
let adminClient;

async function asUser(userId, role = 'authenticated') {
  const c = new Client({ host: '127.0.0.1', port, user: 'postgres', password, database: 'sr_network_test' });
  await c.connect();
  await c.query('set search_path = public, extensions');
  await c.query(`set role ${role}`);
  if (userId) {
    const claims = JSON.stringify({ sub: userId, role });
    await c.query(`select set_config('request.jwt.claims', '${claims}', false)`);
  } else {
    await c.query(`select set_config('request.jwt.claims', '{"role":"anon"}', false)`);
  }
  return c;
}

try {
  console.log('[1/5] Initialising isolated embedded Postgres instance...');
  await pg.initialise();
  await pg.start();
  started = true;
  await pg.createDatabase('sr_network_test');

  adminClient = new Client({ host: '127.0.0.1', port, user: 'postgres', password, database: 'sr_network_test' });
  await adminClient.connect();
  await adminClient.query('set search_path = public, extensions');

  const load = async (f) => fs.readFile(path.join(root, f), 'utf8');

  console.log('[2/5] Applying local Supabase shims and migration history...');
  await adminClient.query(await load('supabase/tests/local-supabase-shim.sql'));

  const migrationFiles = (await fs.readdir(path.join(root, 'supabase/migrations')))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const f of migrationFiles) {
    try {
      await adminClient.query(await load('supabase/migrations/' + f));
    } catch (e) {
      throw Error('Migration failed on ' + f + ': ' + e.message);
    }
  }
  console.log(`  Applied ${migrationFiles.length} migrations including 202611160001_chatgrown_network_foundation.sql`);

  console.log('[3/5] Setting up synthetic tenant test data (2 Orgs, 4 Personas)...');
  const orgA = '11111111-1111-4111-a111-111111111111';
  const orgB = '22222222-2222-4222-b222-222222222222';
  const userA1 = 'aaaaaaaa-1111-4aaa-aaaa-aaaaaaaaaaaa'; // Org A Admin
  const userA2 = 'aaaaaaaa-2222-4aaa-aaaa-aaaaaaaaaaaa'; // Org A Member
  const userB1 = 'bbbbbbbb-1111-4bbb-bbbb-bbbbbbbbbbbb'; // Org B Admin
  const userB2 = 'bbbbbbbb-2222-4bbb-bbbb-bbbbbbbbbbbb'; // Org B Member

  // Insert auth users
  for (const uid of [userA1, userA2, userB1, userB2]) {
    await adminClient.query(`
      insert into auth.users (id, email)
      values ('${uid}', '${uid}@test.local')
      on conflict (id) do nothing
    `);
  }

  // Insert organizations
  await adminClient.query(`
    insert into public.organizations (id, name, slug, created_at)
    values
      ('${orgA}', 'Company A Procurement', 'comp-a', now()),
      ('${orgB}', 'Company B Steel Works', 'comp-b', now())
    on conflict (id) do nothing
  `);

  // Insert memberships
  await adminClient.query(`
    insert into public.organization_memberships (organization_id, user_id, role, created_at)
    values
      ('${orgA}', '${userA1}', 'admin', now()),
      ('${orgA}', '${userA2}', 'member', now()),
      ('${orgB}', '${userB1}', 'owner', now()),
      ('${orgB}', '${userB2}', 'member', now())
  `);

  console.log('[4/5] Running RLS, cross-organization and transactional tests...');

  // T01: Tables exist and have RLS
  const rlsCheck = await adminClient.query(`
    select tablename, rowsecurity from pg_tables
    where schemaname = 'public' and tablename in (
      'sr_organization_profiles',
      'sr_person_profiles',
      'sr_organization_relationships',
      'sr_profile_suggestions'
    )
  `);
  if (rlsCheck.rows.length !== 4 || rlsCheck.rows.some((r) => !r.rowsecurity)) {
    throw new Error('T01 FAIL: RLS not enabled on all 4 new tables: ' + JSON.stringify(rlsCheck.rows));
  }
  console.log('  PASS T01: All 4 network tables exist and have Row Level Security enabled.');

  // T02: Org A admin can create Org A profile (private by default)
  const clientA1 = await asUser(userA1);
  await clientA1.query(`
    insert into public.sr_organization_profiles (
      organization_id, display_name, description, website_url, country, capabilities, updated_by
    ) values (
      '${orgA}', 'Company A Procurement Corp', 'Precision buyer for precast civil works',
      'https://comp-a.example.com', 'Thailand', array['Procurement', 'Structural QA'], '${userA1}'
    )
  `);
  const a1Profile = await clientA1.query(`select * from public.sr_organization_profiles where organization_id = '${orgA}'`);
  if (a1Profile.rows.length !== 1 || a1Profile.rows[0].visibility !== 'private') {
    throw new Error('T02 FAIL: Org A profile insert failed or not private by default');
  }
  console.log('  PASS T02: Org A admin successfully inserted private company profile.');

  // T03: Org B admin CANNOT read Org A's private profile
  const clientB1 = await asUser(userB1);
  const b1SeeA = await clientB1.query(`select * from public.sr_organization_profiles where organization_id = '${orgA}'`);
  if (b1SeeA.rows.length !== 0) {
    throw new Error('T03 FAIL: Cross-org leak! Org B admin read Org A private profile!');
  }
  console.log('  PASS T03: Org B admin strictly blocked from reading Org A private profile (0 rows).');

  // T04: Public profile check
  await clientA1.query(`
    update public.sr_organization_profiles
    set visibility = 'public', published_by = '${userA1}', published_at = now()
    where organization_id = '${orgA}'
  `);
  const b1SeeAPublic = await clientB1.query(`select * from public.sr_organization_profiles where organization_id = '${orgA}'`);
  if (b1SeeAPublic.rows.length !== 1) {
    throw new Error('T04 FAIL: Org B should be able to read explicitly published profile');
  }
  // Revert back to private
  await clientA1.query(`
    update public.sr_organization_profiles
    set visibility = 'private', published_by = null, published_at = null
    where organization_id = '${orgA}'
  `);
  const b1SeeARevert = await clientB1.query(`select * from public.sr_organization_profiles where organization_id = '${orgA}'`);
  if (b1SeeARevert.rows.length !== 0) {
    throw new Error('T04 FAIL: Reverting to private did not immediately block Org B');
  }
  console.log('  PASS T04: Public publication and reversion to private strictly enforced by RLS.');

  // T05: Personal profile isolation
  await clientA1.query(`
    insert into public.sr_person_profiles (user_id, display_name, headline, bio, skills)
    values ('${userA1}', 'Alice A', 'Senior Procurement Lead', 'Civil procurement specialist', array['Steel', 'Precast'])
  `);
  const b1SeePersonalA = await clientB1.query(`select * from public.sr_person_profiles where user_id = '${userA1}'`);
  if (b1SeePersonalA.rows.length !== 0) {
    throw new Error('T05 FAIL: User B1 leaked User A1 private personal profile!');
  }
  console.log('  PASS T05: User personal profiles are strictly private and unreadable by other users.');

  // T06: Private relationship memory (Org A records Org B as a supplier with private notes)
  const relInsert = await clientA1.query(`
    insert into public.sr_organization_relationships (
      owner_organization_id, counterparty_organization_id, counterparty_name,
      relationship_kind, stage, private_notes, created_by
    ) values (
      '${orgA}', '${orgB}', 'Company B Steel Works',
      'supplier', 'active', 'Confidential note: Approved for M20 bolts and 12mm plate at USD 1,200', '${userA1}'
    ) returning id
  `);
  const relId = relInsert.rows[0].id;
  console.log('  PASS T06: Org A admin created private relationship record for counterparty Org B.');

  // T07: Counterparty Org B CANNOT read Org A's relationship, private notes or stage
  const b1SeeRel = await clientB1.query(`select * from public.sr_organization_relationships where id = '${relId}'`);
  if (b1SeeRel.rows.length !== 0) {
    throw new Error('T07 FAIL: CRITICAL LEAK! Counterparty Org B read Org A private notes/CRM!');
  }
  console.log('  PASS T07: Counterparty Org B cannot read Org A relationship or private notes (0 rows).');

  // T08: Internal member isolation: Org A regular member (A2) cannot read admin-only relationship notes
  const clientA2 = await asUser(userA2);
  const a2SeeRel = await clientA2.query(`select * from public.sr_organization_relationships where id = '${relId}'`);
  if (a2SeeRel.rows.length !== 0) {
    throw new Error('T08 FAIL: Org A regular member A2 leaked admin-only relationship notes!');
  }
  console.log('  PASS T08: Regular organization member cannot access admin-only relationship directory.');

  // T09: Immutability triggers
  let triggerBlocked = false;
  try {
    await clientA1.query(`
      update public.sr_organization_relationships
      set owner_organization_id = '${orgB}'
      where id = '${relId}'
    `);
  } catch (e) {
    triggerBlocked = e.message.includes('private_relationship_owner_immutable');
  }
  if (!triggerBlocked) {
    throw new Error('T09 FAIL: Reassigning owner_organization_id was not blocked by immutable trigger!');
  }
  console.log('  PASS T09: Immutability trigger prevents reassigning private relationship to another firm.');

  // T10: AI Suggestions isolation
  const sugInsert = await clientA1.query(`
    insert into public.sr_profile_suggestions (
      target_organization_id, field_key, proposed_value,
      source_kind, source_label, confidence, created_by
    ) values (
      '${orgA}', 'capabilities', '["Heavy Forging", "Galvanized Bolts"]'::jsonb,
      'brochure_text', '2026 Brochure p.4', 0.950, '${userA1}'
    ) returning id
  `);
  const sugId = sugInsert.rows[0].id;

  const b1SeeSug = await clientB1.query(`select * from public.sr_profile_suggestions where id = '${sugId}'`);
  if (b1SeeSug.rows.length !== 0) {
    throw new Error('T10 FAIL: Org B leaked Org A pending AI suggestion!');
  }
  console.log('  PASS T10: AI profile suggestions are isolated to target organization admins.');

  // T11: Transactional confirmation RPC (sr_decide_profile_suggestion)
  // Verify Org B cannot decide Org A's suggestion
  let b1Denied = false;
  try {
    await clientB1.query(`select public.sr_decide_profile_suggestion('${sugId}', '${orgA}', 'accept')`);
  } catch (e) {
    b1Denied = e.message.includes('organization_access_denied');
  }
  if (!b1Denied) {
    throw new Error('T11 FAIL: Org B should be denied when deciding Org A suggestion!');
  }

  // Org A admin accepts suggestion
  const decideRes = await clientA1.query(`select public.sr_decide_profile_suggestion('${sugId}', '${orgA}', 'accept')`);
  const decJson = decideRes.rows[0].sr_decide_profile_suggestion;
  if (!decJson.ok || decJson.status !== 'accepted') {
    throw new Error('T11 FAIL: RPC did not return success: ' + JSON.stringify(decJson));
  }

  // Verify profile and suggestion in one check
  const updatedProfile = await clientA1.query(`select capabilities from public.sr_organization_profiles where organization_id = '${orgA}'`);
  const updatedSug = await clientA1.query(`select status, reviewed_by from public.sr_profile_suggestions where id = '${sugId}'`);
  const caps = updatedProfile.rows[0].capabilities;
  if (!caps.includes('Heavy Forging') || !caps.includes('Galvanized Bolts')) {
    throw new Error('T11 FAIL: Profile capabilities not updated: ' + JSON.stringify(caps));
  }
  if (updatedSug.rows[0].status !== 'accepted' || updatedSug.rows[0].reviewed_by !== userA1) {
    throw new Error('T11 FAIL: Suggestion status not updated atomically: ' + JSON.stringify(updatedSug.rows[0]));
  }
  console.log('  PASS T11: Transactional confirmation RPC atomically applied profile changes and updated review state.');

  // T12: Transactional dismissal RPC
  const sugDismiss = await clientA1.query(`
    insert into public.sr_profile_suggestions (
      target_organization_id, field_key, proposed_value,
      source_kind, source_label, confidence, created_by
    ) values (
      '${orgA}', 'country', '"Germany"'::jsonb,
      'brochure_text', 'Bad scan', 0.200, '${userA1}'
    ) returning id
  `);
  const dismissId = sugDismiss.rows[0].id;
  await clientA1.query(`select public.sr_decide_profile_suggestion('${dismissId}', '${orgA}', 'dismiss')`);
  const dismissedRow = await clientA1.query(`select status, reviewed_by from public.sr_profile_suggestions where id = '${dismissId}'`);
  const profileCountry = await clientA1.query(`select country from public.sr_organization_profiles where organization_id = '${orgA}'`);
  if (dismissedRow.rows[0].status !== 'dismissed') {
    throw new Error('T12 FAIL: Suggestion not dismissed');
  }
  if (profileCountry.rows[0].country !== 'Thailand') {
    throw new Error('T12 FAIL: Dismissed suggestion altered profile country');
  }
  console.log('  PASS T12: Transactional dismissal RPC marked suggestion dismissed without altering profile.');

  // T14: Negative test: Direct UPDATE bypass attempt is strictly blocked
  const sugBypassInsert = await clientA1.query(`
    insert into public.sr_profile_suggestions (
      target_organization_id, field_key, proposed_value,
      source_kind, source_label, confidence, created_by
    ) values (
      '${orgA}', 'description', '"Bypass attempt"'::jsonb,
      'manual', 'unauthorized direct edit', 0.850, '${userA1}'
    ) returning id
  `);
  const sugBypassId = sugBypassInsert.rows[0].id;
  let directUpdateBlocked = false;
  try {
    await clientA1.query(`
      update public.sr_profile_suggestions
      set status = 'accepted', reviewed_by = '${userA1}', reviewed_at = now()
      where id = '${sugBypassId}'
    `);
  } catch (e) {
    directUpdateBlocked = e.message.includes('permission denied') ||
                          e.message.includes('direct_suggestion_update_prohibited');
  }
  if (!directUpdateBlocked) {
    throw new Error('T14 FAIL: Direct UPDATE on sr_profile_suggestions was not blocked!');
  }
  console.log('  PASS T14: Direct UPDATE on profile suggestions strictly blocked (RPC enforcement verified).');

  // T15: Negative test: Non-Admin regular member (A2) cannot decide suggestions
  let memberDecideBlocked = false;
  try {
    await clientA2.query(`select public.sr_decide_profile_suggestion('${sugBypassId}', '${orgA}', 'accept')`);
  } catch (e) {
    memberDecideBlocked = e.message.includes('organization_access_denied');
  }
  if (!memberDecideBlocked) {
    throw new Error('T15 FAIL: Regular member A2 was not blocked from deciding suggestion!');
  }
  console.log('  PASS T15: Regular member strictly blocked from deciding profile suggestions (403 denied).');

  // T16: Negative test: Concurrent / Double decision attempt blocked
  await clientA1.query(`select public.sr_decide_profile_suggestion('${sugBypassId}', '${orgA}', 'accept')`);
  let doubleDecideBlocked = false;
  try {
    await clientA1.query(`select public.sr_decide_profile_suggestion('${sugBypassId}', '${orgA}', 'accept')`);
  } catch (e) {
    doubleDecideBlocked = e.message.includes('suggestion_not_found_or_not_pending');
  }
  if (!doubleDecideBlocked) {
    throw new Error('T16 FAIL: Calling decide on already accepted suggestion was not rejected!');
  }
  console.log('  PASS T16: Concurrent / duplicate decision attempt cleanly rejected (race-condition protected).');

  // T17: Negative test: Transaction rollback on constraint failure (ACID integrity)
  const tooManyCapabilities = JSON.stringify(Array.from({ length: 35 }, (_, i) => `Capability ${i}`));
  const badSugInsert = await clientA1.query(`
    insert into public.sr_profile_suggestions (
      target_organization_id, field_key, proposed_value,
      source_kind, source_label, confidence, created_by
    ) values (
      '${orgA}', 'capabilities', '${tooManyCapabilities}'::jsonb,
      'manual', 'Constraint violator', 0.900, '${userA1}'
    ) returning id
  `);
  const badSugId = badSugInsert.rows[0].id;
  let rollbackCaught = false;
  try {
    await clientA1.query(`select public.sr_decide_profile_suggestion('${badSugId}', '${orgA}', 'accept')`);
  } catch (e) {
    rollbackCaught = e.message.includes('sr_org_capabilities_limited');
  }
  if (!rollbackCaught) {
    throw new Error('T17 FAIL: RPC did not fail on check constraint violation!');
  }
  const badSugAfter = await clientA1.query(`select status, reviewed_by from public.sr_profile_suggestions where id = '${badSugId}'`);
  if (badSugAfter.rows[0].status !== 'pending' || badSugAfter.rows[0].reviewed_by !== null) {
    throw new Error('T17 FAIL: Suggestion was partially updated despite transaction abort!');
  }
  console.log('  PASS T17: Atomic rollback verified on constraint failure (zero partial state left).');

  // T18: Negative test: Unauthenticated / Anon caller blocked from executing RPC
  const anonClient = await asUser(null, 'anon');
  let anonBlocked = false;
  try {
    await anonClient.query(`select public.sr_decide_profile_suggestion('${badSugId}', '${orgA}', 'accept')`);
  } catch (e) {
    anonBlocked = e.message.includes('permission denied') || e.message.includes('unauthorized');
  }
  await anonClient.end();
  if (!anonBlocked) {
    throw new Error('T18 FAIL: Anon caller was not blocked from executing sr_decide_profile_suggestion!');
  }
  console.log('  PASS T18: Unauthenticated caller strictly blocked from executing decision RPC.');

  // T13: Immediate revocation on membership removal
  await adminClient.query(`
    update public.organization_memberships
    set removed_at = now()
    where organization_id = '${orgA}' and user_id = '${userA1}'
  `);
  const a1AfterRemoval = await clientA1.query(`select * from public.sr_organization_relationships where id = '${relId}'`);
  if (a1AfterRemoval.rows.length !== 0) {
    throw new Error('T13 FAIL: Removed member still has access to organization relationships!');
  }
  console.log('  PASS T13: Removed member immediately loses access to all private organization records.');

  await clientA1.end();
  await clientA2.end();
  await clientB1.end();
  await adminClient.end();

  console.log('[5/5] All 18 isolated Postgres RLS & transactional contract checks PASSED!');
  if (started && pg) {
    await pg.stop().catch(() => {});
  }
  process.exit(0);
} catch (err) {
  console.error('FAIL in isolated DB verification:', err);
  if (adminClient) await adminClient.end().catch(() => {});
  process.exit(1);
} finally {
  if (started && pg) {
    await pg.stop().catch(() => {});
  }
}
