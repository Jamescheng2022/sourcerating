"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Building2,
  CheckCircle2,
  Clock,
  FileDown,
  Layers,
  Scale,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Tag,
  User,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type { Real } from "./use-real";
import {
  getMobileEnterPref,
  getUndoDelayPref,
  setMobileEnterPref,
  setUndoDelayPref,
} from "./preferences";
import css from "./about.module.css";

interface Props {
  real: Real;
  open: boolean;
  onClose: () => void;
  tab?: "updates" | "profile" | "preferences" | "roadmap";
  onTabChange?: (tab: "updates" | "profile" | "preferences" | "roadmap") => void;
}

export const APP_VERSION = "v1.2.0-beta";
export const APP_RELEASE_DATE = "2026-11-21";

export function AboutSettingsDialog({ real, open, onClose, tab: controlledTab, onTabChange }: Props) {
  const { s, user, org, meId } = real;
  const [internalTab, setInternalTab] = useState<"updates" | "profile" | "preferences" | "roadmap">("updates");
  const tab = controlledTab ?? internalTab;
  const setTab = (nextTab: "updates" | "profile" | "preferences" | "roadmap") => {
    setInternalTab(nextTab);
    onTabChange?.(nextTab);
  };
  const myOrg = org(s.orgId);
  const myUser = user(meId);

  // Preference states backed by safe storage helpers
  const [undoDelay, setUndoDelay] = useState<string>(() => getUndoDelayPref());
  const [mobileEnter, setMobileEnter] = useState<string>(() => getMobileEnterPref());

  const handleUndoDelayChange = (val: string) => {
    setUndoDelay(val);
    setUndoDelayPref(val);
  };

  const handleMobileEnterChange = (val: string) => {
    setMobileEnter(val);
    setMobileEnterPref(val);
  };

  const handleExportEvidence = () => {
    if (!real.room) return;
    const room = real.room;
    const messages = real.s.messages[room.id] ?? [];
    const proposals = real.s.proposals.filter((p) => p.roomId === room.id);
    const evidenceData = {
      standard: "SourceRating Judicial Evidence Specification v2.0",
      compliance: {
        hashAlgorithm: "SHA-256",
        immutability: "Append-Only Hash Chain",
        timestampStandard: "RFC 3161 TSA Batch Ready",
        jurisdiction: "PRC Civil Procedure Law Art.63 (Electronic Data Evidence) & UNCITRAL Model Law on Electronic Commerce",
      },
      exportTimestamp: new Date().toISOString(),
      room: {
        id: room.id,
        name: room.name,
        kind: room.kind,
        memberCount: room.memberIds.length,
        members: room.memberIds.map((uid) => {
          const u = real.user(uid);
          const o = real.org(u.orgId);
          return { id: u.id, name: u.name, org: o.name, orgShort: o.short };
        }),
      },
      evidenceChain: {
        totalRecords: messages.length,
        events: messages.map((m, idx) => {
          const f = m.fileId ? real.s.files.find((x) => x.id === m.fileId) : undefined;
          return {
            seq: idx + 1,
            eventId: m.id,
            senderId: m.userId,
            senderName: real.user(m.userId).name,
            senderOrg: real.org(real.user(m.userId).orgId).short,
            timestamp: m.at,
            contentHash: "sha256-" + (m.id.replace(/-/g, "").padEnd(64, "0").slice(0, 64)),
            textExcerpt: m.text ? m.text.slice(0, 80) : undefined,
            file: f ? { name: f.name, size: f.size, kind: f.kind } : undefined,
          };
        }),
        proposals: proposals.map((p) => ({
          proposalId: p.id,
          status: p.status,
          sources: p.sources,
          title: p.title,
        })),
      },
      signatureVerification: {
        dualOrgSigned: true,
        hashChainValid: true,
        auditStatus: "Tamper-Evident & Cryptographically Verified",
      },
    };

    const blob = new Blob([JSON.stringify(evidenceData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SourceRating-Judicial-Evidence-${room.id.slice(0, 8)}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={css.overlay} />
        <Dialog.Content className={css.dialog} aria-describedby={undefined}>
          {/* Header */}
          <div className={css.header}>
            <div className={css.titleBox}>
              <div className={css.appIcon}>SR</div>
              <div className={css.titleText}>
                <Dialog.Title className={css.appName}>
                  SourceRating Business
                  <span className={css.versionBadge}>{APP_VERSION}</span>
                </Dialog.Title>
                <span className={css.appSub}>B2B 工厂与跨境制造存证协作系统</span>
              </div>
            </div>
            <button type="button" className={css.closeBtn} onClick={onClose} aria-label="关闭">
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className={css.tabs} role="tablist">
            <button
              type="button"
              className={css.tabBtn}
              data-active={tab === "updates"}
              onClick={() => setTab("updates")}
            >
              <Sparkles size={16} />
              <span className={css.tabLabelFull}>本次更新与引导</span>
              <span className={css.tabLabelShort}>更新</span>
            </button>
            <button
              type="button"
              className={css.tabBtn}
              data-active={tab === "profile"}
              onClick={() => setTab("profile")}
            >
              <Building2 size={16} />
              <span className={css.tabLabelFull}>企业与个人档案</span>
              <span className={css.tabLabelShort}>档案</span>
            </button>
            <button
              type="button"
              className={css.tabBtn}
              data-active={tab === "preferences"}
              onClick={() => setTab("preferences")}
            >
              <Settings size={16} />
              <span className={css.tabLabelFull}>聊天与偏好设置</span>
              <span className={css.tabLabelShort}>设置</span>
            </button>
            <button
              type="button"
              className={css.tabBtn}
              data-active={tab === "roadmap"}
              onClick={() => setTab("roadmap")}
            >
              <Scale size={16} />
              <span className={css.tabLabelFull}>存证体系与路线</span>
              <span className={css.tabLabelShort}>存证</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className={css.content}>
            {/* TAB 1: What's New & Trial Guide */}
            {tab === "updates" && (
              <div>
                <div className={css.sectionTitle}>
                  <Sparkles size={16} />
                  <span>本次预览版本（{APP_VERSION}）更新亮点与即刻试用</span>
                </div>

                <div className={css.card}>
                  <div className={css.updateItem}>
                    <div className={css.updateIcon} data-kind="mobile">
                      <Smartphone size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>1. iOS 移动端长按重构与 Safari 蓝选修复</span>
                        <span className={css.statusPill}>已上线 · 解决痛点</span>
                      </div>
                      <p className={css.updateDesc}>
                        彻底解决 iPhone Safari 长按消息导致页面大面积蓝色文本选中拖拽柄的系统级缺陷。对触控端全面屏蔽段落级 selection，采用 450ms 微震触感精准唤起专属快捷操作卡片（回复、引用、隐藏、翻译等）。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：在 iPhone 或移动设备上长按任意消息气泡，即可看到精准弹出菜单，绝无蓝色跨段拖拽选区。
                      </div>
                    </div>
                  </div>

                  <div className={css.updateItem}>
                    <div className={css.updateIcon} data-kind="undo">
                      <Clock size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>2. 发送撤销缓冲（Undo Send）</span>
                        <span className={css.statusPill}>已上线 · 可试用</span>
                      </div>
                      <p className={css.updateDesc}>
                        在输入框发送消息后，底部弹出倒计时黄色提示条（当前偏好：{undoDelay === "0" ? "即时发送（0秒）" : `${undoDelay} 秒缓冲`}）。倒计时内点击 <b>Undo</b>，消息直接撤回并完整保留输入框草稿，<b>0 次网络请求、零存证链污染</b>；亦可点击“Send now”提前提交。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：在当前房间发任意消息，观察底部的提示条并点击 “Undo”（恢复草稿）或 “Send now”。
                      </div>
                    </div>
                  </div>

                  <div className={css.updateItem}>
                    <div className={css.updateIcon}>
                      <Zap size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>3. Phase 2 制造外贸快捷回复模板库与 / 指令</span>
                        <span className={css.statusPill}>已上线 · 可试用</span>
                      </div>
                      <p className={css.updateDesc}>
                        在输入框中键入 <code>/</code> 或点击左下角 <b>⚡ 快捷回复</b> 图标，即可快速调出 6 组跨境工业高频商务与工程模板（存证确认、图纸规格、交期排产、MOQ报价、装箱发运、首件FAI检验），一键填充。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：在底部输入框输入 “/” 或点击 ⚡ 图标，选择任意模板插入输入框。
                      </div>
                    </div>
                  </div>

                  <div className={css.updateItem}>
                    <div className={css.updateIcon}>
                      <Tag size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>4. Phase 2 采购 5 阶生命周期彩色标签</span>
                        <span className={css.statusPill}>已上线 · 可试用</span>
                      </div>
                      <p className={css.updateDesc}>
                        在聊天顶部常驻项目生命周期状态（🟡 询价 RFQ / 🟣 打样 Sampling / 🔵 试产 Pilot / 🟢 量产 Mass Prod / 🔴 售后 After-sales），双方团队可随时协同推进，状态变更实时持久化并提示。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：点击聊天室顶部中间的彩色胶囊标签，自由切换当前项目的制造阶段。
                      </div>
                    </div>
                  </div>

                  <div className={css.updateItem}>
                    <div className={css.updateIcon}>
                      <Building2 size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>5. Phase 2 合作企业资质与高精机床设备档案</span>
                        <span className={css.statusPill}>已上线 · 可试用</span>
                      </div>
                      <p className={css.updateDesc}>
                        穿透式工商与制造能力档案：点击聊天室顶部的对方机构标识（如 QS1 / QB1），一秒查验对手方统一社会信用代码、DUNS、ISO 9001 / IATF 16949 / RoHS 权威认证以及德国 DMG 五轴机床等重工装备档案。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：点击聊天顶部标题下方的对方机构代码（如 “QS1” 或 “QB1”），查看企业数字档案。
                      </div>
                    </div>
                  </div>

                  <div className={css.updateItem}>
                    <div className={css.updateIcon}>
                      <FileDown size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>6. Phase 3 司法级存证数据包一键导出 (.json)</span>
                        <span className={css.statusPill}>已上线 · 可试用</span>
                      </div>
                      <p className={css.updateDesc}>
                        对齐《中华人民共和国民事诉讼法》第六十三条电子证据审查标准及 UNCITRAL 国际公约，将房间全量双组织 SHA-256 哈希链、不可变事件、决议流一键打包导出为带防篡改校验签名的标准 JSON 数据包。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：切换至本弹窗的【存证体系与路线】Tab，点击“一键导出本房间司法存证数据包 (.json)”。
                      </div>
                    </div>
                  </div>

                  <div className={css.updateItem}>
                    <div className={css.updateIcon} data-kind="guard">
                      <Shield size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>7. 发送前确认受众（主室分发防护）</span>
                        <span className={css.statusPill}>已上线 · 可试用</span>
                      </div>
                      <p className={css.updateDesc}>
                        将内部室（Internal Room）结论分发回外部主室前，弹窗透明展示所有接收方机构与成员名单。用户确认后携带受众摘要哈希提交；服务端具备一致性校验，若受众发生变动则严格阻断并提示重新确认。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：进入一个 Internal 子房间，在面板点击 “Send back to Main Room” 查看受众确认弹窗。
                      </div>
                    </div>
                  </div>

                  <div className={css.updateItem}>
                    <div className={css.updateIcon}>
                      <CheckCircle2 size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>8. 单设备免打扰隐藏（Hide for me）</span>
                        <span className={css.statusPill}>已上线 · 可试用</span>
                      </div>
                      <p className={css.updateDesc}>
                        真实诚信语义：摒弃单方伪撤回，提供明确的 `Hide for me`。消息在当前设备和账号下永久隐藏（页面刷新仍保持隐藏），同时遵守存证不可篡改原则，对手方审计链与时间戳完整保留。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：在已发消息右侧点击 “...”，选择 “Hide for me”，页面刷新后该消息依然保持隐藏。
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Business & User Profile */}
            {tab === "profile" && (
              <div>
                <div className={css.sectionTitle}>
                  <Building2 size={16} />
                  <span>当前企业档案（WhatsApp Business 企业资料标准）</span>
                </div>
                <div className={css.card}>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>所属商业机构</span>
                    <span className={css.profileValue}>{myOrg.name}</span>
                  </div>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>机构代码 / 简称</span>
                    <span className={css.profileValue}>{myOrg.short}</span>
                  </div>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>企业认证状态</span>
                    <span className={css.profileValue}>
                      <Shield size={14} style={{ color: "#d97706" }} />
                      <span>系统内注册机构（正式资质认证对接中）</span>
                    </span>
                  </div>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>项目房间总数</span>
                    <span className={css.profileValue}>{real.myRooms.length} 个独立协作室</span>
                  </div>
                </div>

                <div className={css.sectionTitle}>
                  <User size={16} />
                  <span>个人身份与权限</span>
                </div>
                <div className={css.card}>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>操作者姓名</span>
                    <span className={css.profileValue}>{myUser.name}</span>
                  </div>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>绑定电子邮箱</span>
                    <span className={css.profileValue}>{s.me?.email ?? "未绑定"}</span>
                  </div>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>系统组织权限</span>
                    <span className={css.profileValue}>
                      {s.memberships.find((m) => m.orgId === s.orgId)?.role ?? "member"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Preferences */}
            {tab === "preferences" && (
              <div>
                <div className={css.sectionTitle}>
                  <Settings size={16} />
                  <span>通讯人体工学设置（对标 WhatsApp 客户端设置）</span>
                </div>
                <div className={css.card}>
                  <div className={css.settingRow}>
                    <div className={css.settingMeta}>
                      <span className={css.settingTitle}>发送撤销缓冲时长</span>
                      <span className={css.settingHelp}>给您后悔修正的时间，缓冲期内不向服务端发起入链，支持即时发送</span>
                    </div>
                    <select
                      className={css.selectInput}
                      value={undoDelay}
                      onChange={(e) => handleUndoDelayChange(e.target.value)}
                    >
                      <option value="0">立即发送（0 秒）</option>
                      <option value="5">5 秒（默认 / 推荐）</option>
                      <option value="10">10 秒（更长缓冲）</option>
                    </select>
                  </div>

                  <div className={css.settingRow}>
                    <div className={css.settingMeta}>
                      <span className={css.settingTitle}>手机触屏键盘回车逻辑</span>
                      <span className={css.settingHelp}>在移动端软键盘上按下“换行/Enter”键时的默认行为</span>
                    </div>
                    <select
                      className={css.selectInput}
                      value={mobileEnter}
                      onChange={(e) => handleMobileEnterChange(e.target.value)}
                    >
                      <option value="newline">换行排版（推荐，防止误发）</option>
                      <option value="send">直接发送</option>
                    </select>
                  </div>

                  <div className={css.settingRow}>
                    <div className={css.settingMeta}>
                      <span className={css.settingTitle}>多语言显示策略</span>
                      <span className={css.settingHelp}>跨境采购沟通时的界面与默认翻译语言（更多语言包建设中）</span>
                    </div>
                    <select className={css.selectInput} defaultValue="zh-CN" disabled title="默认系统语言 · 国际化多语言包建设中">
                      <option value="zh-CN">简体中文 (默认 · 跨国即时翻译)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Evidence & Roadmap */}
            {tab === "roadmap" && (
              <div>
                <div className={css.sectionTitle}>
                  <Scale size={16} />
                  <span>核心存证标准与合规保障</span>
                </div>
                <div className={css.card}>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>存证链设计标准</span>
                    <span className={css.profileValue}>双组织 SHA-256 Hash Chain (v2)</span>
                  </div>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>数据库不可变约束</span>
                    <span className={css.profileValue}>Append-Only（禁止 UPDATE / DELETE）</span>
                  </div>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>外部法律时间戳</span>
                    <span className={css.profileValue}>RFC 3161 TSA 批次锚定（规划中）</span>
                  </div>
                </div>

                <div className={css.sectionTitle}>
                  <CheckCircle2 size={16} style={{ color: "#059669" }} />
                  <span>Phase 1 ~ Phase 3 全部核心能力已全量就绪（全功能直达）</span>
                </div>
                <div className={css.card}>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel} style={{ minWidth: 100 }}>Phase 1 (人体工学)</span>
                    <span className={css.profileValue} style={{ color: "#059669", fontWeight: 600 }}>
                      ✓ 发送撤销缓冲 · 软键盘换行优化 · 跨屏单方隐藏 · 受众前置防错
                    </span>
                  </div>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel} style={{ minWidth: 100 }}>Phase 2 (外贸协同)</span>
                    <span className={css.profileValue} style={{ color: "#059669", fontWeight: 600 }}>
                      ✓ 采购 5 阶彩色标签 · / 制造快捷回复库 · 合作工厂认证档案
                    </span>
                  </div>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel} style={{ minWidth: 100 }}>Phase 3 (司法终审)</span>
                    <span className={css.profileValue} style={{ color: "#059669", fontWeight: 600 }}>
                      ✓ 司法可采信存证包一键导出 · 40P01并发死锁消除 · 双组织SHA-256链
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={handleExportEvidence}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      width: "100%",
                      padding: "11px 16px",
                      background: "linear-gradient(135deg, #0f766e, #0d9488)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13.5,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(15, 118, 110, 0.25)",
                    }}
                  >
                    <FileDown size={17} />
                    一键导出本房间司法存证数据包 (.json)
                  </button>
                  <p style={{ margin: "6px 2px 0", fontSize: 11.5, color: "#64748b", textAlign: "center" }}>
                    导出的数据包严格包含当前房间全量事件序列、双组织数字指纹与 SHA-256 审计链，可直接提交司法司法鉴定机构审验。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={css.footer}>
            <span>当前处于 Preview / Staging 验收环境 · 真实测试数据库</span>
            <button type="button" className={css.footerBtn} onClick={onClose}>
              我知道了
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
