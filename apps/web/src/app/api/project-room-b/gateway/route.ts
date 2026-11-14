import { z } from "zod";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";

export const runtime = "nodejs";

/**
 * Same-origin relay to the room-file-gateway Edge Function. It adds no privilege:
 * the caller's own bearer token is forwarded and the function authorises every action.
 */
const schema = z.union([
  z.object({ action: z.enum(["verify", "sign"]), fileVersionId: z.string().uuid() }).strict(),
  z.object({ action: z.literal("cleanup_orphan"), objectPath: z.string().max(400), roomId: z.string().uuid() }).strict(),
]);

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
  const res = await fetch(`${SUPABASE_URL}/functions/v1/room-file-gateway`, {
    method: "POST", cache: "no-store",
    headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body.data),
  }).catch(() => null);
  if (!res) return Response.json({ ok: false, error: "gateway_unreachable" }, { status: 502 });
  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
