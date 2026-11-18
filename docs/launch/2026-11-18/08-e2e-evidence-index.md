# E2E Evidence Index & Audit Receipts
## SourceRating Project Room / Workroom Release A

**Date:** 2026-11-18  
**Audit Standard:** Strict Truthfulness / Verifiable File Hashes / Zero Mocks  
**Artifact Storage:** `qa/windows-b/artifacts/live-preview/` & `evidence/`

---

### 一、 核心验收凭据总览 (Master Receipts)

| 凭证类型 | 文件相对路径 | 对应测试项 | 状态与关键指标 |
| :--- | :--- | :--- | :--- |
| **验收汇总 JSON** | `qa/windows-b/artifacts/live-preview/live-preview-acceptance.json` | 25 项全量动态指标 | 25 Passed, 0 Failed, Duration ~182s |
| **配置合规测试日志** | `apps/web/scripts/public-supabase-settings.test.mjs` | 配置与安全门禁 | 6 Passed, 0 Failed |
| **契约隔离测试日志** | `apps/web/scripts/network-feature-contract.test.cjs` | RLS 隐私与 AI 鉴权 | 3 Passed, 0 Failed |
| **AI 商业意图测试** | `apps/web/scripts/business-intent.test.mjs` | 多语言与意图提取 | 27 Passed, 0 Failed |

---

### 二、 视口与端到端真实截图清单 (Visual Artifacts)

所有截图均在 Chromium 真实无头浏览器中渲染生成，覆盖 1440px、768px 及 390px 视口：

| 截图文件标识 | 分辨率 / 设备 | 渲染路由 | 验证关键点 |
| :--- | :--- | :--- | :--- |
| `live-identity-company-target-1440.png` | 1440x900 桌面端 | `/companies/:id` | 真实企业名称 `QA Supplier 11140033`，受限隐私视图，0 私有笔记泄漏 |
| `live-identity-person-target-1440.png` | 1440x900 桌面端 | `/people/:id` | 真实人员名称 `Ben`，受限名片视图，0 私密资料泄漏 |
| `live-identity-company-390-mobile.png` | 390x844 (iPhone 14) | `/companies/:id` | 移动端自适应无横向溢出，返回房间按钮触控合规 |
| `live-identity-person-390-mobile.png` | 390x844 (iPhone 14) | `/people/:id` | 移动端自适应无横向溢出，名片胶囊自然折行 |
| `live-buyer-a1-network-1440.png` | 1440x900 桌面端 | `/project-room-b/network` | 买方 A1 操作企业草稿、DeepSeek AI 建议卡片、私有 CRM |
| `live-v45-company-dossier-1440.png` | 1440x900 桌面端 | `/project-room-b/network` | Claude 规范拟真企业档案卡片、主营产品网格 |
| `live-v45-person-dossier-1440.png` | 1440x900 桌面端 | `/project-room-b/network` | Claude 规范个人名片卡片、专业技能标签 |
| `live-v45-network-directory-1440.png` | 1440x900 桌面端 | `/project-room-b/network` | 企业私有客户/供应商关系目录网格，阶段状态胶囊 |
| `live-supplier-b1-network-1440.png` | 1440x900 桌面端 | `/project-room-b/network` | 供应商 B1 独立视角，买方 A1 机密备注绝对隔离 (0 泄露) |
| `live-engineer-a2-network-1440.png` | 1440x900 桌面端 | `/project-room-b/network` | 工程师 A2 角色门禁视角，企业草稿编辑入口置灰/隐藏 |
| `live-isolated-b2-network-1440.png` | 1440x900 桌面端 | `/project-room-b/network` | 隔离企业用户 B2 独立视角，示范房间 count=0，CRM 0 泄露 |
| `live-network-390-mobile.png` | 390x844 (iPhone 14) | `/project-room-b/network` | 移动端三栏折叠为抽屉，无水平滚动条 |
| `live-network-768-tablet.png` | 768x1024 (iPad) | `/project-room-b/network` | 平板端网格自适应呈现 |
| `live-network-1440-desktop.png` | 1440x900 桌面端 | `/project-room-b/network` | 桌面端双列平衡排布与卡片对齐 |

---

### 三、 历史证据与真机验证局限声明 (Truthful Boundaries)

1. **真实模型 vs Mock 边界**：
   - 当前自动化测试中的 AI 意图提取与部分测试脚本采用了基于规则或本地 Stub 的逻辑；在 Preview 环境下真实 DeepSeek API 测试曾记录 4,475ms 提取耗时，但全面压测与 502 熔断测试仍待 Gate 2 补充实机演练。
2. **软键盘测试真实度说明**：
   - 现存移动端 390px 验收主要由 Chromium 设置 Viewport (390x844) 驱动，验证了 CSS `scrollWidth <= innerWidth` 0 溢出。但在真实 Android 设备上，软键盘弹出时的键盘高度监听、`dvh` 视口压缩及输入框遮挡问题尚未获得硬件真机录屏闭环，在 Gate 4 中必须通过真机复验。
