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
  const ended = lab.real ? !!s.ended?.[room.id] : older >= 120;
  const loadRef = useRef(() => {});
  useEffect(() => { loadRef.current = () => actions.loadOlder(); });
  const parts = useMemo(() => ({
    Header: () => (
      <div className={css.listHead}>
        {ended ? "Beginning of message history" : <button type="button" onClick={() => loadRef.current()}>Load earlier messages</button>}
      </div>
    ),
    Footer: () => <div className={css.listFoot} />,
  }), [ended]);

  return (
    <section className={css.chat} aria-label="Chat">
      <header className={css.chatHead}>
        <button type="button" className={`${css.iconBtn} ${css.onlyNarrow}`} onClick={onBack} aria-label="Back to room list"><ArrowLeft size={20} /></button>
        <button type="button" className={css.title} onClick={() => actions.openPanel("people")} aria-label={`${room.name}, view members`}>
          <span className={css.titleName}>
            {room.kind === "internal" ? <LockKeyhole size={15} className={css.internalInk} /> : <Hash size={15} />}
            <b>{room.name}</b>
          </span>
          <span className={css.titleSub}>
            {room.kind === "internal" ? (
              <span className={css.internalInk}>Internal to {orgs[0].short} only</span>
            ) : (
              orgs.map((o) => (<span key={o.id} className={css.orgChip}><OrgMark color={o.color} short={o.short} size={14} />{o.short}</span>))
            )}
          </span>
        </button>
        <div className={css.headActs}>
          <button type="button" className={css.iconBtn} onClick={() => setSearching((v) => !v)} aria-label="Search messages" aria-pressed={searching}><Search size={18} /></button>
          {pending > 0 && (
            <button type="button" className={css.pill} onClick={() => actions.openPanel("review")} aria-label={`${pending} items pending review`}>
              <ListChecks size={15} /><span>{pending}</span><span className={css.hideNarrow}>Review</span>
            </button>
          )}
          <button type="button" className={`${css.iconBtn} ${css.hideNarrow}`} onClick={() => actions.openPanel("people")} aria-label="Participants">
            <Users size={18} /><small>{room.memberIds.length}</small>
          </button>
          <button type="button" className={css.iconBtn} onClick={() => (s.panel.open ? actions.closePanel() : actions.openPanel(s.panel.tab))} aria-label={s.panel.open ? "Close project panel" : "Open project panel"} aria-pressed={s.panel.open}>
            <PanelRight size={18} />
          </button>
          {!lab.real && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className={css.demoBtn} aria-label="Demo controls"><FlaskConical size={14} /><span className={css.hideNarrow}>DEMO</span></button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={css.menu} align="end" sideOffset={6}>
                <DropdownMenu.Label className={css.menuLabel}>Demo Controls · Simulated</DropdownMenu.Label>
                <DropdownMenu.CheckboxItem className={css.menuItem} checked={s.failNext} onCheckedChange={(v) => actions.setFailNext(!!v)}>
                  <span className={css.check} data-on={s.failNext} />Simulate send failure
                </DropdownMenu.CheckboxItem>
                <DropdownMenu.Item className={css.menuItem} onSelect={() => actions.simulateIncoming()}>Simulate incoming message</DropdownMenu.Item>
                <DropdownMenu.Item className={css.menuItem} onSelect={() => { actions.loadOlder(2000); toast("Loaded 2,000 generated history messages"); }}>Load 2,000 history messages</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          )}
        </div>
      </header>

      {searching && (
        <div className={css.searchBar}>
          <Search size={16} aria-hidden />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages and files in room" aria-label="Search messages in room"
            onKeyDown={(e) => { if (e.key === "Enter" && hits.length) setHit((h) => (h - 1 + hits.length) % hits.length); if (e.key === "Escape") { setSearching(false); setQ(""); } }} />
          <span className={css.hitCount} aria-live="polite">{q.trim() ? (hits.length ? `${hit + 1}/${hits.length}` : "No results") : ""}</span>
          <button type="button" className={css.iconBtn} disabled={!hits.length} onClick={() => setHit((h) => (h - 1 + hits.length) % hits.length)} aria-label="Previous result"><ChevronUp size={18} /></button>
          <button type="button" className={css.iconBtn} disabled={!hits.length} onClick={() => setHit((h) => (h + 1) % hits.length)} aria-label="Next result"><ChevronDown size={18} /></button>
          <button type="button" className={css.iconBtn} onClick={() => { setSearching(false); setQ(""); }} aria-label="Close search"><X size={18} /></button>
        </div>
      )}

      <div className={css.listWrap}>
        {msgs.length === 0 ? (
          <div className={css.empty}><Hash size={28} /><b>{room.name}</b><span>Send the first message to start collaborating</span></div>
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
            aria-label={fresh ? `${fresh} new messages, scroll to bottom` : "Scroll to bottom"}>
            <ArrowDown size={16} />{fresh > 0 && <span>{fresh} new messages</span>}
          </button>
        )}
      </div>

      {s.typing?.roomId === room.id && (
        <div className={css.typing} aria-live="polite">{user(s.typing.userId).name} is typing<i /><i /><i /></div>
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
      {room.kind === "internal" && <div className={css.internalStrip}><LockKeyhole size={12} /> Internal Room · External organizations cannot view content here</div>}
      {reply && (
        <div className={css.replyBar}>
          <span><b>Reply to {user(reply.userId).name}</b>{reply.text ?? replyFile?.name ?? "Voice message"}</span>
          <button type="button" className={css.iconBtn} onClick={() => actions.setReply(null)} aria-label="Cancel reply"><X size={16} /></button>
        </div>
      )}
      {file && (
        <div className={css.attach}>
          <FileIcon kind={file.type.startsWith("image/") ? "image" : "pdf"} />
          <span><b>{file.name}</b>{formatSize(file.size)}{lab.real ? "" : " · Demo: local only"}</span>
          <button type="button" className={css.iconBtn} onClick={() => { setFile(null); if (pick.current) pick.current.value = ""; }} aria-label="Remove attachment"><X size={16} /></button>
        </div>
      )}
      <div className={css.inputRow}>
        <input ref={pick} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Select attachment" data-testid="file-input" />
        <button type="button" className={css.iconBtn} onClick={() => pick.current?.click()} aria-label="Add attachment"><Paperclip size={20} /></button>
        <textarea
          ref={ta} rows={1} value={text} aria-label="Type message"
          placeholder={room.kind === "internal" ? "Message internal team..." : others.length ? `Message ${others.join(", ")}...` : "Type a message..."}
          onChange={(e) => setText(e.target.value)}
          onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !composing && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
        />
        <button type="button" className={css.send} disabled={!text.trim() && !file} onClick={submit} aria-label="Send"><ArrowUp size={18} /></button>
      </div>
    </footer>
  );
}
