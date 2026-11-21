"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Building2,
  CheckCircle2,
  Cpu,
  FileCheck2,
  Globe2,
  MapPin,
  ShieldCheck,
  Star,
  Users2,
  X,
} from "lucide-react";
import css from "./about.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
  orgShort: string;
}

export function EnterpriseDossierDialog({ open, onClose, orgShort }: Props) {
  // Correctly differentiate Supplier (QS...) vs Buyer (QB...)
  const isSupplier = orgShort.startsWith("QS") || (!orgShort.startsWith("QB") && orgShort.toLowerCase().includes("supp"));

  const orgName = isSupplier
    ? "东莞市超精密模具智造股份有限公司 (QS1)"
    : "深圳未来智能硬件研发创新中心 (QB1)";
  const orgType = isSupplier
    ? "认证制造工厂 · 供应商 (Tier 1 Verified Factory)"
    : "认证采购商 · 品牌买方 (Verified Buyer)";
  const location = isSupplier
    ? "中国广东省东莞市长安镇乌沙工业区兴发路 18 号"
    : "中国广东省深圳市南山区高新科技园南区 8 栋";
  const creditCode = isSupplier ? "91441900MA54D9XX88" : "91440300MA56B8YY12";

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={css.overlay} />
        <Dialog.Content className={css.dialog} aria-describedby={undefined}>
          <div className={css.header}>
            <div className={css.titleBox}>
              <div className={css.appIcon} style={{ background: isSupplier ? "linear-gradient(135deg, #0d9488, #0f766e)" : "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
                {orgShort.slice(0, 2)}
              </div>
              <div className={css.titleText}>
                <Dialog.Title className={css.appName} style={{ flexWrap: "wrap", rowGap: 4 }}>
                  <span>{orgName}</span>
                  <span className={css.versionBadge} style={{ background: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0", whiteSpace: "nowrap" }}>
                    <ShieldCheck size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} />
                    已通过企业资质实名存证
                  </span>
                </Dialog.Title>
                <span className={css.appSub}>{orgType}</span>
              </div>
            </div>
            <button type="button" className={css.closeBtn} onClick={onClose} aria-label="关闭">
              <X size={18} />
            </button>
          </div>

          <div className={css.content} style={{ display: "grid", gap: 14 }}>
            {/* 基本登记信息 */}
            <div className={css.card}>
              <div className={css.sectionTitle} style={{ margin: "0 0 10px 0" }}>
                <Building2 size={15} />
                <span>工商注册与主体信用标识</span>
              </div>
              <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                  <MapPin size={15} style={{ color: "#64748b", flexShrink: 0 }} />
                  <span><b>厂区地址：</b>{location}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                  <Globe2 size={15} style={{ color: "#64748b", flexShrink: 0 }} />
                  <span><b>统一社会信用代码 / DUNS：</b><code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>{creditCode}</code></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                  <Users2 size={15} style={{ color: "#64748b", flexShrink: 0 }} />
                  <span><b>企业规模：</b>{isSupplier ? "高新技术企业 · 员工 320 人 · 厂房 18,000 ㎡" : "外资研发采购中心 · 团队 65 人"}</span>
                </div>
              </div>
            </div>

            {/* 权威资质认证 */}
            <div className={css.card}>
              <div className={css.sectionTitle} style={{ margin: "0 0 10px 0" }}>
                <FileCheck2 size={15} />
                <span>已核验国际认证体系 (Verified Certifications)</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, color: "#166534", fontSize: 12, fontWeight: 600 }}>
                  <CheckCircle2 size={13} /> ISO 9001:2015 质量管理体系
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, color: "#1e40af", fontSize: 12, fontWeight: 600 }}>
                  <CheckCircle2 size={13} /> IATF 16949 汽车供应链认证
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 6, color: "#6b21a8", fontSize: 12, fontWeight: 600 }}>
                  <CheckCircle2 size={13} /> RoHS / REACH 环保合规
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 6, color: "#92400e", fontSize: 12, fontWeight: 600 }}>
                  <Star size={13} /> AAA 级司法存证守信企业
                </span>
              </div>
            </div>

            {/* 制造装备与质检能力 */}
            {isSupplier && (
              <div className={css.card}>
                <div className={css.sectionTitle} style={{ margin: "0 0 10px 0" }}>
                  <Cpu size={15} />
                  <span>核心制造装备与质检能力</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, fontSize: 12.5, color: "#334155" }}>
                  <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <b>CNC 精密加工：</b>
                    <p style={{ margin: "2px 0 0", color: "#64748b" }}>德国 DMG 5 轴加工中心 12 台</p>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <b>特种电火花加工：</b>
                    <p style={{ margin: "2px 0 0", color: "#64748b" }}>日本沙迪克慢走丝切割 6 台</p>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <b>精密三坐标质检：</b>
                    <p style={{ margin: "2px 0 0", color: "#64748b" }}>蔡司 (Zeiss) 高精度 CMM 2 台</p>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <b>历史履约履历：</b>
                    <p style={{ margin: "2px 0 0", color: "#047857", fontWeight: 600 }}>准时交货率 99.4% · 0 争议</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: "12px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className={css.confirmBtn}
              onClick={onClose}
              style={{ width: "auto", minWidth: 100 }}
            >
              关闭
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
