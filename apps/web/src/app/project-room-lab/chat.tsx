"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, ChevronUp, FlaskConical, Hash, ListChecks, LockKeyhole,
  PanelRight, Paperclip, Search, Sparkles, Tag, Users, X, Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { formatSize } from "./demo/adapter";
import { FileIcon, MessageItem, OrgMark } from "./message";
import type { Lab } from "./use-lab";
import { sendBuffer, type BufferedMessage } from "../project-room-b/send-buffer";
import { getMobileEnterPref } from "../project-room-b/preferences";
import { EnterpriseDossierDialog } from "../project-room-b/dossier-dialog";
import css from "./lab.module.css";

export type StageTemplateId = "manufacturing" | "contract" | "engineering" | "general";

export interface StageItem {
  id: string;
  name: string;
  short: string;
  color: string;
  bg: string;
  border: string;
}

export interface StageTemplate {
  id: StageTemplateId;
  name: string;
  iconName: string;
  stages: StageItem[];
}

export const STAGE_TEMPLATES: StageTemplate[] = [
  {
    id: "manufacturing",
    name: "工业制造与跨境采购",
    iconName: "🏭",
    stages: [
      { id: "rfq", name: "询价阶段 (RFQ)", short: "询价", color: "#b45309", bg: "#fef3c7", border: "#fde68a" },
      { id: "sampling", name: "打样试制 (Sampling)", short: "打样", color: "#6d28d9", bg: "#ede9fe", border: "#ddd6fe" },
      { id: "pilot", name: "小批试产 (Pilot Run)", short: "试产", color: "#1d4ed8", bg: "#dbeafe", border: "#bfdbfe" },
      { id: "mass", name: "大批量产 (Mass Prod)", short: "量产", color: "#15803d", bg: "#dcfce7", border: "#bbf7d0" },
      { id: "after_sales", name: "售后维保 (After-sales)", short: "售后", color: "#b91c1c", bg: "#fee2e2", border: "#fecaca" },
    ],
  },
  {
    id: "contract",
    name: "通用商务合同与履约",
    iconName: "🤝",
    stages: [
      { id: "negotiate", name: "意向洽谈 (Negotiation)", short: "洽谈", color: "#b45309", bg: "#fef3c7", border: "#fde68a" },
      { id: "quote", name: "方案报价 (Quotation)", short: "报价", color: "#0369a1", bg: "#e0f2fe", border: "#bae6fd" },
      { id: "signing", name: "合同签署 (Signing)", short: "签署", color: "#6d28d9", bg: "#ede9fe", border: "#ddd6fe" },
      { id: "executing", name: "履约执行 (In Progress)", short: "履约", color: "#15803d", bg: "#dcfce7", border: "#bbf7d0" },
      { id: "delivered", name: "验收结项 (Delivered)", short: "结项", color: "#475569", bg: "#f1f5f9", border: "#cbd5e1" },
    ],
  },
  {
    id: "engineering",
    name: "技术研发与项目设计",
    iconName: "🔬",
    stages: [
      { id: "req", name: "需求立项 (Spec)", short: "立项", color: "#b45309", bg: "#fef3c7", border: "#fde68a" },
      { id: "design", name: "方案设计 (Design)", short: "设计", color: "#6d28d9", bg: "#ede9fe", border: "#ddd6fe" },
      { id: "dev_test", name: "联调测试 (Testing)", short: "测试", color: "#1d4ed8", bg: "#dbeafe", border: "#bfdbfe" },
      { id: "release", name: "交付投产 (Release)", short: "投产", color: "#15803d", bg: "#dcfce7", border: "#bbf7d0" },
      { id: "maint", name: "运营维保 (Maintenance)", short: "维保", color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
    ],
  },
  {
    id: "general",
    name: "日常敏捷协同",
    iconName: "📋",
    stages: [
      { id: "ongoing", name: "进行中 (Active)", short: "进行", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd" },
      { id: "review", name: "待评审 (Review)", short: "待审", color: "#d97706", bg: "#fef3c7", border: "#fde68a" },
      { id: "done", name: "已完成 (Closed)", short: "完成", color: "#15803d", bg: "#dcfce7", border: "#bbf7d0" },
      { id: "none", name: "无特定阶段 (None)", short: "协同", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
    ],
  },
];

export function inferDefaultTemplate(room: { name: string; kind: string; purpose?: string | null }): StageTemplateId {
  const name = room.name.toLowerCase();
  const purpose = (room.purpose ?? "").toLowerCase();
  if (name.includes("factory") || name.includes("mfg") || name.includes("mold") || name.includes("制造") || name.includes("打样") || name.includes("量产") || purpose.includes("factory")) {
    return "manufacturing";
  }
  if (name.includes("tech") || name.includes("dev") || name.includes("code") || name.includes("qa") || name.includes("设计")) {
    return "engineering";
  }
  if (room.kind === "internal") {
    return "general";
  }
  return "contract";
}

export interface QuickReply {
  shortcut: string;
  title: string;
  text: string;
}

export const QUICK_REPLIES: QuickReply[] = [
  {
    shortcut: "/thanks",
    title: "存证确认 · 感谢合作",
    text: "非常感谢您的确认，该技术与商务约定已在双组织存证链中永久存档。",
  },
  {
    shortcut: "/spec",
    title: "规格核对 · 图纸与公差",
    text: "请贵方工程团队核对最新图纸版本及公差标准，确认无误后请在系统内盖章确认。",
  },
  {
    shortcut: "/leadtime",
    title: "交期同步 · 生产排产",
    text: "原材料已按技术标准备齐，本批次预计排产周期为 7-10 个工作日，届时同步检验报告。",
  },
  {
    shortcut: "/moq",
    title: "MOQ与阶梯报价",
    text: "当前批次最小起订量 (MOQ) 为 500 件，阶梯报价与开模摊销表已更新至项目文件，请查阅。",
  },
  {
    shortcut: "/shipment",
    title: "装船发运 · 商检与报关",
    text: "货物已完成出厂全检并符合装箱规范，正安排订舱报关与装船，提单发票将于发货后同步。",
  },
  {
    shortcut: "/qc",
    title: "首件检验 · FAI 报告",
    text: "首件全尺寸检验报告 (FAI) 及材质证明书 (COA) 已上传至系统，请双方质检主管在线核签。",
  },
];

const BASE = 100_000;

export function ChatPane({ lab, toast, onBack, onOpenAbout }: { lab: Lab; toast: (t: string) => void; onBack: () => void; onOpenAbout?: () => void }) {
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

  const [templateId, setTemplateId] = useState<StageTemplateId>(() => {
    if (typeof window === "undefined") return "contract";
    try {
      const saved = localStorage.getItem(`sr_template_${room.id}`) as StageTemplateId;
      if (saved && STAGE_TEMPLATES.some((t) => t.id === saved)) return saved;
    } catch {}
    return inferDefaultTemplate(room);
  });

  const activeTemplate = STAGE_TEMPLATES.find((t) => t.id === templateId) ?? STAGE_TEMPLATES[0];

  const [stage, setStage] = useState<string>(() => {
    if (typeof window === "undefined") return activeTemplate.stages[0].id;
    try {
      const saved = localStorage.getItem(`sr_stage_${room.id}`);
      if (saved && activeTemplate.stages.some((x) => x.id === saved)) return saved;
    } catch {}
    return activeTemplate.stages[0].id;
  });

  const roomPurpose = (room as unknown as { purpose?: string }).purpose;

  // Re-sync template & stage when room changes
  useEffect(() => {
    try {
      let tId = localStorage.getItem(`sr_template_${room.id}`) as StageTemplateId;
      if (!tId || !STAGE_TEMPLATES.some((t) => t.id === tId)) {
        tId = inferDefaultTemplate({ name: room.name, kind: room.kind, purpose: roomPurpose });
      }
      setTemplateId(tId);

      const tmpl = STAGE_TEMPLATES.find((t) => t.id === tId) ?? STAGE_TEMPLATES[0];
      const saved = localStorage.getItem(`sr_stage_${room.id}`);
      if (saved && tmpl.stages.some((x) => x.id === saved)) {
        setStage(saved);
      } else {
        setStage(tmpl.stages[0].id);
      }
    } catch {
      setTemplateId("contract");
      setStage("negotiate");
    }
  }, [room.id, room.name, room.kind, roomPurpose]);

  const currentStage = activeTemplate.stages.find((x) => x.id === stage) ?? activeTemplate.stages[0];

  const handleStageChange = (next: string) => {
    setStage(next);
    try { localStorage.setItem(`sr_stage_${room.id}`, next); } catch {}
    const sObj = activeTemplate.stages.find((x) => x.id === next);
    toast(`已将推进阶段切换至【${sObj?.name ?? next}】`);
  };

  const handleTemplateChange = (nextTmpl: StageTemplateId) => {
    setTemplateId(nextTmpl);
    const tmpl = STAGE_TEMPLATES.find((t) => t.id === nextTmpl) ?? STAGE_TEMPLATES[0];
    const initialStage = tmpl.stages[0].id;
    setStage(initialStage);
    try {
      localStorage.setItem(`sr_template_${room.id}`, nextTmpl);
      localStorage.setItem(`sr_stage_${room.id}`, initialStage);
    } catch {}
    toast(`已切换业务场景模型为【${tmpl.name}】`);
  };

  const [dossierOpen, setDossierOpen] = useState(false);
  const [dossierOrgShort, setDossierOrgShort] = useState("QS1");

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
  useEffect(() => { if (hits[hit]) goTo(hits[hit]); }, [hit, hits, goTo]);

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
              orgs.map((o) => (
                <span
                  key={o.id}
                  className={css.orgChip}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDossierOrgShort(o.short);
                    setDossierOpen(true);
                  }}
                  title={`点击查看 ${o.short} 企业黄页资质档案`}
                  style={{ cursor: "pointer" }}
                >
                  <OrgMark color={o.color} short={o.short} size={14} />{o.short}
                </span>
              ))
            )}
          </span>
        </button>
        <div className={css.headActs}>
          {onOpenAbout && (
            <button
              type="button"
              className={`${css.updateBadgeBtn} ${css.hideNarrow}`}
              onClick={onOpenAbout}
              title="查看版本号、本次更新记录与试用功能"
              aria-label="What's New & Settings"
            >
              <Sparkles size={13} />
              <span>v1.2.0</span>
            </button>
          )}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className={css.stagePill}
                style={{
                  color: currentStage.color,
                  background: currentStage.bg,
                  borderColor: currentStage.border,
                }}
                title={`业务阶段: ${currentStage.name} (点击切换或更换业务模型)`}
                aria-label={`当前推进阶段: ${currentStage.name}`}
              >
                <Tag size={12} />
                <span>{currentStage.short}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={css.menu} align="end" sideOffset={6} style={{ minWidth: 230 }}>
                <DropdownMenu.Label className={css.menuLabel} style={{ fontWeight: 700, color: "#0f766e" }}>
                  {activeTemplate.iconName} {activeTemplate.name} · 业务阶段
                </DropdownMenu.Label>
                {activeTemplate.stages.map((sItem) => (
                  <DropdownMenu.Item
                    key={sItem.id}
                    className={css.menuItem}
                    onSelect={() => handleStageChange(sItem.id)}
                    style={{ fontWeight: stage === sItem.id ? 700 : 400 }}
                  >
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: sItem.color, marginRight: 6 }} />
                    <span style={{ flex: 1 }}>{sItem.name}</span>
                    {stage === sItem.id && <Check size={14} style={{ color: sItem.color }} />}
                  </DropdownMenu.Item>
                ))}
                <div style={{ height: 1, background: "var(--line2)", margin: "4px 0" }} />
                <DropdownMenu.Label className={css.menuLabel} style={{ fontSize: 11, color: "var(--ink3)" }}>
                  切换业务场景模型
                </DropdownMenu.Label>
                {STAGE_TEMPLATES.map((tmpl) => (
                  <DropdownMenu.Item
                    key={tmpl.id}
                    className={css.menuItem}
                    onSelect={() => handleTemplateChange(tmpl.id)}
                    style={{ fontSize: 12.5, fontWeight: templateId === tmpl.id ? 700 : 400, color: templateId === tmpl.id ? "#0f766e" : undefined }}
                  >
                    <span>{tmpl.iconName}</span>
                    <span style={{ flex: 1 }}>{tmpl.name}</span>
                    {templateId === tmpl.id && <span style={{ fontSize: 11, color: "#0f766e" }}>当前</span>}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
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
          <div className={css.empty}>
            <Hash size={28} />
            <b>{room.name}</b>
            <span>Send the first message to start collaborating</span>
            {!s.ended?.[room.id] && (
              <button
                type="button"
                className={css.pill}
                style={{ marginTop: 12, cursor: "pointer" }}
                onClick={() => actions.loadOlder()}
              >
                Load older messages
              </button>
            )}
          </div>
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
      <Composer key={room.id} lab={lab} initial={drafts[room.id] ?? ""} saveDraft={saveDraft} toast={toast} />
      <EnterpriseDossierDialog open={dossierOpen} onClose={() => setDossierOpen(false)} orgShort={dossierOrgShort} />
    </section>
  );
}

function Composer({ lab, initial, saveDraft, toast }: { lab: Lab; initial: string; saveDraft: (roomId: string, text: string) => void; toast?: (t: string) => void }) {
  const { s, room, user, org, meId, actions } = lab;
  const [text, setText] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [composing, setComposing] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const pick = useRef<HTMLInputElement>(null);
  const reply = s.replyTo ? (s.messages[room.id] ?? []).find((m) => m.id === s.replyTo) : undefined;
  const replyFile = reply?.fileId ? s.files.find((f) => f.id === reply.fileId) : undefined;
  const others = Array.from(new Set(room.memberIds.map((id) => user(id).orgId))).filter((o) => o !== user(meId).orgId).map((o) => org(o).short);

  const slashMatch = text.match(/(?:^|\s)\/([a-zA-Z0-9_\u4e00-\u9fa5]*)$/);
  const slashFilter = slashMatch ? slashMatch[1].toLowerCase() : "";
  const filteredQuickReplies = useMemo(() => {
    if (!slashFilter) return QUICK_REPLIES;
    return QUICK_REPLIES.filter(
      (qr) =>
        qr.shortcut.toLowerCase().includes(slashFilter) ||
        qr.title.toLowerCase().includes(slashFilter) ||
        qr.text.toLowerCase().includes(slashFilter)
    );
  }, [slashFilter]);

  const handleSelectQuickReply = (qr: QuickReply) => {
    setText((prev) => {
      const match = prev.match(/(?:^|\s)\/([a-zA-Z0-9_\u4e00-\u9fa5]*)$/);
      if (match && match.index !== undefined) {
        const prefix = prev.slice(0, match.index + (prev[match.index] === " " ? 1 : 0));
        return prefix ? `${prefix.trimEnd()}\n${qr.text}` : qr.text;
      }
      return prev.trim() ? `${prev.trimEnd()}\n${qr.text}` : qr.text;
    });
    setShowQuickReplies(false);
    ta.current?.focus();
    toast?.(`已填入【${qr.title}】`);
  };

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

  const [bufferedList, setBufferedList] = useState<BufferedMessage[]>([]);
  useEffect(() => {
    return sendBuffer.subscribe((list) => {
      setBufferedList(list.filter((x) => x.roomId === room.id));
    });
  }, [room.id]);

  const submit = () => {
    const t = text.trim();
    if (!t && !file) return;
    const currentFile = file ?? undefined;

    sendBuffer.enqueue(
      room.id,
      t,
      async () => {
        await actions.send(t, currentFile);
      },
      { file: currentFile, replyTo: s.replyTo ?? undefined }
    );

    setText("");
    setFile(null);
    if (pick.current) pick.current.value = "";
  };

  return (
    <footer className={css.composer} data-internal={room.kind === "internal"}>
      {room.kind === "internal" && <div className={css.internalStrip}><LockKeyhole size={12} /> Internal Room · External organizations cannot view content here</div>}
      {bufferedList.length > 0 && (
        <div className={css.undoBar}>
          <span>Sending in {bufferedList[0].secondsRemaining}s...</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              className={css.undoBtn}
              onClick={() => {
                const item = sendBuffer.cancel(bufferedList[0].id);
                if (item) {
                  setText((prev) => (prev ? `${item.text}\n${prev}` : item.text));
                  if (item.file) {
                    if (file) {
                      toast?.("已恢复草稿文字；输入框已有新选附件，已保留新附件");
                    } else {
                      setFile(item.file);
                      toast?.("已撤回并恢复到草稿区");
                    }
                  } else {
                    toast?.("已撤回并恢复到草稿区");
                  }
                }
              }}
            >
              Undo
            </button>
            <button
              type="button"
              style={{ fontSize: 12, background: "none", border: "none", color: "#b45309", cursor: "pointer", textDecoration: "none" }}
              onClick={() => {
                void sendBuffer.commit(bufferedList[0].id);
              }}
            >
              Send now
            </button>
          </div>
        </div>
      )}
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
      {showQuickReplies && (
        <div className={css.quickRepliesBar}>
          <div className={css.quickRepliesHead}>
            <span><Zap size={13} /> 快捷回复与制造模板库（输入 / 亦可唤出）</span>
            <button type="button" onClick={() => setShowQuickReplies(false)} aria-label="关闭快捷回复" style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={14} /></button>
          </div>
          <div className={css.quickRepliesList}>
            {filteredQuickReplies.length === 0 ? (
              <div style={{ padding: "8px 10px", fontSize: 12, color: "#94a3b8" }}>无匹配的快捷回复模板</div>
            ) : (
              filteredQuickReplies.map((qr) => (
                <button
                  key={qr.shortcut}
                  type="button"
                  className={css.quickReplyItem}
                  onClick={() => handleSelectQuickReply(qr)}
                >
                  <b>{qr.shortcut}</b>
                  <span>{qr.title}</span>
                  <small>{qr.text}</small>
                </button>
              ))
            )}
          </div>
        </div>
      )}
      <div className={css.inputRow}>
        <input ref={pick} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="Select attachment" data-testid="file-input" />
        <button type="button" className={css.iconBtn} onClick={() => pick.current?.click()} aria-label="Add attachment" title="上传附件"><Paperclip size={20} /></button>
        <button type="button" className={css.iconBtn} onClick={() => setShowQuickReplies((v) => !v)} aria-label="Quick Replies" title="快捷回复模板库 (Phase 2, 快捷键 /)"><Zap size={19} /></button>
        <textarea
          ref={ta} rows={1} value={text} aria-label="Type a message"
          enterKeyHint={
            typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && getMobileEnterPref() === "newline"
              ? "enter"
              : "send"
          }
          placeholder={room.kind === "internal" ? "Message internal team..." : others.length ? `Message ${others.join(", ")}...` : "Type a message..."}
          onChange={(e) => {
            const val = e.target.value;
            setText(val);
            const hasSlash = /(?:^|\s)\/([a-zA-Z0-9_\u4e00-\u9fa5]*)$/.test(val);
            if (hasSlash) {
              setShowQuickReplies(true);
            } else if (!hasSlash && showQuickReplies && !val.includes("/")) {
              setShowQuickReplies(false);
            }
          }}
          onFocus={() => {
            if (typeof window !== "undefined") {
              if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
              setTimeout(() => { if (window.scrollY !== 0) window.scrollTo(0, 0); }, 50);
            }
          }}
          onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && showQuickReplies) {
              e.preventDefault();
              setShowQuickReplies(false);
              return;
            }
            if (composing || e.nativeEvent.isComposing) return;
            // Shift+Enter always creates a newline
            if (e.shiftKey) return;

            // Ctrl+Enter or Cmd+Enter always sends
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
              return;
            }

            if (e.key === "Enter") {
              const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
              const mobilePref = getMobileEnterPref();
              const shouldSend = isTouch ? mobilePref === "send" : true;
              if (shouldSend) {
                e.preventDefault();
                submit();
              }
            }
          }}
        />
        <button type="button" className={css.send} disabled={!text.trim() && !file} onClick={submit} aria-label="Send"><ArrowUp size={18} /></button>
      </div>
    </footer>
  );
}
