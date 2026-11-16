# SourceRating Chat-Grown Network Pilot (PR #5) 独立 Preview 交付与最终验收报告

**任务编号**: `SR-NETWORK-PILOT-20261116`  
**目标分支**: `feat/room-to-marketplace-profiles-20261116`（对应 GitHub PR [#5](https://github.com/Jamescheng2022/sourcerating/pull/5)）  
**部署 SHA**: `3d78f94cb456d2b51fa816eeb0a7ccece08d4b8e`  
**独立 Preview 站点**: [https://sourcerating-room-network-preview.vercel.app](https://sourcerating-room-network-preview.vercel.app)  
**关联数据库**: Supabase Staging (`nunojlfangvnjlwggvvb`) · 零新增费用（$0）  
**执行角色**: AGY QA / Engineering Lead  
**最终评估**: **PREVIEW READY / ALL PASS**（PR #5 保持 Draft，不合并 main，不触碰生产数据库与现有 Lab 别名）

---

## 1. 交付概览与核心修复

根据 Owner 批准的“方案 A（先修复、后迁移、不增付费资源）”，已在 `feat/room-to-marketplace-profiles-20261116` 分支完成以下安全与工程加固，并顺利迁移到免费 Staging 数据库：

| 模块 | 初始风险 / 漏洞 | 加固与修复措施 | 验证结论 |
| :--- | :--- | :--- | :--- |
| **建议审核绕过漏洞** | `sr_profile_suggestions` 存在直接 `UPDATE` 策略，绕过原子审核逻辑 | 撤销对该表的全部直接 `UPDATE` 授权；在 Trigger 增加 `sr.in_rpc` 会话锁校验；强制所有审核流转必须通过 `sr_decide_profile_suggestion` 原子函数 | **PASS**（负向测试 T14 拦截 42501） |
| **原子 RPC 权限控制** | 函数权限可能被非管理员调用或发生跨组织提权 | 显式锁定 `SECURITY DEFINER set search_path = public, pg_temp`；增加 `auth.uid()` 鉴权与当前组织 `owner/admin` 角色校验；使用 `FOR UPDATE` 行级独占锁 | **PASS**（负向测试 T15, T18 严密拦截） |
| **并发与一致性保护** | 并发重复决策或非法字段更新可能造成状态错乱 | 在同一 ACID 事务内验证 `status = 'pending'`；添加负向测试验证并发决策拒绝与约束失败原子回滚（无脏数据） | **PASS**（负向测试 T16, T17 完美回滚） |
| **AI 配额与防刷保护** | Preview 环境可能被频繁触发 AI 提取消耗配额 | 在 `/api/project-room-b/profile-suggest` 增加组织级滑动窗口限流（每分钟最多 6 次），超额返回 HTTP 429 | **PASS**（限流保护生效） |
| **关系库重复录入防护** | 同一合作方再次建联或更新备注时可能触发唯一索引冲突 | 前端对已有关系记录进行防御性查询；若已存在则更新私有备注与时间戳，避免唯一键报错 | **PASS**（Live Preview 验证通过） |

---

## 2. 数据库安全与负向测试套件（18/18 PASS）

在隔离环境中执行 `npm run test:network:rls`，全量覆盖正向功能与 5 项安全负向测试：

* **数据表清单 (4 张表)**:
  1. `public.sr_organization_profiles`（企业私有资料与公开目录草稿，RLS 开启）
  2. `public.sr_person_profiles`（用户个人专业资料，跨企业私有，RLS 开启）
  3. `public.sr_organization_relationships`（企业定向私有客户/供应商关系记忆，RLS 开启）
  4. `public.sr_profile_suggestions`（AI/宣传册提取候选事实，禁止直接 UPDATE，RLS 开启）
* **核心原子 RPC**: `public.sr_decide_profile_suggestion`（`SECURITY DEFINER set search_path = public, pg_temp`）

```text
[1/5] Initialising isolated embedded Postgres instance...
[2/5] Applying local Supabase shims and migration history...
  Applied 32 migrations including 202611160001_chatgrown_network_foundation.sql
[3/5] Setting up synthetic tenant test data (2 Orgs, 4 Personas)...
[4/5] Running RLS, cross-organization and transactional tests...
  PASS T01: All 4 network tables exist and have Row Level Security enabled.
  PASS T02: Org A admin successfully inserted private company profile.
  PASS T03: Org B admin strictly blocked from reading Org A private profile (0 rows).
  PASS T04: Public publication and reversion to private strictly enforced by RLS.
  PASS T05: User personal profiles are strictly private and unreadable by other users.
  PASS T06: Org A admin created private relationship record for counterparty Org B.
  PASS T07: Counterparty Org B cannot read Org A relationship or private notes (0 rows).
  PASS T08: Regular organization member cannot access admin-only relationship directory.
  PASS T09: Immutability trigger prevents reassigning private relationship to another firm.
  PASS T10: AI profile suggestions are isolated to target organization admins.
  PASS T11: Transactional confirmation RPC atomically applied profile changes and updated review state.
  PASS T12: Transactional dismissal RPC marked suggestion dismissed without altering profile.
  PASS T14: Direct UPDATE on profile suggestions strictly blocked (RPC enforcement verified).
  PASS T15: Regular member strictly blocked from deciding profile suggestions (403 denied).
  PASS T16: Concurrent / duplicate decision attempt cleanly rejected (race-condition protected).
  PASS T17: Atomic rollback verified on constraint failure (zero partial state left).
  PASS T18: Unauthenticated caller strictly blocked from executing decision RPC.
  PASS T13: Removed member immediately loses access to all private organization records.
[5/5] All 18 isolated Postgres RLS & transactional contract checks PASSED!
```

---

## 3. 真实 Staging 数据库迁移与灾备方案

* **目标数据库**: Supabase Staging (`nunojlfangvnjlwggvvb`)
* **迁移文件**: `supabase/migrations/202611160001_chatgrown_network_foundation.sql`
* **应用状态**: 经所有者确认授权后成功应用；Supabase 远端迁移历史已标记 `[202611160001] applied`。
* **灾备回滚方案**: 已将幂等销毁性回滚脚本归档至 `supabase/rollbacks/202611160001_chatgrown_network_foundation_rollback.sql`。**注意**：该脚本包含 `DROP TABLE ... CASCADE`，属于结构销毁性重置，会永久清除 4 张新表内的已有数据，**绝非无损回滚**；正式或必要时执行前必须先行导出全库数据备份。

---

## 4. Live Preview 独立站点端到端真机与多角色验收

验收环境直接运行于 [https://sourcerating-room-network-preview.vercel.app](https://sourcerating-room-network-preview.vercel.app)，后端直连 Staging 数据库。测试涵盖四大测试账号：

* **测试账号清单**:
  - `a1` (买方管理员): `qa-a1-16d7b4@sr-staging.test`
  - `a2` (买方工程师): `qa-a2-2dc47b@sr-staging.test`
  - `b1` (供应商管理员): `qa-b1-237311@sr-staging.test`
  - `b2` (无权限/隔离账号): `qa-b2-919a96@sr-staging.test`

### 真实执行与验证清单

1. **协同房间识别与关系沉淀 (Persona a1)**:
   - 携带房间深层链接访问 Network 页面，系统自动识别共同协作方并提示：`已根据你有权限访问的项目房间识别合作企业。保存后仅在本企业客户库中可见。`。
   - 自动预填合作方 `QA Supplier 11140033`，输入保密备注（包含 `M20 bolts & 12mm plates approved at USD 1,200. Confidential to Company A.`）。
   - 点击“保存为私有关系”，数据即时写入 Staging 数据库 `sr_organization_relationships` 表：**PASS**。

2. **真实 DeepSeek AI 宣传册提取与原子 RPC 采纳 (Persona a1)**:
   - 粘贴企业宣传册文本，调用真实 DeepSeek AI 生成候选能力卡片（耗时 ~15s）：**PASS**。
   - 将 AI 建议加入待确认队列后，点击“确认并应用”，触发原子 RPC `sr_decide_profile_suggestion`，成功更新企业资料草稿并将建议状态原子更新为 `accepted`：**PASS**。

3. **跨企业数据隐私严格隔离 (Persona b1)**:
   - 供应商管理员 `b1` 登录并访问其企业网络页面，系统对其执行严格 RLS 隔离检查：
   - 检查 Company A 的 `USD 1,200` 报价与 `Confidential to Company A` 备注泄漏数：**0 泄漏（Strictly Isolated，PASS）**。

4. **非管理员权限门禁校验 (Persona a2)**:
   - 普通工程师 `a2` 访问 Network 页面，触发角色门禁保护：
   - 提示：`企业资料和企业私有客户库需要管理员权限；你的个人资料可由自己维护。`。
   - 企业级资料、CRM 关系库与 AI 提取工具完全隐藏，仅开放维护个人专业技能资料：**PASS**。

5. **原有 Project Room B 功能零回退 (Regression)**:
   - 消息收发与实时渲染：**PASS**。
   - Chat-First 原则核查：登录后直接进入项目房间，**无任何强制完善企业资料的阻断式 Onboarding 弹窗**（count: 0）：**PASS**。
   - 文件与审批面板完整可用：**PASS**。
   - 房间 AI 助手功能可用：**PASS**。

6. **多视口响应式布局适配**:
   - `390px` 移动端：单列自适应，无横向滚动溢出，主要操作按钮清晰可用：**PASS**。
   - `768px` 平板端：卡片网格响应式重排：**PASS**。
   - `1440px` 桌面端：双列平衡布局，资料与关系库并排展示：**PASS**。

---

## 5. 完整 PASS / FAIL / NOT RUN 矩阵

| 编号 | 测试场景 / 功能项 | 执行环境 | 状态 | 详细证据 / 备注 |
| :--- | :--- | :--- | :--- | :--- |
| **T01** | 4 张新数据表存在且开启 RLS | 隔离 Postgres / Staging | **PASS** | `sr_organization_profiles`, `sr_person_profiles`, `sr_organization_relationships`, `sr_profile_suggestions` |
| **T02** | 企业私有资料写入与读取 | 隔离 Postgres / Staging | **PASS** | 仅本企业管理员可读写私有企业资料草稿 |
| **T03** | 跨企业私有企业资料隔离 | 隔离 Postgres / Staging | **PASS** | 对端企业 0 行可见 |
| **T04** | 公开与私有可见性切换约束 | 隔离 Postgres / Staging | **PASS** | 满足发布审批约束 |
| **T05** | 个人专业资料绝对私有性 | 隔离 Postgres / Staging | **PASS** | 跨用户完全不可见 |
| **T06** | 企业私有关系库记录创建 | 隔离 Postgres / Staging | **PASS** | 支持定向记录买方/供应商/合作伙伴 |
| **T07** | 跨企业私有关系库双向隔离 | 隔离 Postgres / Staging | **PASS** | 被记录方完全感知不到对方的 CRM 备注 |
| **T08** | 普通成员访问关系库权限拦截 | 隔离 Postgres / Staging | **PASS** | 非管理员禁止查询或写入关系表 |
| **T09** | 关系归属组织不可篡改触发器 | 隔离 Postgres / Staging | **PASS** | 拦截跨租户修改所有权 |
| **T10** | AI 建议草稿租户隔离 | 隔离 Postgres / Staging | **PASS** | 仅本企业管理员可查询本企业候选事实 |
| **T11** | 原子 RPC 确认应用资料与状态 | 隔离 Postgres / Staging | **PASS** | `sr_decide_profile_suggestion(..., true)` |
| **T12** | 原子 RPC 忽略建议不影响资料 | 隔离 Postgres / Staging | **PASS** | `sr_decide_profile_suggestion(..., false)` |
| **T13** | 离职成员即时权限吊销 | 隔离 Postgres / Staging | **PASS** | `removed_at` 触发 RLS 立即拒访 |
| **T14** | 直接 UPDATE 建议表绕过拦截 | 隔离 Postgres | **PASS** | 触发 Trigger + Revoke 拦截（42501） |
| **T15** | 非管理员调用原子 RPC 拦截 | 隔离 Postgres | **PASS** | 严格拒绝无权限成员（403 denied） |
| **T16** | 并发 / 重复决策幂等性保护 | 隔离 Postgres | **PASS** | 重复决策直接拒绝，防止 Race Condition |
| **T17** | 约束失败事务原子回滚 | 隔离 Postgres | **PASS** | 资料字段超长时全事务回滚，0 残留 |
| **T18** | 匿名 / 未鉴权调用 RPC 拦截 | 隔离 Postgres | **PASS** | 严格拦截未携带合法 JWT 的调用 |
| **E01** | 协同房间深层链接识别对端企业 | Live Preview (Vercel) | **PASS** | 自动预填并展示安全提示 Banner |
| **E02** | 真实保存私有供应商关系与备注 | Live Preview (Vercel) | **PASS** | 成功写入 Staging，防重复录入无异常 |
| **E03** | 真实 DeepSeek 提取企业宣传册 | Live Preview (Vercel) | **PASS** | 成功生成公司简介、网站、国家、能力候选 |
| **E04** | 真实触发原子 RPC 采纳并生效 | Live Preview (Vercel) | **PASS** | 前端通过 Supabase RPC 成功写入 Staging |
| **E05** | 跨企业浏览器 DOM 隐私泄漏检查 | Live Preview (Vercel) | **PASS** | USD 1,200 与机密备注泄漏计数为 0 |
| **E06** | 工程师角色门禁 UI 隐藏与个人页 | Live Preview (Vercel) | **PASS** | CRM 表单隐藏，保留个人专业资料填写 |
| **E07** | 原有 Room B 消息收发与实时更新 | Live Preview (Vercel) | **PASS** | 聊天功能完整，实时历史无异常 |
| **E08** | 原有 Room B 文件与审批面板 | Live Preview (Vercel) | **PASS** | 审批卡片与文件列表完好无损 |
| **E09** | Chat-First 原则（零阻断弹窗） | Live Preview (Vercel) | **PASS** | 登录后 0 onboarding 弹窗直接进入聊天 |
| **E10** | 390px 移动端视口自适应渲染 | Live Preview (Vercel) | **PASS** | 布局自适应，无横向溢出 |
| **E11** | 768px 平板端视口自适应渲染 | Live Preview (Vercel) | **PASS** | 网格自适应重排 |
| **E12** | 1440px 桌面端双列布局渲染 | Live Preview (Vercel) | **PASS** | 资料与关系库双列平衡排布 |
| **M01** | 手机真机软键盘弹出推顶输入框 | 物理移动真机 | **NOT RUN** | 当前通过 Chrome 移动视口模拟完成，真机物理键盘交互留待外网众测时执行 |
| **M02** | 图纸 PDF / CAD 文件的 OCR 自动提取 | 多模态解析服务 | **NOT RUN** | 本版本仅支持用户主动粘贴纯文本宣传册，非文本文件解析属于未来特性规划 |

---

## 6. 独立 Preview 访问信息与状态

* **独立体验 URL**: [https://sourcerating-room-network-preview.vercel.app](https://sourcerating-room-network-preview.vercel.app)
* **直接进入 Network 体验路径**:
  1. 访问预览站，使用受保护本地凭据中的测试账号 `a1`（`qa-a1-16d7b4@sr-staging.test`）登录（测试账号凭据仅通过私有环境变量或受保护本地 `secrets/users.json` 读取，严禁在文档或代码中提交明文）；
  2. 登录后可点击聊天界面右上角“关系与能力资料”，或直接访问 `/project-room-b/network`；
  3. 支持体验从宣传册粘贴文本提取资料、原子审核采纳、维护私有客户/供应商关系。
* **隔离验证账号**:
  - 换用 `b1`（`qa-b1-237311@sr-staging.test`，供应商主管）登录，确认看不到任何企业 A 的 CRM 备注与报价；
  - 换用 `a2`（`qa-a2-2dc47b@sr-staging.test`，工程师）登录，确认企业 CRM 被角色门禁隐藏，仅能维护个人技能；
  - 换用 `b2`（`qa-b2-919a96@sr-staging.test`，隔离账号）登录，验证无权限房间与网络的隔离拦截。
* **边界恪守确认**:
  - `main` 分支未发生任何修改；
  - PR #5 保持为 **Draft PR**，等待后续与 Claude V4.2 前端完成架构整合评审；
  - 正式生产库（`qnozpurjtgkmwtvsrjoi`, `fzrberkeoizarduwuisp`）和正式 Lab 别名（`https://sourcerating-room-lab.vercel.app`）未受任何影响。
