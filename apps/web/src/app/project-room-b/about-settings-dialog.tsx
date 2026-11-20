"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Info,
  Keyboard,
  Lock,
  RotateCcw,
  Scale,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Real } from "./use-real";
import css from "./about.module.css";

interface Props {
  real: Real;
  open: boolean;
  onClose: () => void;
  defaultTab?: "updates" | "profile" | "preferences" | "roadmap";
}

export const APP_VERSION = "v1.1.0-alpha";
export const APP_RELEASE_DATE = "2026-11-20";

export function AboutSettingsDialog({ real, open, onClose, defaultTab = "updates" }: Props) {
  const { s, user, org, meId } = real;
  const [tab, setTab] = useState<"updates" | "profile" | "preferences" | "roadmap">(defaultTab);
  const myOrg = org(s.orgId);
  const myUser = user(meId);

  // Preference states (stored in localStorage for persistent trial)
  const [undoDelay, setUndoDelay] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sr_pref_undo_delay") ?? "5";
    }
    return "5";
  });
  const [mobileEnter, setMobileEnter] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sr_pref_mobile_enter") ?? "newline";
    }
    return "newline";
  });

  const handleUndoDelayChange = (val: string) => {
    setUndoDelay(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("sr_pref_undo_delay", val);
    }
  };

  const handleMobileEnterChange = (val: string) => {
    setMobileEnter(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("sr_pref_mobile_enter", val);
    }
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
              <Sparkles size={15} />
              <span>本次更新与试用引导</span>
            </button>
            <button
              type="button"
              className={css.tabBtn}
              data-active={tab === "profile"}
              onClick={() => setTab("profile")}
            >
              <Building2 size={15} />
              <span>企业与个人档案</span>
            </button>
            <button
              type="button"
              className={css.tabBtn}
              data-active={tab === "preferences"}
              onClick={() => setTab("preferences")}
            >
              <Settings size={15} />
              <span>聊天与偏好设置</span>
            </button>
            <button
              type="button"
              className={css.tabBtn}
              data-active={tab === "roadmap"}
              onClick={() => setTab("roadmap")}
            >
              <ShieldCheck size={15} />
              <span>存证体系与里程碑</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className={css.content}>
            {/* TAB 1: What's New & Trial Guide */}
            {tab === "updates" && (
              <div>
                <div className={css.sectionTitle}>
                  <Sparkles size={16} className="text-amber-500" />
                  <span>本次预览版本（{APP_VERSION}）更新亮点与即刻试用</span>
                </div>

                <div className={css.card}>
                  <div className={css.updateItem}>
                    <div className={css.updateIcon} data-kind="undo">
                      <Clock size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>1. 5秒撤回缓冲（Undo Send）</span>
                        <span className={css.statusPill}>已上线 · 可试用</span>
                      </div>
                      <p className={css.updateDesc}>
                        在输入框点击发送后，底部会弹出 5 秒倒计时提示条。倒计时结束前点击 <b>Undo</b>，消息直接撤回并恢复为草稿，<b>0 次网络请求、存证链零污染</b>。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：在当前房间发任意消息，观察底部黄色提示条并点击 “Undo”。
                      </div>
                    </div>
                  </div>

                  <div className={css.updateItem}>
                    <div className={css.updateIcon} data-kind="mobile">
                      <Smartphone size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>2. 触屏输入法回车换行优化</span>
                        <span className={css.statusPill}>已上线 · 可试用</span>
                      </div>
                      <p className={css.updateDesc}>
                        对标移动端聊天标准：在手机/触屏软键盘按“换行”进行多行文字排版，彻底解决误触直接发送的问题；仅点击右侧向上箭头发送。桌面端保持 Enter 发送。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：用手机浏览器登录本网址，在输入框多按几次“换行”键排版多行文字。
                      </div>
                    </div>
                  </div>

                  <div className={css.updateItem}>
                    <div className={css.updateIcon} data-kind="guard">
                      <Shield size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>3. 内部室转发主室受众确认（DLP 防护）</span>
                        <span className={css.statusPill}>已上线 · 可试用</span>
                      </div>
                      <p className={css.updateDesc}>
                        将内部室（Internal Room）的会议纪要或结论推回外部商业主室时，强制弹窗展示接收方外部企业列表，必须二次确认后才入链，严防商业机密泄露。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：进入一个 Internal 子房间，在面板中找到 “Send back to Main Room” 点击发送测试。
                      </div>
                    </div>
                  </div>

                  <div className={css.updateItem}>
                    <div className={css.updateIcon}>
                      <CheckCircle2 size={16} />
                    </div>
                    <div className={css.updateMain}>
                      <div className={css.updateHeader}>
                        <span className={css.updateHeading}>4. 单机隐藏真实语义（Hide for me）</span>
                        <span className={css.statusPill}>已上线 · 可试用</span>
                      </div>
                      <p className={css.updateDesc}>
                        移除易造成误解的虚假撤回，改为明确的 `Hide for me`。提示用户存证链不可篡改，消息仅在当前会话设备隐藏，对外部对手方如实保留存证。
                      </p>
                      <div className={css.howToTest}>
                        👉 试用方式：点击自己已发送消息右侧 “...”，选择 “Hide for me”。
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
                    <span className={css.profileLabel}>存证认证状态</span>
                    <span className={css.profileValue}>
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>已核验认证机构</span>
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
                      <span className={css.settingHelp}>给您后悔和修正的缓冲期，期间不向服务端发起入链</span>
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
                      <span className={css.settingHelp}>跨境采购沟通时的界面与默认翻译目标语言</span>
                    </div>
                    <select className={css.selectInput} defaultValue="zh-CN">
                      <option value="zh-CN">简体中文 (Simplified Chinese)</option>
                      <option value="en-US">English (US)</option>
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
                    <span className={css.profileValue}>快捷回复 /、采购彩色标签、译后发送校验</span>
                  </div>
                  <div className={css.profileRow}>
                    <span className={css.profileLabel}>02-03 (Phase 3 交付)</span>
                    <span className={css.profileValue}>时间锁密封报价、离线存证包验证</span>
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
