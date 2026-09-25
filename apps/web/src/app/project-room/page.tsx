"use client";

import { useMemo, useState } from "react";

const rooms = [
  { id: "internal", name: "Buyer Internal", boundary: "PRIVATE", note: "Only Apex Living Modular" },
  { id: "eastframe", name: "EastFrame Steel", boundary: "EXTERNAL", note: "Visible to EastFrame Steel Co., Ltd." },
  { id: "siam", name: "Siam Panels", boundary: "EXTERNAL", note: "Visible to Siam Panels Ltd." },
];

const roomMessages: Record<string, {who:string; org:string; text:string; file?:string}[]> = {
  internal: [
    { who: "Tanawat Chen", org: "Apex Living Modular", text: "EastFrame may move to RMB 320,000 if we change to 100mm PU panels. Can we absorb that within contingency?" },
    { who: "Korn Kittisak", org: "Commercial", text: "Yes. The 45-day delivery would also reduce crane rental exposure, so the net impact is acceptable." },
  ],
  eastframe: [
    { who: "Tanawat Chen", org: "Apex Living Modular", text: "We need the exterior envelope upgraded from 75mm to 100mm PU fireproof panels. Please also confirm the 1.8 kPa wind-load connection check." },
    { who: "Wang Lin 王林", org: "EastFrame Steel", text: "已完成节点重新核算。M24高强螺栓和连接板满足1.8 kPa。我们重新出了Quotation v3。", file: "Quotation_EastFrame.pdf · v3 · supersedes v2" },
    { who: "Wang Lin 王林", org: "EastFrame Steel", text: "Updated package total: RMB 320,000. Delivery to Laem Chabang: 45 calendar days instead of 60." },
  ],
  siam: [
    { who: "Chatchai V.", org: "Siam Panels Ltd.", text: "We submitted local EPS alternative Quote v2 at RMB 345,000 with 55 days lead time." },
  ],
};

export default function ProjectRoomPreview() {
  const [roomId, setRoomId] = useState("eastframe");
  const [tab, setTab] = useState("Requirements");
  const [review, setReview] = useState(false);
  const room = useMemo(() => rooms.find(r => r.id === roomId)!, [roomId]);
  const messages = roomMessages[roomId];

  return (
    <main className="h-[100dvh] overflow-hidden bg-slate-100 text-slate-900">
      <div className="grid h-full grid-cols-1 md:grid-cols-[230px_minmax(0,1fr)_360px]">
        <aside className="hidden md:flex flex-col bg-slate-950 text-slate-200 border-r border-slate-800">
          <div className="p-4 border-b border-slate-800">
            <div className="text-sm font-semibold">Apex Living Modular</div>
            <div className="text-[11px] text-slate-400 mt-1">Buyer Organization</div>
          </div>
          <div className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Active Project</div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <div className="text-xs font-semibold">Bangkok Prefab Office</div>
              <div className="text-[10px] text-sky-400 mt-1">BKK-MOD-2026-08</div>
            </div>
          </div>
          <div className="px-2">
            <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-slate-500">Project Rooms</div>
            {rooms.map(r => (
              <button key={r.id} onClick={() => setRoomId(r.id)}
                className={"w-full text-left rounded-md px-3 py-2.5 text-xs mb-1 border-l-2 " + (roomId===r.id ? "bg-slate-800 border-sky-400 text-white" : "border-transparent text-slate-300 hover:bg-slate-900")}>
                <div className="flex items-center justify-between gap-2">
                  <span>{r.name}</span>
                  {r.id==="eastframe" && <span className="rounded-full bg-amber-400/20 text-amber-300 px-1.5 py-0.5 text-[9px]">2</span>}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-auto p-3 border-t border-slate-800">
            <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3">
              <div className="text-xs font-semibold text-amber-300">Needs You · 2</div>
              <div className="mt-1 text-[10px] text-slate-400">Commercial change and open logistics question</div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col bg-white">
          <header className="shrink-0 border-b border-slate-200 bg-white">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Bangkok Prefab Office / <span className="font-semibold text-slate-900">{room.name}</span></div>
                <div className="mt-1 text-[11px] text-slate-400">Phase 2 · Technical & Commercial Alignment</div>
              </div>
              <select className="md:hidden rounded border border-slate-300 px-2 py-1.5 text-xs" value={roomId} onChange={e=>setRoomId(e.target.value)}>
                {rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className={"px-4 py-2 text-[11px] border-t " + (room.boundary==="PRIVATE" ? "bg-indigo-50 border-indigo-100 text-indigo-900" : "bg-amber-50 border-amber-100 text-amber-900")}>
              <span className="font-bold">{room.boundary}</span> · {room.note}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-5">
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">Project Conversation</div>
              {messages.map((m,i)=>(
                <div key={i}>
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-[11px] font-bold">{m.who}</span>
                    <span className="text-[10px] text-slate-400">{m.org}</span>
                  </div>
                  <div className="rounded-xl rounded-tl-sm border border-slate-200 bg-white p-3 text-[13px] leading-6 shadow-sm">
                    {m.text}
                    {m.file && <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50 p-3">
                      <div className="text-xs font-semibold text-sky-900">{m.file}</div>
                      <div className="mt-1 text-[10px] text-sky-700">2.4 MB · PDF · linked to this message</div>
                    </div>}
                  </div>
                </div>
              ))}
              {roomId==="eastframe" && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/60 overflow-hidden">
                  <div className="px-3 py-2 border-b border-sky-100 text-[10px] uppercase tracking-wider font-bold text-sky-800">AI Proposal · Staging Draft</div>
                  <div className="p-3">
                    <div className="text-xs font-bold">AI noticed a commercial change</div>
                    <div className="mt-1 text-xs text-slate-700">Quote v3: RMB 320,000 · delivery 45 days · panel 75mm → 100mm</div>
                    {review && <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                      <div className="rounded border bg-white p-2"><div className="text-slate-400">Price</div><b>295k → 320k</b></div>
                      <div className="rounded border bg-white p-2"><div className="text-slate-400">Lead time</div><b>60d → 45d</b></div>
                      <div className="rounded border bg-white p-2"><div className="text-slate-400">Panel</div><b>75 → 100mm</b></div>
                    </div>}
                    <div className="mt-3 flex gap-2">
                      <button onClick={()=>setReview(v=>!v)} className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">{review ? "Hide" : "Review"}</button>
                      <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs">Dismiss</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-3xl rounded-xl border border-slate-200">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] text-slate-500">Sending to: <b>{room.note}</b></div>
              <textarea rows={2} placeholder="Write a project message..." className="w-full resize-none px-3 py-2.5 text-sm outline-none" />
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="text-xs text-slate-400">Attach · Voice · @Mention</div>
                <button className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Send</button>
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden md:flex flex-col bg-white border-l border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <div className="text-sm font-bold">Project State</div>
            <div className="mt-1 text-[10px] text-slate-500">Derived from conversation and evidence</div>
          </div>
          <div className="flex gap-1 overflow-x-auto border-b border-slate-200 p-2">
            {["Requirements","Quotes","Files","Decisions","Needs You"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} className={"whitespace-nowrap rounded px-2 py-1.5 text-[10px] font-semibold " + (tab===t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}>{t}</button>
            ))}
          </div>
          <div className="p-3 space-y-2 overflow-y-auto">
            {tab==="Requirements" && <>
              <State title="Wall Panel" value="100mm PU Fireproof Core" status="Pending confirmation" />
              <State title="Wind Load" value="1.8 kPa · verified" status="Verified" />
              <State title="Thermal R-value" value="≥ 3.5" status="Verified" />
            </>}
            {tab==="Quotes" && <>
              <State title="EastFrame · v3" value="RMB 320,000 · 45 days" status="Latest" />
              <State title="EastFrame · v2" value="RMB 295,000 · 60 days" status="Superseded" />
              <State title="Siam Panels · v2" value="RMB 345,000 · 55 days" status="Latest" />
            </>}
            {tab==="Files" && <State title="Quotation_EastFrame.pdf" value="v3 · supersedes v2 · SHA256 tracked" status="Evidence" />}
            {tab==="Decisions" && <>
              <State title="M24 Grade 8.8 anchor bolts" value="Confirmed by Priya Somchai" status="Canonical" />
              <State title="100mm panel upgrade" value="Pending human review" status="Staging" />
            </>}
            {tab==="Needs You" && <>
              <State title="Review Quote v3" value="+RMB25k · 45d delivery · 100mm panel" status="High" />
              <State title="Answer logistics scope" value="Container bracing + desiccant bags?" status="Medium" />
            </>}
          </div>
        </aside>
      </div>
    </main>
  );
}

function State({title,value,status}:{title:string;value:string;status:string}) {
  return <div className="rounded-lg border border-slate-200 p-3">
    <div className="text-xs font-semibold">{title}</div>
    <div className="mt-1 text-[11px] text-slate-600">{value}</div>
    <div className="mt-2 flex items-center justify-between"><span className="text-[9px] uppercase tracking-wide text-slate-400">{status}</span><button className="text-[10px] font-semibold text-sky-700">View source</button></div>
  </div>;
}
