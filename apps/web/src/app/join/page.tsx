"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { STORAGE_KEY_ORG_ID, STORAGE_KEY_ROLE } from "@/lib/demo-session";

type InvitePreview = {
  ok: boolean;
  project?: { id: string; name?: string; code?: string };
  organization?: { id: string; name?: string };
  room?: { id: string; name?: string; kind?: string };
  invitedRole?: string;
  invitedEmail?: string | null;
  expiresAt?: string;
  error?: string;
};

export default function JoinProjectPage() {
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawToken = params.get("token") || "";
    setToken(rawToken);
    setLoading(true);
    setError(null);

    if (!rawToken) {
      setError("Missing invite token.");
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const response = await fetch(
          "/api/project-invite",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "preview", token: rawToken }),
          },
        );
        const data = (await response.json()) as InvitePreview;
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Invitation is invalid or expired.");
        }
        setPreview(data);
        if (data.invitedEmail) setEmail(data.invitedEmail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load invitation.");
      } finally {
        setLoading(false);
      }
    })();
  }, [retry]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError(null);

    try {
      const bootstrap = await fetch(
        "/api/project-invite",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "bootstrap",
            token,
            email,
            password,
            displayName,
          }),
        },
      );

      const bootstrapData = await bootstrap.json();
      if (!bootstrap.ok || !bootstrapData.ok) {
        throw new Error(bootstrapData.error || "Unable to prepare your account.");
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !signInData.user) {
        throw new Error(
          "Unable to sign in. Check your email and password, or contact the project buyer.",
        );
      }

      const { data: claimData, error: claimError } = await supabase.rpc(
        "claim_project_invite",
        { p_token: token },
      );
      if (claimError || !claimData?.acting_organization_id) {
        throw new Error(claimError?.message || "Unable to claim invitation.");
      }

      localStorage.setItem(STORAGE_KEY_ROLE, "supplier");
      localStorage.setItem(
        STORAGE_KEY_ORG_ID,
        String(claimData.acting_organization_id),
      );

      window.location.assign("/project-room");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to join project.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-sm text-slate-400">Checking project invitation...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-950 p-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-7">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
          SourceRating Project Invitation
        </div>
        <h1 className="mt-2 text-xl font-bold text-white">
          Join project room
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Project:{" "}
          <span className="font-semibold text-slate-200">
            {preview?.project?.name || "SourceRating Project"}
          </span>
        </p>
        <p className="text-sm leading-6 text-slate-400">
          Room:{" "}
          <span className="font-semibold text-slate-200">
            {preview?.room?.name || "Shared Room"}
          </span>
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
            {error}
          </div>
        )}

        {!preview?.ok && <div className="mt-4 space-y-3 text-sm">
          <p className="text-slate-300">Ask the project buyer for a fresh invitation if this link is missing, invalid or expired.</p>
          {token && <button type="button" onClick={() => setRetry(value => value + 1)} className="rounded bg-sky-500 px-3 py-2 font-semibold text-slate-950">Retry invitation check</button>}
        </div>}
        <Link href="/project-room" className="mt-4 inline-block text-sm font-semibold text-sky-300 underline">Go to project sign in</Link>
        {preview?.organization?.name && <p className="mt-3 text-sm text-slate-300">Joining as: {preview.organization.name}</p>}

        {preview?.ok && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-300">
                Your name
              </span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Wang Lin / 王林"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-300">Email</span>
              <input
                type="email"
                required
                value={email}
                disabled={Boolean(preview.invitedEmail)}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none disabled:opacity-70 focus:border-sky-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-300">
                Password
              </span>
              <input
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 10 characters"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || !email || password.length < 10}
              className="mt-2 w-full rounded-lg bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
            >
              {submitting ? "Joining project..." : "Join Project Room"}
            </button>

            <p className="text-[11px] leading-5 text-slate-400">
              This invitation grants access only to the room shown above. Other
              companies&apos; private rooms remain isolated.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
