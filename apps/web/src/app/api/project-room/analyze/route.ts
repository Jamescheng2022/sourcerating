import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { analyzeProjectMessage } from "@/lib/ai/runtime";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  roomId: z.string().uuid(),
  eventId: z.string().uuid(),
}).strict();

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: z.infer<typeof requestSchema>;
    try { body = requestSchema.parse(await request.json()); }
    catch { return Response.json({ ok: false, error: 'Invalid analysis request', canonicalWrite: false }, { status: 400 }); }
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } = await client.auth.getUser(token);
    if (userError || !userData.user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // RLS check: the caller must be able to see this room before any AI quota is spent.
    const { data: room, error: roomError } = await client
      .from("rooms")
      .select("id")
      .eq("id", body.roomId)
      .maybeSingle();

    if (roomError || !room) {
      return Response.json({ ok: false, error: "Room access denied" }, { status: 403 });
    }

    // Resolve the selected persisted event under the caller's RLS before any
    // provider call. A client cannot forge text/context or move another room's
    // event into this room. No staging/canonical write occurs in this endpoint.
    const { data: event, error: eventError } = await client.from('room_events')
      .select('id,room_id,event_type,payload').eq('id',body.eventId)
      .eq('room_id',body.roomId).eq('event_type','message.posted').maybeSingle();
    if(eventError || !event) return Response.json({ok:false,error:'Source event unavailable',canonicalWrite:false},{status:404});
    const text=event.payload && typeof event.payload.text==='string' ? event.payload.text : '';
    if(!text.trim() || text.length>12000) return Response.json({ok:false,error:'Source event has no supported message text',canonicalWrite:false},{status:422});
    // Do not classify synthetic labels such as "Latest message" as message
    // content (the word "Latest" previously matched the fallback's "late").
    const result = await analyzeProjectMessage(text);

    return Response.json({
      ok: true,
      roomId: body.roomId,
      sourceEventId: event.id,
      decision: result.decision,
      deepAnalysis: result.deepAnalysis,
      deepProvider: result.deepProvider,
      aiStatus: result.aiStatus,
      canonicalWrite: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { ok: false, error: message, canonicalWrite: false },
      { status: 400 },
    );
  }
}
