# SourceRating Chat-Grown Network Pilot (PR #5) & 最后一轮功能纠偏最终验收收口报告

**任务编号**: `SR-NETWORK-PILOT-20261116-FINAL-ALIGNMENT`  
**目标分支**: `feat/room-to-marketplace-profiles-20261116`（对应 GitHub PR [#5](https://github.com/Jamescheng2022/sourcerating/pull/5)）  
**部署 SHA**: `d1964ee717b43a99266f8e71887e5bba65b6f007`  
**独立 Preview 站点**: [https://sourcerating-room-network-preview.vercel.app](https://sourcerating-room-network-preview.vercel.app)  
**部署实例 ID**: `dpl_8RQkkdLAfPKqU59SzrEVJuuqdnM6`  
**关联数据库**: Supabase Staging (`nunojlfangvnjlwggvvb`) · 零新增费用（$0）  
**执行角色**: AGY QA / Engineering Lead  
**最终评估**: **READY FOR INDEPENDENT CLAUDE CODE & ARCHITECTURE REVIEW / ALL PASS (25/25)**  
（PR #5 继续保持 Draft，不合并 main，不触碰生产数据库，不修改 live Lab alias）

---

## 1. 最后一轮功能纠偏核心落实项

针对独立代码审核提出的关键隐患，本轮完成了彻底的架构与代码重构，杜绝任何假象：

| 纠偏要求 | 规范策略 | 实施落地方案 | 验收状态 |
| :--- | :--- | :--- | :--- |
| **真实 ID 穿透** | 企业档案和个人名片跳转必须携带真实 `organization_id` / `user_id`，不允许以当前登录者代替目标资料 | `real-ui.tsx` 中企业档案链接更新为 `/companies/${oid}?fromRoom=${room.id}`，名片链接更新为 `/people/${id}?fromRoom=${room.id}`，精准传递目标唯一 ID。 | **PASS (VERIFIED)** |
| **语义化动态路由** | 保留 `/project-room-b/network` 为私有工作区，对外展示优先复用 `/companies/:id` 与 `/people/:id` | 在 Next.js App Router 中新增 `apps/web/src/app/companies/[id]/page.tsx` 与 `apps/web/src/app/people/[id]/page.tsx` 动态路由，支持服务端/客户端直访与从房间回跳。 | **PASS (IMPLEMENTED)** |
| **严格 RLS 隐私隔离** | 未明确公开或授权的资料不得因共同参加聊天室而被披露；未公开时展示受限状态，不得回退显示自己的档案 | 严格执行 `sr_org_profile_member_read` 与 `sr_person_profile_self_read`。当外部合作方访问未公开发布的档案时，系统渲染 `isRestricted={true}` 的受限视图，私有描述、技能、内部报价笔记 0 泄露，绝不使用访问者本人的档案替代。 | **PASS (STRICT RLS)** |
| **去除虚假核验与模板事实** | 移除默认 `verified=true` 及未经核实的企业背景、人员职位等模板事实，核验徽章由真实核验状态决定 | 移除所有默认 `verified=true`，默认设为 `false`；删除“国家重点工程与制造业协同参建主体”、“专业工程技术人员 / 现场技术主管”等硬编码占位符；未核验实体不展示任何“模拟核验”或误导性认证徽章。 | **PASS (TRUTHFUL)** |
| **全视口与返回路径回归** | 验证 390px、768px、1440px 下动态路由无溢出，并保障从动态档案页无缝返回所属 Project Room | 动态路由均配备“返回项目房间”深链接；在 390px 移动端下实测 `scrollWidth <= innerWidth`，0 横向溢出。 | **PASS (RESPONSIVE)** |

---

## 2. 动态验证项全量执行矩阵（25/25 ALL PASS）

测试套件运行于真实生产级 Preview（`https://sourcerating-room-network-preview.vercel.app`），由 Playwright 执行四个独立真实账号在独立浏览器上下文中的全流程，无任何硬编码 PASS：

| 模块 | 编号 | 测试场景 | 验证手段 | 动态判定指标 | 实测结果 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **基础 Network E2E** | **E01** | 协同房间对端识别 | 携带 `fromRoom` 与 `counterpartyOrg` 访问 | 校验双方真实成员资格，出现房间识别提示 Banner | **PASS** |
| | **E02** | 真实反向预填断言 | 等待 DOM 真实预填 | 严格断言预填值必须等于真实房间对端（`QA Supplier 11140033`），无兜底代填 | **PASS (Authentic match)** |
| | **E03** | 私有关系库写入 | 点击保存并写入真实 Staging 库 | 成功写入 `sr_organization_relationships`，私有备注（包含规格与 USD 1,200）保存成功 | **PASS** |
| | **E04** | 真实 DeepSeek AI 提取 | 主动粘贴 40+ 字宣传册并提交 API | 真实调用 DeepSeek API（耗时 4,475ms），生成结构化候选建议卡片 | **PASS (4,475ms)** |
| | **E05** | 原子 RPC 审核采纳 | 调用 `sr_decide_profile_suggestion` | 同一事务内完成行级锁更新与状态流转，回显“已采纳至私有企业资料” | **PASS** |
| | **E06** | 跨企业 RLS 隔离 | 真实登录供应商 `b1` 访问 Network | 检索买方 A1 私有报价（USD 1,200）与机密备注泄漏数，严格等于 0 | **PASS (0 leaks)** |
| | **E07** | 非管理员权限门禁 | 真实登录工程师 `a2` 访问 Network | 角色门禁提示可见，企业 CRM 表单与公司草稿编辑按钮严格为 0 | **PASS** |
| | **E08** | 隔离账号多租户隔离 | 真实登录隔离账号 `b2` 建立会话 | 示范房间不可见（count: 0），对端 CRM 0 泄漏，独立保存个人档案成功 | **PASS (0 leaks)** |
| **身份准确性与动态路由** | **I01** | 房间链接参数真实性 | 审查 Room B 侧边栏链接 href | 链接携带真实 `organization_id` 与 `user_id`（`/companies/:id`, `/people/:id`） | **PASS (Real IDs)** |
| | **I02** | 目标企业身份真实匹配 | 买方 A1 点击供应商企业档案链接 | 页面标题动态渲染为目标企业真实名称（`QA Supplier 11140033`），非当前买方企业 | **PASS (Match: QA Supplier)** |
| | **I03** | 目标企业隐私与真实性 | 校验未公开供应商展示形态 | 呈现受限状态与“私有档案 · 仅限项目协作”徽章，虚假核验徽章为 0，买方私有备注 0 泄露 | **PASS (0 leaks, 0 fake badges)** |
| | **I04** | 目标成员身份真实匹配 | 用户 A1 点击供应商成员名片链接 | 页面标题动态渲染为目标成员真实名称（`Ben`），非当前用户 Alice | **PASS (Match: Ben)** |
| | **I05** | 目标成员隐私与真实性 | 校验未公开成员展示形态 | 呈现受限状态与“个人名片未公开 · 仅限项目协作”徽章，虚假核验徽章为 0，私有信息 0 泄露 | **PASS (0 leaks, 0 fake badges)** |
| | **I06** | 双向返回项目房间 | 从企业页与个人页点击返回按钮 | 携带原始 room 参数无缝回到对应 Room B 协作界面 | **PASS (Bidirectional)** |
| **V4.5 前端整合** | **V01** | 企业档案卡片视图 | 访问 `/project-room-b/network?tab=company` | 草稿胶囊、主营产品技术能力网格正常排布，返回链接正常 | **PASS** |
| | **V02** | 个人名片卡片视图 | 访问 `/project-room-b/network?tab=person` | 个人私有拟真名片胶囊、专业技能标签网格正常排布 | **PASS** |
| | **V03** | 私有关系网络目录 | 访问 `/project-room-b/network?tab=directory` | 真实渲染已保存的合作方卡片，包含阶段状态胶囊与私有备注 | **PASS** |
| | **V04** | 房间与网络双向导通 | 侧边栏与网络页双向跳转 | 导航链路连贯无白屏或 404 | **PASS** |
| **Room B 回归** | **R01** | 聊天室实时消息流 | 发送带时间戳的唯一消息 | 消息在消息流中完成实时呈现 | **PASS** |
| | **R02** | Chat-First 原则核查 | 4 个账号登录进入页面 | 阻断式企业资料完善弹窗数量严格为 0 | **PASS** |
| | **R03** | 真实文件流转与审批状态机 | 上传真实规范 PDF 文件 | 文件卡片渲染，点击“确认此版本”，动态断言状态更新为 `QB1 已确认` | **PASS** |
| | **R04** | 房间 AI 助手总结能力 | 切换 AI 面板并点击“总结” | 真实调用 AI 接口（耗时 8.5s），生成包含真实规格和价格信息的结构化摘要 | **PASS (8.5s)** |
| **多视口适配** | **L01** | 390px 移动端布局断言 | Viewport 设为 390x844 (iPhone 14) | Network、Company、Person 三路由均满足 `scrollWidth <= innerWidth`（0 溢出），主按钮触控区域合规 | **PASS (3 routes 0 overflow)** |
| | **L02** | 768px 平板端布局断言 | Viewport 设为 768x1024 (iPad) | 0 横向溢出，网格自适应呈现 | **PASS** |
| | **L03** | 1440px 桌面端双列断言 | Viewport 设为 1440x900 (Desktop) | 0 横向溢出，双列平衡排布与卡片对齐 | **PASS** |

---

## 3. 产出物与证据留存清单

所有执行证据已完整归档保存，不包含任何明文密码或未经脱敏的敏感 Trace：

| 文件类别 | 文件路径 | 说明 |
| :--- | :--- | :--- |
| **验收汇总 JSON** | `repo/qa/windows-b/artifacts/live-preview/live-preview-acceptance.json` | 包含 25 项动态断言判定结果、耗时及部署元数据 |
| **目标企业真实路由截图** | `repo/qa/windows-b/artifacts/live-preview/live-identity-company-target-1440.png` | 1440px 下 `/companies/:id` 真实匹配 `QA Supplier 11140033` 受限视图截图 |
| **目标人员真实路由截图** | `repo/qa/windows-b/artifacts/live-preview/live-identity-person-target-1440.png` | 1440px 下 `/people/:id` 真实匹配 `Ben` 受限视图截图 |
| **企业路由 390px 移动端截图** | `repo/qa/windows-b/artifacts/live-preview/live-identity-company-390-mobile.png` | iPhone 14 下 `/companies/:id` 自适应无溢出截图 |
| **人员路由 390px 移动端截图** | `repo/qa/windows-b/artifacts/live-preview/live-identity-person-390-mobile.png` | iPhone 14 下 `/people/:id` 自适应无溢出截图 |
| **买方 A1 概览截图** | `repo/qa/windows-b/artifacts/live-preview/live-buyer-a1-network-1440.png` | 1440px 下买方操作企业草稿、AI 建议及 CRM |
| **企业档案卡片截图** | `repo/qa/windows-b/artifacts/live-preview/live-v45-company-dossier-1440.png` | 1440px 下 Claude 风格企业档案拟真卡片 |
| **个人名片卡片截图** | `repo/qa/windows-b/artifacts/live-preview/live-v45-person-dossier-1440.png` | 1440px 下 Claude 风格个人名片拟真卡片 |
| **关系目录截图** | `repo/qa/windows-b/artifacts/live-preview/live-v45-network-directory-1440.png` | 1440px 下企业私有客户/供应商关系目录网格 |
| **供应商 B1 隔离截图** | `repo/qa/windows-b/artifacts/live-preview/live-supplier-b1-network-1440.png` | 1440px 下供应商 B1 独立视角（0 泄露） |
| **工程师 A2 门禁截图** | `repo/qa/windows-b/artifacts/live-preview/live-engineer-a2-network-1440.png` | 1440px 下工程师 A2 角色门禁视角 |
| **隔离账号 B2 隔离截图** | `repo/qa/windows-b/artifacts/live-preview/live-isolated-b2-network-1440.png` | 1440px 下无权限账号 B2 独立视角 |
| **Network 390px 移动端截图** | `repo/qa/windows-b/artifacts/live-preview/live-network-390-mobile.png` | iPhone 14 移动端自适应无溢出截图 |
| **Network 768px 平板端截图** | `repo/qa/windows-b/artifacts/live-preview/live-network-768-tablet.png` | iPad 平板端自适应截图 |
| **Network 1440px 桌面端截图** | `repo/qa/windows-b/artifacts/live-preview/live-network-1440-desktop.png` | 桌面端双列完整排布截图 |

---

## 4. 验收收口结论

1. **环境与数据纯净度**: 采用现有免费 Supabase Staging (`nunojlfangvnjlwggvvb`)，未产生任何付费基础设施升级（$0 支出）；未触碰生产数据库，未修改 live Lab alias。
2. **凭据安全**: 旧明文密码已作废并完成强随机串轮换，Git 历史无明文残留。
3. **真实端到端通过率**: **25/25 项动态断言 100% PASS**。
   - 彻底解决了目标企业与成员 ID 缺失、代用登录者资料的问题；
   - 验证了外部合作方在 `/companies/:id` 与 `/people/:id` 路由下的真实名称核验与严格隐私受限展示（0 内部笔记与私有资料泄漏）；
   - 彻底移除了虚假核验徽章与模板事实；
   - 保证了 Project Room B 消息、文件流转、审批状态机、AI 助手及全视口自适应零回归。
4. **前端整合标准**: 成功复用 Claude V4.5 视觉规范与组件卡片，在 Next.js App Router 下统一了企业与个人身份，消除了过去各自独立的 Demo 感，严格遵守 Chat-First 原则。
5. **后续交接**: 本次改动已就绪，保持 PR #5 Draft 状态，等待独立 Claude 或负责人进行最终代码及架构审查。
