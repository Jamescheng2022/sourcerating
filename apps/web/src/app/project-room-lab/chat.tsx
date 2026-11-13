"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronUp, FlaskConical, Hash, ListChecks, LockKeyhole,
  PanelRight, Paperclip, Search, Users, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { formatSize } from "./demo/adapter";
import { FileIcon, MessageItem, OrgMark } from "./message";
import type { Lab } from "./use-lab";
import css from "./lab.module.css";

const BASE = 100_000;

export function ChatPane({ lab, toast, onBack }: { lab: Lab; toast: (t: string) => void; onBack: () => void }) {
  const { s, room, msgs, meId, user, org, actions } = lab;
  const vref = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [fresh, setFresh] = useState(0);
  const [hl, setHl] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [hit, setHit] = useState(0);
  const older = s.older[room.id] ?? 0;
  const lastTail = useRef(msgs[msgs.length - 1]?.id);
  const lastRoom = useRef(room.id);
  const holdPaging = useRef(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const saveDraft = useCallback((id: string, text: string) => setDrafts((d) => (d[id] === text ? d : { ...d, [id]: text })), []);

  const orgs = useMemo(() => Array.from(new Set(room.memberIds.map((id) => user(id).orgId))).map(org), [room, user, org]);
  const pending = s.proposals.filter((p) => p.roomId === room.id && p.status === "pending").length;

  // Count messages that arrive at the tail while the reader is scrolled up (prepends don't count).
  useEffect(() => {
    const last = msgs[msgs.length - 1];
    if (lastRoom.current !== room.id) { lastRoom.current = room.id; lastTail.current = last?.id; setFresh(0); setAtBottom(true); return; }
    if (last && last.id !== lastTail.current) {
      if (last.userId === meId) requestAnimationFrame(() => vref.current?.scrollToIndex({ index: msgs.length - 1, align: "end", behavior: "smooth" }));
      else if (!atBottom) setFresh((n) => n + 1);
    }
    lastTail.current = last?.id;
  }, [msgs, room.id, meId, atBottom]);

  const goTo = useCallback((id: string) => {
    const i = msgs.findIndex((m) => m.id === id);
    if (i < 0) return;
    // A jump near the top must not trigger a history prepend mid-scroll, or the target index shifts.
    holdPaging.current = Date.now() + 900;
    vref.current?.scrollToIndex({ index: i, align: "center", behavior: "auto" });
    setHl(id);
    setTimeout(() => setHl((v) => (v === id ? null : v)), 3000);
  }, [msgs]);

  useEffect(() => {
    if (!s.jump) return;
    const id = s.jump.id;
    const h = setTimeout(() => goTo(id), 80);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.jump, room.id]);

  const hits = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    return msgs.filter((m) => {
      const f = m.fileId ? s.files.find((x) => x.id === m.fileId)?.name : "";
      return `${m.text ?? ""} ${m.voice?.transcript ?? ""} ${f}`.toLowerCase().includes(k);
    }).map((m) => m.id);
  }, [q, msgs, s.files]);
  useEffect(() => { setHit(hits.length ? hits.length - 1 : 0); }, [hits.length]);
  useEffect(() => { if (hits[hit]) goTo(hits[hit]);   }, [hit, hits.length]);

  // Older history loads when the top is reached, except while a programmatic jump settles
  // (a prepend mid-jump would shift the target). The header button is the manual fallback.
  const pageOlder = () => { if (Date.now() > holdPaging.current) actions.loadOlder(); };
  const ended = older >= 120;
  const loadRef = useRef(() => {});
  useEffect(() => { loadRef.current = () => actions.loadOlder(); });
  const parts = useMemo(() => ({
    Header: () => (
      <div className={css.listHead}>
        {ended ? "已是最早的消息" : <button type="button" onClick={() => loadRef.current()}>加载更早消息</button>}
      </div>
    ),
    Footer: () => <div className={css.listFoot} />,
  }), [ended]);

  return (
    <section className={css.chat} aria-label="聊天">
      <header className={css.chatHead}>
        <button type="button" className={`${css.iconBtn} ${css.onlyNarrow}`} onClick={onBack} aria-label="返回聊天列表"><ArrowLeft size={20} /></button>
        <button type="button" className={css.title} onClick={() => actions.openPanel("people")} aria-label={`${room.name}，查看成员`}>
          <span className={css.titleName}>
            {room.kind === "internal" ? <LockKeyhole size={15} className={css.internalInk} /> : <Hash size={15} />}
            <b>{room.name}</b>
          </span>
          <span className={css.titleSub}>
            {room.kind === "internal" ? (
              <span className={css.internalInk}>仅 {orgs[0].short} 内部可见</span>
            ) : (
              orgs.map((o) => (<span key={o.id} className={css.orgChip}><OrgMark color={o.color} short={o.short} size={14} />{o.short}</span>))
            )}
          </span>
        </button>
        <div className={css.headActs}>
          <button type="button" className={css.iconBtn} onClick={() => setSearching((v) => !v)} aria-label="搜索消息" aria-pressed={searching}><Search size={18} /></button>
          {pending > 0 && (
            <button type="button" className={css.pill} onClick={() => actions.openPanel("review")} aria-label={`${pending} 项待确认`}>
              <ListChecks size={15} /><span>{pending}</span><span className={css.hideNarrow}>待确认</span>
            </button>
          )}
          <button type="button" className={`${css.iconBtn} ${css.hideNarrow}`} onClick={() => actions.openPanel("people")} aria-label="参与者">
            <Users size={18} /><small>{room.memberIds.length}</small>
          </button>
          <button type="button" className={css.iconBtn} onClick={() => (s.panel.open ? actions.closePanel() : actions.openPanel(s.panel.tab))} aria-label={s.panel.open ? "关闭项目面板" : "打开项目面板"} aria-pressed={s.panel.open}>
            <PanelRight size={18} />
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className={css.demoBtn} aria-label="演示控制"><FlaskConical size={14} /><span className={css.hideNarrow}>DEMO</span></button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={css.menu} align="end" sideOffset={6}>
                <DropdownMenu.Label className={css.menuLabel}>演示控制 · 不触达后端</DropdownMenu.Label>
                <DropdownMenu.CheckboxItem className={css.menuItem} checked={s.failNext} onCheckedChange={(v) => actions.setFailNext(!!v)}>
                  <span className={css.check} data-on={s.failNext} />模拟发送失败
                </DropdownMenu.CheckboxItem>
                <DropdownMenu.Item className={css.menuItem} onSelect={() => actions.simulateIncoming()}>模拟对方来消息</DropdownMenu.Item>
                <DropdownMenu.Item className={css.menuItem} onSelect={() => { actions.loadOlder(2000); toast("已载入 2,000 条生成的历史消息"); }}>载入 2,000 条历史</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      {searching && (
        <div className={css.searchBar}>
          <Search size={16} aria-hidden />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索这个房间的消息和文件" aria-label="搜索当前房间消息"
            onKeyDown={(e) => { if (e.key === "Enter" && hits.length) setHit((h) => (h - 1 + hits.length) % hits.length); if (e.key === "Escape") { setSearching(false); setQ(""); } }} />
          <span className={css.hitCount} aria-live="polite">{q.trim() ? (hits.length ? `${hit + 1}/${hits.length}` : "无结果") : ""}</span>
          <button type="button" className={css.iconBtn} disabled={!hits.length} onClick={() => setHit((h) => (h - 1 + hits.length) % hits.length)} aria-label="上一条结果"><ChevronUp size={18} /></button>
          <button type="button" className={css.iconBtn} disabled={!hits.length} onClick={() => setHit((h) => (h + 1) % hits.length)} aria-label="下一条结果"><ChevronDown size={18} /></button>
          <button type="button" className={css.iconBtn} onClick={() => { setSearching(false); setQ(""); }} aria-label="关闭搜索"><X size={18} /></button>
        </div>
      )}

      <div className={css.listWrap}>
        {msgs.length === 0 ? (
          <div className={css.empty}><Hash size={28} /><b>{room.name}</b><span>发第一条消息开始协作</span></div>
        ) : (
          <Virtuoso
            key={room.id}
            ref={vref}
            className={css.list}
            data={msgs}
            firstItemIndex={BASE - older}
            initialTopMostItemIndex={msgs.length - 1}
            computeItemKey={(_, m) => m.id}
            followOutput={(bottom) => (bottom ? "smooth" : false)}
            atBottomThreshold={80}
            atBottomStateChange={(b) => { setAtBottom(b); if (b) setFresh(0); }}
            startReached={pageOlder}
            increaseViewportBy={{ top: 400, bottom: 200 }}
            components={parts}
            itemContent={(index, m) => (
              <MessageItem lab={lab} m={m} prev={msgs[index - (BASE - older) - 1]} highlight={hl === m.id} query={searching ? q.trim() : ""} toast={toast} />
            )}
          />
        )}
        {!atBottom && msgs.length > 0 && (
          <button type="button" className={css.toBottom} data-fresh={fresh > 0}
            onClick={() => vref.current?.scrollToIndex({ index: msgs.length - 1, align: "end", behavior: "smooth" })}
            aria-label={fresh ? `${fresh} 条新消息，回到底部` : "回到底部"}>
            <ArrowDown size={16} />{fresh > 0 && <span>{fresh} 条新消息</span>}
          </button>
        )}
      </div>

      {s.typing?.roomId === room.id && (
        <div className={css.typing} aria-live="polite">{user(s.typing.userId).name} 正在输入<i /><i /><i /></div>
      )}
      <Composer key={room.id} lab={lab} initial={drafts[room.id] ?? ""} saveDraft={saveDraft} />
    </section>
  );
}

function Composer({ lab, initial, saveDraft }: { lab: Lab; initial: string; saveDraft: (roomId: string, text: string) => void }) {
  const { s, room, user, org, meId, actions } = lab;
  const [text, setText] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [composing, setComposing] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const pick = useRef<HTMLInputElement>(null);
  const reply = s.replyTo ? (s.messages[room.id] ?? []).find((m) => m.id === s.replyTo) : undefined;
  const replyFile = reply?.fileId ? s.files.find((f) => f.id === reply.fileId) : undefined;
  const others = Array.from(new Set(room.memberIds.map((id) => user(id).orgId))).filter((o) => o !== user(meId).orgId).map((o) => org(o).short);

  const grow = () => { const el = ta.current; if (!el) return; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 132)}px`; };
  useEffect(grow, [text]);
  useEffect(() => { if (s.replyTo) ta.current?.focus(); }, [s.replyTo]);
  // An AI answer is only ever offered as a draft: adopt it during render, the user decides whether to send.
  const [adopted, setAdopted] = useState(s.draftInsert?.nonce ?? 0);
  if (s.draftInsert && s.draftInsert.nonce !== adopted) {
    setAdopted(s.draftInsert.nonce);
    setText(text ? `${text}\n${s.draftInsert.text}` : s.draftInsert.text);
  }
  useEffect(() => { if (adopted) ta.current?.focus(); }, [adopted]);
  useEffect(() => { saveDraft(room.id, text); }, [text, room.id, saveDraft]);

  const submit = () => {
    const t = text.trim();
    if (!t && !file) return;
    void actions.send(t, file ?? undefined);
    setText(""); setFile(null);
    if (pick.current) pick.current.value = "";
  };

  return (
    <footer className={css.composer} data-internal={room.kind === "internal"}>
      {room.kind === "internal" && <div className={css.internalStrip}><LockKeyhole size={12} /> 内部房间 · 外部组织看不到这里的内容</div>}
      {reply && (
        <div className={css.replyBar}>
          <span><b>回复 {user(reply.userId).name}</b>{reply.text ?? replyFile?.name ?? "语音消息"}</span>
          <button type="button" className={css.iconBtn} onClick={() => actions.setReply(null)} aria-label="取消回复"><X size={16} /></button>
        </div>
      )}
      {file && (
        <div className={css.attach}>
          <FileIcon kind={file.type.startsWith("image/") ? "image" : "pdf"} />
          <span><b>{file.name}</b>{formatSize(file.size)} · 演示：仅保存在本页，不上传</span>
          <button type="button" className={css.iconBtn} onClick={() => { setFile(null); if (pick.current) pick.current.value = ""; }} aria-label="移除附件"><X size={16} /></button>
        </div>
      )}
      <div className={css.inputRow}>
        <input ref={pick} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="选择附件" data-testid="file-input" />
        <button type="button" className={css.iconBtn} onClick={() => pick.current?.click()} aria-label="添加附件"><Paperclip size={20} /></button>
        <textarea
          ref={ta} rows={1} value={text} aria-label="输入消息"
          placeholder={room.kind === "internal" ? "发给内部同事" : others.length ? `发给 ${others.join("、")}` : "输入消息"}
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !composing && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
        />
        <button type="button" className={css.send} disabled={!text.trim() && !file} onClick={submit} aria-label="发送"><ArrowUp size={18} /></button>
      </div>
    </footer>
  );
}
