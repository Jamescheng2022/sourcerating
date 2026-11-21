"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (pending) return;
    setPending(true); setNotice(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/reset-password",
      });
      setNotice(error ? "Unable to request a reset. Please try again later." : "If this account exists, a reset link will be sent to its email address.");
    } catch { setNotice("Unable to request a reset. Please try again later."); }
    finally { setPending(false); }
  }
  return <main className="min-h-dvh bg-slate-950 p-6 text-slate-100">
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">Reset your password</h1>
      <label className="block">Account email<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded border border-slate-600 bg-slate-900 p-3" /></label>
      <button disabled={pending} className="rounded bg-sky-500 p-3 font-semibold text-slate-950">{pending ? "Requesting..." : "Send reset link"}</button>
      {notice && <p role="status">{notice}</p>}
      <Link href="/project-room" className="block text-sky-300 underline">Go to project sign in</Link>
    </form>
  </main>;
}
