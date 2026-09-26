import { z } from "zod";
import { analyzeProjectMessage } from "@/lib/ai/runtime";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  roomId: z.string().min(1).max(200).optional(),
  latestMessage: z.string().min(1).max(12000),
  recentContext: z.array(z.string().max(4000)).max(20).default([]),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const state = [
      ...body.recentContext.map((item, index) => `Context ${index + 1}: ${item}`),
      `Latest message: ${body.latestMessage}`,
    ].join("\n");

    const result = await analyzeProjectMessage(state);

    return Response.json({
      ok: true,
      roomId: body.roomId ?? null,
      decision: result.decision,
      deepAnalysis: result.deepAnalysis,
      aiStatus: result.aiStatus,
      canonicalWrite: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message, canonicalWrite: false }, { status: 400 });
  }
}