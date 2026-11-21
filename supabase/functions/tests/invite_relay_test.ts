import {
  digestHex,
  LOCAL_RELAY_PROJECT,
  mac,
  randomNonce,
  readRelayBody,
  RELAY_PATH,
  RELAY_PROJECT,
  signRelay,
  verifyRelay,
} from "../_shared/invite-relay.ts";
const secret = "ab".repeat(32); // synthetic test vector, never a configured secret
const body = JSON.stringify({ action: "preview", token: "a".repeat(64) });
const now = 1800000000;
const envelope = {
  project: RELAY_PROJECT,
  timestamp: String(now),
  nonce: "a".repeat(32),
  peerHash: "b".repeat(64),
};
function assert(value: unknown) {
  if (!value) throw new Error("assertion failed");
}

Deno.test("HMAC-SHA256 matches an independently computed Node/OpenSSL vector", async () => {
  assert(
    await mac("00".repeat(32), "test") ===
      "43b0cef99265f9e34c10ea9d3501926d27b39f57c6d674561d8ba236e7a819fb",
  );
});

Deno.test("valid relay signature authenticates exact body and visitor context", async () => {
  const headers = await signRelay(body, envelope, secret);
  const req = new Request("https://example.invalid" + RELAY_PATH, {
    method: "POST",
    headers,
    body,
  });
  assert(await verifyRelay(req, body, RELAY_PROJECT, secret, now));
  const stripped = new Request("https://example.invalid/project-invite", {
    method: "POST",
    headers,
    body,
  });
  assert(await verifyRelay(stripped, body, RELAY_PROJECT, secret, now));
});

for (const field of ["project", "timestamp", "nonce", "peer"] as const) {
  Deno.test(`tampered ${field} denied`, async () => {
    const headers = await signRelay(body, envelope, secret);
    headers[`x-sr-${field}`] = field === "timestamp"
      ? String(now + 1)
      : "c".repeat(field === "nonce" ? 32 : 64);
    assert(
      !await verifyRelay(
        new Request("https://example.invalid" + RELAY_PATH, {
          method: "POST",
          headers,
        }),
        body,
        RELAY_PROJECT,
        secret,
        now,
      ),
    );
  });
}
for (
  const alteration of [
    "body",
    "method",
    "path",
    "query",
    "missing",
    "wrong-key",
    "expired",
    "future",
    "other-project",
    "local-project",
  ]
) {
  Deno.test(`relay ${alteration} denied`, async () => {
    const headers = await signRelay(body, envelope, secret);
    if (alteration === "missing") delete headers["x-sr-signature"];
    const req = new Request(
      "https://example.invalid" +
        (alteration === "path" ? "/other" : RELAY_PATH) +
        (alteration === "query" ? "?x=1" : ""),
      {
        method: alteration === "method" ? "GET" : "POST",
        headers,
      },
    );
    assert(
      !await verifyRelay(
        req,
        alteration === "body" ? body + " " : body,
        alteration === "other-project"
          ? "other"
          : alteration === "local-project"
          ? LOCAL_RELAY_PROJECT
          : RELAY_PROJECT,
        alteration === "wrong-key" ? "cd".repeat(32) : secret,
        alteration === "expired"
          ? now + 61
          : alteration === "future"
          ? now - 61
          : now,
      ),
    );
  });
}

Deno.test("bounded body rejects invalid UTF-8 and oversized/chunked requests", async () => {
  assert(
    await readRelayBody(
      new Request("https://example.invalid", {
        method: "POST",
        body: "a".repeat(8193),
      }),
    ) === null,
  );
  assert(
    await readRelayBody(
      new Request("https://example.invalid", {
        method: "POST",
        body: new Uint8Array([255]),
      }),
    ) === null,
  );
  assert(
    await readRelayBody(
      new Request("https://example.invalid", { method: "POST", body }),
    ) === body,
  );
});

Deno.test("nonce and digest wire formats are fixed", async () => {
  assert(/^[0-9a-f]{32}$/.test(randomNonce()));
  assert(/^[0-9a-f]{64}$/.test(await digestHex(body)));
});
