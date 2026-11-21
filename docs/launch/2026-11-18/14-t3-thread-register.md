# T3 Thread & Agent Register
## SourceRating Project Room / Workroom Launch Control

**Establish Date:** 2026-11-18  
**T3 Project:** `SourceRating | Launch & Acceptance` (`mcp:7a1c5f6f-a377-4148-99d6-86c27b26b7ba`)  
**Workspace:** `D:\AgentWorkspaces\sourcerating-launch`  
**Current Git Branch:** `candidate/release-a-launch-20261118` (HEAD `7629b5d`)

---

### 1. 已建立的 T3 持久化线程清单

| 线程编号 / 名称 | T3 Thread ID / 链接 | 驱动与模型配额 | 核心职责与边界 |
| :--- | :--- | :--- | :--- |
| **SR-00 \| AGY Lead · Launch Control** | `mcp:751ba33d-6f45-4dd7-9921-cfc1bc44bc8e`<br>[SR-00 \| AGY Lead · Launch Control](t3-thread://v2/1c2405c2-edb9-4e4a-be77-5ae9d8317b53/mcp:751ba33d-6f45-4dd7-9921-cfc1bc44bc8e) | **Antigravity**<br>`gemini-3.8-flash` (high) | **唯一任务总协调**。负责整体进度派单、发布门禁（Gate 0~5）把控、汇总结算、主控文档维护。不直接写业务代码。 |
| **SR-01 \| Claude Opus 5.5 Medium · Architecture & UX** | `mcp:3ca77659-05f6-4f06-acde-cfc5fd029b5a`<br>[SR-01 \| Claude Opus 5.5 Medium · Architecture & UX](t3-thread://v2/1c2405c2-edb9-4e4a-be77-5ae9d8317b53/mcp:3ca77659-05f6-4f06-acde-cfc5fd029b5a) | **Claude** (`claudeAgent`)<br>`claude-opus-5-5`<br>`effort: "medium"` | **独立只读首审与终审员**。负责架构边界、PDR v3.0/3.1 一致性、桌面三栏/移动响应式 UX、单一聊天后端契约审查。 |
| **SR-04 \| GPT-6.1 Terra Medium · Full Code Audit** | `mcp:8e6c7032-55d4-452c-bc3c-e11ee0984c73`<br>[SR-04 \| GPT-6.1 Terra Medium · Full Code Audit](t3-thread://v2/1c2405c2-edb9-4e4a-be77-5ae9d8317b53/mcp:8e6c7032-55d4-452c-bc3c-e11ee0984c73) | **Codex** (`codex`)<br>`gpt-6.1-terra`<br>`reasoningEffort: "medium"` | **独立代码与安全全仓审查员**。对全量变更文件、Next.js API、Supabase RLS、SQL 迁移、Edge Functions、安全边界、竞态条件进行行级安全审查。 |
| **SR-05 \| AGY QA · Multi-role E2E & Security** | `mcp:8704c054-95b3-4bae-a6ba-d5c9b636a560`<br>[SR-05 \| AGY QA · Multi-role E2E & Security](t3-thread://v2/1c2405c2-edb9-4e4a-be77-5ae9d8317b53/mcp:8704c054-95b3-4bae-a6ba-d5c9b636a560) | **Antigravity**<br>`gemini-3.8-flash` | **独立多角色自动化测试员**。负责隔离环境 Playwright 跨角色测试、Android 真机测试、负向 RLS 隔离验证，输出带有真实截图与日志的验收矩阵。 |

---

### 2. 待按 Gate 阶段创建的后续执行线程

根据《Master Handoff 2026-11-18》关于控制并发、防止内存耗尽的要求（默认保持最多 1 个重型开发 + 1 个审查/测试线程并发）：
- **SR-02 \| AGY Implementation · Core + Data**: 在 Gate 1/2 启动，独立 worktree 负责 Core Messenger 与存储修复；
- **SR-03 \| AGY Implementation · Web + Mobile UI**: 在架构审查完成后启动，独立 worktree 负责 UI 响应式及软键盘交互；
- **SR-06 \| AGY Release · Preview / Staging / Rollback**: 在 Gate 5 发布演练时创建，专司候选部署与可回滚验证。
