# Deployment, Database & Environment Mapping
## SourceRating Project Room / Workroom

**Audit Timestamp:** 2026-11-18 11:55:00 +07:00  
**Authority:** Read-Only Audit & Verification

---

### 1. 部署环境映射矩阵 (Deployment Mapping)

| 环境类型 | 域名 / URL | Vercel 项目 / 标识 | 对应 Git Commit / 分支 | 状态与核验结果 |
| :--- | :--- | :--- | :--- | :--- |
| **最新功能 Preview** | `https://sourcerating-room-network-preview.vercel.app` | Vercel Deployment: `dpl_Gj6QuwK1PNy6Hw4b4EDT2ngQ9vTj`<br>(Project: `sourcerating-room-lab`) | Commit `50d8d24`<br>Branch `candidate/release-a-launch-20261118` | **[DEPLOYED-LIVE-BUILD]** HTTP 200，重定向旧版 `/project-room` 至 `/project-room-b`。三栏布局、待确认审核面板、真实企业/人员名片、消息排序与实时断档补齐上线。 |
| **Staging Lab Preview** | `https://sourcerating-room-lab.vercel.app` | Vercel Deployment: `dpl_Gj6QuwK1PNy6Hw4b4EDT2ngQ9vTj`<br>(Rollback: `dpl_DkPwau26xBWiNkX8FvhZXNEjB9WZ`) | Commit `50d8d24`<br>Branch `candidate/release-a-launch-20261118` | **[DEPLOYED-LIVE-BUILD]** HTTP 200，支持文件网关转发与确认链路。 |
| **正式生产环境** | 生产域名待定（严格受控） | - | Commit `e7136ab` (`main`) | **[BLOCKED] 未获 Owner 明确授权，严禁直接部署到生产环境**。 |

---

### 2. Supabase 数据库环境映射矩阵 (Database Mapping)

| 环境类型 | Supabase Project Ref | 区域 | 迁移执行状态 | 安全策略与权限边界 |
| :--- | :--- | :--- | :--- | :--- |
| **Staging 隔离测试库** | **`nunojlfangvnjlwggvvb`** | ap-southeast-1 | 已应用迁移至 `202611180003` (包含重载彻底清除、专用消息RPC、Storage verified只读、回滚安全隔离)。 | **[ACTIVE-ISOLATED]** 强制启用 RLS。writes 仅通过 `sr_*` Security Definer 函数；公开匿名读取完全禁用。 |
| **历史 Stage2 候选库** | `fzrberkeoizarduwuisp` | - | 历史快照存留 | **[INACTIVE]** 不在当前活动链路中，不复用旧状态。 |
| **生产正式库 (严禁触碰)** | **`qnozpurjtgkmwtvsrjoi`** | - | P1 历史正式库 | **[FORBIDDEN] 绝不可读取、写入、迁移或连接**。未经 Owner 明确批准，严禁执行任何生产操作。 |

---

### 3. 应用根目录与构建规范 (Build & Execution Contract)

- **Vercel Root Directory:** `apps/web`（严禁设为根目录或 `apps/room`）。
- **Framework:** Next.js 16 (App Router) + React 19 + TailwindCSS v4。
- **环境安全准则:** 所有 `NEXT_PUBLIC_*` 变量仅暴露 Staging Supabase URL 及 Anon Key，严禁出现 Service Role Key、真实 SMTP 密码或 AI Provider Secret。
