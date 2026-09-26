import { supabase } from "./supabase";
import type { RoomEvent } from "./demo-session";

export type RoomAnalysisResponse = {
  ok: boolean;
  deepProvider?: "opencode-go" | "deepseek-direct" | null;
  aiStatus?: {
    jevConfigured?: boolean;
    openCodeGoConfigured?: boolean;
    deepSeekConfigured?: boolean;
    deepAnalysisAvailable?: boolean;
  };
  error?: string;
};

export async function analyzeRoomEvent(
  roomId: string,
  eventId: string,
  _actingOrganizationId: string,
): Promise<RoomAnalysisResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { ok: false, error: "No authenticated session." };
  }

  const { data: event, error } = await supabase
    .from("room_events")
    .select("id,room_id,seq,event_type,payload")
    .eq("id", eventId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (error || !event) {
    return { ok: false, error: "Event unavailable." };
  }

  const payload = (event as RoomEvent).payload;
  const latestMessage =
    payload && typeof payload === "object" && typeof payload.text === "string"
      ? payload.text
      : "";

  if (!latestMessage.trim()) {
    return { ok: false, error: "No analyzable message text." };
  }

  const response = await fetch("/api/project-room/analyze", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomId,
      latestMessage,
      recentContext: [],
    }),
  });

  const result = (await response.json().catch(() => ({}))) as RoomAnalysisResponse;
  if (!response.ok) {
    return {
      ok: false,
      error: result.error || `AI analysis returned ${response.status}`,
    };
  }

  return result;
}