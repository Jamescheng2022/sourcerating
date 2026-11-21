import {
  handleInviteRelay,
  relayConfig,
} from "../../../apps/web/src/lib/invite-relay-server.ts";
import {
  LOCAL_RELAY_PROJECT,
  RELAY_BRANCH,
  RELAY_PROJECT,
  verifyRelay,
} from "../_shared/invite-relay.ts";
const secret = "ab".repeat(32); // unconfigured synthetic test vector
const env = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${RELAY_PROJECT}.supabase.co`,
  SR_INVITE_RELAY_PROJECT_REF: RELAY_PROJECT,
  SR_INVITE_RELAY_SECRET: secret,
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: RELAY_BRANCH,
  VERCEL_URL: "preview.example.invalid",
};
function assert(value: unknown) {
  if (!value) throw new Error("assertion failed");
}
for (
  const [field, value] of Object.entries({
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_REF: "main",
    SR_INVITE_RELAY_PROJECT_REF: "other",
    SR_INVITE_RELAY_SECRET: "",
    NEXT_PUBLIC_SUPABASE_URL: "https://qnozpurjtgkmwtvsrjoi.supabase.co",
  })
) {
  Deno.test(`server config denies ${field}=${value || "missing"}`, () => {
    let rejected = false;
    try {
      relayConfig({ ...env, [field]: value });
    } catch {
      rejected = true;
    }
    assert(rejected);
  });
}
const body = JSON.stringify({ action: "preview", token: "a".repeat(64) });
function request(headers: Record<string, string> = {}, payload = body) {
  return new Request("https://preview.example.invalid/api/project-invite", {
    method: "POST",
    body: payload,
    headers: {
      origin: "https://preview.example.invalid",
      host: "preview.example.invalid",
      "content-type": "application/json",
      ...headers,
    },
  });
}
for (
  const [name, headers, payload, code] of [
    ["foreign origin", { origin: "https://attacker.invalid" }, body, 403],
    ["missing origin", { origin: "" }, body, 403],
    ["cross-site", { "sec-fetch-site": "cross-site" }, body, 403],
    [
      "invalid action",
      {},
      JSON.stringify({ action: "proxy", token: "a".repeat(64) }),
      400,
    ],
    ["oversized", {}, "a".repeat(8193), 413],
  ] as const
) {
  Deno.test(`relay rejects ${name} without sending`, async () => {
    let calls = 0;
    const response = await handleInviteRelay(
      request(headers, payload),
      env,
      (() => {
        calls++;
        throw new Error("unexpected");
      }) as typeof fetch,
    );
    assert(response.status === code && calls === 0);
  });
}
Deno.test("server signs fixed target, overwrites caller context, cookie stabilizes IP-free visitor", async () => {
  const peers: string[] = [], nonces: string[] = [];
  const send = (async (target: RequestInfo | URL, init?: RequestInit) => {
    assert(
      String(target) ===
        `https://${RELAY_PROJECT}.supabase.co/functions/v1/project-invite`,
    );
    const upstream = new Request(target, init);
    assert(
      !upstream.headers.has("authorization") &&
        !upstream.headers.has("cookie") &&
        !upstream.headers.has("x-forwarded-for"),
    );
    const signed = await verifyRelay(
      upstream,
      String(init?.body),
      RELAY_PROJECT,
      secret,
    );
    assert(signed);
    peers.push(signed!.peerHash);
    nonces.push(signed!.nonce);
    return Response.json({ ok: true }, { headers: { "set-cookie": "evil=1" } });
  }) as typeof fetch;
  const response = await handleInviteRelay(
    request({
      "x-sr-signature": "forged",
      "x-sr-peer": "forged",
      "x-forwarded-for": "1.2.3.4",
    }),
    env,
    send,
  );
  const cookie = response.headers.get("set-cookie")!;
  assert(
    cookie.includes("HttpOnly") && cookie.includes("Secure") &&
      cookie.includes("SameSite=Strict") && !cookie.includes(secret),
  );
  assert(!cookie.includes("evil"));
  await handleInviteRelay(request({ cookie: cookie.split(";")[0] }), env, send);
  await handleInviteRelay(
    request({ cookie: cookie.split(";")[0].replace(/.$/, "0") + "x" }),
    env,
    send,
  );
  assert(
    peers[0] === peers[1] && peers[1] !== peers[2] &&
      new Set(nonces).size === 3,
  );
  assert(!JSON.stringify(await response.json()).includes(secret));
});
Deno.test("local relay config cannot be inherited on a Vercel deployment", () => {
  const local = {
    ...env,
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    SR_INVITE_RELAY_PROJECT_REF: LOCAL_RELAY_PROJECT,
    VERCEL: "",
  };
  assert(relayConfig(local).local);
  let denied = false;
  try {
    relayConfig({ ...local, VERCEL: "1" });
  } catch {
    denied = true;
  }
  assert(denied);
});
