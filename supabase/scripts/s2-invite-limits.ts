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
  await must(buyer.auth.signInWithPassword({email:S2.buyerEmail,password:env("S2_BUYER_PASSWORD")}));
  const stamp = `s2-b8-${Date.now()}`;
  if (phase === "rates") {await rateTests(admin,buyer,stamp);}
  else {
    const bound = await must(buyer.rpc("create_supplier_room_invite",{p_project_id:S2.project,p_supplier_organization_name:`[S2-TEST] B8 ${stamp}`,p_invited_email:S2.supplierEmail}));
    const legacyToken = crypto.randomUUID().replaceAll("-","")+crypto.randomUUID().replaceAll("-","");
    const legacy = await must(admin.from("project_invites").insert({token_hash:await sha256Hex(legacyToken),project_id:S2.project,room_id:bound.room_id,target_organization_id:bound.target_organization_id,invited_role:"supplier",invited_email:null,created_by_user_id:(await buyer.auth.getUser()).data.user!.id,created_by_organization_id:S2.buyerOrg,expires_at:new Date(Date.now()+3600000).toISOString()}).select("id").single());
    const emails = Array.from({length:12},(_,i)=>`${stamp}-${i}@s2-test.invalid`);
    const replies = await Promise.all(emails.map((email,i)=>bootstrap(legacyToken,email,{"X-Forwarded-For":`192.0.2.${i+1}`})));
    expect(replies.every(r=>r.status===403),"all 12 concurrent legacy unbound bootstrap requests denied");
    const existingProbe = await bootstrap(legacyToken,S2.supplierEmail);
    expect(existingProbe.status===replies[0].status && JSON.stringify(existingProbe.body)===JSON.stringify(replies[0].body),"legacy unbound existing/absent addresses have identical denials (no email oracle)");
    expect(!(await allUsers(admin)).some(u=>emails.includes(u.email||"")),"unbound invite cannot create any confirmed account");
    const counter = await must(admin.from("project_invites").select("unbound_bootstrap_reservations,bootstrap_attempt_count").eq("id",legacy.id).single());
    expect(counter.unbound_bootstrap_reservations===0 && counter.bootstrap_attempt_count===0,"unbound rejection spends no counters or reservations");
    expect(await must(admin.rpc("reserve_invite_bootstrap",{p_invite_id:legacy.id}))===false,"service reservation refuses legacy unbound invite");
    for (const [name,actor] of [["anon",client()],["authenticated",buyer]] as const) {
      expect((await actor.rpc("reserve_invite_bootstrap",{p_invite_id:legacy.id})).error?.code==="42501",`${name} cannot call reservation RPC`);
      expect((await actor.rpc("consume_invite_bootstrap_attempt",{p_invite_id:legacy.id,p_peer_hash:await sha256Hex(stamp)})).error?.code==="42501",`${name} cannot manipulate attempt counters`);
    }
    if (phase === "uniform") {
      const freshEmail = `${stamp}-bound@s2-test.invalid`;
      const fresh = await must(buyer.rpc("create_supplier_room_invite",{p_project_id:S2.project,p_supplier_organization_name:`[S2-TEST] Fresh ${stamp}`,p_invited_email:freshEmail}));
      const existing = await bootstrap(bound.token,S2.supplierEmail,{},`different-${crypto.randomUUID()}`);
      const created = await bootstrap(fresh.token,freshEmail);
      expect(existing.status===200 && created.status===200 && JSON.stringify(existing.body)===JSON.stringify(created.body),"bound existing/new accounts have uniform 200 body");
      expect((await allUsers(admin)).some(u=>u.email===freshEmail),"positive bound account preparation succeeds");
      await must(client().auth.signInWithPassword({email:S2.supplierEmail,password:env("S2_SUPPLIER_PASSWORD")}));
      expect(true,"existing bound account keeps its original password");
      for(let i=1;i<12;i++) expect((await bootstrap(bound.token,S2.supplierEmail,{"X-Forwarded-For":`203.0.113.${i}`})).status===200,`bound token attempt ${i+1} allowed`);
      expect((await bootstrap(bound.token,S2.supplierEmail,{"X-Forwarded-For":"203.0.113.99"})).status===429,"HTTP token 13 denied despite forged forwarding header");
      const mismatch = await bootstrap(fresh.token,`${stamp}-arbitrary@s2-test.invalid`);
      expect(mismatch.status===403,"bound token cannot prepare an arbitrary different address");
      await rateTests(admin,buyer,stamp);
    }
  }
  console.log(JSON.stringify({phase,total:checks,passed:checks}));
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

  const victimPeer = await sha256Hex(`${stamp}-victim-peer`);
  const denied = await Promise.all(Array.from({length:100},()=>must(admin.rpc("consume_invite_bootstrap_attempt",{p_invite_id:tokenRow.id,p_peer_hash:victimPeer}))));
  expect(denied.every(v=>v===false),"100 exhausted-token concurrent requests denied");
  expect(await localSql(`select count(*) from sourcerating_private.invite_bootstrap_peer_limits where peer_hash='${victimPeer}';`)==="0","exhausted token cannot drain another client's peer budget");
  const victimInvite = await createInvite("legitimate-peer",S2.supplierEmail);
  const victimRow = await must(admin.from("project_invites").select("id").eq("room_id",victimInvite.room_id).single());
  expect(await must(admin.rpc("consume_invite_bootstrap_attempt",{p_invite_id:victimRow.id,p_peer_hash:victimPeer}))===true,"legitimate second token retains its peer positive control");
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
  const capInvite = await createInvite("window-cap", S2.supplierEmail);
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
    reserved.every(Boolean),
    "bound reservations stay limited to the bound address",
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
    tokenRecovered === true && stillCapped === true,
    "bound token attempt window recovers without enabling unbound creation",
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
