# Precast.World Embedded Workstream & Cross-Origin Contract
## SourceRating Project Room / Workroom Release A

**Date:** 2026-11-18  
**Architecture Lead:** AGY & Claude Opus 5.5 Medium  
**Principle:** Single Messaging Authority / No Redundant Backend / Seamless Escalation

---

### 一、 核心接入原则 (Core Integration Principles)

1. **唯一后端原则 (Single Authority)**：
   Precast.World（或 Precast.cn）仅作为 SourceRating 即时通讯的“第一垂直嵌入场景”。**严禁在 Precast 侧研发第二套独立的聊天数据库、即时通讯服务端或工单系统**。
2. **渐进式升级 (Progressive Escalation)**：
   用户在 Precast 构件产品、生产企业或工程案例页面可直接唤起轻量即时咨询；当沟通需要多方参与、图纸签核或长期协作时，经双方确认一键平滑升级至标准的 SourceRating 跨企业 Project Room，聊天记录与上下文 100% 继承。

---

### 二、 参数传递规范与数据契约 (SDK & Query Parameters)

嵌入组件通过 iframe 或无感 Web Component 调起 SourceRating，携带受控参数：

```typescript
export interface PrecastEmbedContext {
  // 来源域名标识，用于白名单安全校验
  source_domain: "precast.world" | "precast.cn";
  
  // 业务上下文引用
  product_ref?: string;        // 构件产品型号或唯一标识（如 "PHC-600AB-130"）
  company_ref: string;         // 目标构件供应商/企业 UUID
  project_ref?: string;        // 关联的实体工程项目 ID（若有）
  
  // 发起方意向元数据
  inquiry_category?: "rfq" | "tech_clarification" | "inspection" | "general";
  initial_note?: string;       // 预填咨询文本
}
```

URL 唤起规范：
`https://sourcerating-room-network-preview.vercel.app/project-room-b?source_domain=precast.world&company_ref=d35a0cfd-...&product_ref=PHC-600AB`

---

### 三、 服务端校验与房间升格流程 (Escalation Lifecycle)

```
[Precast 页面原生按钮: "发起技术/采购咨询"]
                     │
                     ▼ (携带 Context 参数)
[SourceRating 原地嵌入轻量对话面板] ─── (临时会话，由双方企业成员直接收发)
                     │
                     ▼ (当需要多方图纸审批、正式报价时)
[点击 "升格为正式项目协同房间"]
                     │
                     ▼
[调用 sr_create_room_from_inquiry 原子 RPC]
                     │
                     ▼
[创建正式 Project Room B，自动绑定 Parent Organization，沉淀历史事件链]
```

---

### 四、 安全隔离与白名单约束 (Security Boundaries)

1. **CORS 与 Frame-Ancestors 限制**：
   - 生产环境中，仅允许 `precast.world` 与已登记的经过合规认证的合作域名进行 iframe 嵌入；
   - 严禁向未经登记的第三方开放跨域嵌入。
2. **上下文参数防伪造**：
   - 服务端在建立连接前必须通过 RPC 校验 `company_ref` 是否存在于真实的 `organizations` 表中；
   - 虚假或无效的 ID 将降级至常规欢迎页，绝不创建孤儿房间记录。
