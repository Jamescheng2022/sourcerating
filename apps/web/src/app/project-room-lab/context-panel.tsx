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
  decision: { label: "决定", icon: <Stamp size={13} /> },
  date: { label: "日期", icon: <CalendarClock size={13} /> },
  needs_you: { label: "待处理", icon: <CircleDot size={13} /> },
  requirement: { label: "要求", icon: <FileCheck2 size={13} /> },
};

/** Clickable provenance: every derived item links back to raw messages and files. */
export function Sources({ lab, ids, fileId }: { lab: Lab; ids: string[]; fileId?: string }) {
  const { s, user, actions } = lab;
  const all = Object.values(s.messages).flat();
  const fileIds = [...ids.filter((i) => s.files.some((f) => f.id === i)), ...(fileId && !ids.includes(fileId) ? [fileId] : [])];
  return (
    <div className={css.sources} aria-label="来源">
      {ids.map((id) => {
        const m = all.find((x) => x.id === id);
        if (!m) return null;
        return (
          <button key={id} type="button" className={css.src} onClick={() => actions.jumpTo(id)} title="回到原始消息">
            <CornerDownLeft size={12} />{user(m.userId).name} {timeOf(m.at)}
          </button>
        );
      })}
      {fileIds.map((id) => {
        const f = s.files.find((x) => x.id === id)!;
        return (
          <button key={id} type="button" className={css.src} data-file onClick={() => actions.openFile(id)} title="打开文件">
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
          <button type="button" className={css.primary} onClick={() => actions.review(p.id, "confirmed")}><Check size={15} />确认</button>
          <button type="button" className={css.ghost} onClick={() => actions.review(p.id, "rejected")}><X size={15} />驳回</button>
        </div>
      ) : (
        <div className={css.reviewed}>
          <span>{p.status === "confirmed" ? "已确认" : "已驳回"} · {p.reviewedBy ? user(p.reviewedBy).name : ""}</span>
          <button type="button" onClick={() => actions.review(p.id, "pending")}><Undo2 size={13} />撤销</button>
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
        <Tabs.List className={css.tabs} aria-label="项目面板">
          <Tabs.Trigger value="overview">概览</Tabs.Trigger>
          <Tabs.Trigger value="review">待确认{pending.length > 0 && <i>{pending.length}</i>}</Tabs.Trigger>
          <Tabs.Trigger value="files">文件</Tabs.Trigger>
          <Tabs.Trigger value="people">成员</Tabs.Trigger>
          <Tabs.Trigger value="ai"><Sparkles size={13} />AI</Tabs.Trigger>
        </Tabs.List>
        <button type="button" className={css.iconBtn} onClick={actions.closePanel} aria-label="关闭面板"><X size={18} /></button>
      </div>

      <Tabs.Content value="overview" className={css.tabBody}>
        <div className={css.scope} data-internal={room.kind === "internal"}>
          <span className={css.scopeIcon}>{room.kind === "internal" ? <LockKeyhole size={16} /> : <Hash size={16} />}</span>
          <div>
            <b>{room.name}</b>
            <small>{room.project}</small>
          </div>
        </div>
        <h5>谁能看到这里</h5>
        <div className={css.orgRow}>
          {orgIds.map((id) => (
            <span key={id} className={css.orgBlock}><OrgMark color={org(id).color} short={org(id).short} size={22} /><b>{org(id).short}</b><small>{room.memberIds.filter((u) => user(u).orgId === id).length} 人</small></span>
          ))}
        </div>
        <h5>已确认</h5>
        {done.filter((p) => p.status === "confirmed").length === 0 && <p className={css.none}>还没有确认的事项</p>}
        {done.filter((p) => p.status === "confirmed").map((p) => (
          <div key={p.id} className={css.fact}>
            <span className={css.kind} data-kind={p.kind}>{KIND[p.kind].icon}</span>
            <div><b>{p.title}</b><Sources lab={lab} ids={p.sources} fileId={p.fileId} /></div>
          </div>
        ))}
        {pending.length > 0 && (
          <button type="button" className={css.linkRow} onClick={() => actions.openPanel("review")}>{pending.length} 项 AI 整理的事项等待确认 →</button>
        )}
      </Tabs.Content>

      <Tabs.Content value="review" className={css.tabBody}>
        <p className={css.hint}><Sparkles size={13} /> AI 从聊天中整理，确认后才成为项目记录</p>
        {mine.length > 0 && <h5>需要你方处理</h5>}
        {mine.map((p) => <ProposalCard key={p.id} lab={lab} p={p} />)}
        {rest.length > 0 && <h5>待确认</h5>}
        {rest.map((p) => <ProposalCard key={p.id} lab={lab} p={p} />)}
        {pending.length === 0 && <p className={css.none}>没有待确认的事项</p>}
        {done.length > 0 && <h5>已处理</h5>}
        {done.map((p) => <ProposalCard key={p.id} lab={lab} p={p} />)}
      </Tabs.Content>

      <Tabs.Content value="files" className={css.tabBody}>
        {files.length === 0 && <p className={css.none}>这个房间还没有文件</p>}
        {files.slice().reverse().map((f) => {
          const src = allMsgs.find((m) => m.fileId === f.id);
          const old = files.some((x) => x.supersedes === f.id);
          return (
            <button key={f.id} type="button" className={css.fileRow} data-old={old} onClick={() => actions.openFile(f.id)}>
              <span className={css.fileGlyph} data-kind={f.kind}><FileIcon kind={f.kind} /></span>
              <span className={css.fileMeta}>
                <b>{f.name}</b>
                <span>{src ? `${user(src.userId).name} · ${timeOf(src.at)} · ` : ""}{formatSize(f.size)}
                  {(f.version > 1 || old) && <em className={css.ver}>v{f.version}</em>}{old && <em className={css.old}>旧版</em>}</span>
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
                <span><b>{user(uid).name}{uid === meId && <em>你</em>}</b><small>{user(uid).title}</small></span>
              </div>
            ))}
          </div>
        ))}
        <p className={css.hint}>邀请新成员：演示版未接入邀请接口</p>
      </Tabs.Content>

      <Tabs.Content value="ai" className={`${css.tabBody} ${css.aiBody}`}>
        <div className={css.aiScroll}>
          <p className={css.privateNote}><EyeOff size={13} /> 仅你可见 · 不会发到群里</p>
          {turns.length === 0 && (
            <div className={css.aiEmpty}>
              <button type="button" onClick={() => actions.ask({ type: "room", id: room.id }, "这个房间目前定了什么？")}>这个房间目前定了什么？</button>
              <small>或在任意消息、文件上点 <Sparkles size={12} /> 问 AI</small>
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
                    <button type="button" className={css.useBtn} onClick={() => actions.insertDraft(t.answer!.answer)}>放进输入框（由你决定是否发送）</button>
                  </div>
                ) : (
                  <div className={css.thinking} aria-live="polite">正在读取你有权查看的上下文<i /><i /><i /></div>
                )}
              </div>
            );
          })}
          <div ref={end} />
        </div>
        <form className={css.aiInput} onSubmit={(e) => { e.preventDefault(); if (!q.trim()) return; void actions.ask({ type: "room", id: room.id }, q.trim()); setQ(""); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="问这个房间的任何事" aria-label="向 AI 提问" />
          <button type="submit" className={css.send} disabled={!q.trim()} aria-label="提问"><ArrowUp size={16} /></button>
        </form>
      </Tabs.Content>
    </Tabs.Root>
  );
}
