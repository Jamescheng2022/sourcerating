# E2E Test Matrix & Multi-Persona Verification Suite
## SourceRating Project Room / Workroom Release A

**Date:** 2026-11-18  
**QA Lead:** SR-05 (AGY QA)  
**Target Environment:** Staging Isolated (`nunojlfangvnjlwggvvb`) & Preview (`https://sourcerating-room-network-preview.vercel.app`)  
**Baseline Commit:** `7629b5dbcea55a6e1b7b2c69d101618a527db5ec`  
**Execution Authority:** Strict Read-Only Verification / Zero Hardcoded Pass

---

### 一、 5 种独立角色画像与测试隔离边界 (Persona Matrix)

测试套件严禁串用 Session，每个角色分配独立且隔离的 Browser Context / Storage State：

| 角色代码 | 角色定位 | 组织属性 | 测试目标与权限边界 | 凭证读取策略 |
| :--- | :--- | :--- | :--- | :--- |
| **`a1`** | **Buyer Admin** | 买方主企业 (Org A) 管理员 | 发起 Project / Room，邀请供应商，创建/采纳 AI 资料草稿，管理企业私有 CRM 关系，执行 Human Commit 确认 | `secrets/users.json` key: `a1` |
| **`a2`** | **Buyer Engineer** | 买方主企业 (Org A) 工程师 | 参与房间技术讨论，查看图纸/PDF，无权编辑企业草稿，无权访问非所在项目的私有报价 | `secrets/users.json` key: `a2` |
| **`b1`** | **Supplier Admin** | 供应商企业 (Org B) 管理员 | 接受买方邀请进入协作 Room，上传技术规格与报价单，确认文件版本，独立维护供应商私有资料 | `secrets/users.json` key: `b1` |
| **`b2`** | **Isolated User** | 第三方独立企业用户 (Org C) | 验证多租户隔离，对 Org A 与 Org B 的示范房间、企业 CRM 关系、私有报价严格为 0 泄露，独立建房 | `secrets/users.json` key: `b2` |
| **`unauthed`**| **Anonymous Visitor** | 未登录外部访客 | 访问 `/companies/:id` 与 `/people/:id`，断言 0 内部笔记与私有资料泄漏，验证明确的登录引导 | 匿名无凭证会话 |

---

### 二、 四条核心商业业务旅程覆盖 (Core Journeys)

1. **旅程 1：工程检测与专业技术澄清 (Engineering Service Journey)**  
   业主（A1）邀请工程师（A2）与外部检测服务商（B1）在特定子房间澄清技术规范，上传图纸 v1/v2，双向比对哈希与变更说明，检测机构出具报告后完成多方签名凭据沉淀。
2. **旅程 2：定制采购与多供应商隔离报价 (Custom Procurement Isolation)**  
   买方（A1）分别与供应商 A（B1）和竞争供应商 B 建立独立协作房间，双方独立沟通技术与商务报价。断言 B1 绝对无法检索到竞争对手的报价记录与文件 Storage 对象。
3. **旅程 3：受邀供应商增长飞轮 (Supplier-as-Owner Flywheel)**  
   受邀加入协作的供应商（B1）在完成当前协作后，可在自身组织下作为新 Room Owner 发起全新项目并邀请其下游二级供应商，验证邀请增长飞轮。
4. **旅程 4：Precast 行业页面浅嵌入咨询升级 (Precast Embed-to-Room)**  
   在 Precast 行业页面携带产品编号发起原地咨询，服务端验证产品引用与上下文后一键升格为 SourceRating Project Room，会话与上下文无缝继承。

---

### 三、 动态测试项全量执行矩阵 (25 项验收与自动化套件)

测试运行基于 `qa/windows-b/work/test-live-preview-e2e.cjs` 与 `apps/web/scripts/*.test.mjs`：

| 模块 | 编号 | 测试场景 | 核心动态断言指标 | 运行结果 | 证据文件索引 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Network E2E** | **E01** | 协同房间对端识别 | 识别真实成员资格，渲染协作引导 Banner | **PASS** | `E01-banner-present` |
| | **E02** | 真实反向预填断言 | 断言对端企业名称等于 `QA Supplier 11140033`，无兜底假数据 | **PASS** | `E02-authentic-match` |
| | **E03** | 私有关系库写入 | 写入 `sr_organization_relationships`，包含私有报价 USD 1,200 | **PASS** | `E03-crm-persisted` |
| | **E04** | 真实 AI 提取分析 | 提交宣传册调用 API，生成结构化候选建议卡片 | **PASS (4,475ms)** | `E04-deepseek-cards` |
| | **E05** | 原子 RPC 审核采纳 | `sr_decide_profile_suggestion` 行级锁事务流转，状态更新 | **PASS** | `E05-rpc-adopted` |
| | **E06** | 跨企业 RLS 隔离 | 供应商 B1 登录，检索买方 A1 私有报价与机密备注泄漏数严格为 0 | **PASS (0 leaks)** | `E06-zero-leakage` |
| | **E07** | 非管理员权限门禁 | 工程师 A2 登录，角色门禁提示可见，企业 CRM 编辑按钮数为 0 | **PASS** | `E07-role-gated` |
| | **E08** | 隔离账号多租户隔离 | 隔离账号 B2 登录，示范房间不可见 (count=0)，CRM 0 泄漏 | **PASS (0 leaks)** | `E08-multi-tenant-isolated`|
| **动态路由与身份**| **I01** | 房间链接参数真实性 | Room B 侧栏链接携带真实 `organization_id` 与 `user_id` | **PASS (Real IDs)**| `I01-real-query-params` |
| | **I02** | 目标企业身份真实匹配 | A1 点击供应商链接，标题动态渲染为目标企业真实名称，非当前买方 | **PASS** | `I02-company-target-match` |
| | **I03** | 目标企业隐私受限 | 未公开企业呈现受限状态与私有协作徽章，买方私有备注 0 泄露 | **PASS (0 leaks)** | `I03-restricted-view` |
| | **I04** | 目标人员身份真实匹配 | 点击成员名片链接，标题动态渲染为目标人员真实名称 (Ben)，非 Alice | **PASS** | `I04-person-target-match` |
| | **I05** | 目标人员隐私受限 | 未公开人员呈现受限状态与名片未公开徽章，0 私密信息泄露 | **PASS (0 leaks)** | `I05-person-restricted` |
| | **I06** | 双向返回项目房间 | 从企业页与名片页点击返回按钮无缝回到对应 Room B 协作界面 | **PASS** | `I06-back-navigation` |
| **V4.5 前端整合** | **V01** | 企业档案卡片视图 | 草稿胶囊、主营产品网格正常排布，返回链接正常 | **PASS** | `V01-company-dossier` |
| | **V02** | 个人名片卡片视图 | 个人私有拟真名片胶囊、专业技能网格正常排布 | **PASS** | `V02-person-dossier` |
| | **V03** | 私有关系网络目录 | 真实渲染已保存的合作方卡片，包含阶段状态胶囊与私有备注 | **PASS** | `V03-directory-grid` |
| | **V04** | 房间与网络双向导通 | 侧边栏与网络页双向跳转无白屏、无 404 | **PASS** | `V04-bidirectional-flow` |
| **Room B 回归** | **R01** | 聊天室实时消息流 | 发送带时间戳唯一消息，在时间线中完成实时呈现 | **PASS** | `R01-realtime-msg` |
| | **R02** | Chat-First 原则核查 | 4 账号登录进入页面，阻断式资料完善弹窗数为 0 | **PASS** | `R02-zero-modal` |
| | **R03** | 真实文件流转与状态机 | 上传规范 PDF 文件，点击确认，状态动态断言更新为 `QB1 已确认` | **PASS** | `R03-file-confirmation` |
| | **R04** | 房间 AI 助手总结能力 | 切换 AI 面板并点击总结，生成包含规格与价格的结构化摘要 | **PASS (8.5s)** | `R04-ai-summary` |
| **多视口适配** | **L01** | 390px 移动端布局断言 | Viewport 390x844，Network/Company/Person 三路由 `scrollWidth<=innerWidth` | **PASS (0 overflow)**| `L01-mobile-390-fit` |
| | **L02** | 768px 平板端布局断言 | Viewport 768x1024，0 横向溢出，自适应网格排布 | **PASS** | `L02-tablet-768-fit` |
| | **L03** | 1440px 桌面端双列断言 | Viewport 1440x900，0 横向溢出，双列平衡排布与卡片对齐 | **PASS** | `L03-desktop-1440-fit` |

---

### 四、 独立审查发现的待增补回归项 (Gap Remediation in Gate 1~4)

依据 SR-01 与 SR-04 的审查结论，测试矩阵需追加以下负向拦截用例：
1. **[E-NEG-01]** 组织非管理员尝试调用 `sr_remove_org_member` 移除其他成员，必须严格返回 `42501` (Unauthorized)。
2. **[E-NEG-02]** 房间普通成员直接调用 `append_room_event` 插入 `confirmation.recorded` 事件，必须被数据库拒绝。
3. **[E-NEG-03]** 客户端绕过网关直接读取 Storage 桶中 `pending` 状态文件，必须严格拒绝。
4. **[E-NEG-04]** 针对未核验哈希的文件发起 `sr_record_confirmation`，必须严格抛出异常。
5. **[E-UX-01]** Room B 右侧面板集成 `review` Tab，实现点击顶栏“待确认”徽章直达审批卡片。
