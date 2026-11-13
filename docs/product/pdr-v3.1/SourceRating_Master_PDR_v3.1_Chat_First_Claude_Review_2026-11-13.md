# SourceRating — Master PDR v3.1 | Chat-First Core Baseline

**副标题：面向中小企业复杂 B2B 采购与项目协作的 AI 原生聊天工作空间、证据链及双边增长基础设施**  
**版本：** v3.1（2026-11-13，提交 Claude 独立设计与技术审计）  
**状态：** Owner 待批准的产品设计基线；**不代表源码已合并、生产已上线或真实客户验收**  
**产品口号：** *Chat naturally. AI works silently. Business remembers.*  
**产品规则：** *Chat is the product. Procurement is the context. AI is the assistant. Evidence is the asset.*  
**开发规则：** *Build the Core, Integrate the Rest. Freeze the skeleton, refine the organs.*  
**前置参考：** 早期 SourceRating PDR v3.0 与 2026-11-13 Project Room 只读审计；本文件已包含核心产品决策和关键源码链接，不依赖其他附件。

> **审计说明（给 Claude）：** 本文件不是邀请你重新发明一个 ERP、CRM、供应商目录或 3D 设计网站。请把下列已确定的产品边界当作约束，独立指出缺陷，并基于 GitHub 实际源码提出更优秀的 UX、系统架构和落地方案。不要把文档里的“必须有”当作“已经实现”。

## 执行摘要：这次纠偏是什么

SourceRating 的长期定位已经在 2026 年 7 月至 10 月的讨论中建立：它首先是一款**几乎零学习成本、像微信 / WhatsApp / LINE 一样自然的跨企业采购群聊工具**。买方与卖方以各自独立企业身份互相邀请，使用自己熟悉的聊天方式发送消息、图片、语音、文件、图纸、报价与确认。系统在后台保持原始过程，AI 静默抽取技术条件、报价、变更、承诺、风险、任务及相关证据；真正重要的改变通过 Needs You 交给有权人员确认。每次采购自然沉淀为两家企业各自有权限的过程记忆与可复用的 Agent 上下文。

**这不是“在采购 SaaS 里加聊天”，而是“在原生聊天之上自然长出复杂 B2B 采购协作”**。不要求用户先填写复杂 RFQ 表单、学习采购管理界面或使用电子表格才能开始交谈。项目和业务对象可以由系统随过程提取；用户可以随时显式创建或修正，但无需先建立一串流程节点。

独立专业工具（视频会议、Office、CAD/BIM、3D、OCR、CRM/ERP/OA、财务、物流）优先通过 SDK、API、Webhook、MCP、Deep Link 连接，不能反过来把聊天核心弱化为插件合集。WePrefab 的 3D 参数化设计与 BOM 引擎不是 SourceRating 必须亲自制造的核心技术；但其设计版本/构件/BOM/报价与聊天过程的精确关联是 SourceRating 的关键集成场景。

首期目标是：**两个真实企业可以像平时建群聊天一样进入 Project Room、完成多语言技术沟通与文件往来、由 AI 低打扰地整理、在正确授权下确认重要事项，并在下一次询价时找回真实依据**。第二个必要闭环是供应商作为独立主体转为新 Room 发起者，主动邀请另一个买家。

**范围防漂移：** 新兴 Agentic Commerce 协议、Marketplace、信用评级、自动付款、重型企业审批、CAD 编辑可以保留接口并逐步接入，但绝不抢占原生聊天体验与核心数据闭环的工程优先级。

---
## 0. 术语、状态与文档权威性

本文件是 **Master PDR**，约束商业逻辑、产品边界、稳定交互、数据所有权、接口原则与交付验收。各模块后续的详细 PRD、ADR、API Schema、设计稿和测试计划应从此派生。若存在冲突，必须记录正式架构变更（ADR），而非在某个局部开发任务中擅自改变产品方向。

- **[LIVE]**：在检查时从在线部署或在线数据库观察到；不保证整个功能已通过端到端生产验收。
- **[PILOT-VERIFIED]**：在有明确边界的隔离试点完成了真实测试；不等同生产就绪。
- **[CODE]**：指定 GitHub 分支中存在源码或测试脚本；不等于已部署。
- **[REQUIRED]**：批准后首期必须可用的产品要求。
- **[ROADMAP]**：长期架构中保留的模块与扩展点，首期可先提供诚实的受限能力。
- **[HYPOTHESIS]**：需要客户访谈、试点或真实交易验证的商业假设。

**严禁把 Demo 价格、供应商、工程审批、AI 推断、模拟的协同编辑或测试截图称作真实业务成果。**

## 1. 第一性原理：从人性和真实工作习惯定义产品

### 1.1 原始工作行为，而不是采购 SaaS 的菜单

中小企业的复杂采购经常始于一句话：“这个图纸能不能做？大概多少钱？交期多久？”接着是微信/WhatsApp/LINE 群聊、邮件、PDF/Excel、图片、语音、截图以及反复确认。许多企业不愿为了一个供应商安装新的 ERP，采购负责人也不会为了发送一条消息先创建几十个字段的 RFQ。行业差异很大，但**人和人围绕需求交流、澄清、谈条件、传文件、确认和执行的行为**在行业间高度相似。

过去软件将这些动作拆分为 ERP、CRM、SRM、PLM、OA、邮件、云盘和 IM；真正导致损失的往往是无法回答：“现在说的是哪一版图纸？这个数字是谁说的？谁批准了？报价为什么变？客户到底承诺了什么？之前类似采购在哪里做过？”

### 1.2 真正的产品假设

1. **最小行为改变：**如果 SourceRating 的基础聊天达到成熟 IM 的水平，用户可以通过邀请自然加入；不需要“学习采购软件”。
2. **隐形智能的收益：**AI 只在能明显降低重复录入、翻译、文件整理、漏项、审批和追索成本时出现；普通聊天默认不被打断。
3. **先留存过程，再生成智能：**原始消息、文件、版本和权限边界是事实基础；AI 结构化内容是可修正、可重算的派生层；关键商业状态必须由人确认。
4. **长期企业 Agent：**未来的采购 Agent 能使用授权的真实过程记忆、外部数据和人类确认规则进行工作，不必假定必须用专属数据重新训练模型。
5. **双边网络：**买卖双方都拥有独立 OS 与历史资产。供应商从“被邀请者”变成“主动邀请者”，才能形成真正的双边增长。

### 1.3 三条边界

- **不是标准商品货架电商：**不把 Catalog、搜索流量和支付按钮作为首期中心；长期 Marketplace 是现有业务关系上的可选发现层。
- **不是一个 Slack/微信复制品：**底层仍须有强隔离、采购业务对象、证据链、AI 结构化和授权确认，否则用户没有迁移动机。
- **不是强迫客户迁移全部 SaaS：**ERP/CRM/OA/3D/CAD/Office 保留原有权威来源，SourceRating 通过集成记录跨企业过程与操作依据。

**成功条件不只是“聊天能发送”，而是“无需额外操作就比原来的聊天方式更省力、更可信，并能让历史业务复用”。**

## 2. 产品宪法：不得在局部开发中推翻

1. **Chat First / Near-zero Learning Curve：**用户首先进入聊天，像在常见 IM 里建群和沟通，不被 RFQ、CRM、ERP 表单挡在前面。
2. **买卖双方双向发起：**Organization 与用户可在不同项目扮演不同角色，不把 Buyer/Supplier 写死为全局身份；企业可互相邀请。
3. **原生 Project Room 为正式协作场：**微信、WhatsApp、LINE、邮件用于邀请、通知、召回；不依赖抓取私人聊天数据来维持完整证据链。导入历史数据必须另行授权和标注来源完整性。
4. **PC 三栏稳定：**左侧组织/项目/Room，中间群聊/文件工作台，右侧 AI / Needs You / 进度/证据；手机默认全屏聊天，其他功能抽屉化。
5. **聊天体验为 P0：**即时反馈、历史分页、消息引用/回复、附件、检索、未读、移动键盘、断线重试、同步和通知。禁止为了 AI 增加发送延迟。
6. **文件是第一类工作对象：**云端持久化、精确文件版本、哈希、权限、查看、锚定批注和消息关联；第三方编辑器只是能力提供者。
7. **随手问 AI：**消息、文件、文本选择旁提供 Ask AI/Translate，自动带入授权上下文与原文来源；Personal AI 默认私有。
8. **AI 安静地做助理：**实时保存，近实时/定时整理均可；模型故障不影响正常聊天。
9. **人类确认商业状态：**AI 提出 Staging Proposal；Needs You 由有权人处理；Canonical 不能因为一句模糊确认或机器翻译自动写入。
10. **强权限隔离：**买方内部房间和不同供应商房间隔离；授权先于检索，所有数据和 AI 输出遵守 RLS/服务端检查。
11. **先过程，后组织记忆：**原始记录、AI 派生、人工批准状态、业务记忆分层，保留来源和版本关系。
12. **买方和卖方各有资产：**双方企业对自己有权保留的信息形成自己的客户/供应商知识库，不擅自继承对方商业秘密。
13. **对象关联而非全局自动共享：**Person↔Organization↔Project↔Room↔Requirement↔Quote↔File 等 Match & Link 必须能解释、撤销和审计。
14. **Build Core, Integrate Rest：**聊天、协作对象、权限、证据、记忆和集成治理自己掌握；Zoom、Office、CAD、3D、CRM/ERP/OA 优先复用。
15. **首期完整工作方式、逐级增强深度：**客户看到真实可用的全流程骨架，进阶功能可灰度/标 Beta；绝不使用无行为的假按钮。
16. **旧代码资产必须复用：**保留 SourceRating Project Room Pilot 的已验证能力和 WePrefab 独立设计引擎，不未经比较就重写。
17. **来源可追溯、可退出：**所有人可了解有权数据的来源、授权、保留、导出和删除政策，不以“永久不可删除”违背合规责任。
18. **架构冻结的是契约与商业逻辑：**模型、组件、云服务可以替换；破坏核心对象或权限边界须有 ADR、兼容性迁移和回滚。

本文件中标记 [REQUIRED] 的首期能力是产品交付标准，不等于当前状态 [PILOT-VERIFIED] 或 [CODE]。

## 3. 产品定位、用户与双边商业逻辑

### 3.1 产品定义

**SourceRating = Collaboration Kernel + Document Context + AI Decision Layer + Evidence Ledger + Business Memory + Integration Hub + Configurable Workflows。**

首期目标客户是有真实跨企业技术/商务澄清的采购负责人、项目经理、设计/技术主管、制造商销售、供应链代理和专业服务方，而非单纯追求热闹的社交用户。

### 3.2 Buyer OS / Supplier OS / Agent Workspaces

- **Buyer OS：**项目、RFQ、技术文件、独立供应商 Room、报价比较、风险、内部审批、采购决策、交付和历史供应商记忆。
- **Supplier OS：**客户询盘、产品能力、报价、版本、技术答疑、内部技术/销售/财务审批、交货和客户关系记忆。
- **Independent Agent / Professional Workspace：**受托参与、线索归属、独立顾问、QC、物流、工程师与客户之间的授权协作。佣金结算作为后续可选功能，不是平台首期前提。

同一公司可能在 A 项目是买方、在 B 项目是卖方。跨项目复用的是**本企业有权拥有的**资料和记忆，而不是直接把另一企业的商业秘密纳入自家知识库。

### 3.3 双边增长飞轮：两边必须真正独立 [HYPOTHESIS]

**买方飞轮 Buyer Flywheel：**

1. 买方从真实项目或一个聊天主题开始，建立或选择 Project Room。
2. 以邀请链接/邮件/现有通讯软件邀请已认识的供应商；供应商注册及授权保持轻量。
3. 群聊、技术澄清、报价、文件、变更照常进行；无需先学会填写采购表。
4. AI 默默提炼需求、商业要点与待确认事项；人工确认形成可追溯项目状态。
5. 买方下次询价直接复用其有权拥有的供应商关系、技术规格、历史问题、报价证据和工作流程。
6. 更少重复、更少争议、更快开展新项目，主动邀请更多供应商。

**卖方飞轮 Supplier Flywheel：**

1. 供应商受邀进入真实客户 Room，以极低成本回复询盘。
2. 把本企业能力、产品资料、证书、常用技术回复、报价模板与历史文件沉淀在自己的 Organization Workspace 中。
3. AI 帮忙解释跨语言需求、发现缺少的图纸/数量/标准、准备有证据的报价草稿、追踪客户承诺和变更；敏感信息不得泄露给其他客户。
4. 供应商发现“要求客户在 SourceRating 提交需求，比用多个微信群/邮件附件来回确认更省力”。
5. 供应商主动建立新项目并邀请**另一家客户**，不依赖最初买方继续拉人。
6. 形成更多有真实授权的沟通过程与更可信的客户关系，反过来提高卖方保留率和转介绍。

**第二飞轮的必要产品能力：**供应商独立组织账户、客户列表、自己的项目/报价/资料、主动建 Room、邀请新买方、角色动态切换、企业内讨论空间和权限边界。不得把卖方界面永久做成一个仅能填报价的访客页面。

**北极星指标：**Weekly Active Cross-Organization Project Rooms。**飞轮核心指标：**受邀组织成为独立 Room 发起者的转化率（Invitee → New Room Owner），再看第二项目复用率和双边留存。严禁拿简单注册量替代业务验证。

**平台飞轮（远期）：**真实合作 → 授权的项目过程资料 → 企业记忆/Agent 更有用 → 更少重复成本/更多可信协作 → 双边留存。这是待验证因果假设，不是已经成立的网络效应。

### 3.4 商业化 [HYPOTHESIS]

- 基础个人使用、轻量文件/查看可免费；跨企业团队 Room、长期审计、组织记忆、权限与高级导出可采用项目/组织付费。
- 高成本 AI 分析、批量翻译、专业文档审计和历史项目重建按额度或套餐收费。
- 企业版提供 SSO、权限治理、连接器、保留策略、API、私有部署等。
- 后续在利益关系充分披露情况下提供寻源、验厂、质量检测、工程咨询、物流和采购协调服务。
- 不在首期托管买卖双方货款或自动执行佣金支付；支付和佣金合规另案处理。

**实证要求：**先让 5–10 个真实跨企业项目/2–3 个行业场景跑通，记录是否减少信息重复、技术误解、漏项和审批时间。NEWMEDA 可作为真实业务试点，但不得伪造供应商、报价或订单。

## 4. 首期不可缺席的客户体验：三栏 Project Workspace

### 4.1 固定信息架构

| 区域 | 首期职责 | 可渐进增加 |
|---|---|---|
| **左栏** | Organization Switcher、Inbox、Projects、Rooms、搜索、未读 | 联系人、历史项目、外部应用 |
| **中栏** | Chat / Document / Review / Project 四种工作模式 | CAD、BIM、共同编辑、复杂工作台 |
| **右栏** | Ask AI、Needs You、项目摘要、问题、证据、风险 | 智能采购分析、组织记忆与行动建议 |

移动端聊天全屏优先，左右栏分别变为抽屉或底部面板；文件全屏预览。不能为了展示 AI 抢占聊天空间。

### 4.2 Chat Mode [REQUIRED]

发送、接收、可靠顺序、去重、引用回复、@成员、搜索、文件/图片、未读、输入状态、发送状态、断线恢复、移动端键盘与附件体验。消息本地即时回显（optimistic UI），AI 判断和翻译在后台完成。

目标：即使第三方 AI 全部不可用，聊天仍是可靠、有序、可搜索的工具。高并发优化可以渐进，但首期必须把实际收发与恢复做到可用。

### 4.3 Document / Review Mode [REQUIRED 基础能力]

打开附件时无需离开项目：中间显示文件，右边显示该文件的 AI、批注、任务及相关讨论；可按页码/文字区间/坐标引用到消息。首期提供 PDF 查看、同版多人查看和锚定批注；**“共同查看/批注”不等于“共同编辑原文件”**。Word/Excel 深度协同及 CAD/BIM 专业编辑走 SDK/插件分期实现。

### 4.4 Ask AI Everywhere [REQUIRED]

- 单条消息：`Ask AI / Translate / Reply / Copy / Quote`。
- 文件旁：`Ask AI / Preview / Compare / Discuss`。
- 文本选择：解释、翻译、找矛盾、提取参数。
- 右侧个人 AI 面板：提问自动附带当前对象 ID、版本及授权上下文，答案给出可点击的原文/页码/消息引用。
- **Personal AI 私有；Room AI 共享；正式 Decision 另行人工确认。**私人 AI 对话不得未经授权转发到群聊。

### 4.5 低打扰规则

- L0 原始消息/文件立即持久化。
- L1 语言识别、轻量索引尽可能近实时。
- L2 摘要、任务、报价/技术变化识别异步、批量或定时。
- L3 合同、工程与商务深审按需触发。
- 只有权限泄露风险、已确认的紧急事项或特定订阅提醒才主动打扰。其他内容进右栏的 Needs You / Inbox。

### 4.6 零学习成本聊天体验：细粒度交互规范 [REQUIRED]

用户首次进入 Room，不应出现必须先配置采购工作流、填写公司税号、画流程图或观看教程的门槛。优先展示“项目名称、成员、输入框和附件按钮”；在需要进行有权限的动作时才渐进收集必要资料。不能用未经认证的永久匿名链接绕过安全边界。

| 行为 | 最小化交互 | 数据与安全要求 |
|---|---|---|
| 建群 | 选联系人/创建链接；默认以聊天为中心 | 创建 Org / Project / Room 关系，权限后台正确绑定 |
| 发送消息 | Enter 发送、Shift+Enter 换行或可配置；发送即时回显 | 幂等 `client_msg_id`；服务端回执；失败可重试 |
| 文件 | 拖拽、粘贴、手机相册与选择文件 | 文件上传进度、服务端验证、版本、SHA256、明确访问范围 |
| 回复 | 长按/悬停、引用、线程 | 每条来源的 `event_id` / `reply_to_event_id` |
| Ask AI | 消息或文件旁单击，打开右侧个人 AI | 引用精确事件/文件版本，严格继承权限 |
| 翻译 | 当前阅读语言自动呈现，随时“查看原文” | 不覆盖原文；单位、金额、否定词、术语差错可反馈 |
| Needs You | 只提示需要人工决定的项目内容 | 原始证据可点击，批准前不改变正式状态 |
| 搜索 | 像聊天软件一样搜索联系人、房间、消息、文件 | 索引与检索都执行 Room/Org 授权 |
| 通知 | @我、需要我确认、未读摘要 | 遵守企业/个人偏好；可选择邮件/官方消息渠道通知 |
| 离线 | 本地待发、断网恢复、会话重连 | 不重复、不丢序，隐私设备清理策略清晰 |

**体验测试不是请内部开发者评价好不好看，而是让从未见过产品的采购员/供应商在不看说明的情况下完成建群、收发、文件、引用、翻译、Ask AI。**

### 4.7 采购工作流必须“从聊天长出来”，而不是阻塞聊天

自然聊天中，用户可以直接问“这个 200 套能做吗？”、上传图纸、让供应商回复价格。系统可以建议生成 `Requirement`、`RFQ`、`Quote` 或 `Clarification`，但必须区分：机器提议、被邀请方陈述、相对方知悉、双方同意、授权内部批准以及实际履行状态。业务卡片在聊天和右栏适度出现，不强迫所有对话先被录成表单。报价对比和工程审批可以切到工作台，但用户始终能回到原始讨论。

## 5. 第一版完整业务旅程（两个真实用户故事）

1. 买方注册并创建 Organization 与 Project。
2. 买方建立内部 Room，上传 RFQ/BOM/规格图，文件保存到云端并形成版本/哈希。
3. 买方生成供应商专属邀请链接，通过邮件、微信或 WhatsApp 发送。外部工具承担触达，不要求冒用其数据接口。
4. 供应商打开链接，经认证/授权后只看到其专属报价与共享 Room；看不到竞争对手报价与买方内部 Room。
5. 双方像原生聊天软件一样交流、引用文件某一页、对条款批注、使用单条 `Ask AI`。
6. 双方以中英泰各自首选语言阅读译文，随时查看原文；翻译不可替代正式合同原文。
7. AI 后台将重要需求/报价/承诺作为 **Staging Proposal**；需确认的内容进入 **Needs You**。
8. 买方确认变更时，系统形成正式 `Decision / Commitment / Version`，关联原始消息、文档和批准人。
9. 如需内部预算或付款审批，SourceRating 连接客户现有 OA/ERP；客户仍在自己的权威系统审批，外部确认回到项目时间线。
10. 项目结束可以生成证据包；次年新项目可检索历史技术条件、报价及履约记录，检索必须受组织权限限制。

**这条 10 步旅程是首期产品最重要的端到端验收故事。**不是先只做分享链接，也不是先建一个无人使用的 Marketplace。

### 5.1 买方先发起：真实工程采购对话

上一节的10步是买方创建项目的主验收故事：客户邀请供应商，供应商正常聊天与上传技术资料，AI 整理并保留证据，双方完成授权确认，客户复用历史。

### 5.2 卖方发起：双边飞轮必须单独验收

1. 已经参加过买方 A 项目的供应商 B，用**自己的组织空间**创建项目 C，而非复制 A 的私有资料。
2. B 邀请另一位买方 D；D 未注册也可从官方通知/分享链接启动低摩擦的认证加入流程。
3. B 将自己有权复用的产品、产能、证书、历史报价模板用于回应 D；**不得引用买方 A 的私有内容**。
4. D 与 B 正常聊天、发文件、澄清规格；AI 帮 B 形成独立客户项目记忆。
5. D 可带来其内部工程师或其他供应商，但成员只能看到明确授权的 Room；不同供应商互不看对方报价。
6. 该新业务达成真实的沟通与一个可追溯的决定，并形成 `Invitee → New Room Owner` 的指标事件。

### 5.3 Link / Match：不是海量抓取联系人

采用**可确认的关系图谱**：Person、Organization、Project、Room、Counterparty、Product/Component、FileVersion、Requirement、RFQ、Quote、Decision、EvidenceRef。一个人可属于多组织，一个企业可同时做不同项目的买方/供应商，一个文件可在不同 Project 中有不同授权范围。AI 可以建议匹配联系人、旧项目、相似 SKU、规格版本，但不得越权推断同一实体、自动公开隐私关系或未经确认合并两家企业档案。

至少有：候选匹配与置信度、证据来源、人工确认、解除关联、合并冲突记录、跨组织可见性及完整审计。

## 6. 通用业务对象与工作流

### 6.1 内核实体

`User, Organization, Membership, Project, ProjectParticipant, Room, RoomMember, MessageEvent, Thread, FileAsset, FileVersion, Annotation, EvidenceRef, AIAnalysis, StagingProposal, NeedsYou, CanonicalObject, Decision, Commitment, Task, Approval, IntegrationConnection, ExternalObjectRef, MemoryItem, AuditEvent`。

### 6.2 采购扩展对象

`Requirement, Specification, RFQ, RFQLine, SupplierResponse, Quote, QuoteLine, QuoteRevision, ScopeDeviation, Contract, PO, Shipment, Inspection, InvoiceReference, PaymentStatus, Outcome`。

每类对象具有 ID、Owner Organization、项目、版本、状态、来源证据、权限范围、责任人、时间和外部 ID 映射。重要对象的历史版本是追加式，不能直接无痕覆盖。

### 6.3 通用协作工作流

`Requirement → Clarification ↔ Quote → Evaluation → Approval → Contract / Order → Execution ↔ Change → Delivery / Inspection → Close / Learn`。

实际流程不应硬编码为唯一顺序。企业与 Vertical Pack 可以配置节点、前置条件、审批角色、必需证据、SLA 和完成条件。核心引擎支持版本化规则、事件触发、超时、重试和人工干预。

### 6.4 决策状态语义

必须区分 **提议 / 已陈述 / 对方知悉 / 明确接受 / 授权批准 / 外部核验 / 已履约**。一条翻译、一项模型判断或一句“可以”不能自动升级为合同承诺。

### 6.5 业务对象不是前置表单

每类结构化对象来源包括：手工创建、AI 候选、外部系统回执和受控导入。必须保存 `source_event_ids` / `source_file_versions`、当前确认级别、版本和变更触发者。对于制造/工程领域，应区分 RFQ 行项目、报价行、规格偏差、Incoterms、币种、数量单位、交期、税费、设计版本、工程签核。

**最重要的正确性规则：**两方看到的是哪一版 Quote/Specification？供应商提出的改价是否已被买方明确接受？商业双方一致同意不等于买方公司的预算审批。两者要分开记录；正式状态迁移需可重复测试且可回放。

### 6.6 Agent 未来接口约束

人类前端与 AI Agent 应访问同一套受权限保护的业务对象；Agent 只通过有限范围的 Tools（如查当前 RFQ、生成候选回复、草拟报价、查询记忆、发起审批）行动。任何对外发送、承诺、定价、合同/付款/系统写入都需要明确策略及必要人工授权；不能把长期聊天历史直接暴露给不可信外部 Agent。模型微调不是首期必需条件，优先有来源的检索增强与工具执行。

## 7. 数据三层与证据链

| 数据层 | 内容 | 修改规则 |
|---|---|---|
| **Raw Evidence** | 原始消息、上传文件、音视频转写原件、外部回执、时间戳、哈希 | 保留可审计版本；合法删除/保留政策优先 |
| **Derived Intelligence** | 翻译、摘要、向量索引、AI 提议、自动标签、分析 | 可重算，记录模型、提示词版本和输入证据 |
| **Canonical Business State** | 授权确认的需求、报价、审批、合同状态、正式决定 | 只可通过权限控制的版本化业务操作更改 |

证据引用采用统一 `EvidenceRef`：`source_type, source_id, version/hash, location(page/region/line/timecode), actor, timestamp, organization_scope, access_policy`。文件 SHA-256 和事件哈希帮助验证完整性，但不是司法真实性保证；不能宣称“区块链式不可篡改”或“法院自动认可”。

### 7.1 Project Memory 与 Organization Memory

**Project Memory** 是单一项目的沟通、文件、决定、变更、任务、质量与履约记录。**Organization Memory** 是企业跨项目可授权复用的历史知识。跨组织数据不可默认汇总；共有项目中各方可拥有自己有权访问的事实和证据视图，禁止“供应商 A 私有报价自动学习给供应商 B”。

### 7.2 生命周期和隐私

定义每类数据的保留期限、导出、撤销、删除申请、封存和管理员审计；Raw Evidence 不是不受法律限制地永久保存。会议录音/转写、外部 SaaS 数据导入需要权限和适当告知/同意。

## 8. AI 决策与翻译架构

### 8.1 DecisionProvider 模型无关

`Rules → Fast Classifier / Judge (JEV、可替换模型) → Deep Reasoner (DeepSeek / Gemini / GPT 等) → Deterministic Validation → Human Commit`。

- Judge 只承担分类、风险预筛、路由和不确定度；不能批准合同或绕过权限。
- 深度模型结合授权上下文、源文件和历史，产生结构化候选及逐条证据引用。
- 数额、货币、单位、版本、哈希、审批状态等由程序确定性验证。
- 重要提议必须有人确认；模型不可用则排队/重试，聊天不停止。
- 模型选型必须以中英泰真实语料的 Precision/Recall、关键漏判、校准、延迟、成本和越权测试决定；任何外部模型宣传指标都不是本系统的验收结果。

### 8.2 中英泰自动翻译 [REQUIRED]

消息先原文发送；接收者按语言偏好显示异步译文，点击可看原文。记录 `source_message_id, source_hash, source_lang, target_lang, provider, model, glossary_version, status, timestamp`；同源同目标版本做缓存。

强制保护数字、金额、币种、单位、型号、标准、日期、否定/条件语义和责任措辞。技术或法律承诺必须能随时核对原文，低置信度进入人工复核。翻译 Provider 可更换；费用按实际消息量做缓存/批处理。

### 8.3 可观察性

记录每条 AI Job 的输入对象版本、模型、分类、耗时、Token/费用、失败、重试、证据验证及人工处理结果；敏感原文不应随意进入外部日志。

## 9. Universal Integration Hub：先立骨架，按客户需求填充连接器

**产品原则：Integration-First, Not Replacement-First。** SourceRating 不迫使客户更换 CRM、ERP、OA、SRM、PLM、财务、文档、视频或 CAD 软件，自己负责统一协作上下文、外部事件映射、证据和跨系统工作流。

### 9.1 六个必备基础构件

1. **Connector Registry：**连接器清单、版本、能力、许可、状态、数据分类和管理。
2. **Identity / Authorization Broker：**OAuth/OIDC/SSO/服务账号的正确授权与凭证加密、轮换、撤销。
3. **Object & Identity Mapping：**本地 Organization/Project/User/Room/Business Object 对外部 system/object 的稳定映射。
4. **Event / Webhook Bridge：**订阅外部事件、验签、去重、顺序恢复、失败重放；发布本地许可的变化。
5. **Action Gateway / MCP Gateway：**标准 Tool/Resource 调用，权限核验、参数验证、幂等、限额、审批门槛与审计。
6. **Evidence Bridge：**保存外部回执和可授权读取的来源引用、摘要快照、回放路径及同步状态。

### 9.2 四种技术模式，不混淆

| 模式 | 用途 | 例子 |
|---|---|---|
| Embedded SDK | 让专业界面出现在工作区 | PDF Viewer、Zoom Meeting SDK、3D Viewer、Office |
| REST / GraphQL API + Webhook | 双向业务数据和状态同步 | ERP 订单、CRM 商机、OA 审批、物流事件 |
| MCP | 让 Agent 调用工具与授权资源 | 查项目、读取报价、创建审批草稿、查询模型元数据 |
| Deep Link / File Exchange | 最轻量、最兼容的接入 | 打开企业 OA、CAD 原应用、下载/上传标准文件 |

**MCP 不是通用 UI，也不是实时聊天/视频流引擎；“存在 MCP Server”不代表具备企业级生产授权和对象级审计。**

### 9.3 Source-of-Truth 矩阵

| 数据 | 典型权威来源 | SourceRating 负责 |
|---|---|---|
| 客户主档与销售机会 | 客户 CRM | 授权引用、项目映射、沟通证据 |
| 采购订单、库存、应付 | 客户 ERP | 关联状态、发送审批请求、回执 |
| 用印、预算、付款审批 | 客户 OA/财务 | 创建审批草稿、读取最终批准、留证 |
| CAD/PLM 设计模型 | CAD / PLM / WePrefab | 版本/哈希引用、批注、变更讨论 |
| 视频会议媒体 | Zoom/Teams | 会议元信息、许可转写、会议决定候选 |
| 企业间聊天与确认 | SourceRating | 原始事件、证据、Room、人工确认 |
| 项目过程记忆 | SourceRating | 可追溯项目和组织记忆 |

**注意：** SourceRating 内的正式协作决定与客户 ERP 的订单审批不是同一个对象。外部系统更新只能在得到该系统真实成功回执后显示“已同步/已批准”，不能凭 AI 推断写成功。

### 9.4 例子：内部采购审批集成

- 群聊中产生一项价格/范围变更 → AI 生成候选。
- 买方点击确认申请，SourceRating 创建 Approval Request 并附证据摘要。
- Adapter 调用客户 OA/ERP（先检查授权、审批角色、预算字段和幂等键）。
- 外部系统返回申请 ID → SourceRating 标记 `submitted_external`，不是 `approved`。
- Webhook/轮询获得真实批准或拒绝 → 更新本地投影并保留外部回执 ID/时间/来源。
- 外部系统不可用 → `pending_sync`，支持安全重试和人工处理。

**无连接器时**，可生成结构化审批包和只读证据链接，让用户在原 SaaS 手动完成并上传回执。架构不必为第一家客户重新设计。

### 9.5 第一期连接器先后

P0 建立 **Connector Framework**（Registry、权限、映射、Webhook/Action Gateway、Audit）与 1 个真实连接器样例；P1 选择最常见的 Email/Calendar 或客户实际 OA/CRM，先做一条闭环；P2 再扩展 Zoom/Teams、Office、CAD/PLM、ERP、签章和物流。**不是首期要实现所有厂商。**

### 9.6 Build-vs-Integrate 裁判标准

只有满足下列至少一个条件才考虑自建专业引擎：核心差异化依赖、外部组件无法满足关键权限/证据、长期总成本明显更优、或已有业务核心无法被可靠替换。其他情况下优先 SDK/API/插件。所有外部组件须评估许可证、数据驻留、价格、限额、维护状态、回调可用性和退出方案。

## 10. 专业能力的整合清单

| 领域 | 优先策略 | 自有责任 |
|---|---|---|
| 视频会议 | Zoom/Teams SDK、API；可在合规条件下处理录音/转写 | Room 与会议映射、摘要、证据和授权 |
| PDF | PDF.js / 成熟批注组件 | 文件版本、页码坐标锚点、权限和审计 |
| Office | ONLYOFFICE / Collabora 等按许可评估 | 批注与正式审批、文件版本和回执 |
| 协同文本 | Yjs + Hocuspocus / 专业协同服务 | 项目权限、冻结正式版本、审计 |
| 3D/BIM | Speckle / Autodesk APS Viewer / 领域软件 | 项目对象、版本、工程风险、证据 |
| 参数化配置 | WePrefab 保留已验证的 ProjectSpec / BOM 规则 | 设计快照和询价变更同步 |
| 文件解析 | Docling / OCR 服务 | 来源定位、抽取质量与隐私 |
| 翻译 | Google/Azure/LLM Provider Adapter | 原文、术语表、风险语义验证 |
| CRM/ERP/OA | 客户现有 SaaS/API | 连接器、工作流和回执 |
| 电子签名 | 专业签名服务 | 合同版本与签署证据 |

软件选型是候选集，不代表已完成许可、安全、可靠性或商业授权审查。特别注意 ONLYOFFICE 类项目的 AGPL/商业许可差异；Zoom Meeting SDK 与面向 AI 媒体访问的 RTMS 是不同能力，并有平台限制及费用。

## 11. Vertical Pack 策略：WePrefab 是首个试验，不是总平台上限

SourceRating 保有通用协作层；行业包只实现领域特有的数据字段、规则、专业工具和工作流模板：预制建筑、钢结构、定制机械、工业设备、OEM/ODM、工程服务、物流与检验等。

### 11.1 WePrefab × SourceRating 关系

- **WePrefab：**3D 配置、`ProjectSpec/PrefabSpec`、构件图、BOM、设计快照、确定性变更影响、成本/运输/工程状态。保留自己的设计引擎和领域数据库。
- **SourceRating：**企业、项目协作、Room、文件权限、供应商讨论、报价业务对象、AI、Needs You、证据和采购记忆。
- **集成：** 服务端 API / 签名对象引用，项目 ID、设计 Revision、BOM Snapshot、Component ID、Room ID、Supplier Org ID 和来源哈希关联。**不直接共享数据库、不在 WePrefab 再建第二套聊天后端。**

设计变更时，WePrefab 通过确定性依赖/哈希计算标记受影响的 BOM/报价行 `Recheck required`；SourceRating 记录变更原因、讨论、确认和证据。AI 可以解释和发现遗漏，但不能凭推断替代确定性变更判定。

### 11.2 轻量供应商入口 + 完整 Room 同时存在

Supplier Share Link 是 Project Room 的轻量入口，而非替代品：供应商可快速查看受限 RFQ、逐行报价和上传文件；需要多轮讨论时直接进入同一项目 Room，无需迁移文件或丢失上下文。对于尚未接受新平台的工厂，邮件/微信负责触达，回复可经授权导入；但不应以假设式“自动抓取微信”作为首期依赖。

## 12. 当前工程资产和可核查地址（2026-11-13）

### 12.1 SourceRating

- 主仓库：<https://github.com/Jamescheng2022/sourcerating>（公开；`main` 仍不等同完整 Project Room 生产整合）。
- Project Room 基础 PR #1：<https://github.com/Jamescheng2022/sourcerating/pull/1> — `feat/project-room-p1`，本轮复核仍为 **Draft / Open / Not merged**。
- 真实 AI Pilot PR #3：<https://github.com/Jamescheng2022/sourcerating/pull/3> — `pilot/real-ai-acceptance-20261028`，**Draft / Open / Not merged**。
- 试点实测说明：<https://github.com/Jamescheng2022/sourcerating/blob/pilot/real-ai-acceptance-20261028/docs/GCP_REAL_AI_PILOT_20261030.md>。
- Project Room 页面：<https://github.com/Jamescheng2022/sourcerating/blob/pilot/real-ai-acceptance-20261028/apps/web/src/app/project-room/page.tsx>。
- AI Analyze API：<https://github.com/Jamescheng2022/sourcerating/blob/pilot/real-ai-acceptance-20261028/apps/web/src/app/api/project-room/analyze/route.ts>。
- AI Runtime：<https://github.com/Jamescheng2022/sourcerating/blob/pilot/real-ai-acceptance-20261028/apps/web/src/lib/ai/runtime.ts>。
- Worker：<https://github.com/Jamescheng2022/sourcerating/blob/pilot/real-ai-acceptance-20261028/supabase/functions/source-rating-agent-worker/index.ts>。
- Room Core Migration：<https://github.com/Jamescheng2022/sourcerating/blob/feat/project-room-p1/supabase/migrations/202609250001_p1_room_core.sql>。
- 文件版本迁移：<https://github.com/Jamescheng2022/sourcerating/blob/feat/project-room-p1/supabase/migrations/202609260003_p1_room_files.sql>。
- 浏览器验收脚本：<https://github.com/Jamescheng2022/sourcerating/blob/pilot/real-ai-acceptance-20261028/apps/web/scripts/workspace-acceptance.cjs>。

**[PILOT-VERIFIED]** 2026-10-30 的 GCP 隔离试点曾以真实认证测试账号验证跨组织权限、持久化群聊、DeepSeek 分析、Needs You 审批、Canonical 写入、文件 SHA-256 和浏览器响应式工作区；其中仍有临时隧道、正式邀请/SMTP、稳定访问、备份恢复演练、生产容量与真机测试等发布门槛。

**[LIVE]** 上一轮在线 Supabase P1 只读快照：`sourcerating-p1`（`qnozpurjtgkmwtvsrjoi`）包含 28 条 Room Event、6 个 Staging Proposal、6 个 Needs You、0 个 Canonical Object；P1 已部署 Worker 为规则分类版本，**不能把隔离 GCP Pilot 的 Canonical 成功当作 P1 生产已成功。**Stage2 的管理项目在此前检查时为 `INACTIVE`。以上均为当时快照，需部署前复查。

### 12.2 WePrefab

- 原有工程仓库：<https://github.com/Jamescheng2022/weprefab-world>，与新原型严格隔离。
- 独立原型（**Private**）：<https://github.com/Jamescheng2022/weprefab-design-to-reality>，`main`；用户提供原型首推送提交 `a490a4d`（短 SHA，未用作当前 HEAD 断言）。
- [CODE] 独立原型使用 React/Vite/Three.js、`ProjectSpec`、构件/BOM/成本/物流/就绪度派生、切面哈希 `Recheck` 和本地 `localStorage`；README 声明 23 项单元测试与 14 项浏览器验收证据。**没有生产后端、账号、真实报价或专业结构签核。**

**工程原则：**保留这两套已经存在的产品资产；整合通过适配层逐步完成，而不是重新开发第二套聊天室或将 WePrefab 的 3D 直接塞进 SourceRating 核心。

## 13. 发布路线：骨架首期完整、深度逐步递增

### Gate 0：架构与代码基线（必须）

冻结 PDR v3.1、三栏界面信息架构、实体/权限与 EvidenceRef 合同、Connector Adapter 规范；核对 SourceRating PR #1/#3/`main`、试点/生产配置与部署 Commit；建立隔离 Stage/Preview、迁移与回滚方案。**没有统一代码基线，不进入生产推广。**

### Release A：Core Collaboration（首期客户必须看到且能用）

**一个可用的整体产品，不是碎片：**真实登录/组织/邀请、三栏 Workspace、可靠 Project Room、多供应商隔离、云端文件上传和版本、PDF 查看与基本批注、消息/文件 Ask AI、中文英文泰文基础翻译、异步摘要、Needs You、人工确认与最小 Evidence Export。Integration Hub 先具备 Connector Adapter 契约、权限/对象映射与事件/审计基础；**真实 CAD/ERP/OA/会议连接器可在后续按客户需求分期开发，不阻塞首期聊天产品验收**。尚未实现的高级专业功能显示受限能力，不是假按钮。

### Release B：协作深度

实时共同查看与页码同步、线程/区域批注、Office/文本编辑器集成、专业术语库、长文档审计、Project Memory 搜索，丰富任务/报价对象；保留成熟 App 嵌入边界。

### Release C：复杂采购闭环

RFQ/逐行报价/技术澄清/商务偏差/审批/变更/合同证据，客户 OA/CRM/ERP 连接器至少一条端到端真实回执；WePrefab 设计快照与 BOM Quote Line 绑定，首笔真实试单。

### Release D：企业记忆与行业扩展

Organization Memory、Supplier Performance（样本与责任归因透明）、可配置 Workflow Pack、更多 SaaS/会议/CAD/物流连接器、API 和高级审计导出。Marketplace 和代理结算必须在真实需求和合规可行性验证后再扩展。

**同时推进法：**Release A 核心生产整合与 WePrefab 的轻量 BOM 报价入口可以并行，但两者遵守同一项目关联契约；不得将 Release A 推迟到全部 SaaS/Office/CAD 接完之后。

## 13A. 交付工作包：从现有 Pilot 走向可给真实客户用的核心产品

**仅凭下列 PDR 不得直接合并 `main` 或生产部署。先建立隔离开发基线和可重复验收。**

| 工作包 | 目标 | P0 / P1 | 应复用的已有资产 | 通过证据 |
|---|---|---|---|---|
| WB-01 Branch & Runtime Reconciliation | 核对 `main` / Project Room PR #1 / GCP Pilot PR #3 与当前在线 Supabase/VM 的对应关系，形成无密码配置清单 | P0 | migrations、Pilot 文档与真实代码 | 分支/DB/Worker/域名/环境矩阵、迁移演练、回滚 |
| WB-02 Chat Native Feel | 消息收发、连续发送、消息分页、回复/引用、@、未读、可靠通知、手机输入与附件 | P0 | Chatscope、Realtime、`append_room_event`、待发草稿 | 两组织、三设备、断网/重连 E2E，真实手机 |
| WB-03 Bidirectional Organizations | 买卖方都能独立建组织/项目/房间并互邀；不能全球锁死 Buyer/Supplier | P0 | Organizations、Memberships、Project Participants、Room Members、Invites | Buyer→Supplier 及 Supplier→New Buyer 双向验收 |
| WB-04 Document In Chat | 文件可在中栏预览，精确版本和评论，切换 Chat 不失上下文 | P0/P1 | `room_file_versions`、存储网关、SHA256 | 共同查看、跨组织权限、页面/区域批注 |
| WB-05 AI Entry & Translation | 消息/文件旁 Ask AI，阅读语言翻译与原文切换，私有 vs Room AI | P0 | JEV、DeepSeek、Worker、Staging | 中英泰、权限/来源、AI故障时聊天无阻 |
| WB-06 Human Commit & Evidence | 提议→Needs You→确认→Canonical→Evidence；区分双方商业确认和单方内部审批 | P0 | `staging_proposals`、`needs_you`、`canonical_objects`、audit | 原始事件/版本/组织/审批人可回放，越权拒绝 |
| WB-07 Memory / Match & Link | 项目检索、授权企业记忆及人物/企业/项目/文件关系 | P1 | room_events、证据导出、组织模型 | 第二项目真实复用且不泄露首项目私有资料 |
| WB-08 Integration Hub Skeleton | Adapter/连接授权/对象映射/Webhook/审计，不实现整套ERP/3D/Zoom | P1 | 现有 API 与领域契约 | 隔离示例连接器通过授权/事件/撤销测试；真实客户连接器在后续阶段单独验收 |
| WB-09 WePrefab Reference Integration | WePrefab 设计/BOM/版本作 Room 的上下文，不重造聊天 | P1 | Vite 原型、`ProjectSpec`/`Recheck` | 一条 BOM 行与原始讨论/文件/报价版本关联 |
| WB-10 Production Safety | 稳定入口、邀请/邮件、备份恢复、成本/容量、审计 | 发布前P0 | GCP Pilot 结果与安全测试 | 非合成账号、独立安全复查、恢复演练、真机验收 |

**执行建议：**先由 Claude 做独立代码和 UX 审计，给出一套稳定的 `Project Room Core` 模块边界以及 P0 回归计划；再由 Codex/本地开发者按清晰工作包逐条改造。不要“重写整个 SourceRating”，也不要“先做一个另起炉灶的 BOM 表单站”。

### 13A.1 需要特别查实的当前源码风险（静态线索）

- `apps/web/src/app/project-room/page.tsx` 约 2,134 行，包含聊天、文件、邀请、AI 和状态，建议把业务逻辑抽为独立 Hooks/Adapters 并保留现有回归，不搞无目标大重构。
- 当前 Pilot 的文件点击 `handleOpenFile` 调用签名链接 `window.open()`；**内嵌 PDF 查看和锚定批注尚不是已验收的成品**。
- 现有消息有 `client_msg_id`、失败草稿、顺序补齐等好基础，但需要独立验收连续发送、历史分页/虚拟列表、未读和消息引用交互。
- 已有的 DeepSeek Worker 和 Manual Analyze API 与“逐条消息旁 Ask AI / 文件 Ask AI / 完整翻译”不是一回事；需要补 UI、专属引用、授权和数据模型。
- SourceRating 现有受控 GCP Pilot 的能力不能等同 Supabase P1 当前 Worker。独立测试实例与正式数据库必须保持隔离，统一发布时查清数据库迁移顺序和回滚。
- 基于现有业务结构审计 Buyer/Supplier 角色是否存在不可逆的硬编码；修复到**一家公司在不同项目有不同角色**而不是只改 UI 文案。

---

## 14. 首期验收矩阵（未测试不得写 PASS）

| ID | 用户旅程/功能 | 判定门槛 |
|---|---|---|
| AC-01 | 双组织登录和邀请 | 真实账号、邀请链接授权正确，邀请码不得直接绕过认证 |
| AC-02 | Room 隔离 | 买方内部、Supplier A/B 双向越权读取/写入全部拒绝 |
| AC-03 | 原生聊天体验 | 双用户实时收发、移动端、失败重试、断线补齐，不重复 |
| AC-04 | 文件与版本 | 上传、SHA-256、授权下载、第二版本、旧版本可查询 |
| AC-05 | PDF 讨论 | 两人同版查看，批注锚定页码/位置并可从聊天跳转 |
| AC-06 | 消息 Ask AI | AI 仅读取授权上下文，来源可点击，个人/共享模式隔离 |
| AC-07 | 文件 Ask AI | 关联正确文件版本/页码，不能编造页码或超权读取 |
| AC-08 | 翻译 | 中英泰互译、原文切换、数字/单位/否定语义回归 |
| AC-09 | AI 异步 | AI 服务暂停时聊天正常，任务恢复不重复写入 |
| AC-10 | Human Commit | 提议→Needs You→授权确认→Canonical→证据链完整 |
| AC-11 | 连接器框架 [首期骨架] | Adapter 契约、权限映射、Webhooks 的签名/去重测试、失败与审计，不强求首期接入所有外部 SaaS |
| AC-12 | 客户已有审批 [后续连接器验收] | 针对已选择接入的 OA/ERP 做真实审批发起、pending/approved/rejected 同步，非模拟成功；不阻塞基础聊天室试点 |
| AC-13 | Evidence Export | 事件、文件版本、引用、人工动作和访问权限一致 |
| AC-14 | 历史查询 | 复问“谁何时批准哪版报价”，答案指向确切证据 |
| AC-15 | 安全与性能 | RLS/滥用/上传/提示注入、浏览器与真机、备份/恢复和容量审核 |

建议性能目标（用于 P95 实测，而非现有事实）：本地发送反馈 <100ms、良好网络双端消息可见 <500ms；普通短消息翻译 <3s；AI 深度审计允许异步；长消息列表需要分页/虚拟化和恢复测试。优先保证正确性与安全，明确记录测试设备和网络条件。

**追加不可省略的双飞轮和低学习成本验收：**

| ID | 验收故事 | 通过标准 |
|---|---|---|
| AC-16 | 无培训新用户 | 未看教程的3名买方/3名供应商均能独立入群、发图纸、回复、Ask AI；记录实际耗时与失败步骤 |
| AC-17 | 卖方转为新发起方 | 供应商B在独立组织中建立项目、邀请新买方D、完成一次真实消息/文件/决定；不泄漏A项目 |
| AC-18 | 消息至业务对象 | 真实一句技术改动生成候选，确认后引用正确消息/文件版本；拒绝后不写入正式状态 |
| AC-19 | 商务双边确认 | 供应商报价、买方接受、买方内部财务批准分别保留独立状态与责任主体 |
| AC-20 | 多语言工程风险 | 中英泰的否定、价格、单位、数量、交期、术语出现歧义时不能静默改写正式规格 |
| AC-21 | 个人与组织 AI 隔离 | 私人 Ask AI 的提问、检索与输出均不自动公开给房间成员，也不跨房间索引 |
| AC-22 | 外部消息渠道边界 | 通过 WhatsApp/微信/邮件发邀请不等于读取其私人历史；正式 Room 证据完整且能说明范围 |
| AC-23 | 后台 AI 故障 | 禁用全部模型/Worker，聊天、文件、搜索与已确认状态正常工作，任务恢复不重复 |

上述要求与前15条共同构成首期产品验收。所谓“零学习成本”是**需要用真实未经培训的用户测试的目标**，而不是文字保证。


## 15. 非功能要求：基础设施可靠性

- **安全：**Supabase Auth/组织身份/RLS、对象级访问、服务端文件校验、私有签名 URL、最小权限、CSRF/XSS/SSRF/Prompt Injection 防护。
- **连接器：**OAuth Scope、Token 受众绑定、服务端密钥管理、Webhook 验签、防重放、幂等键、权限同步、撤销后停止调用。
- **数据与隐私：**按租户隔离、客户数据不默认用于模型训练、可查询/导出/保留/删除；外部模型和会议转写需透明告知。
- **稳态：**业务事件持久化、Outbox/Dead Letter、重试、恢复测试；离线消息草稿与同步边界清晰。
- **运维：**日志脱敏、错误预算、AI 成本/使用配额、服务状态、可回滚迁移、生产部署可追溯。
- **法律：**未经认可不宣称证据包具法定司法效力；合同、签名、税务、隐私、跨境数据需按司法管辖区落实。

## 16. 指标、反证与产品存亡判断

### 核心指标

- **NSM：**Weekly Active Cross-Org Project Rooms。
- **激活：**首次邀请接受率、首次互发消息、首次文件讨论、首次 AI 引用可用。
- **留存：**第二项目创建率、组织 4/8/12 周留存、受邀方后来主动建 Room。
- **效率：**文件版本争议次数、澄清轮次/用时、Need You 关闭时间、报价版本错误率。
- **可信：**AI 重要事项 Recall、错误承诺率、Evidence Coverage、越权测试、翻译严重误译率。
- **经济：**每活跃 Room 的存储/实时/AI/翻译成本、付费转化、连接器维护成本、服务毛利。

### 需要主动证伪的假设

- 中国工厂是否愿意在微信之外进入专用 Room？若不愿，如何用通知、专属链接和受控导入降低摩擦？
- 买方会不会因为证据与报价清晰而要求供应商进入 Room？
- AI 提示是否真正节省时间，还是造成通知疲劳？
- 企业是否愿意为长期项目记忆付费，还是只愿意付文件/审批服务费？
- 外部 SaaS 连接器是否能在许可、权限、运维和成本上持续可用？

以上都必须通过真实客户行为和收费验证，不依赖访谈赞同或内部 Demo 推断。

## 17. 产品变更治理

本 v3.1 Master PDR 冻结的是业务目标、用户工作方式、核心对象、数据权威归属、权限原则、证据链、连接器协议和三栏信息架构；不是冻结数据库实现细节、模型型号或 UI 配色。核心变更需写 ADR：问题/证据 → 备选方案 → 数据迁移 → 安全影响 → 兼容性 → 回滚 → Owner 决策。局部升级可以换 SDK、模型、存储 Provider 和专业插件，不得破坏已有项目历史与跨企业权限。

---

## 附录 A：具体接口契约草案

```text
ProjectRoomContext {
  tenant_id, project_id, room_id,
  acting_user_id, acting_organization_id,
  role_scope, locale,
  current_object_ref?, document_ref?,
  permissions, correlation_id
}

ExternalObjectRef {
  connector_id, external_tenant_id,
  external_type, external_id, external_version?,
  url?, authoritative_system,
  last_verified_at, access_scope
}

EvidenceRef {
  source_type, source_id, source_version,
  sha256?, location?: { page?, area?, line?, timecode? },
  actor_id?, organization_id,
  captured_at, visibility_scope
}

IntegrationActionReceipt {
  action_id, idempotency_key,
  connector_id, requested_by,
  request_evidence_refs,
  external_request_id?, external_object_ref?,
  status: queued | submitted_external | pending_sync | succeeded | rejected | failed,
  confirmed_at?, error_code?
}
```

接口版本化、签名与 Scope 校验是硬约束；以上仅为领域契约，不是已经部署的数据库 Schema。

## 附录 B：外部技术与官方资源（候选，不代表已签约/已接入）

- Zoom Meeting SDK：<https://developers.zoom.us/docs/meeting-sdk/>；会议实时媒体/转写：<https://developers.zoom.us/docs/rtms/>。
- Model Context Protocol 2026-07-28：<https://modelcontextprotocol.io/specification/2026-07-28>；授权安全参考：<https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/authorization/security-considerations.mdx>。
- Yjs：<https://github.com/yjs/yjs>；Tiptap / Hocuspocus：<https://tiptap.dev/docs/hocuspocus>。
- PDF.js：<https://github.com/mozilla/pdf.js>；Docling：<https://github.com/docling-project/docling>。
- ONLYOFFICE：<https://github.com/ONLYOFFICE>；Speckle：<https://github.com/specklesystems>。
- OASIS UBL 商业文档：<https://docs.oasis-open.org/ubl/>；公共采购数据参考 OCDS：<https://standard.open-contracting.org/>。

## 附录 C：v3.1 相对 v3.0 的实际变更

本次不是重新定位产品，而是恢复2026年7月至10月确定的 Chat-first 基线：

1. 将 SourceRating 统一提升为 **通用复杂 B2B 协作基础设施**，不再只以工程采购定义产品。
2. 明确 **聊天、文件、Ask AI、翻译、证据** 均需在首期形成真实体验，不能被分享链接取代。
3. 将 **Universal Integration Hub** 从后期插件列表提升为核心架构：Connector Registry、身份与权限映射、对象映射、Webhook/MCP Action、Evidence Bridge。
4. 明确企业现有 **CRM/ERP/OA/财务/PLM** 继续作为各自权威系统；SourceRating 保存业务协作和关联记录，不与它们争夺全部主数据。
5. 明确 **Build the Core, Integrate the Rest** 与专业组件复用边界。
6. 保留 **WePrefab 参数化设计和 BOM 的自有价值**，复杂专业 3D/CAD 用外部服务，SourceRating 不重造 3D。
7. 增加原始证据/AI 派生/人工正式业务状态三层数据与可执行验收矩阵。
8. 确认已有 GitHub PR、独立 GCP Pilot 与在线 P1 状态彼此不同，禁止误报生产就绪。

**文档结论：产品骨架先完整落地；模块能力逐步深化；专业工具优先连接；项目过程数据、可信决策与长期企业记忆由 SourceRating 持续掌握。**

---

## 附录 D：供 Claude 独立审核的完整任务书（可直接复制）

### D.1 角色和目的

你是独立的产品架构师、实时聊天系统工程师、B2B 工业采购专家和安全审计负责人。请先阅读本 PDR，**但不假设其中的架构建议正确，也不把历史测试报告等同于生产结果**。必须真正打开和比对 GitHub 代码、PR、目录和测试；若权限不足，明确指出缺了哪些信息，不能靠猜测完成审计。你可以推翻非硬约束的技术建议，但不能在未提出充分理由和迁移方案前，改变下面的产品根本原则。

### D.2 不得擅自改变的产品要求

1. Chat-first：真正像日常消息软件一样低学习成本；以群聊为主体验，AI 不抢界面。
2. PC 三栏、移动端全屏聊天，文件/AI/业务视图是可渐进打开的工作空间。
3. Buyer 与 Supplier 的双飞轮；双方均有自己的 Org OS，可独立发起、邀请、管理项目。
4. 正式跨企业沟通和证据形成于 SourceRating Room；外部 IM 仅作为官方支持的邀请/通知/召回或明确授权的数据导入渠道。
5. 原始消息/文件持久化、版本、权限、证据；AI 静默整理/翻译，Needs You/Human Commit 控制正式状态。
6. 插件/SDK/API/MCP 连接成熟专业能力；不自造 Zoom、Office、复杂 CAD，也不在 WePrefab 再造聊天室。
7. 保留能经独立验收的现有代码和数据，不为追求技术新潮而整套重写。

### D.3 必须读取的仓库（用真实账号权限）

**A. SourceRating 主仓库：** https://github.com/Jamescheng2022/sourcerating

- `main` HEAD 基准：`e7136ab3b4adaae62091603246b268d2fe9062da`（本轮查得，进入实际开发前须再次核对）。
- `feat/project-room-p1` HEAD：`84869fd2c6fecf19f818fa5b59184ae78b80c1c5`，PR #1 https://github.com/Jamescheng2022/sourcerating/pull/1 （当次为 Open / Draft）。
- `pilot/real-ai-acceptance-20261028` HEAD：`f644534d6a73e5894c817c3caccb73d5168261a0`，PR #3 https://github.com/Jamescheng2022/sourcerating/pull/3 （当次为 Open / Draft；**注意 PR #3 的 base 不是 main，而是 `codex/cloud-launch-20261023`**）。
- `apps/web/src/app/project-room/page.tsx` 主要实时聊天和三栏 UI。
- `apps/web/src/app/project-room/workspace-nav.tsx` 左侧导航。
- `apps/web/src/app/project-room/project-state-panel.tsx` AI/Needs You/Canonical。
- `apps/web/src/lib/demo-session.ts` 登录/事件模型适配，名称为历史遗留，不自动等于 mock。
- `apps/web/src/lib/pending-message.ts` 待发和重试。
- `apps/web/src/lib/room-files.ts` 私有文件存储/签名/校验。
- `apps/web/src/lib/ai/runtime.ts` AI 路由。
- `apps/web/src/lib/staging.ts` 分析调用。
- `apps/web/src/app/api/project-room/analyze/route.ts` AI API。
- `supabase/functions/source-rating-agent-worker/index.ts` 后台 Worker。
- `supabase/migrations/202609250001_p1_room_core.sql` 基础 Room/RLS/Event。
- `supabase/migrations/202609260003_p1_room_files.sql` 文件版本。
- `supabase/migrations/202610280001_scoped_ai_pilot.sql` 授权审核/AI Pilot。
- `apps/web/scripts/workspace-acceptance.cjs` 真实浏览器测试脚本。
- `docs/GCP_REAL_AI_PILOT_20261030.md` 隔离试点操作和已验证/未验证范围。
- `docs/ROOM_ARCHIVE_AND_DELETION.md` 文件/事件归档与删除说明。

**B. WePrefab 现有生产/工程线：** https://github.com/Jamescheng2022/weprefab-world

- 审查 `main` 和 `codex/weprefab-architectural-experience-v6`，尤其 `docs/geometry/WEPREFAB_REVISION_AND_ARTIFACT_MODEL_V1.md`，分析 3D/BOM/版本的真实价值与已有局限。
- `weprefab-world` 与 SourceRating 不能共享数据库/直接互写生产表。

**C. WePrefab 独立原型：** https://github.com/Jamescheng2022/weprefab-design-to-reality （Private，需要账号有访问权限）

- `main` README、`src/model/`、`src/engine/`、`src/store/`、`src/scene/`、`src/export/`、`tests/`、`e2e/`。
- React/Vite/Three.js 静态客户端，初始提交 `a490a4d`（用户报告的短 SHA）；示例价格与供应商、工程参数为 DEMO。它不能被描述为已具备生产登录、真实报价或工程签核。

### D.4 客观核查的发布状态

- GCP Pilot 2026-10-30 曾验证真实 Auth、双组织 RLS、群聊持久化、文件 SHA-256、DeepSeek/Needs You/Canonical、浏览器390px/768px，但其临时 Quick Tunnel、正式邀请/SMTP、独立安全审计、恢复演练、容量与真实手机验收尚存在缺口。
- 另一次 2026-11-13 的只读 Supabase 检查显示 P1 `qnozpurjtgkmwtvsrjoi` 的 `canonical_objects` 为0，在线 Worker 是规则分类版本；Stage2 当时 INACTIVE。必须**独立复查**现在的在线状态，不得把 GCP Pilot 的成功混写到 P1 生产。
- 如果查不到现网生产路径、当前构建和部署 Hash，请标 UNVERIFIED，禁止把本地 `npm run build` 当成生产验收。

### D.5 请输出什么，不要只给赞同意见

1. **反驳和边界审计：**至少 5 条对 Chat-first 战略的强挑战（用户迁移、外部协作权限、安全、移动体验、企业记忆数据归属、双边飞轮及成本）；指出每一条能否通过设计解决。
2. **竞品更新检查：**只查 2026 年近几个月真正新发布且接近“Chat-first + Complex B2B + AI/Evidence”的同类产品；区分真实可操作功能与营销说辞，不重新列一遍泛采购大厂。
3. **完整信息架构和关键页面设计：**给桌面1440、768及移动390的独立设计提案；至少展示首屏 Chat Shell、消息/文件 Ask AI、PDF 内嵌查看和批注、Needs You、私密内部 Room 与外部共享 Room 的角色边界。要求极简、少字、不像传统 OA/ERP。
4. **现有代码逐模块审计：**表格列 `[Capability, Branch, Path, Evidence, Status=PASS/PARTIAL/MISSING/UNVERIFIED, Risk, Fix]`，每个重要判断引用真实代码路径与行号或测试回执。
5. **替代方案 A/B/C：**A 保留现有 Supabase/Next/Chatscope 增量增强；B 保留业务后端但更换成熟 IM UI/协议；C 若你认为需要重构，请说明仅限哪一层、测试/数据迁移成本、是否违背 Owner 保留现有成果的要求。对比体验、风险、成本、上线速度和维护。
6. **长期领域模型：**给 Mermaid/ERD 的 Org/Person/Project/Room/Message/File/Evidence/Proposal/Decision/Quote/Memory 关系、RLS 模型、商谈双方确认机制、Event/Outbox/Worker，清晰标明真正的 `source-of-truth`。
7. **Agent 与插件架构：**区分 Tools/MCP、API/Webhooks、SDK 嵌入、Deep Link；客户端授权、连接器权限、AI 数据边界和回执；给 WePrefab 设计快照/BOM 的实际 API Contract。
8. **P0/P1 开发拆单：**列出可合并 PR 单元及其依赖、验收用例、回滚；先围绕聊天/邀请/双向 Org/文件/Ask AI/翻译/证据再扩展采购领域，禁止先发布无聊天室的表单工具。
9. **双飞轮试点设计：**买方邀请供应商、供应商再邀请新买方，两条完整真实账号旅程；用可反证的指标确认用户主动回访，而不是看注册量。
10. **商业与资源判断：**以 SME 跨境复杂采购为初期场景，明确哪几项技术应该自己做，哪些用成熟 SDK/连接器；估计复杂度时注明假设，不编造成本和完成时长。

### D.6 Claude 最终结论必须回答

- 现有 Pilot 做得最好的 5 件事是什么？最危险的 5 个缺口是什么？
- 对这个产品，能否把学习成本压到接近微信/WhatsApp？最大障碍在哪？
- 为什么买卖双方会**主动持续**使用，而不在首次报价后退回旧聊天软件？
- 供应商怎样从受邀请者变成独立客户的邀请发起者？
- 如果只能投入下一轮工程资源，**最该完成哪 3 个可证明价值的功能与验收故事**？
- 你的设计方案是否需要动核心商业模型或全局架构？若是，用明确证据反驳 PDR，并提供兼容迁移和测试方案。

**本次审计默认只读。未经 Owner 明确指示，不合并 PR、不改生产环境、不启动付费模型、不创建外部邀请、不发送邮件、不改变用户真实资料。**