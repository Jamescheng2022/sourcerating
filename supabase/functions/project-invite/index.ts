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

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok:false, error:"method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ ok:false, error:"server_config_missing" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const action = body?.action === "bootstrap" ? "bootstrap" : "preview";

  if (token.length < 32 || token.length > 256) {
    return json({ ok:false, error:"invalid_invite_token" }, 400);
  }

  const tokenHash = await sha256Hex(token);
  const { data: invite, error: inviteError } = await admin
    .from("project_invites")
    .select("id,project_id,room_id,target_organization_id,invited_role,invited_email,expires_at,used_at,revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (inviteError || !invite) return json({ ok:false, error:"invite_not_found" }, 404);
  if (invite.revoked_at) return json({ ok:false, error:"invite_revoked" }, 410);
  if (invite.used_at) return json({ ok:false, error:"invite_already_used" }, 410);
  if (new Date(invite.expires_at).getTime() <= Date.now()) return json({ ok:false, error:"invite_expired" }, 410);

  const [{ data: project }, { data: organization }, { data: room }] = await Promise.all([
    admin.from("projects").select("id,name,code").eq("id", invite.project_id).maybeSingle(),
    admin.from("organizations").select("id,name").eq("id", invite.target_organization_id).maybeSingle(),
    admin.from("rooms").select("id,name,kind").eq("id", invite.room_id).maybeSingle(),
  ]);

  if (action === "preview") {
    return json({
      ok: true,
      project: project || { id: invite.project_id },
      organization: organization || { id: invite.target_organization_id },
      room: room || { id: invite.room_id },
      invitedRole: invite.invited_role,
      invitedEmail: invite.invited_email || null,
      expiresAt: invite.expires_at,
    });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim().slice(0,120) : "";

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return json({ ok:false, error:"invalid_email" }, 400);
  }
  if (password.length < 10 || password.length > 128) {
    return json({ ok:false, error:"password_must_be_10_to_128_chars" }, 400);
  }
  if (invite.invited_email && String(invite.invited_email).toLowerCase() !== email) {
    return json({ ok:false, error:"invite_email_mismatch" }, 403);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName || undefined,
      source_rating_invite_id: invite.id,
      source_rating_role: invite.invited_role,
    },
  });

  if (createError) {
    const message = String(createError.message || "").toLowerCase();
    if (
      message.includes("already") ||
      message.includes("registered") ||
      message.includes("exists")
    ) {
      return json({
        ok: true,
        accountExists: true,
        email,
        project: project || { id: invite.project_id },
        organization: organization || { id: invite.target_organization_id },
        room: room || { id: invite.room_id },
      });
    }
    return json({ ok:false, error:"account_create_failed", detail:createError.message }, 500);
  }

  return json({
    ok: true,
    accountCreated: true,
    accountExists: false,
    userId: created.user?.id || null,
    email,
    project: project || { id: invite.project_id },
    organization: organization || { id: invite.target_organization_id },
    room: room || { id: invite.room_id },
  });
});
