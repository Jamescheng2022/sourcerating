/** View-model types for the lab. A real adapter maps Supabase rows onto these. */
export interface Org { id: string; name: string; short: string; place: string; color: string }
export interface User { id: string; name: string; orgId: string; title: string }
export interface Room {
  id: string; name: string; kind: "external" | "internal"; project: string;
  ownerOrgId: string; memberIds: string[]; unread: Record<string, number>;
}
export interface FileDiff { field: string; from: string; to: string }
export interface RoomFile {
  id: string; roomId: string; name: string; kind: "pdf" | "xlsx" | "image" | "other";
  size: number; version: number; lineage: string; supersedes?: string;
  preview?: { plate?: { t: number; od: number; holes: number; rev: string }; sheet?: string[][]; photo?: string };
  diff?: FileDiff[];
  /** Set for files picked in this browser session; never uploaded. */
  localUrl?: string;
}
export type SendStatus = "sending" | "sent" | "failed";
export interface Msg {
  id: string; userId: string; at: string;
  text?: string; tr?: string; fileId?: string; replyTo?: string;
  voice?: { seconds: number; transcript: string };
  status?: SendStatus;
  /** Generated filler used only to exercise paging and virtualisation. */
  filler?: boolean;
}
export type ProposalKind = "decision" | "date" | "needs_you" | "requirement";
export interface Proposal {
  id: string; roomId: string; kind: ProposalKind; title: string; detail: string;
  sources: string[]; fileId?: string; forOrgId: string | null;
  status: "pending" | "confirmed" | "rejected"; reviewedBy?: string;
}
export interface AiAnswer { answer: string; followup?: string; sources: string[] }
export interface AiTurn {
  id: string; roomId: string;
  subject: { type: "message" | "file" | "room"; id: string };
  question: string; answer?: AiAnswer;
}
export type PanelTab = "overview" | "review" | "files" | "people" | "ai";
