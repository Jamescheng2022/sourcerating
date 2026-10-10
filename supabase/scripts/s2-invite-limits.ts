// B6a live regressions. Local only, retained synthetic fixtures, no deletes.
// Env: SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY, S2_BUYER_PASSWORD,
// S2_SUPPLIER_PASSWORD. S2_INVITE_TEST_PHASE=cap (first fix) or uniform (both).
import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.57.4";
import { S2 } from "./s2-seed.ts";

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing ${name}`);
  return value;
}
function expect(ok: boolean, label: string) {
  if (!ok) throw new Error(label);
  checks++;
  console.log(`PASS ${label}`);
}
let checks = 0;
const phase = Deno.env.get("S2_INVITE_TEST_PHASE") || "cap";
const url = env("SUPABASE_URL");
if (url !== "http://127.0.0.1:54321") throw new Error("Local stack required");
const anonKey = env("SUPABASE_ANON_KEY");
function client(key = anonKey): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function must<
  T extends { data: unknown; error: { message: string } | null },
>(operation: PromiseLike<T>): Promise<NonNullable<T["data"]>> {
  const { data, error } = await operation;
  if (error) throw new Error(error.message);
  if (data === null || data === undefined) {
    throw new Error("missing response data");
  }
  return data as NonNullable<T["data"]>;
}
async function bootstrap(
  token: string,
  email: string,
  headers: Record<string, string> = {},
) {
  const response = await fetch(url + "/functions/v1/project-invite", {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      action: "bootstrap",
      token,
      email,
      password: env("S2_SUPPLIER_PASSWORD"),
      displayName: "[S2-TEST] Bootstrap limits",
    }),
  });
  return { status: response.status, body: await response.json() };
}
async function allUsers(admin: SupabaseClient) {
  const users = [];
  for (let page = 1; page < 100; page++) {
    const result = await must(
      admin.auth.admin.listUsers({ page, perPage: 200 }),
    );
    users.push(...result.users);
    if (result.users.length < 200) return users;
  }
  throw new Error("user inventory truncated");
}
async function main() {
  const admin = client(env("SUPABASE_SERVICE_ROLE_KEY")), buyer = client();
  await must(
    buyer.auth.signInWithPassword({
      email: S2.buyerEmail,
      password: env("S2_BUYER_PASSWORD"),
    }),
  );
  const stamp = `s2-limits-${Date.now()}`;
  const invite = await must(
    buyer.rpc("create_supplier_room_invite", {
      p_project_id: S2.project,
      p_supplier_organization_name: `[S2-TEST] Cap ${stamp}`,
    }),
  );
  const emails = Array.from(
    { length: 12 },
    (_, i) => `${stamp}-${i}@s2-test.invalid`,
  );
  const responses = await Promise.all(
    emails.map((email, i) =>
      bootstrap(invite.token, email, {
        "X-Forwarded-For": `192.0.2.${i + 1}`,
        "X-Real-IP": `198.51.100.${i + 1}`,
      })
    ),
  );
  const users = await allUsers(admin);
  const created = users.filter((u) => emails.includes(u.email || ""));
  expect(
    created.length === 3,
    "12 concurrent HTTP requests create exactly 3 accounts; cap cannot be exceeded",
  );
  const row = await must(
    admin.from("project_invites").select("id,unbound_bootstrap_reservations")
      .eq("room_id", invite.room_id).single(),
  );
  expect(
    row.unbound_bootstrap_reservations === 3,
    "database reservation counter stops at 3 under concurrency",
  );
  expect(
    responses.every((r) => [200, 429].includes(r.status)),
    "all concurrent requests resolve as prepared or limited, without ambiguous failures",
  );
  const rpcArgs = { p_invite_id: row.id };
  for (
    const [name, actor] of [["anon", client()], [
      "authenticated",
      buyer,
    ]] as const
  ) {
    const denied = await actor.rpc("reserve_invite_bootstrap", rpcArgs);
    expect(
      denied.error?.code === "42501",
      `${name} cannot call privileged reservation RPC`,
    );
  }
  if (phase !== "cap") {
    throw new Error("Only cap phase is implemented in the first fix");
  }
  console.log(
    JSON.stringify({
      phase,
      total: checks,
      passed: checks,
      concurrentRequests: 12,
      accountsCreated: created.length,
    }),
  );
}
main().catch((error) => {
  console.error(error.message);
  Deno.exit(1);
});
