import { redirect } from "next/navigation";

/**
 * Legacy Project Room (Version A) has been retired in Release A.
 * All collaboration traffic is cleanly redirected to Project Room B.
 */
export default function LegacyProjectRoomPage() {
  redirect("/project-room-b");
}
