# Code & Security Audit Report
## GPT-6.1 Terra Medium (Independent Full-Repo Audit)

**Date:** 2026-11-18 11:57:20 +07:00  
**Model:** `gpt-6.1-terra` (`reasoningEffort: "medium"`) via Codex  
**T3 Thread:** `[SR-04 | GPT-6.1 Terra Medium · Full Code Audit](t3-thread://v2/1c2405c2-edb9-4e4a-be77-5ae9d8317b53/mcp:8e6c7032-55d4-452c-bc3c-e11ee0984c73)`  
**Target Baseline:** `candidate/release-a-launch-20261118` (HEAD `7629b5dbcea55a6e1b7b2c69d101618a527db5ec`)  
**Audit Mode:** Strict Read-Only  
**Review Verdict:** **FAIL (不建议将当前基线作为安全审查通过版本发布，必须先修复以下关键缺陷)**

---

### 一、 关键安全缺陷清单 (Findings)

#### 1. 【P1 安全缺陷】任意登录用户可移除其他组织的非 owner 成员
- **位置:** `supabase/migrations/202611130001_room_core_generalization.sql:458` (`sr_remove_org_member`)
- **根因:** 第 461 行使用 `sr_org_role(...) NOT IN ('owner','admin')` 校验调用者权限。当调用者根本不属于目标组织时，`sr_org_role` 返回 `NULL`。在 PostgreSQL 三值逻辑中，`NULL NOT IN (...)` 运算结果为 `NULL`（非 TRUE），因此无法触发 `IF` 内部的 `RAISE EXCEPTION` 拒绝逻辑！
- **复现风险:** 任意已登录用户只要获取到目标组织 UUID 及非 owner 成员 UUID，即可调用该 Security Definer RPC 将其标记为 `removed_at`，导致受害者失去该组织下所有房间访问权。
- **整改建议:** 改为 `COALESCE(sr_org_role(...), '') NOT IN ('owner','admin')` 或显式判断 `IS NULL`。第 278 行的邀请接受逻辑存在同类 NULL 判断隐患，需一并修复。

#### 2. 【P1 安全缺陷】房间成员可直接伪造系统事件，Viewer 亦可写入
- **位置:** `supabase/migrations/202609250001_p1_room_core.sql:267` (`append_room_event`)
- **根因:** `append_room_event` 直接对 authenticated 角色开放，仅检查组织与房间基础成员资格，未限制 `room_role`，未限制 `event_type` 与 `payload` 校验。
- **复现风险:** 房间 viewer 或恶意参与者可绕过业务 RPC，直接向房间事件表插入伪造的 `confirmation.recorded`、`file.review_requested` 事件，污染时间线与审计证据链。
- **整改建议:** 废除客户端直接调用通用事件追加函数的权限。公共 RPC 仅允许发送受限的用户消息，系统/确认/批注等关键事件只能由受控的业务 RPC 内部触发。

#### 3. 【P1 安全缺陷】Storage RLS 可绕过文件网关与签名下载门禁
- **位置:** `supabase/migrations/202609260004_p1_room_file_hardening.sql:15`
- **根因:** 允许房间成员直接 SELECT Storage 对象，没有要求 `verification_status = 'verified'`。
- **复现风险:** 成员可绕过 `room-file-gateway` 直接下载 `pending`、哈希不匹配或尚未完成安全扫描的文件对象，签名 URL 的 300 秒有效期形同虚设。
- **整改建议:** 撤销客户端对原始 Storage 桶的直接 SELECT 权限，所有下载必须经由网关验证状态后下发短期签名 URL。

#### 4. 【P1 数据一致性】文件确认可绑定未经服务端校验的哈希
- **位置:** `supabase/migrations/202611130001_room_core_generalization.sql:564` (`sr_record_confirmation`)
- **根因:** 仅比对了传入哈希与数据库存储的上传声明哈希，未要求 `verification_status = 'verified'`，未核验 `server_sha256`。
- **复现风险:** 在文件验证失败或篡改状态下仍能生成不可篡改的法定确认凭证。
- **整改建议:** 强制在同一事务中断言 `verification_status = 'verified'` 且 `server_sha256 = sha256 = p_file_sha256`。

#### 5. 【P2 逻辑竞态】确认操作幂等键未绑定请求负载内容
- **位置:** `supabase/migrations/202611130001_room_core_generalization.sql:574`
- **根因:** 仅凭 `client_msg_id` 匹配直接返回既有确认记录，未比对决定与参数是否一致。
- **整改建议:** 幂等检查时比对请求主体与决策内容，完全一致返回旧单，不一致抛出 `idempotency_conflict`。

#### 6. 【P2 前端竞态】实时消息乱序与轮询补齐造成序号断层
- **位置:** `apps/web/src/app/project-room-b/use-real.ts:223`
- **根因:** 轮询以 `seq > top` 补拉，当高序号消息先到达、低序号丢包时，低序号将永远丢失直到全量重载。
- **整改建议:** 按单调递增连续序号维护水位线，发现序号断层立即触发区间范围补拉（`seq BETWEEN min_missing AND max_missing`）。
