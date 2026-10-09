// Stage 2 synthetic seed: one buyer org, one supplier org, one project, a
// buyer-internal room and a shared supplier room, and two email/password test
// accounts. Every name carries the [S2-TEST] prefix. Idempotent: re-running
// resets the two passwords and re-asserts memberships.
//
// deno run --allow-net --allow-env supabase/scripts/s2-seed.ts
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//      S2_BUYER_PASSWORD, S2_SUPPLIER_PASSWORD (keep them outside the repo),
//      S2_ALLOW_REMOTE_PROJECT_REF (only for a named non-production test project).

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { checkSeedTarget } from "./target-guard.ts";

export const S2 = {
  buyerOrg: "52000000-0000-4000-8000-0000000000b1",
  supplierOrg: "52000000-0000-4000-8000-0000000000c1",
  project: "52000000-0000-4000-8000-0000000000d1",
  internalRoom: "52000000-0000-4000-8000-0000000000e1",
  sharedRoom: "52000000-0000-4000-8000-0000000000e2",
  buyerEmail: "s2-buyer@s2-test.invalid",
  supplierEmail: "s2-supplier@s2-test.invalid",
};

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing env ${name}`);
  return value;
}

async function must<T>(label: string, op: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await op;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function findUserId(admin: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((user) => user.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(admin: SupabaseClient, email: string, password: string, displayName: string) {
  if (password.length < 16) throw new Error(`password for ${email} must be at least 16 characters`);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, s2_test: true },
  });
  if (!error && data.user) return data.user.id;
  const existing = await findUserId(admin, email);
  if (!existing) throw new Error(`createUser ${email}: ${error?.message ?? "unknown"}`);
  const { error: updateError } = await admin.auth.admin.updateUserById(existing, {
    password,
    user_metadata: { display_name: displayName, s2_test: true },
  });
  if (updateError) throw new Error(`updateUser ${email}: ${updateError.message}`);
  return existing;
}

async function main() {
  const url = env("SUPABASE_URL");
  const refusal = checkSeedTarget(url, Deno.env.get("S2_ALLOW_REMOTE_PROJECT_REF") ?? undefined);
  if (refusal) throw new Error(refusal);

  const admin = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const buyerUser = await ensureUser(admin, S2.buyerEmail, env("S2_BUYER_PASSWORD"), "[S2-TEST] Buyer");
  const supplierUser = await ensureUser(admin, S2.supplierEmail, env("S2_SUPPLIER_PASSWORD"), "[S2-TEST] Supplier");

  await must(
    "organizations",
    admin.from("organizations").upsert([
      { id: S2.buyerOrg, name: "[S2-TEST] Buyer Co", slug: "s2-test-buyer" },
      { id: S2.supplierOrg, name: "[S2-TEST] Supplier Co", slug: "s2-test-supplier" },
    ], { onConflict: "id" }),
  );
  await must(
    "projects",
    admin.from("projects").upsert({
      id: S2.project,
      owner_organization_id: S2.buyerOrg,
      name: "[S2-TEST] Prefab Office Pilot",
      code: "S2-TEST-001",
    }, { onConflict: "id" }),
  );
  await must(
    "project_participants",
    admin.from("project_participants").upsert([
      { project_id: S2.project, organization_id: S2.buyerOrg, project_role: "buyer" },
      { project_id: S2.project, organization_id: S2.supplierOrg, project_role: "supplier" },
    ], { onConflict: "project_id,organization_id,project_role" }),
  );
  await must(
    "rooms",
    admin.from("rooms").upsert([
      {
        id: S2.internalRoom,
        project_id: S2.project,
        kind: "buyer_internal",
        name: "[S2-TEST] Buyer Internal",
        owner_organization_id: S2.buyerOrg,
        counterpart_organization_id: null,
      },
      {
        id: S2.sharedRoom,
        project_id: S2.project,
        kind: "supplier_external",
        name: "[S2-TEST] Supplier Co - Shared",
        owner_organization_id: S2.buyerOrg,
        counterpart_organization_id: S2.supplierOrg,
      },
    ], { onConflict: "id" }),
  );
  await must(
    "organization_memberships",
    admin.from("organization_memberships").upsert([
      { organization_id: S2.buyerOrg, user_id: buyerUser, role: "owner", removed_at: null },
      { organization_id: S2.supplierOrg, user_id: supplierUser, role: "owner", removed_at: null },
    ], { onConflict: "organization_id,user_id" }),
  );
  await must(
    "room_members",
    admin.from("room_members").upsert([
      {
        room_id: S2.internalRoom,
        user_id: buyerUser,
        acting_organization_id: S2.buyerOrg,
        room_role: "admin",
        removed_at: null,
      },
      {
        room_id: S2.sharedRoom,
        user_id: buyerUser,
        acting_organization_id: S2.buyerOrg,
        room_role: "admin",
        removed_at: null,
      },
      {
        room_id: S2.sharedRoom,
        user_id: supplierUser,
        acting_organization_id: S2.supplierOrg,
        room_role: "member",
        removed_at: null,
      },
    ], { onConflict: "room_id,user_id,acting_organization_id" }),
  );

  console.log(JSON.stringify({ ok: true, ...S2, buyerUser, supplierUser }, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  });
}
