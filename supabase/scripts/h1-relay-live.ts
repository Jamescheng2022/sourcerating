// Local/new-free-project acceptance only. Retains all synthetic fixtures.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { checkSeedTarget } from "./target-guard.ts";
import {
  digestHex,
  LOCAL_RELAY_PROJECT,
  randomNonce,
  RELAY_PATH,
  RELAY_PROJECT,
  signRelay,
} from "../functions/_shared/invite-relay.ts";
const url = Deno.env.get("SUPABASE_URL") || "";
const remote = new URL(url).protocol === "https:";
const allowed = remote
  ? Deno.env.get("S2_ALLOW_REMOTE_PROJECT_REF")
  : undefined;
if (checkSeedTarget(url, allowed) || (remote && allowed !== RELAY_PROJECT)) {
  throw new Error("Refusing target");
}
const project = remote ? RELAY_PROJECT : LOCAL_RELAY_PROJECT;
const secret = Deno.env.get("SR_INVITE_RELAY_SECRET") || "";
if (!/^[0-9a-f]{64}$/.test(secret)) {
  throw new Error("Missing dedicated relay secret");
}
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(
  url,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  opts,
);
const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, opts);
const buyer = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, opts);
const login = await buyer.auth.signInWithPassword({
  email: "s2-buyer@s2-test.invalid",
  password: Deno.env.get("S2_BUYER_PASSWORD")!,
});
if (login.error) throw new Error("Synthetic buyer login failed");
const results: { label: string; pass: boolean }[] = [];
function assert(value: unknown, message = "assertion failed") {
  if (!value) throw new Error(message);
}
async function check(label: string, test: () => Promise<void> | void) {
  await test();
  results.push({ label, pass: true });
  console.log("PASS " + label);
}
async function invite() {
  const { data, error } = await buyer.rpc("create_supplier_room_invite", {
    p_project_id: "52000000-0000-4000-8000-0000000000d1",
    p_supplier_organization_name: "[S2-TEST] H1 relay " + randomNonce(),
    p_invited_email: "s2-supplier@s2-test.invalid",
    p_expires_in_hours: 1,
  });
  assert(!error && data?.token, "Synthetic invitation creation failed");
  const row = await admin.from("project_invites").select(
    "id,bootstrap_attempt_count",
  ).eq("token_hash", await digestHex(data.token)).single();
  assert(!row.error);
  return { token: data.token as string, id: row.data!.id as string };
}
async function count(id: string) {
  const result = await admin.from("project_invites").select(
    "bootstrap_attempt_count",
  ).eq("id", id).single();
  assert(!result.error);
  return result.data!.bootstrap_attempt_count as number;
}
async function signed(
  body: string,
  peerHash = "b".repeat(64),
  timestamp = Math.floor(Date.now() / 1000),
  target = project,
): Promise<Record<string, string>> {
  const envelope = {
    project: target,
    peerHash,
    nonce: randomNonce(),
    timestamp: String(timestamp),
  };
  return {
    "Content-Type": "application/json",
    ...await signRelay(body, envelope, secret),
  };
}
async function send(
  body: string,
  headers: Record<string, string>,
  method = "POST",
) {
  return await fetch(url + RELAY_PATH, {
    method,
    headers,
    body: method === "POST" ? body : undefined,
  });
}
const probe = await invite();
const preview = JSON.stringify({ action: "preview", token: probe.token });
await check("valid signed preview returns synthetic bound invite", async () => {
  const response = await send(preview, await signed(preview));
  assert(response.status === 200);
  const value = await response.json();
  assert(value.ok && value.invitedEmail === "s2-supplier@s2-test.invalid");
});
const bootstrap = JSON.stringify({
  action: "bootstrap",
  token: probe.token,
  email: "wrong@s2-test.invalid",
  password: "[S2-TEST]-not-an-account",
});
for (
  const variant of [
    "unsigned",
    "forged",
    "body",
    "peer",
    "nonce",
    "timestamp",
    "expired",
    "future",
    "project",
    "wrong-key",
  ]
) {
  await check(
    `forgery ${variant} is denied without spending token budget`,
    async () => {
      let headers = await signed(
        bootstrap,
        "a".repeat(64),
        Math.floor(Date.now() / 1000) +
          (variant === "expired" ? -120 : variant === "future" ? 120 : 0),
        variant === "project" ? "different-project" : project,
      );
      if (variant === "unsigned") {
        headers = {
          "Content-Type": "application/json",
          ...(remote ? {} : { "x-sr-signature": "" }),
        };
      }
      if (variant === "forged") headers["x-sr-signature"] = "0".repeat(64);
      if (variant === "peer") headers["x-sr-peer"] = "c".repeat(64);
      if (variant === "nonce") headers["x-sr-nonce"] = "c".repeat(32);
      if (variant === "timestamp") {
        headers["x-sr-timestamp"] = String(
          Number(headers["x-sr-timestamp"]) + 1,
        );
      }
      if (variant === "wrong-key") {
        headers = {
          "Content-Type": "application/json",
          ...await signRelay(bootstrap, {
            project,
            peerHash: "a".repeat(64),
            nonce: randomNonce(),
            timestamp: String(Math.floor(Date.now() / 1000)),
          }, "cd".repeat(32)),
        };
      }
      const before = await count(probe.id);
      const response = await send(
        variant === "body" ? bootstrap + " " : bootstrap,
        headers,
      );
      assert(
        response.status === 401,
        `Expected 401 for ${variant}, got ${response.status}`,
      );
      assert(await count(probe.id) === before);
    },
  );
}
await check("sequential preview replay rejected", async () => {
  const headers = await signed(preview);
  assert((await send(preview, headers)).status === 200);
  assert((await send(preview, headers)).status === 401);
});
await check(
  "24 simultaneous copies of signed bootstrap spend exactly one attempt",
  async () => {
    const headers = await signed(bootstrap, await digestHex(randomNonce()));
    const before = await count(probe.id);
    const codes = await Promise.all(
      Array.from(
        { length: 24 },
        async () => (await send(bootstrap, headers)).status,
      ),
    );
    assert(
      codes.filter((c) => c === 403).length === 1 &&
        codes.filter((c) => c === 401).length === 23,
    );
    assert(await count(probe.id) === before + 1);
  },
);
await check(
  "24 independently signed requests with rotating visitor keys cannot exceed 12/token",
  async () => {
    const row = await invite();
    const body = JSON.stringify({
      action: "bootstrap",
      token: row.token,
      email: "wrong@s2-test.invalid",
      password: "[S2-TEST]-not-an-account",
    });
    const codes = await Promise.all(
      Array.from(
        { length: 24 },
        async () =>
          (await send(body, await signed(body, await digestHex(randomNonce()))))
            .status,
      ),
    );
    assert(
      codes.filter((c) => c === 403).length === 12 &&
        codes.filter((c) => c === 429).length === 12,
    );
    assert(await count(row.id) === 12);
  },
);
await check(
  "secondary visitor counter still caps many tokens at 60, exhausted token does not drain it",
  async () => {
    const peerHash = await digestHex(randomNonce());
    const rows = await Promise.all(Array.from({ length: 6 }, () => invite()));
    let allowedCalls = 0, denied = 0;
    for (const row of rows) {
      const body = JSON.stringify({
        action: "bootstrap",
        token: row.token,
        email: "wrong@s2-test.invalid",
        password: "[S2-TEST]-not-an-account",
      });
      const codes = await Promise.all(
        Array.from(
          { length: 12 },
          async () => (await send(body, await signed(body, peerHash))).status,
        ),
      );
      allowedCalls += codes.filter((c) => c === 403).length;
      denied += codes.filter((c) => c === 429).length;
      if (row === rows[0]) {
        const repeated = await send(body, await signed(body, peerHash));
        assert(repeated.status === 429);
      }
    }
    assert(allowedCalls === 60 && denied === 12);
  },
);
await check(
  "nonce RPC denies anon and authenticated direct execution",
  async () => {
    for (const client of [anon, buyer]) {
      const result = await client.rpc("consume_invite_relay_nonce", {
        p_project_ref: project,
        p_nonce_hash: await digestHex(randomNonce()),
        p_timestamp: Math.floor(Date.now() / 1000),
      });
      assert(result.error?.code === "42501");
    }
  },
);
await check(
  "guard rejects production and every non-approved remote target",
  () => {
    assert(
      checkSeedTarget(
        "https://qnozpurjtgkmwtvsrjoi.supabase.co",
        "qnozpurjtgkmwtvsrjoi",
      ),
    );
    assert(checkSeedTarget("https://other.supabase.co", RELAY_PROJECT));
  },
);
console.log(JSON.stringify({ project, passed: results.length, results }));
