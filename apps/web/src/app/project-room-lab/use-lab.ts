"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { demoAsk, demoOlder, demoSend, fixture, newId } from "./demo/adapter";
import type { AiTurn, Msg, PanelTab, Proposal, Room, RoomFile } from "./demo/types";

export type PreviewMode = "view" | "compare" | "related";

interface State {
  orgId: string;
  roomId: string;
  view: "list" | "chat";
  rooms: Room[];
  messages: Record<string, Msg[]>;
  older: Record<string, number>;
  files: RoomFile[];
  proposals: Proposal[];
  replyTo: string | null;
  translated: string[];
  panel: { open: boolean; tab: PanelTab };
  aiTurns: AiTurn[];
  preview: { fileId: string; mode: PreviewMode } | null;
  jump: { id: string; nonce: number } | null;
  failNext: boolean;
  typing: { roomId: string; userId: string } | null;
  draftInsert: { text: string; nonce: number } | null;
}

const OLDER_CAP = 120;

export function useLab() {
  const [s, set] = useState<State>(() => ({
    orgId: fixture.identities[0].orgId,
    roomId: "r1",
    view: "list",
    rooms: fixture.rooms,
    messages: Object.fromEntries(
      Object.entries(fixture.messages).map(([k, v]) => [k, v.map((m) => ({ ...m, status: "sent" as const }))]),
    ),
    older: {},
    files: fixture.files,
    proposals: fixture.proposals,
    replyTo: null,
    translated: [],
    panel: { open: false, tab: "overview" },
    aiTurns: [],
    preview: null,
    jump: null,
    failNext: false,
    typing: null,
    draftInsert: null,
  }));
  const replied = useRef(new Set<string>());

  const meId = fixture.identities.find((i) => i.orgId === s.orgId)!.userId;
  const user = useCallback((id: string) => fixture.users.find((u) => u.id === id)!, []);
  const org = useCallback((id: string) => fixture.orgs.find((o) => o.id === id)!, []);

  const myRooms = useMemo(
    () =>
      s.rooms.filter((r) =>
        r.kind === "internal"
          ? r.ownerOrgId === s.orgId
          : r.memberIds.some((id) => fixture.users.find((u) => u.id === id)?.orgId === s.orgId),
      ),
    [s.rooms, s.orgId],
  );
  const room = myRooms.find((r) => r.id === s.roomId) ?? myRooms[0];
  const msgs = s.messages[room.id] ?? [];

  const patchMsg = (roomId: string, id: string, patch: Partial<Msg>) =>
    set((p) => ({
      ...p,
      messages: { ...p.messages, [roomId]: p.messages[roomId].map((m) => (m.id === id ? { ...m, ...patch } : m)) },
    }));
  const append = (roomId: string, m: Msg, bumpUnread: boolean) =>
    set((p) => ({
      ...p,
      messages: { ...p.messages, [roomId]: [...(p.messages[roomId] ?? []), m] },
      rooms: bumpUnread
        ? p.rooms.map((r) => (r.id === roomId ? { ...r, unread: { ...r.unread, [p.orgId]: (r.unread[p.orgId] ?? 0) + 1 } } : r))
        : p.rooms,
    }));

  const deliver = async (roomId: string, id: string, fail: boolean) => {
    try {
      await demoSend(fail);
      patchMsg(roomId, id, { status: "sent" });
      return true;
    } catch {
      patchMsg(roomId, id, { status: "failed" });
      return false;
    }
  };

  const incoming = useCallback(
    (roomId: string, text: string, viewing: boolean) => {
      const r = fixture.rooms.find((x) => x.id === roomId) ?? room;
      const others = r.memberIds.filter((id) => id !== meId);
      const other = others.find((id) => user(id).orgId !== user(meId).orgId) ?? others[0];
      if (!other) return;
      set((p) => ({ ...p, typing: { roomId, userId: other } }));
      setTimeout(() => {
        set((p) => ({ ...p, typing: null }));
        append(roomId, { id: newId("in"), userId: other, at: new Date().toISOString(), text, status: "sent" }, !viewing);
      }, 1600);
    },
     
    [meId, room, user],
  );

  const actions = {
    switchOrg: (orgId: string) =>
      set((p) => ({ ...p, orgId, roomId: "r1", replyTo: null, panel: { ...p.panel, open: false }, aiTurns: [], translated: [] })),
    openRoom: (roomId: string) =>
      set((p) => ({
        ...p, roomId, view: "chat", replyTo: null,
        rooms: p.rooms.map((r) => (r.id === roomId ? { ...r, unread: { ...r.unread, [p.orgId]: 0 } } : r)),
      })),
    backToList: () => set((p) => ({ ...p, view: "list" })),
    setReply: (id: string | null) => set((p) => ({ ...p, replyTo: id })),
    toggleTranslate: (id: string) =>
      set((p) => ({ ...p, translated: p.translated.includes(id) ? p.translated.filter((x) => x !== id) : [...p.translated, id] })),
    setFailNext: (v: boolean) => set((p) => ({ ...p, failNext: v })),
    openPanel: (tab: PanelTab) => set((p) => ({ ...p, panel: { open: true, tab } })),
    closePanel: () => set((p) => ({ ...p, panel: { ...p.panel, open: false } })),
    openFile: (fileId: string, mode: PreviewMode = "view") => set((p) => ({ ...p, preview: { fileId, mode } })),
    closeFile: () => set((p) => ({ ...p, preview: null })),
    jumpTo: (id: string) =>
      set((p) => ({ ...p, preview: null, view: "chat", jump: { id, nonce: Date.now() } })),
    insertDraft: (text: string) => set((p) => ({ ...p, draftInsert: { text, nonce: Date.now() } })),

    send: async (text: string, picked?: File) => {
      const roomId = room.id;
      const id = newId("me");
      let fileId: string | undefined;
      if (picked) {
        fileId = newId("lf");
        const ext = picked.name.split(".").pop()?.toLowerCase() ?? "";
        const kind = picked.type.startsWith("image/") ? "image" : ext === "pdf" ? "pdf" : ["xlsx", "xls", "csv"].includes(ext) ? "xlsx" : "other";
        const f: RoomFile = {
          id: fileId, roomId, name: picked.name, kind, size: picked.size, version: 1, lineage: fileId,
          localUrl: kind === "image" ? URL.createObjectURL(picked) : undefined,
        };
        set((p) => ({ ...p, files: [...p.files, f] }));
      }
      const fail = s.failNext;
      append(roomId, { id, userId: meId, at: new Date().toISOString(), text: text || undefined, fileId, replyTo: s.replyTo ?? undefined, status: "sending" }, false);
      set((p) => ({ ...p, replyTo: null }));
      const ok = await deliver(roomId, id, fail);
      if (ok && room.kind === "external" && !replied.current.has(roomId)) {
        replied.current.add(roomId);
        incoming(roomId, "收到，稍后回复。（演示自动回复）", true);
      }
    },
    retry: (id: string) => {
      patchMsg(room.id, id, { status: "sending" });
      void deliver(room.id, id, false);
    },
    remove: (id: string) =>
      set((p) => ({ ...p, messages: { ...p.messages, [room.id]: p.messages[room.id].filter((m) => m.id !== id) } })),
    simulateIncoming: () => incoming(room.id, "Any update on this? （演示来消息）", true),

    loadOlder: (count = 30) => {
      const have = s.older[room.id] ?? 0;
      if (have >= OLDER_CAP && count <= 30) return 0;
      const first = msgs[0];
      if (!first) return 0;
      const batch = demoOlder(room, first.at, count, have);
      set((p) => ({
        ...p,
        older: { ...p.older, [room.id]: have + count },
        messages: { ...p.messages, [room.id]: [...batch, ...p.messages[room.id]] },
      }));
      return count;
    },

    ask: async (subject: AiTurn["subject"], question: string) => {
      const id = newId("ai");
      const roomId = room.id;
      set((p) => ({ ...p, panel: { open: true, tab: "ai" }, aiTurns: [...p.aiTurns, { id, roomId, subject, question }] }));
      const real = msgs.filter((m) => !m.filler);
      const at = real.findIndex((m) => m.id === subject.id);
      const nearby = subject.type === "message" && at >= 0 ? real.slice(Math.max(0, at - 1), at + 2).map((m) => m.id) : [subject.id];
      let answer = await demoAsk(subject.type === "room" ? "__none" : subject.id, subject.type === "room" ? [] : nearby);
      if (subject.type === "room") {
        const ps = s.proposals.filter((p) => p.roomId === roomId && p.status !== "rejected");
        const line = (st: string) => ps.filter((p) => p.status === st).map((p) => `· ${p.title}`).join("\n") || "· 无";
        answer = {
          answer: `已确认：\n${line("confirmed")}\n\n待确认：\n${line("pending")}`,
          followup: "演示：此摘要由本页的事项列表拼出，不是模型输出。",
          sources: Array.from(new Set(ps.flatMap((p) => p.sources))).slice(0, 6),
        };
      }
      set((p) => ({ ...p, aiTurns: p.aiTurns.map((t) => (t.id === id ? { ...t, answer } : t)) }));
    },

    review: (id: string, status: "confirmed" | "rejected" | "pending") =>
      set((p) => ({
        ...p,
        proposals: p.proposals.map((x) => (x.id === id ? { ...x, status, reviewedBy: status === "pending" ? undefined : meId } : x)),
      })),

    createRoom: (name: string, kind: Room["kind"], inviteOrgId: string | null) => {
      const id = newId("room");
      const guests = kind === "external" && inviteOrgId ? fixture.users.filter((u) => u.orgId === inviteOrgId).map((u) => u.id) : [];
      const r: Room = { id, name, kind, project: "未归入项目", ownerOrgId: s.orgId, memberIds: [meId, ...guests], unread: {} };
      set((p) => ({ ...p, rooms: [r, ...p.rooms], messages: { ...p.messages, [id]: [] }, roomId: id, view: "chat" }));
    },
  };

  return { s, set, meId, user, org, myRooms, room, msgs, actions };
}

export type Lab = ReturnType<typeof useLab>;
