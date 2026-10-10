"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => { if (active) setReady(Boolean(data.session)); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (active) setReady(Boolean(session)); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!ready || pending) return;
    setPending(true); setNotice(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut(); setPassword("");
      setNotice("Password updated. Sign in with your new password.");
    } catch { setNotice("Unable to update password. Request a fresh reset link and try again."); }
    finally { setPending(false); }
  }
  return <main className="min-h-dvh bg-slate-950 p-6 text-slate-100">
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">Choose a new password</h1>
      {ready && <><label className="block">New password<input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded border border-slate-600 bg-slate-900 p-3" /></label>
      <button disabled={pending} className="rounded bg-sky-500 p-3 font-semibold text-slate-950">{pending ? "Updating..." : "Update password"}</button></>}
      {!ready && !notice && <p>This reset link is missing or expired. Request a fresh link.</p>}
      {notice && <p role="status">{notice}</p>}
      <Link href="/forgot-password" className="block text-sky-300 underline">Request a new reset link</Link>
      <Link href="/project-room" className="block text-sky-300 underline">Go to project sign in</Link>
    </form>
  </main>;
}
