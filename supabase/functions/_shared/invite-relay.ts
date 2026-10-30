// Pure Web Crypto protocol shared by the Next server and Supabase runtime.
// Never import this module with secret configuration into a client component.
export const RELAY_PROJECT = "fzrberkeoizarduwuisp";
export const LOCAL_RELAY_PROJECT = "sourcerating-l1-stage2";
export const RELAY_PATH = "/functions/v1/project-invite";
export const RELAY_BRANCH = "pilot/real-ai-acceptance-20261028";
export const RELAY_MAX_BYTES = 8192;
export const RELAY_MAX_AGE_SECONDS = 60;
const HEX64 = /^[0-9a-f]{64}$/;
const NONCE = /^[0-9a-f]{32}$/;
const encoder = new TextEncoder();

export async function digestHex(value: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(
    new Uint8Array(bytes),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function key(secret: string): Promise<CryptoKey> {
  if (!HEX64.test(secret)) throw new Error("relay_config_invalid");
  const bytes = Uint8Array.from(
    secret.match(/../g)!,
    (pair) => parseInt(pair, 16),
  );
  return await crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function mac(secret: string, message: string): Promise<string> {
  return hex(
    await crypto.subtle.sign(
      "HMAC",
      await key(secret),
      encoder.encode(message),
    ),
  );
}

export async function verifyMac(
  secret: string,
  message: string,
  signature: string,
): Promise<boolean> {
  if (!HEX64.test(signature)) return false;
  const bytes = Uint8Array.from(
    signature.match(/../g)!,
    (pair) => parseInt(pair, 16),
  );
  return await crypto.subtle.verify(
    "HMAC",
    await key(secret),
    bytes,
    encoder.encode(message),
  );
}

export type RelayEnvelope = {
  project: string;
  timestamp: string;
  nonce: string;
  peerHash: string;
};

async function canonical(
  body: string,
  envelope: RelayEnvelope,
): Promise<string> {
  return [
    "SR-INVITE-RELAY-V1",
    "POST",
    RELAY_PATH,
    await digestHex(body),
    envelope.project,
    envelope.timestamp,
    envelope.nonce,
    envelope.peerHash,
  ].join("\n");
}

export async function signRelay(
  body: string,
  envelope: RelayEnvelope,
  secret: string,
): Promise<Record<string, string>> {
  return {
    "x-sr-project": envelope.project,
    "x-sr-timestamp": envelope.timestamp,
    "x-sr-nonce": envelope.nonce,
    "x-sr-peer": envelope.peerHash,
    "x-sr-signature": await mac(secret, await canonical(body, envelope)),
  };
}

export async function verifyRelay(
  req: Request,
  body: string,
  expectedProject: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<RelayEnvelope | null> {
  const url = new URL(req.url);
  if (
    req.method !== "POST" ||
    ![RELAY_PATH, "/project-invite"].includes(url.pathname) || url.search
  ) return null;
  const envelope = {
    project: req.headers.get("x-sr-project") || "",
    timestamp: req.headers.get("x-sr-timestamp") || "",
    nonce: req.headers.get("x-sr-nonce") || "",
    peerHash: req.headers.get("x-sr-peer") || "",
  };
  if (
    envelope.project !== expectedProject ||
    !/^\d{10}$/.test(envelope.timestamp) ||
    Math.abs(now - Number(envelope.timestamp)) > RELAY_MAX_AGE_SECONDS ||
    !NONCE.test(envelope.nonce) || !HEX64.test(envelope.peerHash)
  ) return null;
  return await verifyMac(
      secret,
      await canonical(body, envelope),
      req.headers.get("x-sr-signature") || "",
    )
    ? envelope
    : null;
}

export function randomNonce(): string {
  return hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

// Read a bounded stream, rather than trusting the caller's Content-Length.
export async function readRelayBody(req: Request): Promise<string | null> {
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > RELAY_MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}
