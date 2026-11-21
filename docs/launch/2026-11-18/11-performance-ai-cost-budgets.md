# Performance Metrics & AI Cost Budget Control
## SourceRating Project Room / Workroom Release A

**Date:** 2026-11-18  
**Standard:** Chat-First Low Latency / Strict AI Token Budgets / Fail-Safe Degradation

---

### 一、 核心性能指标与前端 SLA (Performance Metrics)

| 指标维度 | 目标基准 (SLA) | 实测现状 (Commit `7629b5d`) | 调优与整改计划 |
| :--- | :--- | :--- | :--- |
| **首屏加载 (FCP)** | < 1.2s | ~1.1s (Next.js SSR 纯页面) | 针对大体积依赖优化动态导入 |
| **消息发送上屏 (RTT)** | < 150ms | 瞬时（乐观更新机制） | 保留乐观回显，发送失败时标红提供一键重发 |
| **实时推送延迟** | < 300ms | 正常时 <200ms（Postgres Changes） | 当前依赖 5s 轮询补拉作为兜底 |
| **5 秒轮询性能瓶颈** | 增量补拉 < 50ms | **需优化**: 目前每次轮询执行 4 次全量查询 | **改为按 seq 增量查询**，空闲时退避至 15s |
| **移动端滚动与渲染** | 60 FPS 无卡顿 | 390px 视口无横向溢出 | 结合 `react-virtuoso` 实现 500+ 长消息虚拟滚动 |

---

### 二、 AI Token 预算、费用控制与熔断机制 (AI Cost Budgets)

1. **单次提议提取上限**：
   - 限制单次提交分析的消息范围：最大不超过最近 30 条消息或 2,000 Tokens；
   - 严禁将全量历史上下文无脑发送给 LLM。
2. **硬性超时与自动熔断**：
   - 服务端 API (`apps/web/src/app/api/project-room-b/assist`) 强制设置 **8 秒 AbortController 超时**；
   - 连续出现 3 次 502 / 超时后，触发房间级 AI 熔断器，冷却 60 秒并向客户端返回明确的降级提示：“AI 服务暂时繁忙，普通沟通完全不受影响”。
3. **成本限额分配**：
   - 每个测试组织每日最大限制 50 次 AI 总结调用，预估每日单个活跃房间 LLM 成本控制在 $0.15 以内；
   - 绝不使用超大上下文重型模型做高频轮询任务。
4. **AI 宕机保障原则（宪法核心）**：
   - 即使外部模型提供商全量下线，用户在 Room 内发送文本、上传图纸、对比版本、查看历史记录与人工点击确认动作 **100% 正常运行**。
