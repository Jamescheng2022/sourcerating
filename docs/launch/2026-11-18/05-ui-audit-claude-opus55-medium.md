# 05 · Gate 0 架构与前端 UX 独立首审（SR-01）

| 项 | 值 |
| :--- | :--- |
| 审查人 | Claude Opus 5.5（`claude-opus-5-5`），medium，SR-01 |
| 日期 | 2026-11-18 |
| 基线 | `candidate/release-a-launch-20261118` @ `7629b5d`（工作树 clean） |
| 方法 | 只读静态审查：源码、迁移、Edge Function、`docs/launch/2026-11-18/00–02,14,15`、Master Handoff V4.0 |
| 未覆盖 | 未打开任何部署 URL，未运行应用 / Playwright / 真机；未取得 PDR v3.0/v3.1 原文（仓库内无此文件，对照以 Handoff §1/§5 转述为准）。响应式结论来自代码断点，**不是**截图验收 |
| 业务代码改动 | 无 |

## 结论：**FAIL**（针对 Release A / 受控 Beta 就绪）

`apps/web` 的 Room B（`/project-room-b`）+ Supabase `room_events` 单表事件流 + `sr_*` Security Definer RPC，是**可以保留的唯一基线**，不需要重写；AI 路由只读、不写库，"AI 静默"方向基本正确。但下列 P0 违反产品宪法或 AC，Gate 0 不能视为通过：Needs You → Canonical 人工确认链在 B 版 UI 上**无法到达**；档案页把"已发布"渲染成"核验"徽章；入口指向旧版 A；Precast 嵌入与 Connector **没有任何代码**；实时消息存在丢消息/乱序窗口。

---

## P0 阻塞清单

| # | 问题 | 证据（文件:行） | 违反 | 整改建议 |
| :--- | :--- | :--- | :--- | :--- |
| **P0-A** | **Needs You / 待确认在 Room B 不可达**。顶栏"N 待确认"按钮和消息菜单"查看证据记录"都调用 `openPanel("review")`，但 `RealPanel` 只认 `files`/`ai`，其余一律落到"成员"页。`actions.review()`（调用 `review_staging_proposal`）在 B 版没有任何 UI 调用方。Worker 持续产生 `staging_proposals`，用户却无法接受或驳回。 | `apps/web/src/app/project-room-lab/chat.tsx:108`；`project-room-lab/message.tsx:104`；`project-room-b/real-ui.tsx:362`；`project-room-b/use-real.ts:559-563` | AC-10、AC-14、宪法 §7 Human Commit | 在 `RealPanel` 增加"待确认"页签：proposal 卡片、来源跳转、确认/驳回（需有权限角色）、确认后显示 canonical 记录与审计人/时间。按钮显示的数字必须与这个页签实际列出的条目数一致。 |
| **P0-B** | **伪核验徽章**。`/companies/:id`、`/people/:id` 用 `verified = Boolean(published_at)`，并传 `verificationLevel="VERIFIED"`；头像角标是无文字的 ShieldCheck，徽章文字为"模拟核验"。在真实数据页上，"发布"被呈现为"核验"，没有 EvidenceRef。 | `app/companies/[id]/page.tsx:164-165`；`app/people/[id]/page.tsx:164`；`components/network/Avatar.tsx:66-70`；`components/network/VerificationBadge.tsx:41-46,75` | Handoff §8"不准无凭据标注认证"、Gate 3 | 删除 published → verified 的映射。徽章只能由 `evidence_records` 中可追溯的人工核验产生；没有记录就显示"机构自述"。"模拟核验"组件只允许在 `/project-room-lab`、`/demo` 使用。 |
| **P0-C** | **产品入口歧义**。`/` 重定向到 `/project-room`（版本 A，chatscope + 旧 inquiry 流程），而真实的 Room B 在 `/project-room-b`。`/project-room-lab`（演示）、`/demo`、`/game` 与真实路由并存在同一部署里。 | `app/page.tsx:3`；`app/project-room-b/page.tsx:15` 注释 | Gate 0 退出条件"无部署来源歧义"、宪法 §8 | 写 ADR-01：确定唯一产品路由（建议 `/` → Room B，后续改名为 `/rooms`）。A、lab、demo、game 在 Release A 构建中下线或用环境开关隔离，生产构建不得暴露演示控制。 |
| **P0-D** | **Precast 嵌入与 Integration Hub 没有实现**。全仓找不到 `source_domain`、`product_ref`、嵌入入口、Connector Registry 或 Webhook 验签代码。`15-…blockers.md` 的 P0-4 只是文档条目。 | `grep` 全仓（`apps/web/src`、`supabase/*`）零命中 | AC-11、AC-12、AC-17、Gate 3 | 先冻结 `12-precast-embed-contract.md`（见 ADR-04），再实现服务端验签的 `POST /api/embed/inquiry`：创建或复用 Room，原样写入 `room_events`，不新建聊天表。Connector 范围由 Owner 用 Scope-ADR 决定。 |
| **P0-E** | **实时消息存在丢失/乱序窗口**。`onEvent` 不按 seq 排序，只追加到列表尾部；补拉条件是 `gt(seq, top)`，`top` 取当前最大 seq。如果 Realtime 先送到 N+2、漏掉 N+1，补拉从 N+2 之后开始，N+1 会一直缺失，直到重进房间；N+1 晚到时又会被插在 N+2 后面。 | `project-room-b/use-real.ts:343-351,388-391` | AC-03、Gate 1 | 按 seq 有序合并；检测"连续 seq 断档"后用 `gt(seq, lastContiguous)` 补拉。增加单测：乱序到达、漏帧、重复帧。 |

## P1 清单

| # | 问题 | 证据 | 建议 |
| :--- | :--- | :--- | :--- |
| P1-1 | 收到 `file.attached`/`confirmation.recorded` 事件时会调用 `loadRoom()` 整体重置为最新 50 条，用户已经向上加载的历史会丢失，滚动位置也会跳。 | `use-real.ts:341-342,303-306` | 只增量拉取文件和确认数据，不覆盖消息列表。 |
| P1-2 | 消息内"预览 / 比较版本 / 相关消息"会写入 `s.preview`，但 B 版面板从不渲染 preview，所以只会打开文件列表。没有页内 PDF 预览、页码或批注锚点。 | `use-real.ts:490`；`real-ui.tsx` 未读 `s.preview` | 接入 `file-preview.tsx` 或成熟的 PDF 组件；AC-05 需要"同版本 + 锚点 + 从聊天回跳"。 |
| P1-3 | 每 5 秒全量 `refresh()`：4 个查询拉取全部可见组织、房间、成员；加上 `postgres_changes` 无过滤订阅 `room_events`。用户和房间增多后，成本与 RLS 评估量线性上升。 | `use-real.ts:230-235,362-366,366-394` | 写 ADR-02：Realtime 改用 per-room Private Broadcast 或带 filter 的订阅；轮询只拉 `last_seq` 摘要。 |
| P1-4 | AI 回合只存在内存里，刷新就丢；只有"仅你可见"的 Personal AI，没有 Room AI 共享范围和二者的区分。 | `real-ui.tsx:463`；`use-real.ts:531` | AC-06 需要两种范围；Room AI 输出只能作为 proposal 进入 Needs You，不能直接发到房间。 |
| P1-5 | `/api/project-room-b/assist` 没有按用户/房间限流，也没有费用上限；房间内容直接拼进 prompt，没有标注"不可信数据"。 | `api/project-room-b/assist/route.ts` 全文无 rate/limit 逻辑 | 加限流和每日额度；用分隔符包裹房间内容并在 system 中声明其为数据；在 Terra 审查中复核。 |
| P1-6 | "移出"成员、"移出组织"是一次点击、没有确认的破坏性操作。 | `real-ui.tsx:423-424` | 加确认对话框并写审计事件。 |
| P1-7 | 档案页把"未登录""无权限""不存在"混成同一个状态；未登录访问 `/companies/:id` 不会提示登录。页头显示调试文本"路由语义: /companies/…"。 | `companies/[id]/page.tsx:117-119,134-155`；`people/[id]/page.tsx:114` | 拆成三种状态并提供登录 CTA；删除调试文本。 |
| P1-8 | 视觉体系分裂：Room B 用 CSS Module，档案页和 Network 用 Tailwind slate 体系，侧栏还混有内联样式和硬编码颜色。从房间跳到档案时，用户会感觉进了另一个网站。 | `real-ui.tsx:257-260,385-421`；`companies/[id]/page.tsx` | 统一 token。档案页优先做成房间内的右侧面板或抽屉，减少整页跳转（宪法 §5"避免多页跳转"）。 |
| P1-9 | 768 宽度属于 `mid` 模式：面板以抽屉打开，但侧栏和聊天的并列与返回逻辑只按 `narrow` 处理 `history`；`isViewingRoom` 用 700 判断，CSS 断点是 699/1099，两处阈值没有统一定义。 | `project-room-b/page.tsx:13,57`；`use-real.ts:181`；`lab.module.css:347,354` | 把断点收敛到一个常量，做 768 实机截图验收（Gate 4）。 |
| P1-10 | `<html lang="en">`，但界面是中文；metadata 仍是旧文案。 | `app/layout.tsx` | 按 locale 输出 `lang`，并考虑泰语和英语。 |
| P1-11 | 翻译目标语言固定取 `navigator.language`，用户不能选择中、英、泰。 | `use-real.ts:482` | 在消息上提供目标语言选择；数字、单位、否定的回归集属于 AC-08。 |
| P1-12 | 共享组件靠 `real as unknown as Lab` 强转，`createRoom`/`setFailNext`/`simulateIncoming` 是空函数。目前演示菜单被 `!lab.real` 隐藏，但类型无法阻止空操作按钮回流到真实页面。 | `project-room-b/page.tsx:67`；`use-real.ts:486-487,564` | 抽出 `RoomAdapter` 接口，演示动作改为可选能力，不再给出空实现。 |
| P1-13 | Gate 0 文档的可信度：`02` 把两个 Preview 都标为 `[VERIFIED-LIVE]`，依据只是 HTTP 200，而且两者响应体都是 8,229 字节（疑为同一个登录壳或 SSO 页）；`15` 中 P0-3 引用的 `chat-pane.tsx` 在仓库中不存在。 | `02-deployment-db-env-map.md`；`15-…blockers.md` | 按 Handoff 改为"SHA + 页面内容断言"之后才标 LIVE，并修正文件引用。 |

## 符合项（保留）

- **单一消息权威**：消息、文件、审核、确认、跨房间摘要都通过 `append_room_event` 写入 `room_events`，按 `client_msg_id` 幂等（`202611130001…sql:575`）。
- **AI 静默**：assist 路由用调用者 token 读取（受 RLS 约束），不写任何记录（`assist/route.ts:8-11`）；AI 失败只影响 AI 面板，聊天发送路径不依赖模型。
- **Human Commit**：文件确认绑定 `file_version_id + sha256`，确认人为当前组织（`use-real.ts:602-611`）；子房间拆分建议需要人工"创建…"。
- **乐观发送与失败重试**：失败消息可重发或删除，同一个 `clientId` 重发由服务端去重。
- **移动端**：用 `visualViewport` 高度处理软键盘，narrow 模式下有 `history` 返回栈，面板在手机上是 bottom sheet，在平板上是 drawer。

## ADR 建议（由 AGY 汇总登记，均为建议，未获 Owner 确认）

1. **ADR-01 唯一产品路由**：Room B 是唯一的 Work 入口；A、lab、demo、game 移出生产构建。
2. **ADR-02 Realtime 契约**：per-room 通道 + seq 断档补拉；明确 Postgres Changes 与 Private Broadcast 的取舍，并给出容量预算。
3. **ADR-03 决策对象流**：`staging_proposal(AI/规则)` → Needs You（有权限的人）→ `canonical_objects` → `room_events(decision.committed)` → Evidence Export。每个对象标注来源：`rules` 还是 `deepseek-draft`，UI 必须区分（Worker 在缺少 key 时回退为规则，见 `source-rating-agent-worker/index.ts:149`）。
4. **ADR-04 Precast 嵌入**：只提供客户端组件，服务端用 HMAC 校验 `source_domain/product_ref/company_ref/project_ref`；升格为 Room 时复用原 `room_id` 和事件，不复制记录。
5. **ADR-05 核验语义**：`published` ≠ `verified`；徽章必须引用 `evidence_records`；定义 self-claimed / collaboration-observed / verified 三级。
6. **ADR-06 档案呈现**：企业和人员档案优先在房间内以面板或抽屉呈现，独立路由只用于分享或深链。

## 复审触发

P0-A…E 关闭后，提交候选分支的 SHA、对应 Preview URL，以及 390/768/1440 截图和交互录屏，由 SR-01 复审。Terra 的代码审查（SR-04）不能代替本 UX/架构审查，本审查也不能代替 Terra。

---

# Gate 4 · Release A 终审（SR-01，2026-11-18）

**裁决：FAIL。** 本节为摘要，完整意见以 SR-01 线程回复为准（已原样呈送 Owner）。

- 审查对象：`candidate/release-a-launch-20261118` @ `9be62d4`（含 `604279c`），远端 HEAD 一致。
- 证据基线问题：验收 JSON 的 `deployment_sha` 为 `d1964ee…`，**该提交不在本仓库中**；JSON 生成时间 05:02Z（12:02 +07），早于修复提交 `604279c`（13:57 +07）。因此 25/25 不覆盖本轮任何修复。
- `qa/windows-b/artifacts/` 未入库。14 张截图中没有 Room B 聊天页，也没有 Android 真机证据。
- 新增 P0：
  - G4-P0-1：`sr_record_confirmation(p_proposal_id)` 可绕过 `review_staging_proposal` 的指派校验与 canonical 写入。
  - G4-P0-2：迁移头部声称的 `append_room_event` 限制没有实现，客户端仍可伪造 `confirmation.recorded` 事件。
  - G4-P0-3：`network/page.tsx:573` 仍渲染 `verified={true}` 的盾牌标记。
  - G4-P0-4：迁移 `202611180001` 没有任何"已应用到 Staging"的记录；`10-migrations…` 中 5 个迁移文件名在仓库中不存在。
- Gate 0 的 P0-C、P0-D、P0-E 仍未修复。

---

# Gate 4 · 第三轮终审（SR-01，2026-11-18，对象 `6644a3b`，Preview 运行 `8663945`）

**裁决：FAIL。** 本节为摘要，完整意见以 SR-01 线程回复为准（原样呈送 Owner）。

**只读实测证据：**
- Vercel：别名 `sourcerating-room-network-preview.vercel.app` → `dpl_DkPwau26xBWiNkX8FvhZXNEjB9WZ`，项目 `sourcerating-room-lab`，SHA `8663945`，`source: cli`。验收 JSON 中的 `deployment_id`（`dpl_8RQkk…`）实际对应旧的 `e70ee20`。
- Supabase Staging `nunojlfangvnjlwggvvb`：
  - `list_migrations` 最后一条为 `202611160001`；
  - `sr_post_room_message` 不存在；
  - `append_room_event` 对 authenticated 可执行；
  - `sr_record_confirmation` 仍是含 `p_proposal_id` 的 8 参数版本，且没有 verified 校验；
  - `sr_remove_org_member` 没有 coalesce 修复；
  - Storage SELECT 策略没有 verified 条件。
  结论：`202611180001`、`0002`、`0003` **均未应用**。`10-migrations…` 第 12–14 行"已应用"与事实不符。
- 2026-11-18 16:23Z 那次 26/26 运行期间，Staging 只写入了 `file.attached` 和 `confirmation.recorded`，**没有任何 `message.posted`**。前端已改为调用不存在的 `sr_post_room_message`，**Preview 上发送文字消息失败**。测试只断言乐观回显，因此误报 PASS。
