# Deployment, Database & Environment Mapping
## SourceRating Project Room / Workroom

**Audit Timestamp:** 2026-11-18 11:55:00 +07:00  
**Authority:** Read-Only Audit & Verification

---

### 1. 部署环境映射矩阵 (Deployment Mapping)

| 环境类型 | 域名 / URL | Vercel 项目 / 标识 | 对应 Git Commit / 分支 | 状态与核验结果 |
| :--- | :--- | :--- | :--- | :--- |
| **最新功能 Preview** | `https://sourcerating-room-network-preview.vercel.app` | Vercel Project: `sourcerating` (Team: `jamescheng2022s-projects`) | Commit `7629b5d`<br>Branch `feat/room-to-marketplace-profiles-20261116` | **[VERIFIED-LIVE]** HTTP 200 (8,229 bytes)，已部署最新 Marketplace/Network 动态档案路由与 25/25 验收基线。 |
| **Staging Lab Preview** | `https://sourcerating-room-lab.vercel.app` | Vercel Deployment `dpl_67vsWnRuzPE6gFgZvzkWoVCtWQUZ`<br>(Rollback: `dpl_HZsnBQFTK7kfSNSB6F2GzBukysD4`) | Commit `6274559`<br>Branch `fix/project-room-file-lineage-20261114` | **[VERIFIED-LIVE]** HTTP 200 (8,229 bytes)，稳定支持文件网关转发与确认链路。 |
| **正式生产环境** | 生产域名待定（严格受控） | - | Commit `e7136ab` (`main`) | **[BLOCKED] 未获 Owner 明确授权，严禁直接部署到生产环境**。 |

---

### 2. Supabase 数据库环境映射矩阵 (Database Mapping)

| 环境类型 | Supabase Project Ref | 区域 | 迁移执行状态 | 安全策略与权限边界 |
| :--- | :--- | :--- | :--- | :--- |
| **Staging 隔离测试库** | **`nunojlfangvnjlwggvvb`** | ap-southeast-1 | 已应用迁移至 `202611160001` (含 `chatgrown_network_foundation`)。最新新增表 `room_confirmations`、`company_profiles`、`person_dossiers`、`evidence_records`。 | **[ACTIVE-ISOLATED]** 强制启用 RLS。writes 仅通过 `sr_*` Security Definer 函数；公开匿名读取完全禁用。 |
| **历史 Stage2 候选库** | `fzrberkeoizarduwuisp` | - | 历史快照存留 | **[INACTIVE]** 不在当前活动链路中，不复用旧状态。 |
| **生产正式库 (严禁触碰)** | **`qnozpurjtgkmwtvsrjoi`** | - | P1 历史正式库 | **[FORBIDDEN] 绝不可读取、写入、迁移或连接**。未经 Owner 明确批准，严禁执行任何生产操作。 |

---

### 3. 应用根目录与构建规范 (Build & Execution Contract)

- **Vercel Root Directory:** `apps/web`（严禁设为根目录或 `apps/room`）。
- **Framework:** Next.js 16 (App Router) + React 19 + TailwindCSS v4。
- **环境安全准则:** 所有 `NEXT_PUBLIC_*` 变量仅暴露 Staging Supabase URL 及 Anon Key，严禁出现 Service Role Key、真实 SMTP 密码或 AI Provider Secret。
