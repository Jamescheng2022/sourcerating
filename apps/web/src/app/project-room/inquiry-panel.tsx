"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Inquiry = { id: string; subject: string; detail: string; created_at: string;
  submitted_by_user_id: string; submitter_organization_name: string | null; acknowledged_at: string | null };

export function InquiryPanel({ roomId, isBuyer, onSubmitted }: {
  roomId: string; isBuyer: boolean; onSubmitted: () => void;
}) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [subject, setSubject] = useState("");
  const [detail, setDetail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const request = useRef<{ id: string; subject: string; detail: string } | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const { data, error: queryError } = await supabase.from("project_inquiries")
      .select("id,subject,detail,created_at,submitted_by_user_id,submitter_organization_name,acknowledged_at").eq("room_id", roomId)
      .order("created_at", { ascending: false }).limit(50);
    if (!mounted.current) return;
    if (queryError) setError("Unable to load inquiries. Please try again.");
    else setInquiries(data || []);
  }, [roomId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    const timer = window.setInterval(() => { if (navigator.onLine) void load(); }, 3000);
    return () => { mounted.current = false; window.clearInterval(timer); };
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const text = { subject: subject.trim(), detail: detail.trim() };
    if (!text.subject || !text.detail) { setError("Enter a subject and inquiry details."); return; }
    // Keep the same request ID after an uncertain network outcome/retry.
    if (!request.current || request.current.subject !== text.subject || request.current.detail !== text.detail) {
      request.current = { id: crypto.randomUUID(), ...text };
    }
    setPending(true); setError(null); setNotice(null);
    try {
      const { error: submitError } = await supabase.rpc("submit_project_inquiry", {
        p_room_id: roomId, p_client_request_id: request.current.id,
        p_subject: text.subject, p_detail: text.detail,
      });
      if (submitError) throw submitError;
      if (mounted.current) {
        setSubject(""); setDetail(""); request.current = null;
        setNotice("Inquiry saved. The buyer can review it in Needs You.");
        await load(); onSubmitted();
      }
    } catch {
      if (mounted.current) setError("Unable to save inquiry. Your draft is kept; try again when connected.");
    } finally { if (mounted.current) setPending(false); }
  }

  return (
    <details className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs">
      <summary className="cursor-pointer font-semibold text-slate-800">Inquiries · {isBuyer ? "Buyer collection" : "Your submissions"}</summary>
      <div className="mt-2 max-h-56 md:max-h-72 space-y-3 overflow-y-auto" aria-label="Inquiry collection">
        <p className="text-slate-600">{isBuyer ? "Review partner inquiries in Needs You. Acknowledging keeps the inquiry in this collection." : "Submit a project inquiry for the buyer. Other submitters cannot read your inquiry."}</p>
        {!isBuyer && <form onSubmit={submit} className="space-y-2">
          <label className="block">Inquiry subject
            <input required disabled={pending} maxLength={160} value={subject} onChange={e => setSubject(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white p-2" />
          </label>
          <label className="block">Inquiry details
            <textarea required disabled={pending} maxLength={8000} rows={2} value={detail} onChange={e => setDetail(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white p-2" />
          </label>
          <button type="submit" disabled={pending} className="rounded bg-sky-700 px-3 py-2 font-semibold text-white disabled:opacity-50">
            {pending ? "Saving inquiry..." : "Submit inquiry"}
          </button>
        </form>}
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        {notice && <p role="status" className="text-emerald-700">{notice}</p>}
        <h2 className="font-semibold">{isBuyer ? "Collected inquiries" : "Your inquiries"}</h2>
        {inquiries.length === 0 && <p className="text-slate-500">No inquiries yet.</p>}
        {inquiries.map(inquiry => <article key={inquiry.id} className="rounded border border-slate-200 bg-white p-2">
          <h3 className="font-semibold">{inquiry.subject}</h3>
          <p className="text-slate-600 break-words">{inquiry.submitter_organization_name || "Organization not recorded"} · Submitter {inquiry.submitted_by_user_id.slice(0, 8)}</p>
          <p className="text-slate-600"><time dateTime={inquiry.created_at}>{new Date(inquiry.created_at).toLocaleString()}</time> · {inquiry.acknowledged_at ? "Acknowledged" : "Awaiting buyer review"}</p>
          <p className="whitespace-pre-wrap break-words">{inquiry.detail}</p>
        </article>)}
      </div>
    </details>
  );
}
