// Stage 2 B2 live smoke test for the rebuilt Edge Functions and the B2
// migrations, against the LOCAL stack only (target-guard). Run after
// `supabase db reset` + s2-seed.ts:
//
// deno run --allow-net --allow-env supabase/scripts/s2-smoke.ts
// Env: SUPABASE_URL, SUPABASE_ANON_KEY, S2_BUYER_PASSWORD, S2_SUPPLIER_PASSWORD
//
// Creates only [S2-TEST] rows / s2-*@s2-test.invalid accounts. Exit 1 on any failure.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { checkSeedTarget } from "./target-guard.ts";
import { S2 } from "./s2-seed.ts";

type Check = { name: string; ok: boolean; detail?: unknown };
const checks: Check[] = [];

function record(name: string, ok: boolean, detail?: unknown) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail === undefined ? "" : `  ${JSON.stringify(detail)}`}`);
}

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing env ${name}`);
  return value;
}

const URL_BASE = env("SUPABASE_URL");
const ANON = env("SUPABASE_ANON_KEY");
const ORIGIN = "http://localhost:3000";

function anonClient(): SupabaseClient {
  return createClient(URL_BASE, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function signIn(email: string, password: string): Promise<{ client: SupabaseClient; token: string; id: string }> {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`sign in ${email}: ${error?.message}`);
  return { client, token: data.session.access_token, id: data.user.id };
}

async function callFunction(name: string, body: unknown, accessToken?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: ANON, Origin: ORIGIN };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${URL_BASE}/functions/v1/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: response.status, json, cors: response.headers.get("access-control-allow-origin") };
}

async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function upload(
  user: { token: string },
  roomId: string,
  fileName: string,
  mime: string,
  bytes: Uint8Array<ArrayBuffer>,
) {
  const objectPath = `${roomId}/${crypto.randomUUID()}/${fileName}`;
  const response = await fetch(`${URL_BASE}/storage/v1/object/room-files/${objectPath}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${user.token}`, apikey: ANON, "Content-Type": mime, "x-upsert": "false" },
    body: bytes,
  });
  await response.body?.cancel();
  return { objectPath, status: response.status };
}

async function register(
  user: { client: SupabaseClient },
  roomId: string,
  orgId: string,
  objectPath: string,
  fileName: string,
  mime: string,
  size: number,
  sha: string,
) {
  return await user.client.rpc("register_room_file_version", {
    p_room_id: roomId,
    p_object_path: objectPath,
    p_file_name: fileName,
    p_mime_type: mime,
    p_size_bytes: size,
    p_sha256: sha,
    p_actor_organization_id: orgId,
    p_client_msg_id: crypto.randomUUID(),
    p_caption: "[S2-TEST] smoke",
  });
}

async function main() {
  const refusal = checkSeedTarget(URL_BASE);
  if (refusal) throw new Error(refusal);
  const stamp = Date.now();

  const buyer = await signIn(S2.buyerEmail, env("S2_BUYER_PASSWORD"));
  const supplier = await signIn(S2.supplierEmail, env("S2_SUPPLIER_PASSWORD"));
  record("seeded buyer and supplier sign in with email/password", true);

  // --- B2 config / migration assertions ---
  const signUp = await anonClient().auth.signUp({
    email: `s2-signup-${stamp}@s2-test.invalid`,
    password: "S2-test-0123456789",
  });
  record("public signup is disabled", Boolean(signUp.error), signUp.error?.message);

  const claim = await supplier.client.rpc("claim_p1_demo_role", { p_role: "buyer" });
  record("claim_p1_demo_role is not executable by authenticated", Boolean(claim.error), claim.error?.message);

  const supplierRooms = await supplier.client.from("rooms").select("id");
  const visible = (supplierRooms.data ?? []).map((r: { id: string }) => r.id);
  record(
    "supplier sees the shared room but not the buyer-internal room",
    visible.includes(S2.sharedRoom) && !visible.includes(S2.internalRoom),
    visible,
  );

  // --- project-invite ---
  const inviteeEmail = `s2-invitee-${stamp}@s2-test.invalid`;
  const created = await buyer.client.rpc("create_supplier_room_invite", {
    p_project_id: S2.project,
    p_supplier_organization_name: `[S2-TEST] Invited Supplier ${stamp}`,
    p_invited_email: inviteeEmail,
    p_expires_in_hours: 24,
  });
  if (created.error) throw new Error(`create_supplier_room_invite: ${created.error.message}`);
  const token = String((created.data as Record<string, unknown>).token);
  const invitedRoom = String((created.data as Record<string, unknown>).room_id);

  const bad = await callFunction("project-invite", { action: "preview", token: "f".repeat(64) });
  record("preview of unknown token is refused", bad.status === 404 && bad.json.ok === false, bad.status);

  const preview = await callFunction("project-invite", { action: "preview", token });
  // Local Kong replaces the function's origin allowlist header with "*".
  // These requests send no cookies, so either value permits the browser call.
  const allowsOrigin = (origin: string | null) => origin === ORIGIN || origin === "*";
  const preflight = await fetch(`${URL_BASE}/functions/v1/project-invite`, {
    method: "OPTIONS",
    headers: {
      Origin: ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "apikey,content-type",
    },
  });
  const allowedHeaders = (preflight.headers.get("access-control-allow-headers") ?? "").toLowerCase().split(",")
    .map((header) => header.trim());
  const allowedMethods = (preflight.headers.get("access-control-allow-methods") ?? "").toUpperCase().split(",")
    .map((method) => method.trim());
  await preflight.body?.cancel();
  record(
    "preview returns project/room/invited email (+CORS for localhost)",
    preview.status === 200 && preview.json.ok === true && preview.json.invitedEmail === inviteeEmail &&
      allowsOrigin(preview.cors) && preflight.ok &&
      allowsOrigin(preflight.headers.get("access-control-allow-origin")) && allowedMethods.includes("POST") &&
      ["apikey", "content-type"].every((header) => allowedHeaders.includes(header)),
    {
      status: preview.status,
      room: (preview.json.room as Record<string, unknown> | undefined)?.name,
      cors: preview.cors,
      preflight: preflight.status,
      allowedHeaders,
    },
  );

  const mismatch = await callFunction("project-invite", {
    action: "bootstrap",
    token,
    email: `other-${stamp}@s2-test.invalid`,
    password: "S2-test-0123456789",
  });
  record("bootstrap with a different email is refused", mismatch.status === 403, mismatch.status);

  const inviteePassword = `S2-test-${crypto.randomUUID()}`;
  const boot = await callFunction("project-invite", {
    action: "bootstrap",
    token,
    email: inviteeEmail,
    password: inviteePassword,
    displayName: "[S2-TEST] Invitee",
  });
  record("bootstrap responds uniformly before invitee signs in", boot.status === 200 && JSON.stringify(boot.json) === JSON.stringify({ ok: true }), boot.json);

  const again = await callFunction("project-invite", {
    action: "bootstrap",
    token,
    email: inviteeEmail,
    password: "S2-test-different-pw",
  });
  record("second bootstrap returns the same status/body without an existence flag", again.status === boot.status && JSON.stringify(again.json) === JSON.stringify(boot.json));

  const invitee = await signIn(inviteeEmail, inviteePassword);
  record("invitee signs in with the original password", true);

  const claimed = await invitee.client.rpc("claim_project_invite", { p_token: token });
  const actingOrg = (claimed.data as Record<string, unknown> | null)?.acting_organization_id;
  record(
    "claim_project_invite returns the acting organization",
    !claimed.error && Boolean(actingOrg),
    claimed.error?.message,
  );

  const used = await callFunction("project-invite", { action: "preview", token });
  record("preview of a used invite is refused", used.status === 410, used.status);

  const inviteeRooms = await invitee.client.from("rooms").select("id");
  const inviteeVisible = (inviteeRooms.data ?? []).map((r: { id: string }) => r.id);
  record(
    "invitee sees only the invited room",
    inviteeVisible.length === 1 && inviteeVisible[0] === invitedRoom,
    inviteeVisible,
  );

  // --- room-file-gateway ---
  const noJwt = await callFunction("room-file-gateway", { action: "verify", fileVersionId: crypto.randomUUID() });
  record("gateway without a user JWT is refused", noJwt.status === 401, noJwt.status);

  const pdf = new TextEncoder().encode(`%PDF-1.4\n% [S2-TEST] smoke ${stamp}\n%%EOF\n`) as Uint8Array<ArrayBuffer>;
  const pdfSha = await sha256Hex(pdf);
  const good = await upload(supplier, S2.sharedRoom, "s2-quote.pdf", "application/pdf", pdf);
  const goodReg = await register(
    supplier,
    S2.sharedRoom,
    S2.supplierOrg,
    good.objectPath,
    "s2-quote.pdf",
    "application/pdf",
    pdf.length,
    pdfSha,
  );
  const goodId = String(((goodReg.data as Record<string, unknown> | null)?.file as Record<string, unknown>)?.id ?? "");
  record("supplier uploads and registers a PDF", good.status === 200 && !goodReg.error && Boolean(goodId), {
    upload: good.status,
    error: goodReg.error?.message,
  });

  const verify = await callFunction("room-file-gateway", { action: "verify", fileVersionId: goodId }, supplier.token);
  record(
    "verify marks a genuine PDF verified with the server hash",
    verify.json.verificationStatus === "verified" && verify.json.serverSha256 === pdfSha,
    verify.json,
  );

  const sign = await callFunction("room-file-gateway", { action: "sign", fileVersionId: goodId }, buyer.token);
  let downloadedSha = "";
  if (sign.json.ok && typeof sign.json.signedUrl === "string") {
    const got = await fetch(sign.json.signedUrl);
    downloadedSha = await sha256Hex(new Uint8Array(await got.arrayBuffer()));
  }
  record("buyer (room member) downloads the verified file via signed URL", downloadedSha === pdfSha, {
    status: sign.status,
    host: typeof sign.json.signedUrl === "string" ? new URL(sign.json.signedUrl).host : null,
  });

  const outsider = await callFunction("room-file-gateway", { action: "sign", fileVersionId: goodId }, invitee.token);
  record("non-member cannot sign the file", outsider.status === 404, outsider.status);

  const disguised = await upload(supplier, S2.sharedRoom, "s2-photo.png", "image/png", pdf);
  const disguisedReg = await register(
    supplier,
    S2.sharedRoom,
    S2.supplierOrg,
    disguised.objectPath,
    "s2-photo.png",
    "image/png",
    pdf.length,
    pdfSha,
  );
  const disguisedId = String(
    ((disguisedReg.data as Record<string, unknown> | null)?.file as Record<string, unknown>)?.id ?? "",
  );
  const quarantine = await callFunction(
    "room-file-gateway",
    { action: "verify", fileVersionId: disguisedId },
    supplier.token,
  );
  record(
    "PDF bytes declared as PNG are quarantined",
    quarantine.json.verificationStatus === "quarantined",
    quarantine.json,
  );
  const signQuarantined = await callFunction(
    "room-file-gateway",
    { action: "sign", fileVersionId: disguisedId },
    supplier.token,
  );
  record("quarantined file cannot be signed", signQuarantined.status === 409, signQuarantined.status);

  const lied = await upload(supplier, S2.sharedRoom, "s2-lied.pdf", "application/pdf", pdf);
  const liedReg = await register(
    supplier,
    S2.sharedRoom,
    S2.supplierOrg,
    lied.objectPath,
    "s2-lied.pdf",
    "application/pdf",
    pdf.length,
    "0".repeat(64),
  );
  const liedId = String(((liedReg.data as Record<string, unknown> | null)?.file as Record<string, unknown>)?.id ?? "");
  const mismatchVerify = await callFunction(
    "room-file-gateway",
    { action: "verify", fileVersionId: liedId },
    supplier.token,
  );
  record(
    "wrong client hash yields hash_mismatch",
    mismatchVerify.json.verificationStatus === "hash_mismatch",
    mismatchVerify.json,
  );

  const orphan = await upload(supplier, S2.sharedRoom, "s2-orphan.pdf", "application/pdf", pdf);
  const notOwner = await callFunction(
    "room-file-gateway",
    { action: "cleanup_orphan", objectPath: orphan.objectPath, roomId: S2.sharedRoom },
    buyer.token,
  );
  record("another room member cannot delete someone else's orphan", notOwner.status === 403, notOwner.json);
  const cleanup = await callFunction(
    "room-file-gateway",
    { action: "cleanup_orphan", objectPath: orphan.objectPath, roomId: S2.sharedRoom },
    supplier.token,
  );
  record("uploader removes their own unregistered upload", cleanup.json.removed === true, cleanup.json);
  const registeredCleanup = await callFunction(
    "room-file-gateway",
    { action: "cleanup_orphan", objectPath: good.objectPath, roomId: S2.sharedRoom },
    supplier.token,
  );
  record("registered files cannot be cleaned up", registeredCleanup.status === 409, registeredCleanup.status);

  const failed = checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ total: checks.length, passed: checks.length - failed.length, failed: failed.length }));
  if (failed.length) Deno.exit(1);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  });
}
