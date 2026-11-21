import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";

export const runtime = "nodejs";
export const maxDuration = 45;

/**
 * Room assistant for Project Room B. Reads ONE room under the caller's RLS, asks the
 * configured model, and returns the answer to the caller only. It writes nothing:
 * no message, proposal, room or record is created here.
 */
const schema = z.object({
  roomId: z.string().uuid(),
  mode: z.enum(["summary", "explain", "translate", "split"]),
  eventId: z.string().uuid().optional(),
  language: z.string().max(24).optional(),
}).strict();

const SHAPES: Record<string, string> = {
  summary: `{"summary": string, "decided": [{"text": string, "sources": [seq]}], "open_questions": [{"text": string, "sources": [seq]}], "todos": [{"text": string, "owner": string, "sources": [seq]}], "contradictions": [{"text": string, "sources": [seq]}], "version_notes": [{"text": string, "sources": [seq]}], "clarify": [string]}`,
  explain: `{"answer": string, "sources": [seq]}`,
  translate: `{"translation": string}`,
  split: `{"suggestions": [{"name": string, "purpose": string, "kind": "external" | "internal", "member_names": [string], "file_names": [string], "reason": string, "sources": [seq]}]}`,
};
const TASKS: Record<string, string> = {
  summary: "Summarise this room for the reader. decided = things the parties explicitly agreed. open_questions = raised but unanswered. todos = actions someone said they will do or was asked to do. contradictions = statements or file versions that disagree (numbers, dates, specs). version_notes = what changed between file versions as stated in the room. clarify = up to 3 short questions the reader should ask. Empty arrays are correct when nothing qualifies.",
  explain: "Explain the TARGET message in plain words using only the surrounding room content: what is being asked or stated, and what it implies for the reader.",
  translate: "Translate the TARGET message faithfully. Keep numbers, units, part numbers and names unchanged.",
  split: "Decide whether this discussion has grown into separate work streams that deserve their own sub rooms. Suggest at most 3, or none. member_names must be chosen only from MEMBERS; file_names only from FILES. Use kind internal only if the stream is clearly one organisation's private discussion.",
};

function provider() {
  const pref = process.env.SOURCERATING_LLM_PROVIDER || "auto";
  const go = process.env.SOURCERATING_OPENCODE_GO_API_KEY, ds = process.env.SOURCERATING_DEEPSEEK_API_KEY;
  if (go && pref !== "deepseek-direct") return { name: "opencode-go", key: go, endpoint: process.env.SOURCERATING_OPENCODE_GO_ENDPOINT || "https://opencode.ai/zen/go/v1/chat/completions", model: process.env.SOURCERATING_OPENCODE_GO_MODEL || "deepseek-v4.1-flash" };
  if (ds) return { name: "deepseek-direct", key: ds, endpoint: process.env.SOURCERATING_DEEPSEEK_ENDPOINT || "https://api.deepseek.com/chat/completions", model: process.env.SOURCERATING_DEEPSEEK_MODEL || "deepseek-flash" };
  return null;
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
  const { roomId, mode, eventId, language } = parsed.data;
  if ((mode === "explain" || mode === "translate") && !eventId) return Response.json({ ok: false, error: "eventId_required" }, { status: 400 });

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: who, error: whoError } = await client.auth.getUser(token);
  if (whoError || !who.user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Everything below is read with the caller's token, so RLS is the access check.
  const { data: room } = await client.from("rooms").select("id,name,kind,purpose,parent_room_id").eq("id", roomId).maybeSingle();
  if (!room) return Response.json({ ok: false, error: "Room access denied" }, { status: 403 });
  const p = provider();
  if (!p) return Response.json({ ok: false, error: "AI provider is not configured" }, { status: 503 });

  const [ev, members, files, orgs] = await Promise.all([
    client.from("room_events").select("id,seq,event_type,payload,actor_user_id,actor_organization_id,actor_display_name,created_at").eq("room_id", roomId).order("seq", { ascending: false }).limit(mode === "translate" ? 1 : 80),
    client.from("room_members").select("user_id,acting_organization_id,member_display_name").eq("room_id", roomId).is("removed_at", null),
    client.from("room_file_versions").select("id,logical_name,version_no,size_bytes,sha256,created_at,source_event_id").eq("room_id", roomId).order("created_at"),
    client.from("organizations").select("id,name"),
  ]);
  const orgName = (id: string) => orgs.data?.find((o) => o.id === id)?.name ?? "?";
  const rows = (ev.data ?? []).slice().reverse();
  type Target = { id: string; seq: number; payload: Record<string, unknown> };
  let target = null as Target | null;
  if (eventId) {
    const { data } = await client.from("room_events").select("id,seq,payload").eq("id", eventId).eq("room_id", roomId).maybeSingle();
    if (!data) return Response.json({ ok: false, error: "Source event unavailable" }, { status: 404 });
    target = data as Target;
  }
  const line = (e: (typeof rows)[number]) => {
    const pl = (e.payload ?? {}) as Record<string, unknown>;
    const who = `${e.actor_display_name ?? "member"} (${orgName(e.actor_organization_id)})`;
    const body =
      e.event_type === "message.posted" ? String(pl.text ?? "") :
      e.event_type === "file.attached" ? `[file ${pl.logical_name} v${pl.version_no}] ${pl.caption ?? ""}` :
      e.event_type === "confirmation.recorded" ? `[${pl.decision} ${pl.logical_name ?? "item"} v${pl.version_no ?? ""}] ${pl.comment ?? ""}` :
      e.event_type === "file.review_requested" ? `[review requested ${pl.logical_name} v${pl.version_no}] ${pl.note ?? ""}` :
      e.event_type === "room.summary_shared" ? `[summary from ${pl.from_room_name ?? "a sub room"}] ${pl.text ?? ""}` : "";
    return body ? `[#${e.seq}] ${e.created_at.slice(0, 16)} ${who}: ${body.slice(0, 1500)}` : "";
  };
  const transcriptLines = rows.map((event) => ({ seq: event.seq, id: event.id, text: line(event) })).filter((entry) => entry.text);
  const packTranscript = (limit: number) => {
    const selected: typeof transcriptLines = [];
    let size = 0;
    for (let i = transcriptLines.length - 1; i >= 0; i--) {
      const entry = transcriptLines[i];
      if (size + entry.text.length + (selected.length ? 1 : 0) > limit) break;
      selected.unshift(entry);
      size += entry.text.length + (selected.length > 1 ? 1 : 0);
    }
    return { text: selected.map((entry) => entry.text).join("\n"), selected };
  };
  const initialTranscript = packTranscript(mode === "summary" ? 12000 : 24000);
  const targetText = target ? String((target.payload as Record<string, unknown>)?.text ?? "") : "";
  if ((mode === "explain" || mode === "translate") && !targetText.trim()) return Response.json({ ok: false, error: "No text to work on" }, { status: 422 });

  const buildPrompt = (bodyTranscript: string) => [
    `ROOM: ${room.name}${room.purpose ? ` — ${room.purpose}` : ""} (${room.kind})`,
    `MEMBERS: ${(members.data ?? []).slice(0, 80).map((m) => `${m.member_display_name ?? "member"} (${orgName(m.acting_organization_id)})`).join("; ")}`,
    `FILES: ${(files.data ?? []).slice(-80).map((f) => `${f.logical_name} v${f.version_no} sha256:${f.sha256.slice(0, 10)} ${f.created_at.slice(0, 10)}`).join("; ") || "none"}`,
    mode === "translate" ? "" : `TRANSCRIPT (each line starts with its sequence number):\n${bodyTranscript}`,
    target ? `TARGET [#${target.seq}]: ${targetText.slice(0, 6000)}` : "",
    `TASK: ${TASKS[mode]}`,
    mode === "summary" ? "Keep the summary under 200 words and each list to at most 4 short items; omit unsupported items." : "",
    `Answer in ${language || "the language the reader's colleagues use in this room"}.`,
    `Use only what is written above. Do not invent facts, prices, dates or commitments. "sources" are the #numbers of the lines that support the item.`,
    `Return JSON only, exactly this shape: ${SHAPES[mode]}`,
  ].filter(Boolean).join("\n\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  try {
    let result: unknown = null;
    let successfulTranscript = initialTranscript.selected;
    let invalidReason = "AI returned invalid JSON";
    // Retry an incomplete summary once, using a smaller context and one overall timeout.
    const attempts = mode === "summary" ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const selected = attempt === 0 ? initialTranscript : packTranscript(4000);
      const attemptPrompt = buildPrompt(selected.text) + (attempt ? "\nKeep each list to at most 2 items and keep the complete JSON concise." : "");
      const res = await fetch(p.endpoint, {
        method: "POST", cache: "no-store", signal: controller.signal,
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          model: p.model, temperature: 0.1, max_tokens: mode === "summary" ? (attempt === 0 ? 4096 : 8192) : 2000, response_format: { type: "json_object" },
          messages: [{ role: "system", content: "You are a careful project-room assistant for engineering companies. Output valid JSON only." }, { role: "user", content: attemptPrompt }],
        }),
      });
      if (!res.ok) return Response.json({ ok: false, error: `AI provider returned ${res.status}` }, { status: 502 });
      const envelope = await res.json().catch(() => null);
      const choice = envelope?.choices?.[0];
      const content = choice?.message?.content;
      if (choice?.finish_reason === "length") {
        console.warn("room-assist-output-limit", { provider: p.name, model: p.model, mode, attempt: attempt + 1 });
        invalidReason = "AI response exceeded its output limit";
        continue;
      }
      try { result = typeof content === "string" ? JSON.parse(content) : null; }
      catch { result = null; }
      if (result && typeof result === "object" && !Array.isArray(result)) {
        successfulTranscript = selected.selected;
        break;
      }
      result = null;
    }
    if (!result) return Response.json({ ok: false, error: invalidReason }, { status: 502 });
    // Sequence numbers become event ids the client can jump to; anything the model made up is dropped.
    const bySeq = new Map((mode === "translate" ? [] : successfulTranscript).map((entry) => [entry.seq, entry.id]));
    if (target) bySeq.set(target.seq, target.id);
    const fix = (v: unknown): unknown => {
      if (Array.isArray(v)) return v.map(fix);
      if (v && typeof v === "object") {
        const o: Record<string, unknown> = {};
        for (const [k, x] of Object.entries(v)) o[k] = k === "sources" && Array.isArray(x) ? x.map((n) => bySeq.get(Number(String(n).replace("#", "")))).filter(Boolean) : fix(x);
        return o;
      }
      return v;
    };
    return Response.json({ ok: true, mode, provider: p.name, result: fix(result), written: false });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error && e.name === "AbortError" ? "AI timed out" : "AI provider connection failed" }, { status: 502 });
  } finally { clearTimeout(timer); }
}
