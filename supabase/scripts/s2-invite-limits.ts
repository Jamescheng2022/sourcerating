// B6a live regressions. Local only, retained synthetic fixtures, no deletes.
// Env: SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY, S2_BUYER_PASSWORD,
// S2_SUPPLIER_PASSWORD. S2_INVITE_TEST_PHASE=cap, uniform (both fixes), or rates.
// uniform/rates additionally allow-run=docker to advance only synthetic rate
// windows and assert private-schema grants, via this project's local database.
import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.57.4";
import { S2 } from "./s2-seed.ts";
import { sha256Hex } from "../functions/_shared/http.ts";

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
  password = env("S2_SUPPLIER_PASSWORD"),
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
      password,
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
async function localSql(sql: string): Promise<string> {
  const result = await new Deno.Command("docker", {
    args: [
      "exec",
      "supabase_db_sourcerating-l1-stage2",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!result.success) throw new Error(new TextDecoder().decode(result.stderr));
  return new TextDecoder().decode(result.stdout).trim();
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
  if (phase === "rates") {
    await rateTests(admin, buyer, stamp);
    console.log(JSON.stringify({ phase, total: checks, passed: checks }));
    return;
  }
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
  if (phase === "uniform") await uniformTests(admin, buyer, stamp, responses);
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
async function uniformTests(
  admin: SupabaseClient,
  buyer: SupabaseClient,
  stamp: string,
  concurrent: Awaited<ReturnType<typeof bootstrap>>[],
) {
  const samePrepared = (reply: Awaited<ReturnType<typeof bootstrap>>) =>
    reply.status === 200 && JSON.stringify(reply.body) === '{"ok":true}';
  expect(
    concurrent.every(samePrepared),
    "concurrent new-account and cap-exhausted HTTP responses have identical status/body",
  );
  const createInvite = (name: string, email: string | null = null) =>
    must(buyer.rpc("create_supplier_room_invite", {
      p_project_id: S2.project,
      p_supplier_organization_name: `[S2-TEST] Limits ${stamp} ${name}`,
      p_invited_email: email,
    }));
  const invite = await createInvite("uniform");
  const existingBefore = (await allUsers(admin)).find((user) =>
    user.email === S2.supplierEmail
  );
  const newEmail = `${stamp}-uniform-new@s2-test.invalid`,
    cappedEmail = `${stamp}-uniform-capped@s2-test.invalid`;
  const replies = [];
  for (
    const email of [S2.supplierEmail, newEmail, S2.supplierEmail, cappedEmail]
  ) {
    replies.push(
      await bootstrap(
        invite.token,
        email,
        {},
        email === S2.supplierEmail
          ? `S2-TEST-different-${crypto.randomUUID()}`
          : env("S2_SUPPLIER_PASSWORD"),
      ),
    );
  }
  expect(
    replies.every(samePrepared),
    "existing, absent, repeated-existing and exhausted-cap emails get the same 200/ok response",
  );
  const users = await allUsers(admin);
  expect(
    users.some((user) => user.email === newEmail) &&
      !users.some((user) => user.email === cappedEmail),
    "positive Auth controls prove one absent account was prepared and cap exhaustion created no extra account",
  );
  const existingAfter = users.find((user) => user.email === S2.supplierEmail);
  expect(
    existingBefore?.id === existingAfter?.id &&
      JSON.stringify(existingBefore?.user_metadata) ===
        JSON.stringify(existingAfter?.user_metadata),
    "existing account identity and metadata are not overwritten",
  );
  await must(
    client().auth.signInWithPassword({
      email: S2.supplierEmail,
      password: env("S2_SUPPLIER_PASSWORD"),
    }),
  );
  expect(true, "existing account still signs in with its original password");
  for (let i = 4; i < 12; i++) {
    const reply = await bootstrap(
      invite.token,
      i % 2 ? S2.supplierEmail : `${stamp}-probe-${i}@s2-test.invalid`,
      { "X-Forwarded-For": `203.0.113.${i}` },
    );
    expect(
      samePrepared(reply),
      `attempt ${
        i + 1
      } remains uniform independent of existence and spoofed forwarding IP`,
    );
  }
  const limitedExisting = await bootstrap(invite.token, S2.supplierEmail, {
    "X-Forwarded-For": "203.0.113.99",
  });
  const limitedAbsent = await bootstrap(
    invite.token,
    `${stamp}-limited-absent@s2-test.invalid`,
    { "X-Real-IP": "203.0.113.100" },
  );
  expect(
    limitedExisting.status === 429 && limitedAbsent.status === 429 &&
      JSON.stringify(limitedExisting.body) ===
        JSON.stringify(limitedAbsent.body),
    "token attempt limit counts every probe and returns uniform 429 after 12 despite changing headers",
  );

  const rpcArgs = {
    p_invite_id: (await must(
      admin.from("project_invites").select("id").eq("room_id", invite.room_id)
        .single(),
    )).id,
    p_peer_hash: await sha256Hex("192.0.2.55"),
  };
  for (
    const [name, actor] of [["anon", client()], [
      "authenticated",
      buyer,
    ]] as const
  ) {
    const denied = await actor.rpc("consume_invite_bootstrap_attempt", rpcArgs);
    expect(
      denied.error?.code === "42501",
      `${name} cannot manipulate privileged attempt counters`,
    );
  }
  await rateTests(admin, buyer, stamp);
  const invalidInputInvite = await createInvite(
    "invalid-input",
    S2.supplierEmail,
  );
  const invalidResponse = await fetch(url + "/functions/v1/project-invite", {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "bootstrap",
      token: invalidInputInvite.token,
      email: S2.supplierEmail,
      password: "x",
    }),
  });
  expect(
    invalidResponse.status === 400,
    "input validation still rejects too-short passwords",
  );
  const invalidRow = await must(
    admin.from("project_invites").select(
      "bootstrap_attempt_count,unbound_bootstrap_reservations",
    ).eq("room_id", invalidInputInvite.room_id).single(),
  );
  expect(
    invalidRow.bootstrap_attempt_count === 1 &&
      invalidRow.unbound_bootstrap_reservations === 0,
    "failed validation consumes an attempt without consuming a creation reservation",
  );
}
async function rateTests(
  admin: SupabaseClient,
  buyer: SupabaseClient,
  stamp: string,
) {
  const createInvite = (name: string, email: string | null = null) =>
    must(buyer.rpc("create_supplier_room_invite", {
      p_project_id: S2.project,
      p_supplier_organization_name: `[S2-TEST] Rates ${stamp} ${name}`,
      p_invited_email: email,
    }));
  const tokenRace = await createInvite("token-race", S2.supplierEmail);
  const tokenRow = await must(
    admin.from("project_invites").select("id").eq("room_id", tokenRace.room_id)
      .single(),
  );
  const tokenResults = await Promise.all(
    Array.from({ length: 20 }, async (_, i) =>
      must(
        admin.rpc("consume_invite_bootstrap_attempt", {
          p_invite_id: tokenRow.id,
          p_peer_hash: await sha256Hex(`${stamp}-synthetic-peer-${i}`),
        }),
      )),
  );
  expect(
    tokenResults.filter(Boolean).length === 12,
    "20 concurrent requests from distinct peer buckets cannot exceed the token's 12-attempt window",
  );
  const peerHash = await sha256Hex(`${stamp}-synthetic-global-peer`);
  const globalInvites = await Promise.all(
    Array.from(
      { length: 6 },
      (_, i) => createInvite(`peer-global-${i}`, S2.supplierEmail),
    ),
  );
  const globalRows = await Promise.all(
    globalInvites.map((i) =>
      must(
        admin.from("project_invites").select("id").eq("room_id", i.room_id)
          .single(),
      )
    ),
  );
  // Sixty calls across five tokens stay under each token cap. The next token is fresh.
  const peerResults = await Promise.all(
    globalRows.slice(0, 5).flatMap((row) =>
      Array.from({ length: 12 }, () =>
        must(
          admin.rpc("consume_invite_bootstrap_attempt", {
            p_invite_id: row.id,
            p_peer_hash: peerHash,
          }),
        ))
    ),
  );
  expect(
    peerResults.every(Boolean),
    "global peer positive control allows 60 attempts spread across five valid tokens",
  );
  const peerDenied = await must(
    admin.rpc("consume_invite_bootstrap_attempt", {
      p_invite_id: globalRows[5].id,
      p_peer_hash: peerHash,
    }),
  );
  expect(
    peerDenied === false,
    "global per-IP limit denies attempt 61 even with a fresh token (no per-token limit reached)",
  );
  const freshPeer = await must(
    admin.rpc("consume_invite_bootstrap_attempt", {
      p_invite_id: globalRows[5].id,
      p_peer_hash: await sha256Hex(`${stamp}-different-peer`),
    }),
  );
  expect(
    freshPeer === true,
    "a different peer has an independent attempt bucket",
  );
  // Advance only a synthetic fixture's window; no real peer limit is reset.
  await localSql(
    `update sourcerating_private.invite_bootstrap_peer_limits set window_started_at = now() - interval '11 minutes' where peer_hash = '${peerHash}';`,
  );
  const peerRecovered = await must(
    admin.rpc("consume_invite_bootstrap_attempt", {
      p_invite_id: globalRows[5].id,
      p_peer_hash: peerHash,
    }),
  );
  const peerCounter = await localSql(
    `select attempt_count from sourcerating_private.invite_bootstrap_peer_limits where peer_hash = '${peerHash}';`,
  );
  expect(
    peerRecovered === true && peerCounter === "1",
    "expired synthetic per-IP window recovers and resets its attempt count",
  );
  const capInvite = await createInvite("window-cap");
  const capRow = await must(
    admin.from("project_invites").select("id").eq("room_id", capInvite.room_id)
      .single(),
  );
  const rpcArgs = { p_invite_id: capRow.id };
  const reserved = [];
  for (let i = 0; i < 4; i++) {
    reserved.push(await must(admin.rpc("reserve_invite_bootstrap", rpcArgs)));
  }
  expect(
    JSON.stringify(reserved) === "[true,true,true,false]",
    "window fixture has a proven exhausted lifetime creation cap",
  );
  await must(
    admin.from("project_invites").update({
      bootstrap_attempt_count: 13,
      bootstrap_window_started_at: new Date(Date.now() - 11 * 60_000)
        .toISOString(),
    }).eq("id", capRow.id).select("id").single(),
  );
  const tokenRecovered = await must(
    admin.rpc("consume_invite_bootstrap_attempt", {
      ...rpcArgs,
      p_peer_hash: await sha256Hex(`${stamp}-window-recovery-peer`),
    }),
  );
  const stillCapped = await must(
    admin.rpc("reserve_invite_bootstrap", rpcArgs),
  );
  expect(
    tokenRecovered === true && stillCapped === false,
    "token attempt window recovers while lifetime account-creation cap remains exhausted",
  );
  const privatePrivileges = await localSql(
    "select (not has_schema_privilege('anon','sourcerating_private','usage') and not has_schema_privilege('authenticated','sourcerating_private','usage') and not has_table_privilege('anon','sourcerating_private.invite_bootstrap_peer_limits','select') and not has_table_privilege('authenticated','sourcerating_private.invite_bootstrap_peer_limits','select') and (select relrowsecurity from pg_class where oid='sourcerating_private.invite_bootstrap_peer_limits'::regclass))::text;",
  );
  expect(
    privatePrivileges === "true",
    "peer counters are private, RLS-enabled, and unreadable to anon/authenticated",
  );
}
main().catch((error) => {
  console.error(error.message);
  Deno.exit(1);
});
