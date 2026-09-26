import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ ok: false, error: "server_config_missing" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!token || token.length < 32 || token.length > 256) {
    return json({ ok: false, error: "invalid_invite_token" }, 400);
  }

  const tokenHash = await sha256Hex(token);
  const { data: invite, error: inviteError } = await admin
    .from("project_invites")
    .select(
      "id,project_id,room_id,target_organization_id,invited_role,invited_email,expires_at,used_at,revoked_at",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (inviteError || !invite) {
    return json({ ok: false, error: "invite_not_found" }, 404);
  }
  if (invite.revoked_at) return json({ ok: false, error: "invite_revoked" }, 410);
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return json({ ok: false, error: "invite_expired" }, 410);
  }
  if (invite.used_at) return json({ ok: false, error: "invite_already_used" }, 410);

  const [{ data: project }, { data: room }, { data: organization }] =
    await Promise.all([
      admin.from("projects").select("id,name,code").eq("id", invite.project_id).maybeSingle(),
      admin.from("rooms").select("id,name,kind").eq("id", invite.room_id).maybeSingle(),
      admin
        .from("organizations")
        .select("id,name")
        .eq("id", invite.target_organization_id)
        .maybeSingle(),
    ]);

  if (action === "preview") {
    return json({
      ok: true,
      project,
      room,
      organization,
      invitedRole: invite.invited_role,
      invitedEmail: invite.invited_email,
      expiresAt: invite.expires_at,
    });
  }

  if (action !== "bootstrap") {
    return json({ ok: false, error: "invalid_action" }, 400);
  }

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const displayName =
    typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 120) : "";

  if (!email || !email.includes("@")) {
    return json({ ok: false, error: "valid_email_required" }, 400);
  }
  if (password.length < 10 || password.length > 256) {
    return json({ ok: false, error: "password_length_invalid" }, 400);
  }
  if (invite.invited_email && invite.invited_email.toLowerCase() !== email) {
    return json({ ok: false, error: "invite_email_mismatch" }, 403);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName || email.split("@")[0],
      source_rating_invited: true,
    },
  });

  if (!createError && created.user) {
    return json({
      ok: true,
      accountExists: false,
      email,
    });
  }

  const duplicate =
    createError?.message?.toLowerCase().includes("already") ||
    createError?.message?.toLowerCase().includes("registered") ||
    createError?.status === 422;

  if (duplicate) {
    return json({
      ok: true,
      accountExists: true,
      email,
    });
  }

  return json(
    {
      ok: false,
      error: createError?.message || "account_bootstrap_failed",
    },
    500,
  );
});
