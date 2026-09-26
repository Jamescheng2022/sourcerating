import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { analyzeProjectMessage } from "@/lib/ai/runtime";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  roomId: z.string().uuid(),
  latestMessage: z.string().min(1).max(12000),
  recentContext: z.array(z.string().max(4000)).max(20).default([]),
});

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

    const body = requestSchema.parse(await request.json());
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://qnozpurjtgkmwtvsrjoi.supabase.co";
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "sb_publishable_ksRD_ocrn4jnK6F2h6buFg_GzT9roS6";

    const client = createClient(url, key, {
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

    const state = [
      ...body.recentContext.map((item, index) => `Context ${index + 1}: ${item}`),
      `Latest message: ${body.latestMessage}`,
    ].join("\n");

    const result = await analyzeProjectMessage(state);

    return Response.json({
      ok: true,
      roomId: body.roomId,
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