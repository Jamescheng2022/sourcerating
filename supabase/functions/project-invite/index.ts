// project-invite — rebuilt 2026-10-10 from the client contract
// (apps/web/src/app/join/page.tsx, apps/android-native ApiClient.joinInvite)
// and migration 202609260007_pilot_invites.sql. The deployed original was not used.
//
// POST { action: "preview", token }
//   -> 200 { ok, project{id,name,code}, organization{id,name}, room{id,name,kind},
//            invitedRole, invitedEmail, expiresAt }
// POST { action: "bootstrap", token, email, password, displayName? }
//   -> 200 { ok: true } uniformly (prepares a confirmed account when allowed;
//      never changes an existing account or discloses its existence). Then sign in and call
//      the claim_project_invite RPC, which performs the membership change.
//
// Hosted preview/bootstrap require a signed server relay (no user JWT), so verify_jwt = false in
// supabase/config.toml. Authorization is possession of a valid, unused,
// unexpired, unrevoked, email-bound invite token. The nominated address is fixed;
// this pilot preparation flow does not prove that the invitee controls its inbox.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  corsHeaders,
  json,
  requireEnv,
  sha256Hex,
} from "../_shared/http.ts";
import {
  bootstrapPeerAddress,
  checkBootstrapInput,
  type InviteRow,
  inviteState,
  isEmailExistsError,
  isWellFormedToken,
} from "../_shared/invite.ts";
import { digestHex, LOCAL_RELAY_PROJECT, readRelayBody, RELAY_PROJECT, verifyRelay } from "../_shared/invite-relay.ts";

const INVALID_INVITE = "Invitation is invalid or expired.";
const BOOTSTRAP_AUDIT_ACTION = "project_invite.account_bootstrapped";

Deno.serve(async (req, info) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405, cors);
  }

  const internalUrl = new URL(requireEnv("SUPABASE_URL"));
  const local = internalUrl.protocol === "http:" && ["kong", "127.0.0.1", "localhost"].includes(internalUrl.hostname);
  const rawBody = await readRelayBody(req);
  if (rawBody === null) return json({ ok: false, error: "request_too_large" }, 413, cors);
  let relay = null;
  if (!local || req.headers.has("x-sr-signature")) {
    const expectedProject = local ? LOCAL_RELAY_PROJECT : RELAY_PROJECT;
    if ((!local && internalUrl.origin !== `https://${RELAY_PROJECT}.supabase.co`) ||
      Deno.env.get("SR_INVITE_RELAY_PROJECT_REF") !== expectedProject) {
      return json({ ok: false, error: "relay_config_invalid" }, 503, cors);
    }
    try {
      relay = await verifyRelay(req, rawBody, expectedProject, requireEnv("SR_INVITE_RELAY_SECRET"));
    } catch { return json({ ok: false, error: "relay_config_invalid" }, 503, cors); }
    if (!relay) return json({ ok: false, error: "relay_denied" }, 401, cors);
  }
  let body: Record<string, unknown> | null;
  try { body = JSON.parse(rawBody || "null"); } catch { return json({ ok: false, error: "invalid_request" }, 400, cors); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ ok: false, error: "invalid_request" }, 400, cors);

  const action = body.action;
  if (action !== "preview" && action !== "bootstrap") {
    return json({ ok: false, error: "invalid_action" }, 400, cors);
  }
  if (!isWellFormedToken(body.token)) {
    return json({ ok: false, error: INVALID_INVITE }, 404, cors);
  }

  let admin;
  try {
    admin = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "server_config_missing" }, 500, cors);
  }

  if (relay) {
    const { data: fresh, error } = await admin.rpc("consume_invite_relay_nonce", {
      p_project_ref: relay.project, p_nonce_hash: await digestHex(relay.nonce),
      p_timestamp: Number(relay.timestamp),
    });
    if (error) return json({ ok: false, error: "relay_unavailable" }, 503, cors);
    if (!fresh) return json({ ok: false, error: "relay_replay_denied" }, 401, cors);
  }
  const tokenHash = await sha256Hex(body.token);
  const { data: invite, error: inviteError } = await admin
    .from("project_invites")
    .select(
      "id, project_id, room_id, target_organization_id, invited_role, invited_email, expires_at, used_at, revoked_at",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle<InviteRow>();

  if (inviteError) {
    console.error("invite lookup failed", inviteError.message);
    return json({ ok: false, error: "invite_lookup_failed" }, 500, cors);
  }
  const state = inviteState(invite, new Date());
  if (state !== "ok" || !invite) {
    return json(
      { ok: false, error: INVALID_INVITE },
      state === "not_found" ? 404 : 410,
      cors,
    );
  }

  if (!invite.invited_email) {
    return json({ ok: false, error: "Email-bound invitation required. Ask the buyer for a new link." }, 403, cors);
  }

  if (action === "preview") {
    const [project, organization, room] = await Promise.all([
      admin.from("projects").select("id, name, code").eq(
        "id",
        invite.project_id,
      ).maybeSingle(),
      admin.from("organizations").select("id, name").eq(
        "id",
        invite.target_organization_id,
      ).maybeSingle(),
      admin.from("rooms").select("id, name, kind").eq("id", invite.room_id)
        .maybeSingle(),
    ]);
    if (
      project.error || organization.error || room.error || !project.data ||
      !room.data
    ) {
      return json({ ok: false, error: INVALID_INVITE }, 410, cors);
    }
    return json(
      {
        ok: true,
        project: project.data,
        organization: organization.data ??
          { id: invite.target_organization_id },
        room: room.data,
        invitedRole: invite.invited_role,
        invitedEmail: invite.invited_email,
        expiresAt: invite.expires_at,
      },
      200,
      cors,
    );
  }

  // action === "bootstrap"
  const replyNotBefore = performance.now() + 600 +
    crypto.getRandomValues(new Uint8Array(1))[0];
  const preparedResponse = async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, replyNotBefore - performance.now()))
    );
    return json({ ok: true }, 200, cors);
  };
  // The MAC authenticates hosted visitor context. No IP/XFF trust list.
  // Unsigned loopback calls preserve the proven local/native path only.
  const localPeer = local ? bootstrapPeerAddress(info, req.headers) : null;
  const peerHash = relay?.peerHash ?? (localPeer ? await sha256Hex(localPeer) : null);
  if (!peerHash) return json({ ok: false, error: "Invitation service is temporarily unavailable." }, 503, cors);
  const { data: attemptAllowed, error: attemptError } = await admin.rpc(
    "consume_invite_bootstrap_attempt",
    {
      p_invite_id: invite.id,
      p_peer_hash: peerHash,
    },
  );
  if (attemptError) {
    console.error("bootstrap attempt limiter failed", attemptError.code);
    return json({ ok: false, error: "invite_lookup_failed" }, 500, cors);
  }
  if (!attemptAllowed) {
    return json(
      { ok: false, error: "Too many attempts. Please try again later." },
      429,
      cors,
    );
  }
  const checked = checkBootstrapInput(body, invite);
  if (!checked.ok) {
    return json({ ok: false, error: checked.error }, checked.status, cors);
  }
  const { email, password, displayName } = checked.value;

  const { data: reserved, error: reservationError } = await admin.rpc(
    "reserve_invite_bootstrap",
    {
      p_invite_id: invite.id,
    },
  );
  if (reservationError) {
    console.error("bootstrap reservation failed", reservationError.message);
    return json({ ok: false, error: "invite_lookup_failed" }, 500, cors);
  }
  if (!reserved) {
    return preparedResponse();
  }

  const { data: created, error: createError } = await admin.auth.admin
    .createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: displayName ? { display_name: displayName } : {},
    });

  if (createError) {
    if (!isEmailExistsError(createError)) {
      console.error("createUser preparation failed", createError.code);
    }
    return preparedResponse();
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_user_id: created.user?.id ?? null,
    project_id: invite.project_id,
    room_id: invite.room_id,
    action: BOOTSTRAP_AUDIT_ACTION,
    target_type: "project_invite",
    target_id: invite.id,
    metadata: {
      email_bound: Boolean(invite.invited_email),
      display_name_set: Boolean(displayName),
    },
  });
  if (auditError) {
    console.error("bootstrap audit insert failed", auditError.message);
  }

  return preparedResponse();
});
