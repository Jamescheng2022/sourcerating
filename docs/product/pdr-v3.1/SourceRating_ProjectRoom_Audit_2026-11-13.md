# SourceRating Project Room｜真实源码与在线后端审计 + 实时翻译升级方案

日期：2026-11-13（只读审计）  
对象：`Jamescheng2022/sourcerating` 的 `main`、`l1/stage2-continuation`、`pilot/real-ai-acceptance-20261028`；Supabase 项目 `sourcerating-p1` 与 `sourcerating-stage2` 的当前项目状态、表元数据、Edge Functions。  
边界：本次没有写代码、合并 PR、修改数据库、部署、调用付费翻译模型或使用真实多人账号跑端到端测试。

## 一、执行结论

**建议：保留现有 Supabase 事件/权限/文件/AI 候选架构，优先修复真实 AI 闭环和聊天体验，隔离开发实时翻译；不要重新建设另一套聊天后端。**

结论性质：代码静态检查 + Supabase 项目元数据/只读 SQL + 部署函数源代码检查，不等于生产环境 E2E PASS。

### 在线核查（当次快照）

- `sourcerating-p1`：`ACTIVE_HEALTHY`；有 28 条 `room_events`，6 条 `staging_proposals`，6 条 `needs_you`，0 条 `canonical_objects`。
- `event_outbox`：26 `delivered`、2 `failed`；`delivered` 只代表事件任务投递状态，不能当作 AI 抽取质量或人类审核完成。
- 当前部署的 `source-rating-agent-worker` 版本 2：**采用关键词/正则规则分类**，未在此部署函数中看到 DeepSeek/JEV API 调用；与较新的 `pilot/real-ai-acceptance-20261028` 分支不同。该分支的 Worker 明确限制只处理隔离 Stage2 合成租户。
- `sourcerating-stage2`：当前 `INACTIVE`，不能宣称已完成本轮实时多人、跨组织、AI 闭环验证。
- `main` 主要是网站内容/产品界面，Project Room 的完整开发代码存在于其他分支；不能把不同分支的“有代码”算成当前正式生产上线。

## 二、代码级审计与风险

| 级别 | 问题或事实 | 核查证据 | 判断及必要行动 |
|---|---|---|---|
| P0 | 当前在线 Worker 与 GitHub Pilot 的模型链不一致 | Supabase 已部署 `source-rating-agent-worker` v2；Pilot `supabase/functions/source-rating-agent-worker/index.ts` | 先明确哪个环境运行哪套 Worker，不直接用试验 Worker 覆盖 P1；安全回归后隔离测试，再有受控发布计划 |
| P0 | `canonical_objects=0`，人工确认到正式状态未证明走通 | P1 只读聚合 SQL；`supabase/migrations/202610280001_scoped_ai_pilot.sql` | 两方账号按权限确认草稿→写入 canonical→审计链必须真实运行一次，不以 SQL 表存在代替 |
| P0 | Stage2 当前非活动；缺乏新的动态验收 | Supabase project list | 复用隔离资源或合法可用的本地测试库，不改 P1 生产数据；保持后端隔离 |
| P1 | 项目状态面板每 3 秒轮询 | `apps/web/src/app/project-room/page.tsx` 中 `setInterval(...,3000)` | 对审核状态/待办改为 Broadcast 或可靠事件驱动，轮询仅作为故障恢复回退 |
| P1 | 房间历史消息按序一次加载，未发现客户端分页/虚拟列表闭环 | `apps/web/src/app/project-room/page.tsx` 的 `.from('room_events').select('*').order('seq')` | 增加游标分页、虚拟列表、渐进加载和向上滚动锚定 |
| P1 | 客户端对收发事件都可能调用 `maybeAnalyzeEvent`；有后端 Worker | `page.tsx` 的 `maybeAnalyzeEvent` 以及实时订阅；Edge Worker | 统一一个异步后台决策入口，客户端只订阅结果。避免重复成本/多端触发/客户端关闭依赖 |
| P1 | 消息发送已有本地待发草稿、稳定 `client_msg_id`、失败重试及数据库幂等 RPC；但一条待发消息会阻塞后续新发送 | `page.tsx` `deliverMessage/handleSend`；`apps/room/src/lib/supabase/roomClient.ts` | 保留已实现的幂等与恢复机制；升级轻量队列允许连续发送，验收乱序/断线重传 |
| P1 | Postgres Changes 适合初期，但不是长期高并发首选 | `apps/room/src/lib/supabase/roomClient.ts`；Supabase 官方 Realtime 文档 | 测量 P95 后逐步切 private Broadcast；事件仍以数据库为真相源，权限不能倒退 |
| P1 | 中英泰翻译没有独立的数据模型、UI、缓存和误译复核链 | Pilot 现有前后端和依赖文件核查 | 独立 Translation Service/Read Model；原文不可覆盖，允许查看原文/修正译文 |
| P1 | 在线 Worker 关键词规则对隐含承诺、反问、否定、泰语/混合语言不可靠 | 已部署 Worker 的 `classifyText` 代码 | 与 DeepSeek/JEV/Decision 模型对照盲测，必要时拒判；规则兜底仅用于明确关键词 |
| P2 | 未看到 typing、presence、已读/表情等 IM 体验的完整代码实现 | `apps/web/src/app/project-room/page.tsx` | 用 Realtime Presence/Broadcast 逐步完善，不能牺牲证据安全 |
| P2 | 图纸/合同多人协同批注尚未形成现有可运行闭环 | 当前 Project Room 组件和 package.json | PDF.js/ONLYOFFICE/Yjs 等按需独立验证集成与许可证，批注必须关联原文件及确定版本 |

关键源码链接：
- [Project Room UI (`page.tsx`)](https://github.com/Jamescheng2022/sourcerating/blob/pilot/real-ai-acceptance-20261028/apps/web/src/app/project-room/page.tsx)
- [消息/实时订阅 (`roomClient.ts`)](https://github.com/Jamescheng2022/sourcerating/blob/pilot/real-ai-acceptance-20261028/apps/room/src/lib/supabase/roomClient.ts)
- [AI API (`analyze/route.ts`)](https://github.com/Jamescheng2022/sourcerating/blob/pilot/real-ai-acceptance-20261028/apps/web/src/app/api/project-room/analyze/route.ts)
- [JEV/DeepSeek 路由 (`runtime.ts`)](https://github.com/Jamescheng2022/sourcerating/blob/pilot/real-ai-acceptance-20261028/apps/web/src/lib/ai/runtime.ts)
- [异步 Agent Worker](https://github.com/Jamescheng2022/sourcerating/blob/pilot/real-ai-acceptance-20261028/supabase/functions/source-rating-agent-worker/index.ts)
- [人工审查与 Canonical SQL](https://github.com/Jamescheng2022/sourcerating/blob/pilot/real-ai-acceptance-20261028/supabase/migrations/202610280001_scoped_ai_pilot.sql)

## 三、实时翻译产品方案（先文字，后音频）

**硬原则：消息即时送达原文，译文随后异步出现；译文只是阅读辅助，不替代法律/工程/商业原文。**

### 用户体验

1. 用户设置“我偏好的阅读语言：中文/English/ไทย”，默认按语言检测自动翻译；保留逐条“原文/译文/双语”开关。
2. 发送消息时只发送用户真正输入的原文；不等待翻译模型，消息乐观显示与服务器确认按原有正常路径完成。
3. 新消息到达后异步翻译成当前接收者语言，成功后替换显示层，保留“查看原文”。失败仅显示原文和轻微提示，不能阻止聊天。
4. 术语表按项目/行业管理，标记标准号、图纸号、SKU、金额、单位、交期、Incoterms、专有名词为保护字段；允许指定正确译法。
5. 用户可提交“译文不准确”并补充建议，不允许修改已保存的原始消息。经人工确认的术语修订产生新译文版本。
6. AI 形成候选证据时优先引用**原始语言的消息及来源 ID**，译文为辅助。正式批准可以展示中英双语，但签署对象必须锁定原文及版本。

### 建议的数据契约

- `room_events`：保留原文、发件人、房间、`event_id`、时间、哈希链；不加入会覆盖原文的 `translated_text` 字段。
- `message_translations`：`room_id`, `event_id`, `target_lang`, `detected_source_lang`, `translated_text`, `provider`, `model`, `glossary_version`, `source_hash`, `status`, `created_at`, `reviewed_by`；建议按 `(event_id,target_lang,provider/model,glossary_version,source_hash)` 去重。
- `glossary_terms`：项目、产品、国家/语种、原始术语、标准译法、版本与管理员批准。
- `translation_feedback`：误译片段、严重程度、修订人、证据和回放测试结果。

所有译文的读取必须重新验证 Room Membership/RLS，不能因为缓存而跨房间、跨供应商共享私密翻译。

### API 候选

- **Google Cloud Translation Advanced**：NMT/Translation LLM、术语表、Adaptive Translation；适合专业术语控制和批量翻译。需测中文↔泰文、英文↔泰文。
- **Azure AI Translator**：2026-06-06 GA 提供 NMT 和 LLM 模型选择，支持实时文本应用，适合另一家对照测试。
- **DeepSeek / 通用 LLM**：语境复杂的长消息和双关语义的辅助复核，不建议作为所有短消息的默认最高成本流程。
- **OpenAI Realtime Translation**：未来会议和语音实时同传的专项候选；语音属于第二阶段，需独立测试口音、数字、交叠发言与参与者告知同意。

模型选型以同一套盲测集比较质量、成本、延迟、失败率、数据处理边界，不按厂商宣传直接选择。

### 翻译验收集

至少覆盖：
- `6.0m/9.0m`、`75mm/100mm`、`USD 1,200`、`45/60 days`、符号、单位、日期。
- `must/should/may`、可以/必须/建议、`subject to approval`、否定、反问、条件承诺。
- `FCA/FOB/CIF/DDP`、`GB/T`、`ASTM`、`EN`、`ISO` 等不可误改的代码。
- 含中英文缩写和泰文工地术语的混合聊天。
- 同一段技术要求在文件和聊天中的用词一致性。
- 与真人审核一致的严重误译率、专业术语命中率和长尾人工拒判率；所有高风险数字/否定/合同义务错误须阻断自动作为正式业务事实。

## 四、性能及可信度验收门槛（目标，尚未实测）

| 能力 | 验收目标 |
|---|---|
| 本地发送回显 | P95 < 100ms |
| 跨端收消息 | 良好网络 P95 < 500ms，以真实多端测量 |
| 翻译 | 原文先到，译文异步；翻译失败 0 次影响发送；按语种记录翻译 P95 |
| 断网重连 | 不丢/重复消息；多条待发内容仍可可靠排队并逐条确认 |
| 长历史记录 | 10k 条历史不一次性渲染；分页、虚拟列表、滚动定位 |
| AI 静默率 | 普通闲聊不触发人工确认卡；重大事项无漏检的盲测评估 |
| 审核闭环 | AI Candidate→Needs You→Human Commit→Canonical→Source Evidence 真实通过 |
| 安全 | 无跨组织、跨供应商泄露，译文/缓存权限同原文 |
| 文档批注 | 批注固定到 File ID + Revision + Page/Sheet + Coordinate + Anchor |

## 五、执行顺序（不要直接碰生产）

1. **P0 基线核验**：冻结当前 P1 Worker/数据库/代码的只读证据；对 Stage2 异常给出单独恢复/替代测试环境方案。先比较数据库已部署 Worker 与 GitHub Pilot 代码及迁移差异。
2. **P0 AI 闭环**：使用合成买方、供应商、工程师账户确认 6 类事件、人工授权和 Canonical 回写；复测出错/重试/越权。修复真正阻塞后再考虑发布。
3. **P1 聊天性能**：历史分页/虚拟列表、传输与断线、pending 队列、typing/presence、事件驱动状态更新；对 Postgres Changes 与私有 Broadcast 做压测对比。
4. **P1 文字实时翻译**：隔离接入一个翻译 Provider + 三语术语表 + 译文缓存/原文切换/人工纠错；完成数据安全与准确性盲测。
5. **P1 文档讨论**：先用 PDF.js 做共享页面、批注、回复、版本定位；合同协作采用 ONLYOFFICE 或 Yjs/Tiptap 按许可核查结果选择。不得自动批准合同变更。
6. **P2 语音与会议**：在文字翻译稳定后，评测专用流式同传，处理单独音轨、授权与录音保留策略。

## 六、需要明确避免的误区

- 翻译模型不能自动修订原始消息或正式合同；双语方便理解，但不改变文件法律效力。
- JEV/Gemini 等是决策分类/分流工具，不能替代权限、确定性计算和人的授权。
- “Worker ACTIVE”不等于 Worker 正在处理消息；“event_outbox delivered”不等于人工确认已完成。
- 当前项目里使用 ChatScope UI + Supabase Realtime 的代码已经存在；现有 Zulip 容器与 Git 仓库的集成边界尚未在本次核对中证实，不能凭历史计划把它当作当前消息真相源。
- 不应为了实时翻译把每条消息的发送延迟绑定给外部 AI 服务。

### 参考技术文档
- [Supabase Realtime：Postgres Changes / Broadcast](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)
- [Supabase Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Google Cloud Translation Advanced](https://docs.cloud.google.com/translate/docs/overview)
- [Google Cloud Translation Glossary](https://docs.cloud.google.com/translate/docs/advanced/glossary)
- [Azure Text Translation 2026-06-06](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/overview)
- [OpenAI Realtime Translation](https://developers.openai.com/api/docs/guides/realtime-translation)

**本次交付状态**：READ-ONLY AUDIT COMPLETED；SOURCE/DEPLOYMENT DIVERGENCE FOUND；REALTIME TRANSLATION DESIGNED NOT IMPLEMENTED；LIVE MULTIUSER E2E NOT VERIFIED。未修改线上系统。