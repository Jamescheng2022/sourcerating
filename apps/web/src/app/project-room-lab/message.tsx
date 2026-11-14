"use client";

import * as ContextMenu from "@radix-ui/react-context-menu";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  AlertCircle, CornerUpLeft, Copy, FileSpreadsheet, FileText, GitCompare, Image as ImageIcon, Languages,
  Link2, MessagesSquare, MoreHorizontal, Pause, Play, RotateCw, ScanSearch, Sparkles, Stamp, Trash2,
} from "lucide-react";
import { memo, useEffect, useState, type ReactNode } from "react";
import { dayOf, formatSize, timeOf } from "./demo/adapter";
import type { Msg, RoomFile } from "./demo/types";
import type { Lab } from "./use-lab";
import css from "./lab.module.css";

export function FileIcon({ kind }: { kind: RoomFile["kind"] }) {
  if (kind === "xlsx") return <FileSpreadsheet size={20} aria-hidden />;
  if (kind === "image") return <ImageIcon size={20} aria-hidden />;
  return <FileText size={20} aria-hidden />;
}

export function OrgMark({ color, short, size = 18 }: { color: string; short: string; size?: number }) {
  return (
    <span className={css.orgMark} style={{ background: color, width: size, height: size, fontSize: size * 0.5 }} aria-hidden>
      {short.slice(0, 1)}
    </span>
  );
}

function Voice({ seconds, transcript }: { seconds: number; transcript: string }) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const h = setInterval(() => setT((v) => (v + 1 >= seconds ? (setPlaying(false), 0) : v + 1)), 1000);
    return () => clearInterval(h);
  }, [playing, seconds]);
  return (
    <div className={css.voice}>
      <button type="button" className={css.voiceBtn} onClick={() => setPlaying((p) => !p)} aria-label={playing ? "暂停语音" : "播放语音（演示，无音频）"}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <span className={css.wave} aria-hidden>
        {Array.from({ length: 22 }, (_, i) => (
          <i key={i} style={{ height: 6 + ((i * 7) % 13), opacity: i / 22 <= t / seconds ? 1 : 0.35 }} />
        ))}
      </span>
      <span className={css.voiceTime}>0:{String(playing ? t : seconds).padStart(2, "0")}</span>
      <p className={css.transcript}>{transcript}</p>
    </div>
  );
}

interface Action { key: string; label: string; icon: ReactNode; run: () => void; danger?: boolean; primary?: boolean }

function mark(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (<>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>);
}

interface Props {
  lab: Lab; m: Msg; prev?: Msg; highlight: boolean; query: string; toast: (t: string) => void;
}

export const MessageItem = memo(function MessageItem({ lab, m, prev, highlight, query, toast }: Props) {
  const { s, meId, user, org, actions, room } = lab;
  const u = user(m.userId);
  const o = org(u.orgId);
  const mine = m.userId === meId;
  const file = m.fileId ? s.files.find((f) => f.id === m.fileId) : undefined;
  const newDay = !prev || dayOf(prev.at) !== dayOf(m.at);
  const grouped = !newDay && prev?.userId === m.userId && +new Date(m.at) - +new Date(prev.at) < 5 * 60_000;
  const translated = s.translated.includes(m.id);
  const quoted = m.replyTo ? (s.messages[room.id] ?? []).find((x) => x.id === m.replyTo) : undefined;
  const quotedFile = quoted?.fileId ? s.files.find((f) => f.id === quoted.fileId) : undefined;
  const evidence = s.proposals.filter((p) => p.status !== "rejected" && (p.sources.includes(m.id) || (file && p.fileId === file.id)));
  const failed = m.status === "failed";

  const acts: Action[] = [];
  if (failed) {
    acts.push({ key: "retry", label: "重新发送", icon: <RotateCw size={15} />, run: () => actions.retry(m.id), primary: true });
    acts.push({ key: "del", label: "删除", icon: <Trash2 size={15} />, run: () => actions.remove(m.id), danger: true });
  } else {
    if (file) acts.push({ key: "preview", label: "预览", icon: <ScanSearch size={15} />, run: () => actions.openFile(file.id), primary: true });
    acts.push({ key: "reply", label: "回复", icon: <CornerUpLeft size={15} />, run: () => actions.setReply(m.id), primary: true });
    acts.push({
      key: "ai", label: "问 AI", icon: <Sparkles size={15} />, primary: true,
      run: () => actions.ask(file ? { type: "file", id: file.id } : { type: "message", id: m.id }, file ? "这份文件讲了什么？" : "解释这条消息"),
    });
    if (m.tr || (lab.real && m.text)) acts.push({ key: "tr", label: translated ? "隐藏译文" : "翻译", icon: <Languages size={15} />, run: () => actions.toggleTranslate(m.id), primary: !file });
    if (file?.supersedes) acts.push({ key: "cmp", label: "比较版本", icon: <GitCompare size={15} />, run: () => actions.openFile(file.id, "compare") });
    if (file) acts.push({ key: "rel", label: "相关消息", icon: <MessagesSquare size={15} />, run: () => actions.openFile(file.id, "related") });
    if (m.text) acts.push({ key: "copy", label: "复制文字", icon: <Copy size={15} />, run: () => { void navigator.clipboard?.writeText(m.text!); toast("已复制"); } });
    acts.push({
      key: "link", label: "复制消息链接", icon: <Link2 size={15} />,
      run: () => { void navigator.clipboard?.writeText(`${location.origin}${location.pathname}?room=${room.id}&msg=${m.id}`); toast("链接已复制"); },
    });
    if (evidence.length) acts.push({ key: "ev", label: "查看证据记录", icon: <Stamp size={15} />, run: () => actions.openPanel("review") });
  }

  const bubble = (
    <div className={css.bubble} data-mine={mine} data-failed={failed} data-file={!!file}>
      {quoted && (
        <button type="button" className={css.quote} onClick={() => actions.jumpTo(quoted.id)}>
          <b>{user(quoted.userId).name}</b>
          <span>{quoted.text ?? quotedFile?.name ?? "语音消息"}</span>
        </button>
      )}
      {file && (
        <button type="button" className={css.fileCard} onClick={() => actions.openFile(file.id)} aria-label={`预览文件 ${file.name}`}>
          {file.localUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.localUrl} alt="" className={css.thumb} />
          ) : (
            <span className={css.fileGlyph} data-kind={file.kind}><FileIcon kind={file.kind} /></span>
          )}
          <span className={css.fileMeta}>
            <b>{mark(file.name, query)}</b>
            <span>
              {formatSize(file.size)}
              {(file.version > 1 || s.files.some((f) => f.supersedes === file.id)) && <em className={css.ver}>v{file.version}</em>}
              {s.files.some((f) => f.supersedes === file.id) && <em className={css.old}>已被新版取代</em>}
            </span>
          </span>
        </button>
      )}
      {m.voice && <Voice {...m.voice} />}
      {m.text && <p className={css.text}>{mark(m.text, query)}</p>}
      {translated && m.tr && (
        <div className={css.private}>
          <span className={css.privateTag}><Languages size={12} /> 译文 · 仅你可见</span>
          <p>{m.tr}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className={css.item} data-msg={m.id}>
      {newDay && <div className={css.day}><span>{dayOf(m.at)}</span></div>}
      <div className={css.row} data-mine={mine} data-grouped={grouped} data-hl={highlight}>
        {!mine && <span className={css.avatar} style={{ background: o.color }} data-hidden={grouped} aria-hidden>{u.name.slice(0, 1)}</span>}
        <div className={css.col}>
          {!grouped && (
            <div className={css.meta}>
              {!mine && (<><b>{u.name}</b><span className={css.orgTag} style={{ color: o.color }}>{o.short}</span></>)}
              <time>{timeOf(m.at)}</time>
            </div>
          )}
          <div className={css.bubbleWrap}>
            <ContextMenu.Root>
              <ContextMenu.Trigger asChild>{bubble}</ContextMenu.Trigger>
              <ContextMenu.Portal>
                <ContextMenu.Content className={css.menu}>
                  {acts.map((a) => (
                    <ContextMenu.Item key={a.key} className={css.menuItem} data-danger={a.danger} onSelect={a.run}>{a.icon}{a.label}</ContextMenu.Item>
                  ))}
                </ContextMenu.Content>
              </ContextMenu.Portal>
            </ContextMenu.Root>
            <div className={css.hoverBar} role="toolbar" aria-label="消息操作">
              {acts.filter((a) => a.primary).slice(0, 3).map((a) => (
                <button key={a.key} type="button" title={a.label} aria-label={a.label} onClick={a.run}>{a.icon}</button>
              ))}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button type="button" aria-label="更多操作"><MoreHorizontal size={15} /></button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className={css.menu} align={mine ? "end" : "start"} sideOffset={4}>
                    {acts.map((a) => (
                      <DropdownMenu.Item key={a.key} className={css.menuItem} data-danger={a.danger} onSelect={a.run}>{a.icon}{a.label}</DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>
          {(m.status === "sending" || failed || evidence.some((p) => p.status === "confirmed")) && (
            <div className={css.under}>
              {m.status === "sending" && <span className={css.sending}>发送中…</span>}
              {failed && (
                <button type="button" className={css.failed} onClick={() => actions.retry(m.id)}>
                  <AlertCircle size={13} /> 未发出 · 点击重发
                </button>
              )}
              {evidence.filter((p) => p.status === "confirmed").map((p) => (
                <button key={p.id} type="button" className={css.evChip} data-status={p.status} onClick={() => actions.openPanel("review")} title="查看证据记录">
                  <Stamp size={12} /> 已记录：{p.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
