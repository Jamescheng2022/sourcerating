// project-invite — rebuilt 2026-10-10 from the client contract
// (apps/web/src/app/join/page.tsx, apps/android-native ApiClient.joinInvite)
// and migration 202609260007_pilot_invites.sql. The deployed original was not used.
//
// POST { action: "preview", token }
//   -> 200 { ok, project{id,name,code}, organization{id,name}, room{id,name,kind},
//            invitedRole, invitedEmail, expiresAt }
// POST { action: "bootstrap", token, email, password, displayName? }
//   -> 200 { ok, accountExists }  (creates a confirmed account if none exists;
//      never changes an existing account). The client then signs in and calls
//      the claim_project_invite RPC, which performs the membership change.
//
// Called with the anon apikey only (no user JWT), so verify_jwt = false in
// supabase/config.toml. Authorization is possession of a valid, unused,
// unexpired, unrevoked invite token.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { corsHeaders, json, readJsonObject, requireEnv, sha256Hex } from "../_shared/http.ts";
import {
  checkBootstrapInput,
  type InviteRow,
  inviteState,
  isEmailExistsError,
  isWellFormedToken,
  MAX_UNBOUND_BOOTSTRAPS,
} from "../_shared/invite.ts";

const INVALID_INVITE = "Invitation is invalid or expired.";
const BOOTSTRAP_AUDIT_ACTION = "project_invite.account_bootstrapped";

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, cors);

  const body = await readJsonObject(req);
  if (!body) return json({ ok: false, error: "invalid_request" }, 400, cors);

  const action = body.action;
  if (action !== "preview" && action !== "bootstrap") {
    return json({ ok: false, error: "invalid_action" }, 400, cors);
  }
  if (!isWellFormedToken(body.token)) return json({ ok: false, error: INVALID_INVITE }, 404, cors);

  let admin;
  try {
    admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "server_config_missing" }, 500, cors);
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
    return json({ ok: false, error: INVALID_INVITE }, state === "not_found" ? 404 : 410, cors);
  }

  if (action === "preview") {
    const [project, organization, room] = await Promise.all([
      admin.from("projects").select("id, name, code").eq("id", invite.project_id).maybeSingle(),
      admin.from("organizations").select("id, name").eq("id", invite.target_organization_id).maybeSingle(),
      admin.from("rooms").select("id, name, kind").eq("id", invite.room_id).maybeSingle(),
    ]);
    if (project.error || organization.error || room.error || !project.data || !room.data) {
      return json({ ok: false, error: INVALID_INVITE }, 410, cors);
    }
    return json(
      {
        ok: true,
        project: project.data,
        organization: organization.data ?? { id: invite.target_organization_id },
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
  const checked = checkBootstrapInput(body, invite);
  if (!checked.ok) return json({ ok: false, error: checked.error }, checked.status, cors);
  const { email, password, displayName } = checked.value;

  if (!invite.invited_email) {
    // An invite without a bound email must not become an account factory.
    const { count, error: countError } = await admin
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("action", BOOTSTRAP_AUDIT_ACTION)
      .eq("target_id", invite.id);
    if (countError) {
      console.error("bootstrap count failed", countError.message);
      return json({ ok: false, error: "invite_lookup_failed" }, 500, cors);
    }
    if ((count ?? 0) >= MAX_UNBOUND_BOOTSTRAPS) {
      return json({ ok: false, error: "This invitation cannot create more accounts." }, 429, cors);
    }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: displayName ? { display_name: displayName } : {},
  });

  if (createError) {
    if (isEmailExistsError(createError)) {
      return json({ ok: true, accountExists: true }, 200, cors);
    }
    console.error("createUser failed", createError.message);
    return json({ ok: false, error: "Unable to prepare your account." }, 500, cors);
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    actor_user_id: created.user?.id ?? null,
    project_id: invite.project_id,
    room_id: invite.room_id,
    action: BOOTSTRAP_AUDIT_ACTION,
    target_type: "project_invite",
    target_id: invite.id,
    metadata: { email_bound: Boolean(invite.invited_email), display_name_set: Boolean(displayName) },
  });
  if (auditError) console.error("bootstrap audit insert failed", auditError.message);

  return json({ ok: true, accountExists: false }, 200, cors);
});
