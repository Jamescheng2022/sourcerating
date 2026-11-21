# Release A Execution Backlog & Dependency Matrix
## SourceRating Project Room / AI-native Workroom

**Version:** 1.0  
**Baseline Commit:** `7629b5d` (on `candidate/release-a-launch-20261118`)  
**Lead:** AGY via T3 Code  
**Architecture Reviewer:** Claude Opus 5.5 Medium  
**Code Audit Reviewer:** GPT-6.1 Terra Medium

---

### 一、 门禁阶段演进路径 (Gate Sequence)

```
[Gate 0: 基线冻结与双审] 
       │
       ▼
[Gate 1: Core Messenger 修复 & 离线/弱网韧性] 
       │
       ▼
[Gate 2: 文件私有云/网关 + 真实AI静默接入 + Human Commit 决策闭环] 
       │
       ▼
[Gate 3: Precast.World 嵌入契约接入 & 动态档案路由打通] 
       │
       ▼
[Gate 4: 独立多角色 E2E (5角色) + 移动端软键盘适配 + RLS 负向穿透] 
       │
       ▼
[Gate 5: Release Candidate 演练 + 回滚验证 + Owner 最终批准]
```

---

### 二、 具体任务分解与依赖排期 (Backlog Items)

| 任务编号 | 任务名称与目标 | 责任线程 | 前置依赖 | 验收标准 (Definition of Done) |
| :--- | :--- | :--- | :--- | :--- |
| **TSK-01** | **首轮架构与代码双审回收**：收集 SR-01 (Claude Opus 5.5) 与 SR-04 (GPT-6.1 Terra) 的首审结论，收敛 P0/P1 清单。 | SR-00 (AGY Lead) | 无 | 完成 `05-ui-audit-claude-opus55-medium.md` 与 `06-code-audit-terra61-medium.md` 归档。 |
| **TSK-02** | **Core Messenger 弱网与消息时序加固**：优化 WebSocket 重连补齐（由 12s 轮询降级为 3s 快速增量同步），确保断网重连无重复气泡、乱序。 | SR-02 (AGY Core) | TSK-01 | 双端模拟丢包与断网，50 条高频消息无丢消息、无倒序。 |
| **TSK-03** | **真实 AI 辅助链路调优与熔断**：配置受控 AI API 凭证，限制单次 Prompt 长度与 Token 上限，增加 8s 超时自动熔断降级。 | SR-02 (AGY Core) | TSK-01 | AI 502/超时不再抛出全页面错误，私有面板提示友好重试，主聊天持续畅通。 |
| **TSK-04** | **文件血缘与网关签名时效验证**：确认文件上传经 `room-file-gateway` 计算 SHA-256 并标记 `verified`，版本对比与历史下载鉴权无越权。 | SR-02 (AGY Core) | TSK-01 | 非房间成员无法生成或访问签名下载链接，版本回溯 SHA 严格一致。 |
| **TSK-05** | **移动端视口与软键盘交互适配**：修复 390px 视口下虚拟键盘弹起遮挡输入框问题，优化 `dvh` 与 `interactive-widget=resizes-content`。 | SR-03 (AGY UI) | TSK-01 | Android 实机输入时输入框自动贴合键盘上方，消息列表自动滚动至最新位置。 |
| **TSK-06** | **Precast.World 浅嵌入 SDK 契约落实**：编写 `12-precast-embed-contract.md`，提供 Precast 页面引用的无感聊天接入层，统一房间数据模型。 | SR-03 (AGY UI) | TSK-01 | Precast 页面咨询一键带参进入 SourceRating Room，无需二次创建独立后端。 |
| **TSK-07** | **RLS 跨组织负向隔离测试**：编写针对 `room_members`、`organization_memberships`、`room_confirmations` 的负向穿透用例。 | SR-05 (AGY QA) | TSK-02, 04 | 组织移除成员在 0 延迟下彻底失去任何私有数据访问权。 |
| **TSK-08** | **5 角色真实旅程 Playwright E2E**：运行 Buyer Admin、Buyer Engineer、Supplier A、Supplier B、Unauthorized 全旅程自动化测试并录屏/截图。 | SR-05 (AGY QA) | TSK-02~07 | 4 条核心商业旅程 100% 通过，无跨组织数据泄露。 |
| **TSK-09** | **双审员 Gate 4 终审**：由 Claude Opus 5.5 进行全页面交互终审，GPT-6.1 Terra 进行全仓变更代码终审。 | SR-01 & SR-04 | TSK-08 | 获得两名独立审查员的书面 PASS 结论。 |
| **TSK-10** | **Release Candidate 与 Owner 决策包**：生成完整 RC 打包、DB 回滚脚本、配置清单，向 Owner 提交正式受控 Beta 批准请求。 | SR-00 (AGY Lead) | TSK-09 | 产出 `13-release-candidate-and-go-no-go.md`，等待 Owner 签字。 |
