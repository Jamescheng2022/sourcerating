// B4 checklist 1/2/6: real local Auth, table RLS, storage and RPC authority tests.
// Run after s2-seed.ts. Env: SUPABASE_URL, SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY, S2_BUYER_PASSWORD, S2_SUPPLIER_PASSWORD,
// S2_PUBLIC_TABLES (JSON array from pg_tables, schema public; verifies full coverage).
// Creates only [S2-TEST] fixtures; never deletes data. Exit 1 on any failure.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { S2 } from "./s2-seed.ts";
import { checkSeedTarget } from "./target-guard.ts";
import { sha256Hex } from "../functions/_shared/http.ts";

type Result = { name: string; ok: boolean; denial: boolean };
type ApiError = { code?: string; message: string };
const checks: Result[] = [];
function record(name: string, ok: boolean, detail?: unknown, denial = false) {
  checks.push({ name, ok, denial });
  console.log(
    `${ok ? "PASS" : "FAIL"} ${denial ? "DENY" : "CONTROL"} ${name}${
      detail === undefined ? "" : ` ${JSON.stringify(detail)}`
    }`,
  );
}
function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing env ${name}`);
  return value;
}
function client(key = env("SUPABASE_ANON_KEY")) {
  return createClient(env("SUPABASE_URL"), key, { auth: { autoRefreshToken: false, persistSession: false } });
}
async function must<T extends { data: unknown; error: ApiError | null }>(
  label: string,
  op: PromiseLike<T>,
): Promise<NonNullable<T["data"]>> {
  const { data, error } = await op;
  if (error) throw new Error(`${label}: ${error.code} ${error.message}`);
  if (data === null || data === undefined) throw new Error(`${label}: missing response data`);
  return data as NonNullable<T["data"]>;
}
async function signIn(email: string, password: string) {
  const api = client();
  const auth = await must("sign in", api.auth.signInWithPassword({ email, password }));
  if (!auth.session || !auth.user) throw new Error("sign in returned no session");
  return { api, id: auth.user.id, jwt: auth.session.access_token };
}
type Actor = Awaited<ReturnType<typeof signIn>>;
function downloadResponse(actor: Actor, path: string) {
  return fetch(`${env("SUPABASE_URL")}/storage/v1/object/authenticated/room-files/${path}`, {
    headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: `Bearer ${actor.jwt}` },
  });
}
async function denyRpc(
  api: SupabaseClient,
  name: string,
  rpc: string,
  args: Record<string, unknown>,
  message?: string,
) {
  const { error } = await api.rpc(rpc, args);
  record(name, error?.code === "42501" && (!message || error.message === message), error, true);
}
async function denyRead(api: SupabaseClient, table: string, room: string, label: string) {
  const result = await api.from(table).select("*").eq(table === "rooms" ? "id" : "room_id", room);
  // Authenticated RLS should return a successful empty array, not a broken query.
  record(label, !result.error && result.data?.length === 0, result.error ?? { rows: result.data?.length }, true);
}
function eventArgs(room: string, org: string) {
  return {
    p_room_id: room,
    p_client_msg_id: crypto.randomUUID(),
    p_actor_organization_id: org,
    p_event_type: "message.posted",
    p_payload: { text: "[S2-TEST] B4 authorization fixture" },
  };
}
async function fixtureFile(actor: Actor, room: string, org: string, stamp: string) {
  const name = `s2-rls-${stamp}.pdf`;
  const path = `${room}/${crypto.randomUUID()}/${name}`;
  const bytes = new TextEncoder().encode(`%PDF-1.4\n% [S2-TEST] B4 ${stamp}\n%%EOF\n`);
  const sha = await sha256Hex(bytes);
  await must(
    "upload fixture",
    actor.api.storage.from("room-files").upload(path, bytes, { contentType: "application/pdf" }),
  );
  const args = {
    p_room_id: room,
    p_object_path: path,
    p_file_name: name,
    p_mime_type: "application/pdf",
    p_size_bytes: bytes.length,
    p_sha256: sha,
    p_actor_organization_id: org,
    p_client_msg_id: crypto.randomUUID(),
    p_caption: "[S2-TEST] B4 RLS control",
  };
  const registered = await must("register fixture", actor.api.rpc("register_room_file_version", args));
  if (!registered?.file?.id) throw new Error("file registration returned no id");
  const downloaded = await must("download fixture", actor.api.storage.from("room-files").download(path));
  if (await sha256Hex(new Uint8Array(await downloaded.arrayBuffer())) !== sha) {
    throw new Error("fixture download mismatch");
  }
  const response = await downloadResponse(actor, path);
  if (response.status !== 200 || await sha256Hex(new Uint8Array(await response.arrayBuffer())) !== sha) {
    throw new Error("raw storage positive control failed");
  }
  record(`authorized upload/register/download in ${room}`, true);
  return { id: registered.file.id as string, path, args };
}
async function main() {
  const refusal = checkSeedTarget(env("SUPABASE_URL"));
  if (refusal) throw new Error(refusal); // Never honors any remote-project override.
  const tables: string[] = JSON.parse(env("S2_PUBLIC_TABLES"));
  const expectedTables = [
    "audit_log",
    "canonical_objects",
    "event_outbox",
    "needs_you",
    "organization_memberships",
    "organizations",
    "project_inquiries",
    "project_invites",
    "project_participants",
    "projects",
    "room_context_projections",
    "room_events",
    "room_file_versions",
    "room_members",
    "rooms",
    "staging_proposals",
  ];
  if (JSON.stringify([...tables].sort()) !== JSON.stringify(expectedTables)) {
    throw new Error("public table coverage changed");
  }
  const stamp = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const admin = client(env("SUPABASE_SERVICE_ROLE_KEY"));
  const anon = client();
  const buyer = await signIn(S2.buyerEmail, env("S2_BUYER_PASSWORD"));
  const supplier = await signIn(S2.supplierEmail, env("S2_SUPPLIER_PASSWORD"));
  record("seeded buyer and supplier email/password sessions", buyer.id !== supplier.id);

  const outsiderEmail = `s2-outsider-${stamp}@s2-test.invalid`;
  const outsiderPassword = `S2-test-${crypto.randomUUID()}`;
  await must(
    "create isolated outsider",
    admin.auth.admin.createUser({
      email: outsiderEmail,
      password: outsiderPassword,
      email_confirm: true,
      user_metadata: { display_name: "[S2-TEST] B4 outsider" },
    }),
  );
  const outsider = await signIn(outsiderEmail, outsiderPassword);
  record("authenticated outsider has a real session", Boolean(outsider.id));
  const signup = await anon.auth.signUp({ email: `s2-public-${stamp}@s2-test.invalid`, password: outsiderPassword });
  record("public signup stays off", signup.error?.code === "signup_disabled", signup.error?.code, true);
  for (
    const [name, actor] of [["buyer", buyer.api], ["supplier", supplier.api], ["outsider", outsider.api], [
      "anon",
      anon,
    ]] as const
  ) {
    await denyRpc(actor, `${name} cannot self-claim a demo role`, "claim_p1_demo_role", { p_role: "buyer" });
  }

  // No room-name or kind filtering: the database must provide all isolation.
  const buyerRooms = await must("buyer rooms", buyer.api.from("rooms").select("id"));
  record(
    "buyer sees seeded internal and shared rooms with unfiltered RLS query",
    [S2.internalRoom, S2.sharedRoom].every((id) => buyerRooms.some((r) => r.id === id)),
  );
  const supplierRooms = await must("supplier rooms", supplier.api.from("rooms").select("id"));
  record(
    "supplier unfiltered room query returns only seeded shared room",
    supplierRooms.length === 1 && supplierRooms[0].id === S2.sharedRoom,
  );
  const buyerMemberships = await must(
    "buyer memberships",
    buyer.api.from("room_members").select("*").eq("user_id", buyer.id),
  );
  record(
    "buyer admin role and acting org correct in both seeded rooms",
    [S2.internalRoom, S2.sharedRoom].every((id) =>
      buyerMemberships.some((m) =>
        m.room_id === id && m.room_role === "admin" && m.acting_organization_id === S2.buyerOrg && !m.removed_at
      )
    ),
  );
  const supplierMemberships = await must(
    "supplier memberships",
    supplier.api.from("room_members").select("*").eq("user_id", supplier.id),
  );
  record(
    "supplier member role and acting org correct",
    supplierMemberships.length === 1 &&
      supplierMemberships[0].room_role === "member" && supplierMemberships[0].acting_organization_id === S2.supplierOrg,
  );

  const internalEvent = await must(
    "internal event",
    buyer.api.rpc("append_room_event", eventArgs(S2.internalRoom, S2.buyerOrg)),
  );
  const sharedEvent = await must(
    "shared event",
    supplier.api.rpc("append_room_event", eventArgs(S2.sharedRoom, S2.supplierOrg)),
  );
  const internalFile = await fixtureFile(buyer, S2.internalRoom, S2.buyerOrg, stamp);
  const sharedFile = await fixtureFile(supplier, S2.sharedRoom, S2.supplierOrg, stamp);

  // Populate every otherwise-empty room table to prevent vacuous read denials.
  for (const [room, event] of [[S2.internalRoom, internalEvent], [S2.sharedRoom, sharedEvent]] as const) {
    await must(
      "projection fixture",
      admin.from("room_context_projections").upsert({ room_id: room, source_seq: event.seq }).select("room_id"),
    );
    const proposal = await must(
      "proposal fixture",
      admin.from("staging_proposals").insert({
        room_id: room,
        source_event_id: event.id,
        proposal_type: "general",
        payload: { text: "[S2-TEST] B4 fixture" },
      }).select("id").single(),
    );
    await must(
      "needs fixture",
      admin.from("needs_you").insert({
        room_id: room,
        source_event_id: event.id,
        proposal_id: proposal.id,
        title: "[S2-TEST] B4 fixture",
      }).select("id"),
    );
    await must(
      "canonical fixture",
      admin.from("canonical_objects").insert({
        room_id: room,
        source_event_id: event.id,
        accepted_proposal_id: proposal.id,
        object_type: "s2-test",
        payload: { text: "[S2-TEST] B4 fixture" },
        committed_by_user_id: buyer.id,
        committed_by_organization_id: S2.buyerOrg,
      }).select("id"),
    );
  }

  // Item 2: a real buyer invite creates the supplier's role only through claim.
  const inviteeEmail = `s2-rls-invitee-${stamp}@s2-test.invalid`;
  const inviteArgs = {
    p_project_id: S2.project,
    p_supplier_organization_name: `[S2-TEST] B4 Supplier ${stamp}`,
    p_invited_email: inviteeEmail,
    p_expires_in_hours: 24,
  };
  const invite = await must("buyer creates invite", buyer.api.rpc("create_supplier_room_invite", inviteArgs));
  record(
    "buyer invite returns room and supplier organization",
    Boolean(invite.room_id && invite.target_organization_id),
  );
  const inviteePassword = `S2-test-${crypto.randomUUID()}`;
  const boot = await fetch(`${env("SUPABASE_URL")}/functions/v1/project-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: env("SUPABASE_ANON_KEY") },
    body: JSON.stringify({
      action: "bootstrap",
      token: invite.token,
      email: inviteeEmail,
      password: inviteePassword,
      displayName: "[S2-TEST] B4 invitee",
    }),
  });
  const bootBody = await boot.json();
  if (!boot.ok || JSON.stringify(bootBody) !== JSON.stringify({ ok: true })) throw new Error("invite bootstrap failed");
  const invitee = await signIn(inviteeEmail, inviteePassword);
  await denyRead(invitee.api, "rooms", invite.room_id, "invitee cannot see invited room before claiming");
  await denyRpc(supplier.api, "bound invite rejects other supplier email", "claim_project_invite", {
    p_token: invite.token,
  }, "invite_email_mismatch");
  await denyRpc(
    outsider.api,
    "bound invite rejects outsider email",
    "claim_project_invite",
    { p_token: invite.token },
    "invite_email_mismatch",
  );
  const claimed = await must("claim invitation", invitee.api.rpc("claim_project_invite", { p_token: invite.token }));
  record(
    "claim returns supplier role, exact room, project and acting org",
    claimed.role === "supplier" &&
      claimed.room_id === invite.room_id && claimed.project_id === S2.project &&
      claimed.acting_organization_id === invite.target_organization_id,
  );
  const joinedRooms = await must("joined rooms", invitee.api.from("rooms").select("id"));
  record(
    "new supplier sees only invited room without name filtering",
    joinedRooms.length === 1 && joinedRooms[0].id === invite.room_id,
  );
  const joinedMembership = await must(
    "joined membership",
    invitee.api.from("room_members").select("*").eq("user_id", invitee.id).single(),
  );
  record(
    "invited supplier has member role and bound acting org",
    joinedMembership.room_role === "member" &&
      joinedMembership.acting_organization_id === invite.target_organization_id && !joinedMembership.removed_at,
  );
  const joinedOrg = await must(
    "joined organization",
    invitee.api.from("organization_memberships").select("*").eq("user_id", invitee.id).single(),
  );
  record(
    "invite grants organization member role",
    joinedOrg.role === "member" && joinedOrg.organization_id === invite.target_organization_id,
  );
  const replay = await must(
    "idempotent invite replay",
    invitee.api.rpc("claim_project_invite", { p_token: invite.token }),
  );
  record("same invitee claim replay is idempotent", replay.idempotent === true);
  await denyRpc(supplier.api, "another user cannot claim a used invite", "claim_project_invite", {
    p_token: invite.token,
  }, "invite_already_used");

  // Keep full public-table coverage non-vacuous after B6 adds inquiries.
  for (const [actor, room] of [[buyer.api, S2.internalRoom], [supplier.api, S2.sharedRoom]] as const) {
    await must("inquiry fixture", actor.rpc("submit_project_inquiry", {
      p_room_id: room, p_client_request_id: crypto.randomUUID(),
      p_subject: `[S2-TEST] B4 inquiry ${stamp}`, p_detail: "[S2-TEST] RLS positive control",
    }));
  }
  const roomTables = [
    "rooms",
    "room_events",
    "room_file_versions",
    "room_members",
    "room_context_projections",
    "staging_proposals",
    "needs_you",
    "canonical_objects",
    "audit_log",
    "project_inquiries",
  ];
  for (const table of roomTables) {
    const positive = await must(
      `buyer internal control ${table}`,
      buyer.api.from(table).select("*").eq(table === "rooms" ? "id" : "room_id", S2.internalRoom),
    );
    record(`buyer reads populated internal ${table}`, positive.length > 0);
    const shared = await must(
      `supplier shared control ${table}`,
      supplier.api.from(table).select("*").eq(table === "rooms" ? "id" : "room_id", S2.sharedRoom),
    );
    record(`supplier reads populated shared ${table}`, shared.length > 0);
    await denyRead(supplier.api, table, S2.internalRoom, `supplier cannot read internal ${table}`);
    await denyRead(outsider.api, table, S2.sharedRoom, `non-member cannot read shared ${table}`);
    await denyRead(invitee.api, table, S2.sharedRoom, `different invited supplier cannot read shared ${table}`);
  }
  for (const table of tables) {
    const control = await admin.from(table).select("*", { count: "exact", head: true });
    if (control.error || !control.count) throw new Error(`anon ${table} control is absent/broken`);
    record(`service-role fixture proves ${table} is populated`, true, { rows: control.count });
    const read = await anon.from(table).select("*");
    record(
      `anon cannot read public.${table}`,
      read.error?.code === "42501" ||
        (!read.error && read.data?.length === 0),
      read.error ?? { rows: read.data?.length },
      true,
    );
  }

  const accessible = await must(
    "file RPC positive control",
    buyer.api.rpc("get_room_file_version_for_access", { p_file_version_id: internalFile.id }),
  );
  record("member file RPC returns the known internal file", accessible?.id === internalFile.id);
  for (
    const [name, actor, file] of [["supplier internal", supplier, internalFile], [
      "outsider shared",
      outsider,
      sharedFile,
    ], ["other supplier shared", invitee, sharedFile]] as const
  ) {
    const result = await actor.api.rpc("get_room_file_version_for_access", { p_file_version_id: file.id });
    record(
      `${name} file RPC leaks no composite fields`,
      !result.error && (result.data === null ||
        (typeof result.data === "object" && Object.values(result.data).every((value) => value === null))),
      result.error,
      true,
    );
    // The SDK's binary-download error loses the JSON body on this stack.
    // Assert the real HTTP denial, with the same endpoint's member control above.
    const download = await downloadResponse(actor, file.path);
    const body = await download.json().catch(() => null);
    record(
      `${name} cannot download private storage object`,
      [400, 403, 404].includes(download.status) && body?.statusCode === "404" && body?.code === "NoSuchKey",
      { status: download.status, body },
      true,
    );
  }
  await denyRpc(anon, "anon cannot use file access RPC", "get_room_file_version_for_access", {
    p_file_version_id: internalFile.id,
  });
  await denyRpc(
    supplier.api,
    "supplier cannot append internal event",
    "append_room_event",
    eventArgs(S2.internalRoom, S2.supplierOrg),
    "room_access_denied",
  );
  await denyRpc(
    outsider.api,
    "non-member cannot append shared event",
    "append_room_event",
    eventArgs(S2.sharedRoom, S2.supplierOrg),
    "room_access_denied",
  );
  await denyRpc(
    supplier.api,
    "supplier cannot spoof buyer acting org",
    "append_room_event",
    eventArgs(S2.sharedRoom, S2.buyerOrg),
    "acting_org_access_denied",
  );
  await denyRpc(anon, "anon cannot append an event", "append_room_event", eventArgs(S2.sharedRoom, S2.supplierOrg));
  await denyRpc(supplier.api, "supplier cannot register an internal file", "register_room_file_version", {
    ...internalFile.args,
    p_actor_organization_id: S2.supplierOrg,
  }, "room_access_denied");
  await denyRpc(
    outsider.api,
    "non-member cannot register a shared file",
    "register_room_file_version",
    sharedFile.args,
    "room_access_denied",
  );
  await denyRpc(supplier.api, "supplier cannot register as buyer org", "register_room_file_version", {
    ...sharedFile.args,
    p_actor_organization_id: S2.buyerOrg,
  }, "acting_org_not_bound_to_room");
  for (const [name, actor] of [["supplier", supplier.api], ["outsider", outsider.api], ["anon", anon]] as const) {
    await denyRpc(
      actor,
      `${name} cannot create buyer-project invites`,
      "create_supplier_room_invite",
      inviteArgs,
      name === "anon" ? undefined : "project_owner_membership_required",
    );
  }
  await denyRpc(anon, "anon cannot claim a project invite", "claim_project_invite", { p_token: invite.token });
  await denyRpc(supplier.api, "supplier cannot call privileged orphan lookup", "room_file_orphan_object", {
    p_object_path: sharedFile.path,
  });
  await denyRpc(supplier.api, "supplier cannot claim worker outbox", "agent_claim_outbox", { p_limit: 1 });
  const summary = {
    total: checks.length,
    passed: checks.filter((c) => c.ok).length,
    failed: checks.filter((c) => !c.ok).length,
    denials: checks.filter((c) => c.denial).length,
    denialsPassed: checks.filter((c) => c.denial && c.ok).length,
    publicTables: tables.length,
    complete: true,
  };
  console.log(JSON.stringify(summary));
  if (summary.failed || summary.denials !== summary.denialsPassed) Deno.exit(1);
}
if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    console.log(JSON.stringify({ complete: false, checksFinished: checks.length }));
    Deno.exit(1);
  });
}
