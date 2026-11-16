// Static contract checks only; not an RLS penetration test or browser acceptance.
// CI must run the migration in a disposable database and verify RLS using distinct
// real users before the feature flag is enabled.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("network tables default private, with RLS and separate company-private relationship records", () => {
  const sql = read("supabase/migrations/202611160001_chatgrown_network_foundation.sql");
  for (const name of [
    "sr_organization_profiles",
    "sr_person_profiles",
    "sr_organization_relationships",
    "sr_profile_suggestions",
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${name}`));
    assert.match(sql, new RegExp(`alter table public\\.${name} enable row level security`));
  }
  assert.match(sql, /visibility text not null default 'private'/);
  assert.match(sql, /sr_relationship_admin_read/);
  assert.match(sql, /sr_suggestion_owner_read/);
  assert.match(sql, /sr_network_immutable_identity/);
  assert.doesNotMatch(sql, /insert into public\.room_events/i);
});

test("AI draft endpoint requires a caller JWT and organization admin rights", () => {
  const route = read("apps/web/src/app/api/project-room-b/profile-suggest/route.ts");
  assert.match(route, /getUser\(token\)/);
  assert.match(route, /organization_memberships/);
  assert.match(route, /\["owner", "admin"\]/);
  assert.match(route, /written: false, published: false/);
  assert.match(route, /sourceText: z\.string\(\)\.min\(40\)\.max\(12000\)/);
  assert.doesNotMatch(route, /service_role|SERVICE_ROLE|adminKey/);
  assert.doesNotMatch(route, /\.from\("room_events"\)/);
});

test("network UI is opt-in and all company edits are private drafts", () => {
  const sidebar = read("apps/web/src/app/project-room-b/real-ui.tsx");
  const page = read("apps/web/src/app/project-room-b/network/page.tsx");
  assert.match(sidebar, /NEXT_PUBLIC_SR_NETWORK_PILOT === "1"/);
  assert.match(page, /visibility: "private", published_by: null, published_at: null/);
  assert.match(page, /status: "pending", created_by: userId/);
  assert.match(page, /from\("room_members"\)/);
  assert.match(page, /window\.confirm\(/);
});
