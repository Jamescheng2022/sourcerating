# Repository Branch & PR Inventory
## SourceRating Project Room / Workroom

**Audit Timestamp:** 2026-11-18 11:55:00 +07:00  
**Repository:** https://github.com/Jamescheng2022/sourcerating.git  
**Target Workspace:** `D:\AgentWorkspaces\sourcerating-launch`  
**Current Working Branch:** `candidate/release-a-launch-20261118` (tracking `feat/room-to-marketplace-profiles-20261116`)

---

### 1. 活跃与近期关键分支清单 (Git Branch Analysis)

| 分支名称 | HEAD Commit | 提交时间 | 状态 / 归属 | 关联部署 / Preview | 剩余价值与处理建议 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`feat/room-to-marketplace-profiles-20261116`** | `7629b5d` | 2026-11-16 15:58 | **【当前有效产品基线】** 包含 25/25 验收、动态 /companies/:id 与 /people/:id 路由、最新 RLS 迁移。 | `https://sourcerating-room-network-preview.vercel.app` (HTTP 200) | **作为 Release A 审计与上线唯一代码底座**，已拉取至 `candidate/release-a-launch-20261118`。 |
| **`qa/real-user-p0-20261114`** | `44ca6f2` | 2026-11-16 03:46 | 真实用户验收记录分支，包含 19/19、25/25 测试日志及证据。 | 测试记录与脚本 | 保留作为 QA 证据索引源，合并有价值测试脚本至主套件。 |
| **`fix/project-room-file-lineage-20261114`** | `6274559` | 2026-11-15 17:23 | 修复文件血缘与网关转发，包含迁移 `202611150001`~`0003`。 | `https://sourcerating-room-lab.vercel.app` (Vercel deployment `dpl_67vsWnRuzPE6gFgZvzkWoVCtWQUZ`) | 已完全合入 `feat/room-to-marketplace-profiles-20261116`，保留为回滚锚点。 |
| **`feature/project-room-b-real-core-20261113`** | `3c8584f` | 2026-11-14 09:21 | Project Room B 核心功能（三栏、房间分割、版本对比、RPC）。 | 旧 lab preview | 代码已包含在最新基线中。 |
| **`docs/sourcerating-chat-first-pdr-v3-1-claude-handoff-20261113`** | `523c733` | 2026-11-13 10:31 | PDR v3.1 演进草案与 Claude 交接记录。 | 文档分支 | 作为 PDR 演进参照，已写入 ADR。 |
| **`experiment/claude-frontend-comparison-20261113`** | `8c0bf38` | 2026-11-13 12:48 | 前端组件对比实验（ChatScope vs 自研）。 | 实验原型 | 只读归档，不合入生产。 |
| **`qa/windows-b-e2e-20261114`** | `99a5333` | 2026-11-14 11:15 | Windows 环境 Playwright 测试套件。 | 测试运行脚本 | 提取有效用例至 SR-05 QA 线程。 |
| **`pilot/real-ai-acceptance-20261028`** | `f644534` | 2026-10-30 09:45 | 10月底 GCP 隔离试点分支。 | 旧 GCP 隧道/试运行 | 【历史试点】不得充当当前生产验收事实。 |
| **`main`** | `e7136ab` | 2026-04 | 生产默认主干分支（最后提交停留在 2026-04）。 | 生产域名 | **未经 Owner 明确批准，严禁将未完成测试代码合入 main**。 |

---

### 2. 历史 PR 状态核查

- PR #1 (`feat/project-room-p1`): 历史草稿 PR，已被 `feature/project-room-b-real-core-20261113` 及后续分支彻底重构替代。
- PR #3 (`pilot/real-ai-acceptance-20261028`): GCP 试点 PR，未合并。
- 当前代码开发直接基于分支推进，Release A 待架构与代码双审完成后，统一通过 T3 生成规范 PR 待审。
