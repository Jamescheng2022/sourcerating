# Owner Decisions & Open Blockers Register
## SourceRating Project Room / Workroom Launch

**Date:** 2026-11-18  
**Current Gate:** Gate 0 (Baseline Audit & Independent Review)  
**Status:** **[VERIFIED BASELINE] / [NO-GO FOR PRODUCTION]**

---

### 一、 Top P0 阻塞项清单 (Blocking Release A Beta)

| 编号 | 阻塞问题定义 | 根因与既有证据 | 解决方案与责任人 | 退出门槛 (Exit Gate) |
| :--- | :--- | :--- | :--- | :--- |
| **P0-1** | **真实 AI 模型端到端未通过生产级验收** | 历史报告显示 AI 总结曾因输出限制报 502；此前部分 25/25 测验采用本地 Mock/Stub 代替了真实模型推理。 | 在 Staging 配置受控 API 凭证，通过 `apps/web/src/app/api/project-room-b/assist` 验证真实模型调用，增加严格 Token 上限与熔断超时，验证 AI 宕机时普通聊天 100% 畅通。<br>*责任人: SR-02 (AGY Implementation)* | 真实模型 20 轮连续对话/提议提取成功，超时自动降级不阻断聊天。 |
| **P0-2** | **跨组织成员移除后 RLS 缓存与残留风险 (R7 问题)** | `HANDOFF-AGY-ROOMB-20261115` 中记录 R7 组织移除测试出现测试用户残留，此前解释未获得独立实测验证。 | 由 SR-04 (GPT-6.1 Terra) 行级审查 `202611130001` 及 `202611160001` 迁移中 `room_members` 与 `organization_memberships` RLS 策略，SR-05 编写独立负向测试脚本并执行。<br>*责任人: SR-04 & SR-05* | 移除组织成员后，其持有的所有 Room、消息、文件私有 Storage URL 立即 100% 返回 403 / 空集。 |
| **P0-3** | **移动端软键盘弹出与视口适配** | 此前 390px 验收主要依赖缩小浏览器视口，未在 Android 真机实测软键盘弹起时的输入框上顶、滚动条保持及虚拟键盘收起。 | 在实际 390px 视口及 Android 环境进行输入测试，优化 `apps/web/src/app/project-room-b/real-ui.tsx` 与视口高度中的 `interactive-widget=resizes-content` / `dvh` 处理。<br>*责任人: SR-03 (AGY UI)* | Android 真机与 390px 视口输入、发送、收起键盘无抖动、无输入框遮挡。 |
| **P0-4** | **Precast.World 嵌入契约严格化** | 需确保 Precast 页面调起沟通时共享同一套 SourceRating 房间对象，防止在 Precast 侧衍生孤立数据库。 | 固化 `docs/launch/2026-11-18/12-precast-embed-contract.md`，服务端严格验签 `source_domain` 与 `product_ref`。<br>*责任人: SR-01 (Claude) & SR-02* | Precast 原生嵌入组件只作为客户端 SDK，所有通讯直接连入 SourceRating API。 |
| **P0-5** | **生产库与发布门禁绝对隔离** | 生产库 `qnozpurjtgkmwtvsrjoi` 曾有 P1 历史资产，若被脚本误触将造成不可逆风险。 | 所有迁移与自动化测试严格锁死在 Staging `nunojlfangvnjlwggvvb`，生产环境变量由 Owner 单独保管，代码合并保持 PR 状态。<br>*责任人: SR-00 (AGY Lead)* | 零生产误触，所有变更具备可回滚脚本。 |

---

### 二、 需要 Owner 决策的事项 (Decisions Pending Owner Confirmation)

1. **Staging 邮箱验证机制**: 目前 Staging 默认开启了 Supabase 自带邮件验证（每小时配额较低），是否保留还是在受控 Beta 时接入专用测试 SMTP？
2. **外部 Integration Hub 最小闭环**: Master PDR v3.0 要求的“真实 OA/审批端到端回执”，在 Release A 受控 Beta 中建议先以 Webhook 幂等验签与可审计回调作为第一期交付，是否批准此 Scope-ADR？
