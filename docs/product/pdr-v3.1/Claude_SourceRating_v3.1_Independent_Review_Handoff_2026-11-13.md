**审计输入文件：** `SourceRating_Master_PDR_v3.1_Chat_First_Claude_Review_2026-11-13.md`。此指令属于独立审计，不等于已完成审计。

**报告日期基准：** 2026-11-13。复核 GitHub/部署实时变化，不沿用文件日期当当前事实。

# Claude Independent Design & Code Audit — SourceRating Master PDR v3.1

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