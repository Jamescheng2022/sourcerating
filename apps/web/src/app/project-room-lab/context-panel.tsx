"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { ArrowUp, CalendarClock, Check, CircleDot, CornerDownLeft, EyeOff, FileCheck2, Hash, LockKeyhole, Sparkles, Stamp, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatSize, timeOf } from "./demo/adapter";
import type { PanelTab, Proposal } from "./demo/types";
import { FileIcon, OrgMark } from "./message";
import type { Lab } from "./use-lab";
import css from "./lab.module.css";

const KIND: Record<Proposal["kind"], { label: string; icon: React.ReactNode }> = {
  decision: { label: "Decision", icon: <Stamp size={13} /> },
  date: { label: "Date", icon: <CalendarClock size={13} /> },
  needs_you: { label: "Action Needed", icon: <CircleDot size={13} /> },
  requirement: { label: "Requirement", icon: <FileCheck2 size={13} /> },
};

/** Clickable provenance: every derived item links back to raw messages and files. */
export function Sources({ lab, ids, fileId }: { lab: Lab; ids: string[]; fileId?: string }) {
  const { s, user, actions } = lab;
  const all = Object.values(s.messages).flat();
  const fileIds = [...ids.filter((i) => s.files.some((f) => f.id === i)), ...(fileId && !ids.includes(fileId) ? [fileId] : [])];
  return (
    <div className={css.sources} aria-label="Sources">
      {ids.map((id) => {
        const m = all.find((x) => x.id === id);
        if (!m) return null;
        return (
          <button key={id} type="button" className={css.src} onClick={() => actions.jumpTo(id)} title="Back to original message">
            <CornerDownLeft size={12} />{user(m.userId).name} {timeOf(m.at)}
          </button>
        );
      })}
      {fileIds.map((id) => {
        const f = s.files.find((x) => x.id === id)!;
        return (
          <button key={id} type="button" className={css.src} data-file onClick={() => actions.openFile(id)} title="Open file">
            <FileIcon kind={f.kind} />{f.name.replace(/\.[^.]+$/, "")}{(f.version > 1 || f.supersedes) && ` v${f.version}`}
          </button>
        );
      })}
    </div>
  );
}

function ProposalCard({ lab, p }: { lab: Lab; p: Proposal }) {
  const { actions, user, org } = lab;
  return (
    <article className={css.card} data-status={p.status} data-testid={`proposal-${p.id}`}>
      <header>
        <span className={css.kind} data-kind={p.kind}>{KIND[p.kind].icon}{KIND[p.kind].label}</span>
        {p.forOrgId && <span className={css.forOrg}><OrgMark color={org(p.forOrgId).color} short={org(p.forOrgId).short} size={14} />{org(p.forOrgId).short}</span>}
      </header>
      <h4>{p.title}</h4>
      {p.detail && <p>{p.detail}</p>}
      <Sources lab={lab} ids={p.sources} fileId={p.fileId} />
      {p.status === "pending" ? (
        <div className={css.cardActs}>
          <button type="button" className={css.primary} onClick={() => actions.review(p.id, "confirmed")}><Check size={15} />Confirm</button>
          <button type="button" className={css.ghost} onClick={() => actions.review(p.id, "rejected")}><X size={15} />Reject</button>
        </div>
      ) : (
        <div className={css.reviewed}>
          <span>{p.status === "confirmed" ? "Confirmed" : "Rejected"} · {p.reviewedBy ? user(p.reviewedBy).name : ""}</span>
          <button type="button" onClick={() => actions.review(p.id, "pending")}><Undo2 size={13} />Undo</button>
        </div>
      )}
    </article>
  );
}

export function ContextPanel({ lab }: { lab: Lab }) {
  const { s, room, user, org, meId, actions } = lab;
  const ps = s.proposals.filter((p) => p.roomId === room.id);
  const pending = ps.filter((p) => p.status === "pending");
  const mine = pending.filter((p) => p.forOrgId === s.orgId);
  const rest = pending.filter((p) => p.forOrgId !== s.orgId);
  const done = ps.filter((p) => p.status !== "pending");
  const files = s.files.filter((f) => f.roomId === room.id);
  const orgIds = Array.from(new Set(room.memberIds.map((id) => user(id).orgId)));
  const turns = s.aiTurns.filter((t) => t.roomId === room.id);
  const [q, setQ] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const lastAnswer = turns.at(-1)?.answer;
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [turns.length, lastAnswer]);
  const allMsgs = s.messages[room.id] ?? [];

  return (
    <Tabs.Root className={css.panel} value={s.panel.tab} onValueChange={(v) => actions.openPanel(v as PanelTab)}>
      <div className={css.panelHead}>
        <Tabs.List className={css.tabs} aria-label="Project Panel">
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="review">Review{pending.length > 0 && <i>{pending.length}</i>}</Tabs.Trigger>
          <Tabs.Trigger value="files">Files</Tabs.Trigger>
          <Tabs.Trigger value="people">Members</Tabs.Trigger>
          <Tabs.Trigger value="ai"><Sparkles size={13} />AI</Tabs.Trigger>
        </Tabs.List>
        <button type="button" className={css.iconBtn} onClick={actions.closePanel} aria-label="Close panel"><X size={18} /></button>
      </div>

      <Tabs.Content value="overview" className={css.tabBody}>
        <div className={css.scope} data-internal={room.kind === "internal"}>
          <span className={css.scopeIcon}>{room.kind === "internal" ? <LockKeyhole size={16} /> : <Hash size={16} />}</span>
          <div>
            <b>{room.name}</b>
            <small>{room.project}</small>
          </div>
        </div>
        <h5>Who can see this</h5>
        <div className={css.orgRow}>
          {orgIds.map((id) => (
            <span key={id} className={css.orgBlock}><OrgMark color={org(id).color} short={org(id).short} size={22} /><b>{org(id).short}</b><small>{room.memberIds.filter((u) => user(u).orgId === id).length} members</small></span>
          ))}
        </div>
        <h5>Confirmed</h5>
        {done.filter((p) => p.status === "confirmed").length === 0 && <p className={css.none}>No confirmed items yet</p>}
        {done.filter((p) => p.status === "confirmed").map((p) => (
          <div key={p.id} className={css.fact}>
            <span className={css.kind} data-kind={p.kind}>{KIND[p.kind].icon}</span>
            <div><b>{p.title}</b><Sources lab={lab} ids={p.sources} fileId={p.fileId} /></div>
          </div>
        ))}
        {pending.length > 0 && (
          <button type="button" className={css.linkRow} onClick={() => actions.openPanel("review")}>{pending.length} AI structured items awaiting review →</button>
        )}
      </Tabs.Content>

      <Tabs.Content value="review" className={css.tabBody}>
        <p className={css.hint}><Sparkles size={13} /> AI structured from chat; becomes project record upon confirmation</p>
        {mine.length > 0 && <h5>Action Required by Your Team</h5>}
        {mine.map((p) => <ProposalCard key={p.id} lab={lab} p={p} />)}
        {rest.length > 0 && <h5>Pending Review</h5>}
        {rest.map((p) => <ProposalCard key={p.id} lab={lab} p={p} />)}
        {pending.length === 0 && <p className={css.none}>No pending items</p>}
        {done.length > 0 && <h5>Processed</h5>}
        {done.map((p) => <ProposalCard key={p.id} lab={lab} p={p} />)}
      </Tabs.Content>

      <Tabs.Content value="files" className={css.tabBody}>
        {files.length === 0 && <p className={css.none}>No files in this room yet</p>}
        {files.slice().reverse().map((f) => {
          const src = allMsgs.find((m) => m.fileId === f.id);
          const old = files.some((x) => x.supersedes === f.id);
          return (
            <button key={f.id} type="button" className={css.fileRow} data-old={old} onClick={() => actions.openFile(f.id)}>
              <span className={css.fileGlyph} data-kind={f.kind}><FileIcon kind={f.kind} /></span>
              <span className={css.fileMeta}>
                <b>{f.name}</b>
                <span>{src ? `${user(src.userId).name} · ${timeOf(src.at)} · ` : ""}{formatSize(f.size)}
                  {(f.version > 1 || old) && <em className={css.ver}>v{f.version}</em>}{old && <em className={css.old}>Old version</em>}</span>
              </span>
            </button>
          );
        })}
      </Tabs.Content>

      <Tabs.Content value="people" className={css.tabBody}>
        {orgIds.map((id) => (
          <div key={id} className={css.orgGroup}>
            <h5><OrgMark color={org(id).color} short={org(id).short} size={18} />{org(id).name}<small>{org(id).place}</small></h5>
            {room.memberIds.filter((u) => user(u).orgId === id).map((uid) => (
              <div key={uid} className={css.person}>
                <span className={css.avatar} style={{ background: org(id).color }}>{user(uid).name.slice(0, 1)}</span>
                <span><b>{user(uid).name}{uid === meId && <em>You</em>}</b><small>{user(uid).title}</small></span>
              </div>
            ))}
          </div>
        ))}
        <p className={css.hint}>Invite members: Not connected in demo version</p>
      </Tabs.Content>

      <Tabs.Content value="ai" className={`${css.tabBody} ${css.aiBody}`}>
        <div className={css.aiScroll}>
          <p className={css.privateNote}><EyeOff size={13} /> Visible only to you · Not shared with room</p>
          {turns.length === 0 && (
            <div className={css.aiEmpty}>
              <button type="button" onClick={() => actions.ask({ type: "room", id: room.id }, "What has been decided in this room so far?")}>What has been decided in this room so far?</button>
              <small>Or click <Sparkles size={12} /> Ask AI on any message or file</small>
            </div>
          )}
          {turns.map((t) => {
            const m = t.subject.type === "message" ? allMsgs.find((x) => x.id === t.subject.id) : undefined;
            const f = t.subject.type === "file" ? s.files.find((x) => x.id === t.subject.id) : undefined;
            return (
              <div key={t.id} className={css.turn}>
                {m && <button type="button" className={css.subject} onClick={() => actions.jumpTo(m.id)}><b>{user(m.userId).name}</b>{m.text ?? m.voice?.transcript ?? ""}</button>}
                {f && <button type="button" className={css.subject} onClick={() => actions.openFile(f.id)}><b><FileIcon kind={f.kind} /></b>{f.name} · v{f.version}</button>}
                <p className={css.ask}>{t.question}</p>
                {t.answer ? (
                  <div className={css.answer}>
                    <p>{t.answer.answer}</p>
                    {t.answer.followup && <p className={css.follow}>{t.answer.followup}</p>}
                    <Sources lab={lab} ids={t.answer.sources} />
                    <button type="button" className={css.useBtn} onClick={() => actions.insertDraft(t.answer!.answer)}>Put into composer (you decide whether to send)</button>
                  </div>
                ) : (
                  <div className={css.thinking} aria-live="polite">Reading authorized context<i /><i /><i /></div>
                )}
              </div>
            );
          })}
          <div ref={end} />
        </div>
        <form className={css.aiInput} onSubmit={(e) => { e.preventDefault(); if (!q.trim()) return; void actions.ask({ type: "room", id: room.id }, q.trim()); setQ(""); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything about this room" aria-label="Ask AI" />
          <button type="submit" className={css.send} disabled={!q.trim()} aria-label="Send"><ArrowUp size={16} /></button>
        </form>
      </Tabs.Content>
    </Tabs.Root>
  );
}
