"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase-config";

const recoveryStorageKey = "sr_p1_password_recovery";
function clearRecoverySession() {
  for (const suffix of ["", "-user", "-code-verifier"]) sessionStorage.removeItem(recoveryStorageKey + suffix);
}

export default function ResetPasswordPage() {
  const [phase, setPhase] = useState<"checking" | "ready" | "unavailable" | "complete">("checking");
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const clientRef = useRef<SupabaseClient | null>(null);
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    async function initialize() {
      try {
        const url = new URL(window.location.href), hash = new URLSearchParams(url.hash.slice(1));
        const parameter = (key: string) => hash.get(key) ?? url.searchParams.get(key);
        const callback = ["access_token", "refresh_token", "code", "type", "error", "error_code", "error_description"].some(key => parameter(key) !== null);
        // An invalid/new callback must never fall back to an older recovery or project session.
        if (callback) {
          clearRecoverySession();
          if (parameter("type") !== "recovery" || !parameter("access_token") || !parameter("refresh_token") ||
              ["error", "error_code", "error_description"].some(key => parameter(key) !== null)) {
            window.history.replaceState(window.history.state, "", "/reset-password");
            if (active) setPhase("unavailable");
            return;
          }
        }
        // The provider validates the recovery tokens. A separate, per-tab session
        // keeps the existing project login out of password updates and survives reload.
        const client = clientRef.current ?? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { storageKey: recoveryStorageKey, storage: sessionStorage, persistSession: true, autoRefreshToken: false },
        });
        clientRef.current = client;
        const { data } = client.auth.onAuthStateChange((event, session) => {
          if (active && userIdRef.current && (event === "SIGNED_OUT" || session?.user.id !== userIdRef.current)) {
            userIdRef.current = null; setPassword(""); setPhase("unavailable");
          }
        });
        unsubscribe = () => data.subscription.unsubscribe();
        const initialized = await client.auth.initialize();
        if (initialized.error) throw initialized.error;
        const { data: userData, error } = await client.auth.getUser();
        if (error || !userData.user) throw Error("Recovery session unavailable");
        if (active) {
          userIdRef.current = userData.user.id; setAccountEmail(userData.user.email ?? ""); setPhase("ready");
        }
      } catch {
        try { clearRecoverySession(); } catch { /* Storage may be unavailable. Never use project storage as a fallback. */ }
        if (active) setPhase("unavailable");
      }
    }
    void initialize();
    return () => { active = false; unsubscribe?.(); };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const client = clientRef.current, userId = userIdRef.current;
    if (phase !== "ready" || !client || !userId || pending) return;
    setPending(true); setNotice(null);
    try {
      const current = await client.auth.getUser();
      if (current.error || current.data.user?.id !== userId) throw Error("Recovery session changed");
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      // A completed password change must not be reported as failed if subsequent logout fails.
      let revoked = false;
      try { revoked = !(await client.auth.signOut()).error; } catch { /* Report the incomplete revocation below. */ }
      let cleared = false;
      try { clearRecoverySession(); cleared = true; } catch { /* Do not misreport a completed password change. */ }
      userIdRef.current = null; setPassword(""); setPhase("complete");
      setNotice(!cleared ? "Password updated, but this browser could not confirm recovery-session cleanup. Close this recovery tab." :
        revoked ? "Password updated. Sign in with your new password." :
        "Password updated. This recovery session was cleared, but server sign-out could not be confirmed. Other sessions may remain active.");
    } catch { setNotice("Unable to update password. Request a fresh reset link and try again."); }
    finally { setPending(false); }
  }
  return <main className="min-h-dvh bg-slate-950 p-6 text-slate-100">
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">Choose a new password</h1>
      {phase === "checking" && <p role="status">Checking your reset link…</p>}
      {phase === "ready" && <><p>Changing password for <strong>{accountEmail}</strong>.</p><label className="block">New password<input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded border border-slate-600 bg-slate-900 p-3" /></label>
      <button disabled={pending} className="rounded bg-sky-500 p-3 font-semibold text-slate-950">{pending ? "Updating..." : "Update password"}</button></>}
      {phase === "unavailable" && !notice && <p>This reset link is missing or expired. Request a fresh link.</p>}
      {notice && <p role="status">{notice}</p>}
      <Link href="/forgot-password" className="block text-sky-300 underline">Request a new reset link</Link>
      <Link href="/project-room" className="block text-sky-300 underline">Go to project sign in</Link>
    </form>
  </main>;
}
