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
| **02** | `202609250002_p1_security_hardening.sql` | 增加 RLS 撤销 anon 权限加固 | 安全加固 | 已应用 |
| **03** | `202609260001_p1_room_realtime.sql` | 事件表实时发布与复制支持 | 实时流 | 已应用 |
| **04** | `202609260003_p1_room_files.sql` | 增加文件存储与版本管理 | 存储 | 已应用 |
| **05** | `202609260004_p1_room_file_hardening.sql` | 增加文件哈希、版本标记与私有 Storage 权限绑定 | 存储安全 | 已应用 |
| **06** | `20261010024202_project_inquiries.sql` | 增加工程询价单与意向登记表 | 业务流 | 已应用 |
| **07** | `202611130001_room_core_generalization.sql` | 引入 `room_confirmations` 表，19 个 `sr_*` 核心 RPC | 业务泛化 | 已应用 |
| **08** | `202611150001_room_file_lineage_and_reason.sql` | 增加文件血缘、版本父子溯源字段 | 数据完整性 | 已应用 |
| **09** | `202611150002_room_review_idempotency.sql` | 修复审核请求幂等与防并发重复 | 缺陷修复 | 已应用 |
| **10** | `202611150003_open_review_dedup.sql` | 修复待审核状态去重处理 | 缺陷修复 | 已应用 |
| **11** | `202611160001_chatgrown_network_foundation.sql` | 增加企业/人员动态档案、私有 CRM 关系与 AI 建议草稿表 | 网络拓展 | 已应用 |
| **12** | `202611180001_p0_security_and_confirmation_hardening.sql` | 修复 sr_remove_org_member NULL 绕过，增加 verified 校验 | 安全加固 | 已应用 |
| **13** | `202611180002_fix_confirmation_bypass_and_event_injection.sql` | 移除 proposal 绕过，增加专用 sr_post_room_message 并收回 append_room_event | 安全与完整性 | 已应用 |
| **14** | `202611180003_consolidate_security_and_close_overloads.sql` | 清除重载冲突、统一2参数sr_room_role、加固Storage直接下载 | 架构与安全收敛 | 已应用 |

---

### 二、 可逆回滚脚本与执行演练 (Reversible Rollbacks)

所有新特性迁移均配备对应的反向脚本，严禁不可逆迁移。为防止按字母序执行所有迁移的自动化测试工具误执行回滚，所有回滚脚本集中管理于 `supabase/rollbacks/` 目录：

#### 回滚脚本定位：
- `supabase/rollbacks/202611160001_chatgrown_network_foundation_rollback.sql`
- `supabase/rollbacks/202611180001_p0_security_and_confirmation_hardening_rollback.sql`
- `supabase/rollbacks/202611180002_fix_confirmation_bypass_and_event_injection_rollback.sql`
- `supabase/rollbacks/202611180003_consolidate_security_and_close_overloads_rollback.sql`

#### 回滚内容概要：
1. 删除 `sr_decide_profile_suggestion`、`sr_save_org_relationship` 等新增 RPC；
2. 撤销针对 `sr_org_profiles`、`sr_person_profiles`、`sr_organization_relationships` 的 RLS 策略；
3. 针对 `sr_record_confirmation` 与 `sr_post_room_message` 提供平滑回退，恢复原权限；
4. 优雅删除相关私有数据表，不影响核心房间通讯与文件流转。

#### 演练与回滚命令：
```bash
# 在隔离 Staging 环境演练回滚（绝不可在生产库执行）
psql "$STAGING_DATABASE_URL" -f supabase/rollbacks/202611160001_chatgrown_network_foundation_rollback.sql
# 验证核心聊天表 rooms 与 room_events 结构完好
npm run test:config
```

---

### 三、 备份与快照策略 (Backup & Disaster Recovery)

1. **Staging 库每日快照**：每天自动保留前一日的全量 Logical Backup，保存于 Supabase 安全存储区。
2. **迁移前快照要求**：任何后续补丁迁移执行前，必须先在 Supabase 控制台执行一次 On-demand Backup 并记录 Snapshot ID。
3. **零停机策略**：所有字段追加操作必须设定默认值或允许 NULL，严禁在生产或活跃测试库执行带有排他表级写锁的长时间 DDL。
