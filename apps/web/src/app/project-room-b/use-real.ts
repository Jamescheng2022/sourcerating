"use client";

/**
 * Real-backend adapter for Project Room B. It exposes the same shape as the lab's
 * demo hook so the chat components are shared, but every value comes from Supabase
 * under the signed-in user's RLS. Nothing here is fixture data.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadRoomAttachment } from "@/lib/room-files";
import type { PreviewMode } from "../project-room-lab/use-lab";
import type { AiTurn, Msg, Org, PanelTab, Proposal, Room, RoomFile, User } from "../project-room-lab/demo/types";

export interface RealRoom extends Room { parentId: string | null; purpose: string | null; projectId: string; lastSeq: number; myRole: string; rawKind: string }
export interface RealFile extends RoomFile { sha256: string; uploaderOrgId: string; uploaderUserId: string; createdAt: string; verification: string; sourceEventId: string | null }
export interface Confirmation { id: string; roomId: string; fileVersionId: string | null; sha: string | null; orgId: string; userId: string; decision: "confirmed" | "changes_requested"; comment: string | null; at: string }
export interface Membership { orgId: string; role: string; displayName: string | null }
export interface SplitSuggestion { id: string; roomId: string; name: string; purpose: string; kind: "external" | "internal"; memberNames: string[]; fileNames: string[]; reason: string; sources: string[]; dismissed?: boolean }
export interface AiSection { title: string; items: { text: string; sources: string[] }[] }
export interface Colleague { userId: string; orgId: string; name: string }

interface EventRow {
  id: string; room_id: string; seq: number; client_msg_id: string | null; actor_user_id: string; actor_organization_id: string;
  actor_display_name: string | null; event_type: string; payload: Record<string, unknown>; created_at: string;
}
interface State {
  phase: "boot" | "signedOut" | "ready";
  me: { id: string; email: string } | null;
  memberships: Membership[];
  colleagues: Colleague[];
  orgs: Org[];
  users: Record<string, User>;
  orgId: string; roomId: string; view: "list" | "chat";
  rooms: RealRoom[];
  messages: Record<string, Msg[]>;
  older: Record<string, number>;
  ended: Record<string, boolean>;
  files: RealFile[];
  proposals: Proposal[];
  confirmations: Confirmation[];
  splits: SplitSuggestion[];
  aiSections: Record<string, AiSection[]>;
  replyTo: string | null; translated: string[];
  panel: { open: boolean; tab: PanelTab };
  aiTurns: AiTurn[];
  preview: { fileId: string; mode: PreviewMode } | null;
  jump: { id: string; nonce: number } | null;
  failNext: boolean; typing: null;
  draftInsert: { text: string; nonce: number } | null;
  error: string | null;
}

const PALETTE = ["#0f6b5c", "#2f5fb3", "#a04a2a", "#6b4ea0", "#8a6a00", "#1f7a8c", "#a03a5c", "#4f6b1f"];
const hash = (t: string) => Array.from(t).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const shortOf = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (/[㐀-鿿]/.test(name)) return name.trim().slice(0, 2);
  return (w.length > 1 ? w.slice(0, 3).map((x) => x[0]).join("") : name.slice(0, 3)).toUpperCase();
};
const kindOfFile = (mime: string, name: string): RoomFile["kind"] =>
  mime.startsWith("image/") ? "image" : mime.includes("pdf") ? "pdf" : /sheet|excel|csv/.test(mime) || /\.(xlsx?|csv)$/i.test(name) ? "xlsx" : "other";
const internal = (kind: string) => kind === "internal" || kind === "buyer_internal";
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const PAGE = 50;
const ORG_KEY = "sr_b_acting_org";

function toMsg(e: EventRow, files: RealFile[]): Msg | null {
  const p = e.payload ?? {};
  const base = { id: e.id, userId: e.actor_user_id, at: e.created_at, status: "sent" as const, replyTo: str(p.reply_to) };
  const ver = `${str(p.logical_name) ?? "文件"} v${p.version_no ?? "?"}`;
  switch (e.event_type) {
    case "message.posted": return { ...base, text: str(p.text) ?? "" };
    case "file.attached": {
      const f = files.find((x) => x.sourceEventId === e.id || x.id === p.file_version_id);
      return { ...base, text: str(p.caption), fileId: f?.id ?? str(p.file_version_id) };
    }
    case "room.summary_shared": return { ...base, text: `【${str(p.from_room_name) ?? "内部讨论"} · 摘要】\n${str(p.text) ?? ""}` };
    case "file.review_requested": return { ...base, text: `请各方审核 ${ver}${p.note ? `\n${p.note}` : ""}` };
    case "confirmation.recorded":
      return { ...base, text: `${p.decision === "confirmed" ? "✓ 已确认" : "✎ 要求修改"} ${p.file_version_id ? `${ver} · ${String(p.sha256 ?? "").slice(0, 10)}` : "事项"}${p.comment ? `\n${p.comment}` : ""}` };
    default: return null;
  }
}

export function useReal() {
  const [s, set] = useState<State>({
    phase: "boot", me: null, memberships: [], colleagues: [], orgs: [], users: {}, orgId: "", roomId: "", view: "list", rooms: [],
    messages: {}, older: {}, ended: {}, files: [], proposals: [], confirmations: [], splits: [], aiSections: {}, replyTo: null, translated: [],
    panel: { open: false, tab: "overview" }, aiTurns: [], preview: null, jump: null, failNext: false, typing: null, draftInsert: null, error: null,
  });
  const ref = useRef(s);
  useEffect(() => { ref.current = s; });
  const seqs = useRef(new Map<string, number>());
  const pending = useRef(new Map<string, { roomId: string; text: string; file?: File; replyTo?: string }>());
  const fail = (e: unknown) => set((p) => ({ ...p, error: e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e) }));

  const user = useCallback((id: string): User => s.users[id] ?? { id, name: "成员", orgId: "", title: "" }, [s.users]);
  const org = useCallback((id: string): Org => s.orgs.find((o) => o.id === id) ?? { id, name: "—", short: "?", place: "", color: "#8a8f95" }, [s.orgs]);

  /** Organisations, rooms and members visible to this user. */
  const refresh = useCallback(async (userId?: string) => {
    const uid = userId ?? ref.current.me?.id;
    if (!uid) return;
    const [mem, orgs, rooms, members] = await Promise.all([
      supabase.from("organization_memberships").select("organization_id,user_id,role,display_name").is("removed_at", null),
      supabase.from("organizations").select("id,name"),
      supabase.from("rooms").select("id,name,kind,project_id,owner_organization_id,parent_room_id,purpose,last_seq,projects(name)").is("archived_at", null).order("created_at"),
      supabase.from("room_members").select("room_id,user_id,acting_organization_id,room_role,member_display_name,last_read_seq").is("removed_at", null),
    ]);
    const err = mem.error ?? orgs.error ?? rooms.error ?? members.error;
    if (err) return fail(err);
    const orgList: Org[] = (orgs.data ?? []).map((o) => ({ id: o.id, name: o.name, short: shortOf(o.name), place: "", color: PALETTE[hash(o.id) % PALETTE.length] }));
    const users: Record<string, User> = { ...ref.current.users };
    for (const m of mem.data ?? []) users[m.user_id] = { id: m.user_id, name: m.display_name ?? users[m.user_id]?.name ?? "成员", orgId: m.organization_id, title: m.role };
    for (const m of members.data ?? []) users[m.user_id] = { id: m.user_id, name: m.member_display_name ?? users[m.user_id]?.name ?? "成员", orgId: m.acting_organization_id, title: m.room_role };
    const memberships = (mem.data ?? []).filter((m) => m.user_id === uid).map((m) => ({ orgId: m.organization_id, role: m.role, displayName: m.display_name }));
    const colleagues = (mem.data ?? []).filter((m) => m.user_id !== uid).map((m) => ({ userId: m.user_id, orgId: m.organization_id, name: m.display_name ?? "成员" }));
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(ORG_KEY) : null;
    const orgId = memberships.find((m) => m.orgId === ref.current.orgId)?.orgId ?? memberships.find((m) => m.orgId === saved)?.orgId ?? memberships[0]?.orgId ?? "";
    const list: RealRoom[] = (rooms.data ?? []).map((r) => {
      const ms = (members.data ?? []).filter((m) => m.room_id === r.id);
      const unread: Record<string, number> = {};
      for (const m of ms.filter((x) => x.user_id === uid)) unread[m.acting_organization_id] = Math.max(0, Number(r.last_seq) - Number(m.last_read_seq));
      const project = Array.isArray(r.projects) ? r.projects[0] : r.projects;
      return {
        id: r.id, name: r.name, kind: internal(r.kind) ? "internal" : "external", rawKind: r.kind, project: (project as { name?: string } | null)?.name ?? "项目",
        projectId: r.project_id, ownerOrgId: r.owner_organization_id, memberIds: Array.from(new Set(ms.map((m) => m.user_id))), unread,
        parentId: r.parent_room_id, purpose: r.purpose, lastSeq: Number(r.last_seq),
        myRole: ms.find((m) => m.user_id === uid && m.acting_organization_id === orgId)?.room_role ?? "member",
      };
    });
    set((p) => ({ ...p, phase: "ready", memberships, colleagues, orgs: orgList, users, rooms: list, orgId }));
  }, []);

  const loadRoom = useCallback(async (roomId: string) => {
    const [ev, fv, cf, pr] = await Promise.all([
      supabase.from("room_events").select("*").eq("room_id", roomId).order("seq", { ascending: false }).limit(PAGE),
      supabase.from("room_file_versions").select("*").eq("room_id", roomId).order("created_at"),
      supabase.from("room_confirmations").select("*").eq("room_id", roomId).order("created_at"),
      supabase.from("staging_proposals").select("id,room_id,source_event_id,proposal_type,payload,status").eq("room_id", roomId).order("created_at"),
    ]);
    const err = ev.error ?? fv.error ?? cf.error;
    if (err) return fail(err);
    const files: RealFile[] = (fv.data ?? []).map((f) => ({
      id: f.id, roomId, name: f.logical_name, kind: kindOfFile(f.mime_type, f.logical_name), size: Number(f.size_bytes), version: f.version_no,
      lineage: f.logical_name, supersedes: f.supersedes_version_id ?? undefined, sha256: f.sha256, uploaderOrgId: f.uploader_organization_id,
      uploaderUserId: f.uploader_user_id, createdAt: f.created_at, verification: f.verification_status ?? "pending", sourceEventId: f.source_event_id,
    }));
    const rows = ((ev.data ?? []) as EventRow[]).slice().reverse();
    rows.forEach((e) => seqs.current.set(e.id, e.seq));
    const msgs = rows.map((e) => toMsg(e, files)).filter((m): m is Msg => !!m);
    const confirmations: Confirmation[] = (cf.data ?? []).map((c) => ({
      id: c.id, roomId, fileVersionId: c.file_version_id, sha: c.file_sha256, orgId: c.organization_id, userId: c.user_id, decision: c.decision, comment: c.comment, at: c.created_at,
    }));
    const proposals: Proposal[] = (pr.data ?? []).map((x) => {
      const pl = (x.payload ?? {}) as Record<string, unknown>;
      return {
        id: x.id, roomId, kind: x.proposal_type === "decision" ? "decision" : x.proposal_type === "requirement" ? "requirement" : "needs_you",
        title: str(pl.summary) ?? str(pl.title) ?? x.proposal_type, detail: str(pl.detail) ?? str(pl.evidence_quote) ?? "", sources: [x.source_event_id],
        forOrgId: null, status: x.status === "accepted" ? "confirmed" : x.status === "pending" ? "pending" : "rejected",
      };
    });
    const users = { ...ref.current.users };
    for (const e of rows) if (!users[e.actor_user_id]) users[e.actor_user_id] = { id: e.actor_user_id, name: e.actor_display_name ?? "成员", orgId: e.actor_organization_id, title: "" };
    set((p) => ({
      ...p, users,
      messages: { ...p.messages, [roomId]: [...msgs, ...(p.messages[roomId] ?? []).filter((m) => m.status !== "sent")] },
      older: { ...p.older, [roomId]: 0 }, ended: { ...p.ended, [roomId]: rows.length < PAGE || rows[0]?.seq === 1 },
      files: [...p.files.filter((f) => f.roomId !== roomId), ...files],
      confirmations: [...p.confirmations.filter((c) => c.roomId !== roomId), ...confirmations],
      proposals: [...p.proposals.filter((x) => x.roomId !== roomId), ...proposals],
    }));
    const last = rows.at(-1)?.seq;
    if (last) {
      await supabase.rpc("sr_mark_room_read", { p_room_id: roomId, p_seq: last });
      set((p) => ({ ...p, rooms: p.rooms.map((r) => (r.id === roomId ? { ...r, unread: { ...r.unread, [p.orgId]: 0 } } : r)) }));
    }
  }, []);

  // Session bootstrap.
  useEffect(() => {
    let live = true;
    const apply = (u: { id: string; email?: string } | null | undefined) => {
      if (!live) return;
      if (!u) { set((p) => ({ ...p, phase: "signedOut", me: null, rooms: [], messages: {}, memberships: [] })); return; }
      if (ref.current.me?.id === u.id) return;
      set((p) => ({ ...p, me: { id: u.id, email: u.email ?? "" } }));
      void refresh(u.id);
    };
    void supabase.auth.getSession().then(({ data }) => apply(data.session?.user));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setTimeout(() => apply(session?.user), 0));
    return () => { live = false; data.subscription.unsubscribe(); };
  }, [refresh]);

  // Realtime: RLS decides which inserts reach this client. A slow poll covers new rooms and missed frames.
  useEffect(() => {
    if (s.phase !== "ready" || !s.me) return;
    const onEvent = (e: EventRow) => {
      const cur = ref.current;
      seqs.current.set(e.id, e.seq);
      if (e.event_type === "file.attached" || e.event_type === "confirmation.recorded") {
        if (cur.messages[e.room_id]) void loadRoom(e.room_id);
      } else if (cur.messages[e.room_id]) {
        const m = toMsg(e, cur.files);
        if (m) set((p) => {
          const list = p.messages[e.room_id] ?? [];
          if (list.some((x) => x.id === e.id)) return p;
          const users = p.users[e.actor_user_id] ? p.users : { ...p.users, [e.actor_user_id]: { id: e.actor_user_id, name: e.actor_display_name ?? "成员", orgId: e.actor_organization_id, title: "" } };
          const mine = e.client_msg_id ? list.findIndex((x) => x.id === e.client_msg_id) : -1;
          return { ...p, users, messages: { ...p.messages, [e.room_id]: mine >= 0 ? list.map((x, i) => (i === mine ? m : x)) : [...list, m] } };
        });
      }
      const viewing = cur.roomId === e.room_id && cur.view === "chat" && document.visibilityState === "visible";
      if (viewing) void supabase.rpc("sr_mark_room_read", { p_room_id: e.room_id, p_seq: e.seq });
      set((p) => ({
        ...p, rooms: p.rooms.map((r) => r.id !== e.room_id ? r : {
          ...r, lastSeq: Math.max(r.lastSeq, e.seq),
          unread: viewing || e.actor_user_id === p.me?.id ? { ...r.unread, [p.orgId]: viewing ? 0 : r.unread[p.orgId] ?? 0 } : { ...r.unread, [p.orgId]: (r.unread[p.orgId] ?? 0) + 1 },
        }),
      }));
    };
    const ch = supabase.channel(`sr_b:${s.me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_events" }, (payload) => onEvent(payload.new as EventRow))
      .subscribe();
    const poll = setInterval(async () => {
      await refresh();
      const cur = ref.current;
      const r = cur.rooms.find((x) => x.id === cur.roomId);
      // Verification verdicts arrive without an event; pick them up while any file here is still pending.
      if (r && cur.files.some((f) => f.roomId === r.id && f.verification === "pending")) void loadRoom(r.id);
      const top = Math.max(0, ...(cur.messages[cur.roomId] ?? []).map((m) => seqs.current.get(m.id) ?? 0));
      if (r && cur.messages[r.id] && r.lastSeq > top) {
        const { data } = await supabase.from("room_events").select("*").eq("room_id", r.id).gt("seq", top).order("seq").limit(200);
        ((data ?? []) as EventRow[]).forEach(onEvent);
      }
    }, 12000);
    return () => { clearInterval(poll); void supabase.removeChannel(ch); };
  }, [s.phase, s.me, refresh, loadRoom]);

  const myRooms = useMemo(() => s.rooms.filter((r) => r.unread[s.orgId] !== undefined), [s.rooms, s.orgId]);
  const room = (myRooms.find((r) => r.id === s.roomId) ?? myRooms[0]) as RealRoom | undefined;
  const msgs = room ? s.messages[room.id] ?? [] : [];
  const meId = s.me?.id ?? "";

  useEffect(() => { if (room && !ref.current.messages[room.id]) void loadRoom(room.id); }, [room, loadRoom]);

  const patch = (roomId: string, id: string, m: Partial<Msg>) =>
    set((p) => ({ ...p, messages: { ...p.messages, [roomId]: (p.messages[roomId] ?? []).map((x) => (x.id === id ? { ...x, ...m } : x)) } }));

  const deliver = async (clientId: string) => {
    const job = pending.current.get(clientId);
    if (!job) return;
    const orgId = ref.current.orgId;
    try {
      let eventId: string;
      if (job.file) {
        const res = await uploadRoomAttachment({ roomId: job.roomId, actingOrganizationId: orgId, file: job.file, clientMessageId: clientId, caption: job.text });
        eventId = res.event.id as string;
        seqs.current.set(eventId, res.event.seq as number);
        // Server-side re-hash and type check; a file can only be opened once this says "verified".
        if (res.verification?.status !== "verified") await api("gateway", { action: "verify", fileVersionId: res.file.id }).catch(() => null);
        await loadRoom(job.roomId);
      } else {
        const { data, error } = await supabase.rpc("append_room_event", {
          p_room_id: job.roomId, p_client_msg_id: clientId, p_actor_organization_id: orgId, p_event_type: "message.posted",
          p_payload: job.replyTo ? { text: job.text, reply_to: job.replyTo } : { text: job.text },
        });
        if (error) throw error;
        const e = data as EventRow;
        eventId = e.id; seqs.current.set(e.id, e.seq);
        void supabase.rpc("sr_mark_room_read", { p_room_id: job.roomId, p_seq: e.seq });
      }
      pending.current.delete(clientId);
      set((p) => {
        const list = p.messages[job.roomId] ?? [];
        const dup = list.some((x) => x.id === eventId);
        return { ...p, messages: { ...p.messages, [job.roomId]: dup ? list.filter((x) => x.id !== clientId) : list.map((x) => (x.id === clientId ? { ...x, id: eventId, status: "sent" } : x)) } };
      });
    } catch (e) {
      patch(job.roomId, clientId, { status: "failed" });
      fail(e);
    }
  };

  const api = async (path: string, body: Record<string, unknown>) => {
    const { data } = await supabase.auth.getSession();
    const res = await fetch(`/api/project-room-b/${path}`, { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as Record<string, unknown>;
  };

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) { fail(error); throw error; }
    return data as Record<string, unknown>;
  };

  const actions = {
    clearError: () => set((p) => ({ ...p, error: null })),
    switchOrg: (orgId: string) => { localStorage.setItem(ORG_KEY, orgId); set((p) => ({ ...p, orgId, roomId: "", replyTo: null, panel: { ...p.panel, open: false } })); void refresh(); },
    openRoom: (roomId: string) => {
      set((p) => ({ ...p, roomId, view: "chat", replyTo: null, rooms: p.rooms.map((r) => (r.id === roomId ? { ...r, unread: { ...r.unread, [p.orgId]: 0 } } : r)) }));
      const r = ref.current.rooms.find((x) => x.id === roomId);
      if (r && ref.current.messages[roomId]) void supabase.rpc("sr_mark_room_read", { p_room_id: roomId, p_seq: r.lastSeq });
    },
    backToList: () => set((p) => ({ ...p, view: "list" })),
    setReply: (id: string | null) => set((p) => ({ ...p, replyTo: id })),
    toggleTranslate: async (id: string) => {
      if (!room) return;
      const roomId = room.id;
      if (ref.current.translated.includes(id)) return set((p) => ({ ...p, translated: p.translated.filter((x) => x !== id) }));
      const m = (ref.current.messages[roomId] ?? []).find((x) => x.id === id);
      if (m && !m.tr) {
        patch(roomId, id, { tr: "…" });
        set((p) => ({ ...p, translated: [...p.translated, id] }));
        const r = await api("assist", { roomId, mode: "translate", eventId: id, language: navigator.language });
        patch(roomId, id, { tr: r.ok ? String((r.result as { translation?: string })?.translation ?? "") : `翻译不可用：${r.error}` });
      } else set((p) => ({ ...p, translated: [...p.translated, id] }));
    },
    setFailNext: () => {},
    simulateIncoming: () => {},
    openPanel: (tab: PanelTab) => set((p) => ({ ...p, panel: { open: true, tab } })),
    closePanel: () => set((p) => ({ ...p, panel: { ...p.panel, open: false } })),
    openFile: (fileId: string, mode: PreviewMode = "view") => set((p) => ({ ...p, preview: { fileId, mode }, panel: { open: true, tab: "files" } })),
    closeFile: () => set((p) => ({ ...p, preview: null })),
    jumpTo: (id: string) => set((p) => ({ ...p, view: "chat", jump: { id, nonce: Date.now() } })),
    insertDraft: (text: string) => set((p) => ({ ...p, draftInsert: { text, nonce: Date.now() } })),

    send: async (text: string, picked?: File, logicalName?: string) => {
      if (!room) return;
      const id = crypto.randomUUID();
      const file = picked && logicalName && logicalName !== picked.name ? new File([picked], logicalName, { type: picked.type }) : picked;
      pending.current.set(id, { roomId: room.id, text, file, replyTo: ref.current.replyTo ?? undefined });
      set((p) => ({
        ...p, replyTo: null,
        messages: { ...p.messages, [room.id]: [...(p.messages[room.id] ?? []), { id, userId: meId, at: new Date().toISOString(), text: text || (file ? `正在上传 ${file.name}…` : undefined), replyTo: p.replyTo ?? undefined, status: "sending" }] },
      }));
      await deliver(id);
    },
    retry: (id: string) => { if (room) { patch(room.id, id, { status: "sending" }); void deliver(id); } },
    remove: (id: string) => { pending.current.delete(id); if (room) set((p) => ({ ...p, messages: { ...p.messages, [room.id]: (p.messages[room.id] ?? []).filter((m) => m.id !== id) } })); },

    loadOlder: () => {
      if (!room || ref.current.ended[room.id]) return 0;
      const roomId = room.id;
      const first = Math.min(...(ref.current.messages[roomId] ?? []).map((m) => seqs.current.get(m.id) ?? Infinity));
      if (!Number.isFinite(first)) return 0;
      set((p) => ({ ...p, ended: { ...p.ended, [roomId]: true } })); // re-opened below unless history is exhausted
      void supabase.from("room_events").select("*").eq("room_id", roomId).lt("seq", first).order("seq", { ascending: false }).limit(PAGE).then(({ data, error }) => {
        if (error) return fail(error);
        const rows = ((data ?? []) as EventRow[]).slice().reverse();
        rows.forEach((e) => seqs.current.set(e.id, e.seq));
        const batch = rows.map((e) => toMsg(e, ref.current.files)).filter((m): m is Msg => !!m);
        set((p) => ({
          ...p, ended: { ...p.ended, [roomId]: rows.length < PAGE }, older: { ...p.older, [roomId]: (p.older[roomId] ?? 0) + batch.length },
          messages: { ...p.messages, [roomId]: [...batch, ...(p.messages[roomId] ?? [])] },
        }));
      });
      return PAGE;
    },

    ask: async (subject: AiTurn["subject"], question: string, mode: "summary" | "explain" | "split" = subject.type === "message" ? "explain" : "summary") => {
      if (!room) return;
      const id = crypto.randomUUID(), roomId = room.id;
      set((p) => ({ ...p, panel: { open: true, tab: "ai" }, aiTurns: [...p.aiTurns, { id, roomId, subject, question }] }));
      const fileMsg = subject.type === "file" ? ref.current.files.find((f) => f.id === subject.id)?.sourceEventId : null;
      const r = await api("assist", { roomId, mode, language: navigator.language, ...(mode === "explain" ? { eventId: fileMsg ?? subject.id } : {}) }).catch((e) => ({ ok: false, error: String(e) }) as Record<string, unknown>);
      const res = (r.result ?? {}) as Record<string, unknown>;
      type Item = { text: string; sources?: string[]; owner?: string };
      const list = (k: string) => (Array.isArray(res[k]) ? (res[k] as Item[]) : []);
      let answer = { answer: `AI 暂不可用：${r.error ?? "未知错误"}`, sources: [] as string[] };
      if (r.ok && mode === "explain") answer = { answer: String(res.answer ?? ""), sources: (res.sources as string[]) ?? [] };
      if (r.ok && mode === "summary") {
        const sections: AiSection[] = ([["已达成", "decided"], ["未解决", "open_questions"], ["待办", "todos"], ["矛盾", "contradictions"], ["版本变化", "version_notes"]] as const)
          .map(([title, k]) => ({ title, items: list(k).map((x) => ({ text: x.owner ? `${x.text}（${x.owner}）` : x.text, sources: x.sources ?? [] })) }))
          .filter((x) => x.items.length);
        const clarify = (Array.isArray(res.clarify) ? (res.clarify as string[]) : []).map((text) => ({ text, sources: [] }));
        if (clarify.length) sections.push({ title: "建议追问", items: clarify });
        answer = { answer: String(res.summary ?? ""), sources: [] };
        set((p) => ({ ...p, aiSections: { ...p.aiSections, [id]: sections } }));
      }
      if (r.ok && mode === "split") {
        const sug = (Array.isArray(res.suggestions) ? (res.suggestions as Record<string, unknown>[]) : []).map((x): SplitSuggestion => ({
          id: crypto.randomUUID(), roomId, name: String(x.name ?? ""), purpose: String(x.purpose ?? ""), kind: x.kind === "internal" ? "internal" : "external",
          memberNames: (x.member_names as string[]) ?? [], fileNames: (x.file_names as string[]) ?? [], reason: String(x.reason ?? ""), sources: (x.sources as string[]) ?? [],
        })).filter((x) => x.name);
        answer = { answer: sug.length ? `建议拆出 ${sug.length} 个子房间，由你决定是否创建。` : "目前看不出需要拆分的独立方向。", sources: [] };
        set((p) => ({ ...p, splits: [...p.splits.filter((x) => x.roomId !== roomId || x.dismissed), ...sug] }));
      }
      set((p) => ({ ...p, aiTurns: p.aiTurns.map((t) => (t.id === id ? { ...t, answer } : t)) }));
    },
    dismissSplit: (id: string) => set((p) => ({ ...p, splits: p.splits.filter((x) => x.id !== id) })),
    review: async (id: string, status: "confirmed" | "rejected" | "pending") => {
      if (!room || status === "pending") return;
      await rpc("review_staging_proposal", { p_proposal_id: id, p_action: status === "confirmed" ? "accept" : "dismiss", p_actor_organization_id: ref.current.orgId, p_payload_override: null }).catch(() => null);
      void loadRoom(room.id);
    },
    createRoom: () => {},

    // ── real-only ──
    signIn: async (email: string, password: string) => { const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw error; },
    signUp: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${location.origin}${location.pathname}` } });
      if (error) throw error;
      return !!data.session;
    },
    signOut: async () => { await supabase.auth.signOut(); },
    createOrganization: async (name: string, displayName: string) => { await rpc("sr_create_organization", { p_name: name, p_display_name: displayName }); await refresh(); },
    createProject: async (name: string, role: string) => {
      const r = await rpc("sr_create_project", { p_organization_id: ref.current.orgId, p_name: name, p_project_role: role });
      await refresh(); actions.openRoom(r.main_room_id as string);
    },
    createSubRoom: async (name: string, purpose: string, kind: "internal" | "external", memberIds: string[]) => {
      if (!room) return;
      const parent = room.parentId ?? room.id;
      const r = await rpc("sr_create_sub_room", { p_parent_room_id: parent, p_actor_organization_id: ref.current.orgId, p_name: name, p_purpose: purpose || null, p_kind: kind, p_member_user_ids: memberIds });
      await refresh(); actions.openRoom(r.room_id as string);
    },
    invite: async (email: string, kind: "organization" | "org_member", orgName: string) => {
      if (!room) return "";
      const r = await rpc("sr_create_invite", { p_room_id: room.id, p_actor_organization_id: ref.current.orgId, p_email: email, p_kind: kind, p_organization_name: orgName || null });
      return `${location.origin}${location.pathname}?invite=${r.token as string}`;
    },
    previewInvite: async (token: string) => { const { data, error } = await supabase.rpc("sr_preview_invite", { p_token: token }); if (error) throw error; return data as Record<string, string>; },
    acceptInvite: async (token: string, orgId: string | null, newOrgName: string, displayName: string) => {
      const r = await rpc("sr_accept_invite", { p_token: token, p_organization_id: orgId, p_new_organization_name: orgId ? null : newOrgName, p_display_name: displayName || null });
      localStorage.setItem(ORG_KEY, r.acting_organization_id as string);
      set((p) => ({ ...p, orgId: r.acting_organization_id as string }));
      await refresh(); actions.openRoom(r.room_id as string);
    },
    addMember: async (userId: string, orgId: string) => { if (room) { await rpc("sr_add_room_member", { p_room_id: room.id, p_actor_organization_id: ref.current.orgId, p_user_id: userId, p_member_organization_id: orgId }); await refresh(); } },
    removeMember: async (userId: string) => { if (room) { await rpc("sr_remove_room_member", { p_room_id: room.id, p_actor_organization_id: ref.current.orgId, p_user_id: userId }); await refresh(); } },
    removeFromOrganization: async (userId: string) => { await rpc("sr_remove_org_member", { p_organization_id: ref.current.orgId, p_user_id: userId }); await refresh(); },
    shareToParent: async (text: string) => { if (room) await rpc("sr_share_to_parent", { p_room_id: room.id, p_actor_organization_id: ref.current.orgId, p_client_msg_id: crypto.randomUUID(), p_text: text, p_source_event_ids: [] }); },
    requestReview: async (fileId: string, note: string) => { await rpc("sr_request_file_review", { p_file_version_id: fileId, p_actor_organization_id: ref.current.orgId, p_client_msg_id: crypto.randomUUID(), p_note: note || null }); },
    confirmFile: async (f: RealFile, decision: "confirmed" | "changes_requested", comment: string) => {
      await rpc("sr_record_confirmation", { p_room_id: f.roomId, p_actor_organization_id: ref.current.orgId, p_client_msg_id: crypto.randomUUID(), p_decision: decision, p_file_version_id: f.id, p_file_sha256: f.sha256, p_comment: comment || null });
      await loadRoom(f.roomId);
    },
    fileUrl: async (fileId: string) => {
      let r = await api("gateway", { action: "sign", fileVersionId: fileId });
      if (!r.ok && r.verificationStatus === "pending") { await api("gateway", { action: "verify", fileVersionId: fileId }); r = await api("gateway", { action: "sign", fileVersionId: fileId }); }
      if (!r.ok || !r.signedUrl) throw new Error(String(r.error ?? "无法打开文件"));
      return r.signedUrl as string;
    },
    restoreVersion: async (f: RealFile) => {
      const blob = await (await fetch(await actions.fileUrl(f.id))).blob();
      await actions.send(`恢复自 v${f.version}`, new File([blob], f.name, { type: blob.type || "application/pdf" }), f.name);
    },
    exportEvidence: async () => {
      if (!room) return;
      const data = await rpc("sr_export_room_evidence", { p_room_id: room.id });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      a.download = `evidence-${room.name}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
  };

  return { s, set, meId, user, org, myRooms, room, msgs, actions, real: true as boolean };
}

export type Real = ReturnType<typeof useReal>;
