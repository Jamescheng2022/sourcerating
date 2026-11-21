# Security & RLS Policy Deep Audit Report
## SourceRating Cross-Organization Isolation & Authorization

**Date:** 2026-11-18  
**Audit Standard:** Zero Trust Multi-Tenant Isolation / Strict Row Level Security  
**Auditor Reference:** SR-04 (GPT-6.1 Terra Medium) & SR-00 (AGY Lead)  
**Evaluated Migrations:** `202609250001` ~ `202611160001` (Total 12 migrations)

---

### 一、 核心数据表 RLS 策略评估矩阵 (Table-by-Table Audit)

| 数据库表名 | RLS 启用状态 | 允许写入角色 / 入口 | 允许读取角色 / 策略 | 隔离评估与风险点 |
| :--- | :--- | :--- | :--- | :--- |
| **`organizations`** | **ENABLED** | 仅系统 / 注册 RPC | 仅当前用户所在组织成员可见 | **SECURE**: 匿名或外部用户无法枚举企业列表。 |
| **`organization_memberships`** | **ENABLED** | 仅 `sr_remove_org_member` 等受控 RPC | 组织内部有效成员可见 | **P1 修复中**: 历史 RPC 存在三值逻辑缺陷，详见下文。 |
| **`rooms`** | **ENABLED** | 仅 `sr_create_sub_room` 等 RPC | 房间有效成员（`room_members`）可见 | **SECURE**: 跨房间、内部房间严格隔离。 |
| **`room_members`** | **ENABLED** | 仅邀请接受与房间创建 RPC | 仅本房间成员可见 | **SECURE**: 无法跨房间探测成员列表。 |
| **`room_events`** | **ENABLED** | `append_room_event` (待收敛) | 仅本房间成员可见 | **P1 修复中**: 需收紧事件类型写入白名单。 |
| **`room_confirmations`** | **ENABLED** | **仅 `sr_record_confirmation` RPC** | 仅本房间成员可 SELECT | **P1 修复中**: 需在写入时强校验文件 verified 状态。 |
| **`storage.objects`** | **ENABLED** | 经过 `room-file-gateway` 签名上传 | 仅房间成员通过签名 URL 访问 | **P1 修复中**: Storage RLS 需增加 verified 状态断言。 |
| **`sr_org_profiles`** | **ENABLED** | 仅企业 Admin 可维护私有草稿 | 外部合作方默认仅见受限公开字段 | **SECURE**: 私有笔记与内部报价 100% 隔离。 |

---

### 二、 关键安全缺陷与代码级整改方案 (Remediation Patches)

#### 1. 【修复 P1-1】`sr_remove_org_member` 权限三值逻辑穿透
- **问题代码:**
  ```sql
  -- 漏洞代码：当调用者不是目标组织成员时，sr_org_role 返回 NULL
  -- 在 SQL 中 NULL NOT IN ('owner','admin') 为 NULL，无法进入拒绝分支
  IF sr_org_role(p_organization_id, auth.uid()) NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;
  ```
- **修复方案:**
  ```sql
  -- 修复方案：显式使用 COALESCE 并防范外部任意调用
  IF COALESCE(sr_org_role(p_organization_id, auth.uid()), '') NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'permission denied: caller is not org admin or owner' USING ERRCODE = '42501';
  END IF;
  ```

#### 2. 【修复 P1-2】废除通用事件追加权限，限制事件类型与 Payload
- **整改策略:**
  - 撤销普通客户端对 `append_room_event` 的全量调用权；
  - 仅开放 `sr_post_message(p_room_id, p_text, p_mentions)` 供常规发信；
  - 所有系统事件（如 `confirmation.recorded`、`file.verified`、`proposal.decided`）严禁由客户端直接触发，必须在对应的业务 RPC 事务内由服务端直接写入。

#### 3. 【修复 P1-3】Storage RLS 强制绑定服务端验证状态
- **整改策略:**
  - 在 `storage.objects` 的 SELECT 策略中，追加对 `room_files` 表的关联检查：
    ```sql
    EXISTS (
      SELECT 1 FROM public.room_files rf
      WHERE rf.storage_path = name
        AND rf.verification_status = 'verified'
    )
    ```
  - 未经网关安全计算与验证的文件，前端无法直接通过 Storage API 读取。

#### 4. 【修复 P1-4】`sr_record_confirmation` 强校验服务端 SHA-256
- **整改策略:**
  - 在 `sr_record_confirmation` 内部追加：
    ```sql
    IF v_file.verification_status <> 'verified' OR v_file.server_sha256 <> p_file_sha256 THEN
      RAISE EXCEPTION 'cannot confirm unverified or altered file' USING ERRCODE = '22023';
    END IF;
    ```

---

### 三、 负向安全测试执行要求 (Negative Test Mandate)

在 Gate 4 正式发布验收前，必须编写针对上述 4 项修复的专用负向自动化用例（`test-rls-negative.cjs`）：
1. 账号 A（普通用户）调用 RPC 尝试移除企业 B 的成员，断言必抛 42501；
2. 房间 Viewer 账号尝试插入确认事件，断言必抛 42501；
3. 试图针对 `pending` 状态文件调用确认 RPC，断言必抛 22023；
4. 供应商 B 尝试直接从 Supabase Storage API 获取供应商 A 上传的图纸原始对象，断言返回 403。
