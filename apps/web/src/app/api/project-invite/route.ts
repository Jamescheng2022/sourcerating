import "server-only";
import { handleInviteRelay } from "@/lib/invite-relay-server";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return await handleInviteRelay(request, process.env);
}
