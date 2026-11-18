# Database Migrations, Backup Strategy & Reversible Rollback Plan
## SourceRating Project Room / Workroom Release A

**Date:** 2026-11-18  
**Target Environment:** Supabase Staging (`nunojlfangvnjlwggvvb`)  
**Production Boundary:** Production DB (`qnozpurjtgkmwtvsrjoi`) **STRICTLY UNTOUCHED**  
**Policy:** Every Forward Migration Must Have a Tested Reversible Rollback Script

---

### 一、 数据库迁移链条与版本依赖 (Migration Sequence)

当前基线已在 Staging 隔离库成功按序应用以下迁移：

| 迁移序号 | 迁移文件名称 | 核心表 / 结构变更 | 变更性质 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `202609250001_p1_room_core.sql` | 建立 `rooms`, `room_members`, `room_events` 基础结构 | 基础架构 | 已应用 |
| **02** | `202609260001_p1_room_roles.sql` | 增加组织与房间角色枚举 (`owner`, `admin`, `member`, `viewer`) | 权限拓展 | 已应用 |
| **03** | `202609260002_p1_room_events.sql` | 事件表增加 client_msg_id 幂等键与 payload 约束 | 消息加固 | 已应用 |
| **04** | `202609260003_p1_room_invites.sql` | 增加基于邮件绑定的项目邀请机制 | 鉴权拓展 | 已应用 |
| **05** | `202609260004_p1_room_file_hardening.sql` | 增加文件哈希、版本标记与私有 Storage 权限绑定 | 存储安全 | 已应用 |
| **06** | `20261010024202_project_inquiries.sql` | 增加工程询价单与意向登记表 | 业务流 | 已应用 |
| **07** | `202611130001_room_core_generalization.sql` | 引入 `room_confirmations` 表，19 个 `sr_*` 核心 RPC | 业务泛化 | 已应用 |
| **08** | `202611140001_room_file_lineage.sql` | 增加文件血缘、版本父子溯源字段 | 数据完整性 | 已应用 |
| **09** | `202611150001_room_file_lineage_fix.sql` | 修复文件网关校验及哈希重算机制 | 缺陷修复 | 已应用 |
| **10** | `202611160001_chatgrown_network_foundation.sql` | 增加企业/人员动态档案、私有 CRM 关系与 AI 建议草稿表 | 网络拓展 | 已应用 |

---

### 二、 可逆回滚脚本与执行演练 (Reversible Rollbacks)

所有新特性迁移均配备对应的反向脚本，严禁不可逆迁移。以最新网络层迁移为例：

#### 回滚脚本定位：
`supabase/migrations/202611160001_chatgrown_network_foundation_rollback.sql`

#### 回滚内容概要：
1. 删除 `sr_decide_profile_suggestion`、`sr_save_org_relationship` 等新增 RPC；
2. 撤销针对 `sr_org_profiles`、`sr_person_profiles`、`sr_organization_relationships` 的 RLS 策略；
3. 优雅删除相关私有数据表，不影响核心房间通讯与文件流转。

#### 演练与回滚命令：
```bash
# 在隔离 Staging 环境演练回滚（绝不可在生产库执行）
psql "$STAGING_DATABASE_URL" -f supabase/migrations/202611160001_chatgrown_network_foundation_rollback.sql
# 验证核心聊天表 rooms 与 room_events 结构完好
npm run test:config
```

---

### 三、 备份与快照策略 (Backup & Disaster Recovery)

1. **Staging 库每日快照**：每天自动保留前一日的全量 Logical Backup，保存于 Supabase 安全存储区。
2. **迁移前快照要求**：任何后续补丁迁移执行前，必须先在 Supabase 控制台执行一次 On-demand Backup 并记录 Snapshot ID。
3. **零停机策略**：所有字段追加操作必须设定默认值或允许 NULL，严禁在生产或活跃测试库执行带有排他表级写锁的长时间 DDL。
