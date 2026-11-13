"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, CornerDownLeft, Languages, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { formatSize, timeOf } from "./demo/adapter";
import type { RoomFile } from "./demo/types";
import { FileIcon } from "./message";
import type { Lab, PreviewMode } from "./use-lab";
import css from "./lab.module.css";

const EN: Record<string, string> = {
  "EP-600 端板": "EP-600 end plate", "包装": "Packing", "钢托盘 + 防锈": "Steel pallet + rust protection",
  "合计 FOB 天津": "Total, FOB Tianjin", "Q355B · t=20 mm": "Q355B · t=20 mm",
};
const ZH: Record<string, string> = {
  Item: "项目", Spec: "规格", Qty: "数量", "Unit price (USD)": "单价 (USD)", "Amount (USD)": "金额 (USD)",
  Pallet: "托盘", Pcs: "件数", "Gross (kg)": "毛重 (kg)",
};

function Plate({ p, tr, changed }: { p: NonNullable<NonNullable<RoomFile["preview"]>["plate"]>; tr: boolean; changed?: boolean }) {
  const holes = Array.from({ length: p.holes }, (_, i) => {
    const a = (i / p.holes) * Math.PI * 2;
    return <circle key={i} cx={130 + Math.cos(a) * 82} cy={130 + Math.sin(a) * 82} r={7} />;
  });
  return (
    <svg viewBox="0 0 420 300" className={css.sheetSvg} role="img" aria-label={`端板图纸 Rev ${p.rev}，厚度 ${p.t} mm`}>
      <rect x="6" y="6" width="408" height="288" className={css.frame} />
      <g className={css.ink}>
        <circle cx="130" cy="130" r="104" /><circle cx="130" cy="130" r="58" />{holes}
        <rect x="290" y="26" width={p.t * 1.4} height="208" />
      </g>
      <g className={css.dim}>
        <line x1="26" y1="254" x2="234" y2="254" /><text x="130" y="272" textAnchor="middle">Ø{p.od}</text>
        <line x1="290" y1="250" x2={290 + p.t * 1.4} y2="250" />
        <text x={290 + p.t * 0.7} y="270" textAnchor="middle" className={changed ? css.changed : undefined}>t = {p.t}</text>
        <text x="404" y="286" textAnchor="end">EP-600 · {tr ? "End plate" : "端板"} · Rev {p.rev} · {p.holes}×Ø22</text>
      </g>
    </svg>
  );
}

function Body({ f, tr, changed }: { f: RoomFile; tr: boolean; changed?: boolean }) {
  if (f.localUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- local object URL, never a remote asset
    return <img src={f.localUrl} alt={f.name} className={css.localImg} />;
  }
  if (f.preview?.plate) return <Plate p={f.preview.plate} tr={tr} changed={changed} />;
  if (f.preview?.sheet)
    return (
      <div className={css.sheetWrap}>
        <table className={css.xls}>
          <tbody>
            {f.preview.sheet.map((row, i) => (
              <tr key={i} data-head={i === 0} data-total={i === f.preview!.sheet!.length - 1 && i > 1}>
                {row.map((c, j) => <td key={j}>{tr ? EN[c] ?? ZH[c] ?? c : c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (f.preview?.photo)
    return (
      <svg viewBox="0 0 420 300" className={css.photo} role="img" aria-label="首件样品照片（演示占位图）">
        <rect width="420" height="300" fill="#8d8f8c" /><rect y="210" width="420" height="90" fill="#6f716e" />
        <ellipse cx="210" cy="170" rx="150" ry="46" fill="#3c4146" /><ellipse cx="210" cy="160" rx="150" ry="46" fill="#aab1b6" />
        <ellipse cx="210" cy="160" rx="84" ry="25" fill="#6f716e" />
        {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <ellipse key={i} cx={210 + Math.cos(a) * 118} cy={160 + Math.sin(a) * 36} rx="9" ry="3.4" fill="#3c4146" />; })}
      </svg>
    );
  return <div className={css.noPreview}><FileIcon kind={f.kind} /><b>{f.name}</b><span>本地文件 · 演示版不解析此格式</span></div>;
}

export function FilePreview({ lab }: { lab: Lab }) {
  const { s } = lab;
  const open = s.preview;
  const f = open ? s.files.find((x) => x.id === open.fileId) : undefined;
  if (!f || !open) return null;
  return <Viewer key={`${f.id}:${open.mode}`} lab={lab} f={f} initial={open.mode} />;
}

function Viewer({ lab, f, initial }: { lab: Lab; f: RoomFile; initial: PreviewMode }) {
  const { s, user, actions } = lab;
  const [mode, setMode] = useState<PreviewMode>(initial);
  const [tr, setTr] = useState(false);
  const prev = f.supersedes ? s.files.find((x) => x.id === f.supersedes) : undefined;
  const next = s.files.find((x) => x.supersedes === f.id);
  const msgs = s.messages[f.roomId] ?? [];
  const own = msgs.find((m) => m.fileId === f.id);
  const cited = new Set(s.proposals.filter((p) => p.fileId === f.id).flatMap((p) => p.sources));
  const related = msgs.filter((m) => m.fileId === f.id || (own && m.replyTo === own.id) || cited.has(m.id));
  const canTranslate = !!(f.preview?.plate || f.preview?.sheet);

  return (
    <Dialog.Root open onOpenChange={(v) => !v && actions.closeFile()}>
      <Dialog.Portal>
        <Dialog.Overlay className={css.overlay} />
        <Dialog.Content className={css.viewer} aria-describedby={undefined}>
          <header className={css.viewerHead}>
            <span className={css.fileGlyph} data-kind={f.kind}><FileIcon kind={f.kind} /></span>
            <div className={css.viewerName}>
              <Dialog.Title>{f.name}</Dialog.Title>
              <small>
                {formatSize(f.size)}{own && ` · ${user(own.userId).name} · ${timeOf(own.at)}`}
                {(prev || next || f.version > 1) && <em className={css.ver}>v{f.version}</em>}
                {next && <button type="button" className={css.newer} onClick={() => actions.openFile(next.id)}>有新版 v{next.version} →</button>}
              </small>
            </div>
            <Dialog.Close className={css.iconBtn} aria-label="关闭预览"><X size={20} /></Dialog.Close>
          </header>

          <div className={css.viewerBar}>
            <div className={css.seg} role="tablist" aria-label="查看方式">
              <button type="button" role="tab" aria-selected={mode === "view"} onClick={() => setMode("view")}>预览</button>
              <button type="button" role="tab" aria-selected={mode === "compare"} disabled={!prev} onClick={() => setMode("compare")} title={prev ? "" : "没有更早的版本"}>比较版本</button>
              <button type="button" role="tab" aria-selected={mode === "related"} onClick={() => setMode("related")}>相关消息<i>{related.length}</i></button>
            </div>
            <div className={css.viewerActs}>
              <button type="button" className={css.ghost} aria-pressed={tr} disabled={!canTranslate} onClick={() => setTr((v) => !v)}><Languages size={15} />{tr ? "原文" : "翻译"}</button>
              <button type="button" className={css.primary} onClick={() => { actions.closeFile(); void actions.ask({ type: "file", id: f.id }, "这份文件讲了什么？"); }}><Sparkles size={15} />问 AI</button>
            </div>
          </div>

          <div className={css.viewerBody} data-mode={mode}>
            {mode === "view" && (<><Body f={f} tr={tr} />{tr && <p className={css.privateNote}>译文 · 仅你可见 · 演示预置</p>}</>)}
            {mode === "compare" && prev && (
              <>
                <div className={css.cmp}>
                  <figure><figcaption>v{prev.version} · 旧</figcaption><Body f={prev} tr={tr} /></figure>
                  <ArrowRight size={18} className={css.cmpArrow} aria-hidden />
                  <figure data-new><figcaption>v{f.version} · 当前</figcaption><Body f={f} tr={tr} changed /></figure>
                </div>
                <table className={css.diff}>
                  <tbody>
                    {(f.diff ?? []).map((d) => (<tr key={d.field}><th>{d.field}</th><td><del>{d.from}</del></td><td><ins>{d.to}</ins></td></tr>))}
                  </tbody>
                </table>
              </>
            )}
            {mode === "related" && (
              <div className={css.related}>
                {related.map((m) => (
                  <button key={m.id} type="button" onClick={() => actions.jumpTo(m.id)}>
                    <span><b>{user(m.userId).name}</b><time>{timeOf(m.at)}</time></span>
                    <p>{m.text ?? m.voice?.transcript ?? (m.fileId === f.id ? "发送了这份文件" : "")}</p>
                    <CornerDownLeft size={14} aria-hidden />
                  </button>
                ))}
              </div>
            )}
          </div>
          <footer className={css.viewerFoot}>演示预览：页面内容由演示数据绘制，不是真实文件渲染</footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
