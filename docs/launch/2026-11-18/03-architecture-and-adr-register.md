# Architecture & ADR Register
## SourceRating Project Room / Workroom

**Date:** 2026-11-18  
**Architecture Lead:** AGY  
**Mandatory Reviewer:** Claude Opus 5.5 Medium

---

### 一、 核心架构决策记录 (Architectural Decision Records)

#### ADR-001: 确立即时通讯 (Chat-First) 为全产品唯一核心载体
- **背景:** 早期方案中曾探讨工单系统、B2B 黄页目录、复杂审批流等多种模式。
- **决策:** 确立以即时通讯（原生聊天）为全站核心交互底座。所有企业资料沉淀、图纸确认、询价报价、争议协商均自然发生并追溯于 Room 聊天流中。
- **约束:** 任何新功能（包括 AI 工具、Marketplace、Directory）均不得打断原生聊天的流畅性；AI 宕机时，普通聊天与文件发送保持 100% 可用。

#### ADR-002: Precast.World 与其他垂直场景共享单一通讯后端
- **背景:** 用户曾探讨 Precast 行业站是否需要独立聊天库或客服模块。
- **决策:** 绝对不在 Precast.World 开发第二套聊天后端。Precast 前端通过轻量嵌入组件接入 SourceRating，携带 `product_ref` / `company_ref` 等上下文原地调起会话，必要时升级为标准 SourceRating 跨企业 Room。
- **约束:** 统一身份系统、统一 Supabase 数据库、统一消息持久化。

#### ADR-003: 强制 Human Commit 机制，AI 绝不越权决策
- **背景:** AI 模型可提取并分析聊天中的结构化参数与报价。
- **决策:** AI 提议必须经由具有相应权限的人类用户进行明确点击确认（`Staging Proposal -> Needs You -> Human Confirmation -> Canonical Decision`），才能生成不可篡改的业务凭证。
- **约束:** 禁止任何由 Agent 或 AI 模型自主触发的自动签署、自动下单、自动扣款或自动工程确认行为。

#### ADR-004: 基于 Supabase RLS 与 Security Definer RPC 的跨企业数据隔离
- **背景:** 多个竞争供应商可能在同一买方的不同房间中，存在报价和技术图纸泄露的极高商业风险。
- **决策:** 彻底废弃客户端直接操作敏感表机制。所有写操作通过 `sr_*` Security Definer 函数验证组织与房间成员资格；所有表强制开启 RLS，确保供应商 A 绝无可能查询到供应商 B 的房间记录、文件 Storage 地址或报价提议。
- **约束:** 测试套件必须包含针对未授权账号和竞争对手账号的负向访问阻断测试。

#### ADR-005: AI 辅助私有面板与优雅降级机制
- **背景:** 真实大模型调用存在网络延迟、超时、供应商配额用尽（502）或 Token 上限风险。
- **决策:** AI 辅助分析结果仅呈现在发起者个人的私有侧边栏，不自动广播至公共聊天流；服务端设定 8 秒超时与严格 Token 预算，发生异常时静默降级并提示重试，绝不阻塞前端界面或阻断正常聊天。
