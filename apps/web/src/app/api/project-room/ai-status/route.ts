import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const roomId = z
    .string()
    .uuid()
    .safeParse(new URL(request.url).searchParams.get("roomId"));
  if (!roomId.success)
    return Response.json({ error: "Invalid room" }, { status: 400 });
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: identity, error } = await client.auth.getUser(token);
  if (error || !identity.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: room, error: roomError } = await client
    .from("rooms")
    .select("id")
    .eq("id", roomId.data)
    .maybeSingle();
  if (roomError || !room)
    return Response.json({ error: "Room access denied" }, { status: 403 });
  const scope = (process.env.SOURCERATING_PILOT_ROOM_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .includes(room.id)
    ? "automatic"
    : "manual";
  // Only non-secret metadata; never return the key, its prefix, or service credentials.
  return Response.json(
    {
      configured: Boolean(process.env.SOURCERATING_DEEPSEEK_API_KEY),
      provider: "deepseek-direct",
      model: process.env.SOURCERATING_DEEPSEEK_MODEL || "deepseek-flash",
      scope,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}