/**
 * DEMO adapter. Everything here is local and simulated: no network, no
 * Supabase, no model call. A production adapter would keep these signatures
 * and call append_room_event / room-file-gateway / the analyze route instead.
 */
import raw from "./fixture.json";
import type { AiAnswer, Msg, Org, Proposal, Room, RoomFile, User } from "./types";

export const fixture = raw as unknown as {
  orgs: Org[]; users: User[]; identities: { orgId: string; userId: string }[];
  rooms: Room[]; files: RoomFile[]; messages: Record<string, Msg[]>;
  proposals: Proposal[]; ai: Record<string, AiAnswer>;
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
let seq = 0;
export const newId = (p: string) => `${p}-${Date.now().toString(36)}-${++seq}`;

/** Simulated send: resolves after a short delay, rejects when `fail` is set. */
export async function demoSend(fail: boolean) {
  await wait(650);
  if (fail) throw new Error("DEMO: simulated network failure");
}

/** Simulated AI: returns the canned answer for a subject, or an honest fallback. */
export async function demoAsk(subjectId: string, nearby: string[]): Promise<AiAnswer> {
  await wait(900);
  return (
    fixture.ai[subjectId] ?? {
      answer:
        "演示环境只为部分消息和文件预置了回答，这一条没有。接入真实模型后，这里会基于你有权查看的上下文作答，并列出来源。",
      sources: nearby,
    }
  );
}

const FILLER = [
  "收到。", "OK, noted.", "图纸我再核一遍。", "Will check and revert.", "好的，明天同步。",
  "Please share the latest revision.", "已转给技术。", "Thanks, received.",
];

/** Generated older history, used only to exercise paging and virtualisation. */
export function demoOlder(room: Room, before: string, count: number, offset: number): Msg[] {
  const end = new Date(before).getTime();
  return Array.from({ length: count }, (_, i) => {
    const n = offset + (count - i);
    return {
      id: `old-${room.id}-${n}`,
      userId: room.memberIds[n % room.memberIds.length],
      at: new Date(end - n * 47 * 60_000).toISOString(),
      text: `${FILLER[n % FILLER.length]} · 历史 #${n}`,
      filler: true,
    };
  });
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
export const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" });
export const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Bangkok" });
