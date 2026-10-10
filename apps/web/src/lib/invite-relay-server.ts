import {
  digestHex, LOCAL_RELAY_PROJECT, mac, randomNonce, readRelayBody, RELAY_BRANCH,
  RELAY_PATH, RELAY_PROJECT, signRelay, verifyMac,
} from "../../../../supabase/functions/_shared/invite-relay";

type Environment = Record<string, string | undefined>;
const COOKIE = "sr_invite_visitor";
const COOKIE_SECONDS = 600;
function reply(status: number, error: string) {
  return Response.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}

export function relayConfig(env: Environment) {
  const backend = new URL(env.NEXT_PUBLIC_SUPABASE_URL || "https://example.invalid");
  const local = !env.VERCEL && backend.origin === "http://127.0.0.1:54321";
  if (backend.pathname !== "/" || backend.search || backend.hash || backend.username || backend.password ||
    (!local && (backend.origin !== `https://${RELAY_PROJECT}.supabase.co` ||
      env.VERCEL !== "1" || env.VERCEL_ENV !== "preview" || env.VERCEL_GIT_COMMIT_REF !== RELAY_BRANCH)) ||
    env.SR_INVITE_RELAY_PROJECT_REF !== (local ? LOCAL_RELAY_PROJECT : RELAY_PROJECT) ||
    !/^[0-9a-f]{64}$/.test(env.SR_INVITE_RELAY_SECRET || "")) throw new Error("relay_config_invalid");
  return { backend, local, project: local ? LOCAL_RELAY_PROJECT : RELAY_PROJECT, secret: env.SR_INVITE_RELAY_SECRET! };
}

// Platform SSO protects this same-origin route. These checks do not substitute
// for SSO: they confine configuration and prevent cross-origin browser signing.
export async function handleInviteRelay(req: Request, env: Environment, send: typeof fetch = fetch): Promise<Response> {
  let config;
  try { config = relayConfig(env); } catch { return reply(503, "Invitation service is temporarily unavailable."); }
  // Next's internal Request URL may use localhost even when the browser uses
  // 127.0.0.1. Validate the actual Host against a fixed local/deployment origin.
  const origin = `${config.local ? "http" : "https"}://${req.headers.get("host")}`;
  if (config.local && !["http://127.0.0.1:3000", "http://localhost:3000"].includes(origin)) return reply(403, "request_denied");
  if (!config.local && origin !== `https://${env.VERCEL_URL}`) return reply(403, "request_denied");
  if (req.method !== "POST" || req.headers.get("origin") !== origin ||
    req.headers.get("content-type")?.split(";")[0].trim() !== "application/json" ||
    (req.headers.has("sec-fetch-site") && req.headers.get("sec-fetch-site") !== "same-origin")) return reply(403, "request_denied");
  const body = await readRelayBody(req);
  if (body === null) return reply(413, "request_too_large");
  let data;
  try { data = JSON.parse(body); } catch { return reply(400, "invalid_request"); }
  if (!data || Array.isArray(data) || !["preview", "bootstrap"].includes(data.action) ||
    typeof data.token !== "string" || !/^[0-9a-f]{64}$/.test(data.token)) return reply(400, "invalid_request");

  const now = Math.floor(Date.now() / 1000);
  const cookieValue = req.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  let visitor = randomNonce(), issued = String(now);
  if (cookieValue) {
    const parts = cookieValue.split(".");
    if (parts.length === 3 && /^[0-9a-f]{32}$/.test(parts[0]) && /^\d{10}$/.test(parts[1]) &&
      now >= Number(parts[1]) && now - Number(parts[1]) < COOKIE_SECONDS &&
      await verifyMac(config.secret, `SR-INVITE-VISITOR-V1\n${config.project}\n${parts[0]}\n${parts[1]}`, parts[2])) {
      [visitor, issued] = parts;
    }
  }
  const visitorMac = await mac(config.secret, `SR-INVITE-VISITOR-V1\n${config.project}\n${visitor}\n${issued}`);
  const envelope = { project: config.project, timestamp: String(now), nonce: randomNonce(),
    peerHash: await digestHex(`SR-INVITE-VISITOR-V1\n${config.project}\n${visitor}`) };
  try {
    const upstream = await send(new URL(RELAY_PATH, config.backend), {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", ...await signRelay(body, envelope, config.secret) }, body,
    });
    // Allow only the established JSON contract, never upstream cookies/headers.
    const result = await upstream.json();
    return Response.json(result, { status: upstream.status, headers: {
      "Cache-Control": "no-store", "Set-Cookie": `${COOKIE}=${visitor}.${issued}.${visitorMac}; Path=/api/project-invite; HttpOnly; SameSite=Strict; Max-Age=${Math.max(1, COOKIE_SECONDS - (now - Number(issued)))}${config.local ? "" : "; Secure"}`,
    } });
  } catch { return reply(502, "Invitation service is temporarily unavailable. Please retry."); }
}
