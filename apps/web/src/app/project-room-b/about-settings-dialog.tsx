"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Building2,
  CheckCircle2,
  Clock,
  Scale,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  User,
  X,
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

export const APP_VERSION = "v1.1.0-alpha";
export const APP_RELEASE_DATE = "2026-11-20";

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
                    <div className={css.updateIcon} data-kind="undo">
                      <Clock size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>1. 发送撤销缓冲（Undo Send）</span>
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
                    <div className={css.updateIcon} data-kind="mobile">
                      <Smartphone size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>2. 触屏软键盘回车换行优化</span>
                        <span className={css.statusPill}>已上线 · 可试用</span>
                      </div>
                      <p className={css.updateDesc}>
                        对标 WhatsApp 触屏人体工学：手机软键盘按“换行”进行多行排版，彻底避免误触直接发送；点击输入框右侧向上箭头正式提交；桌面键盘按 Enter 发送；任何终端按 <b>Ctrl/⌘ + Enter</b> 均直接发送。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：用手机或移动模拟器登录本页面，在输入框多按几次“换行”键进行多行排版。
                      </div>
                    </div>
                  </div>

                  <div className={css.updateItem}>
                    <div className={css.updateIcon} data-kind="guard">
                      <Shield size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>3. 发送前确认受众（主室分发防护）</span>
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
                        <span className={css.updateHeading}>4. 单设备免打扰隐藏（Hide for me）</span>
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
                  <Clock size={16} />
                  <span>后续阶段交付日历</span>
                </div>
                <div className={css.card}>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>12-11 (Phase 1 交付)</span>
                    <span className={css.profileValue}>组织级已读回执、服务端撤回墓碑、文件打开存证</span>
                  </div>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>01-08 (Phase 2 交付)</span>
                    <span className={css.profileValue}>快捷回复 /、采购彩色标签、受众变更审计报告</span>
                  </div>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>02-03 (Phase 3 代码冻结)</span>
                    <span className={css.profileValue}>时间锁密封报价、离线存证包验证、全链路穿透测试</span>
                  </div>
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
