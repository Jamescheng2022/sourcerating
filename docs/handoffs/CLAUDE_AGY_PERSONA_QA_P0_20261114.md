# SourceRating｜Claude 指挥 AGY 模拟真人测试与 P0 风险复现 Handoff
**日期：2026-11-14｜性质：执行任务 + 隔离 QA 测试开发｜状态：未执行**

## 0. 目标与完成标准

请 Claude 作为测试负责人，真正调用本地 AGY（Antigravity）作为多角色 Test Director，由受限 Playwright 浏览器工具执行，复现真实用户操作，使用独立 Oracle 判断结果。首轮重点不是再重复固定 37/37，而是针对真实浏览器探索发现的危险边界，创建可以失败、可以复现、可以回归的测试。

**任务分成两个独立 Gate：**
- **Gate A / 真正 AGY 控制：** 必须有 AGY 会话确实调用 `sourcerating-playwright` 工具的工具调用记录，如 `list_personas → open_session → snapshot → click/fill → screenshot/trace → close_session`。仅 Claude 自己用 Playwright 或 AGY 文本回答，不算 AGY 已接通。
- **Gate B / 业务完整性：** 按以下风险驱动场景完成真实操作和独立验证，报告 PASS/FAIL/NOT RUN。现有基线 37/37 UI、29/29 Oracle 不等于新增业务场景已经通过。

目标代码：https://github.com/Jamescheng2022/sourcerating  
已有 QA 分支：https://github.com/Jamescheng2022/sourcerating/tree/qa/windows-b-e2e-20261114  
QA 提交基线：`99a533347b2bdb9b775635c3028aa41bd8e1b993`  
被测产品基线：`3c8584fc4bd82c33204072cb3e067d52fe68429c`  
现有报告：[WINDOWS_B_E2E_20261114.md](../WINDOWS_B_E2E_20261114.md)  
现有框架：[qa/windows-b/](../../qa/windows-b/)  
现有核心 E2E：[apps/web/scripts/project-room-b-real-e2e.cjs](../../apps/web/scripts/project-room-b-real-e2e.cjs)  
目标网站：https://sourcerating-room-lab.vercel.app/project-room-b

**仅对隔离测试数据库执行写入：** Supabase `nunojlfangvnjlwggvvb`；生产/受保护项目 `qnozpurjtgkmwtvsrjoi` 禁止访问。浏览器证据不得包含真实客户内容、密钥、授权头、Cookie 或任何签名下载链接。不得发送真实邮箱邀请、真实交易/审批或真实客户信息。

## 1. 新发现：以 Claude 真人浏览器实测报告作为待复现输入

以下是 Claude 使用 James 测试账号在 staging 实际观察到的结果，**尚不是独立自动化复现结论**。Claude/AGY 必须重新复现，并提供真实浏览器 Trace、截图、请求 ID、Console 日志、可行的数据库证据和代码定位，不得提前把它们标记为自动测试 PASS。

### P0-01 上传新版本改名后被创建为新逻辑文件（首要）

复现场景：同一个 Room 中上传 `QA_Joint_Plate_Rev0.pdf`，由两家独立组织对这一版本确认，然后从**这份文件的“上传新版本”按钮**上传 `QA_Joint_Plate_Rev1.pdf`（文件名改变，实际内容也改变）。

**应有结果：** 同一稳定文件资产 ID 下存在 v1→v2 版本关系；新版成为当前候选/正式版本；所有旧版确认保留为不可篡改的历史事实，但明显显示“基于旧版本/已被取代，不代表批准当前版本”；新版确认状态重置为未确认或待审核，不自动继承。PDF、内容哈希、上传人、消息来源均可追溯。

**绝对禁止：** 删除/改写旧版批准历史；继续让旧版绿色“已确认”看起来代表当前图纸已获批准；靠文件名判断版本关系。技术设计应优先使用稳定 `FileAsset/lineage ID`、`FileVersion ID` 和明确的 supersedes 引用。

**现有源码可疑点（需核验）：** `apps/web/src/app/project-room-b/real-ui.tsx` 的 `target.current = name`，文件 input 通过 `actions.send("", f, target.current ?? undefined)`；`apps/web/src/lib/room-files.ts` 中 `register_room_file_version` 只提交 `p_file_name` 等参数，尚无稳定的 file asset/version target 参数。当前基线固定测试 v1/v2 使用同名文件，不能覆盖改名。

独立 Oracle 必须在数据库层断言两版属于同一个逻辑文件、版本连续、文件哈希与原件一致、新版无继承确认、旧版批准记录存在但非当前批准。

### P0-02 文件上传触发 React #185 / Maximum update depth

在执行 P0-01 时监控浏览器 Console，捕获堆栈、操作顺序、React #185 和每一次异常的后续行为。重复 10 次相同操作或不同文件名/尺寸；检查上传后文件预览和按钮仍可点击。禁用“只要刷新就好”的规避手法。定位 `onChange`、状态更新、刷新/订阅反馈环及组件重新挂载。若现象是偶发，报告复现次数，不得宣称修复。

### P0-03 自己发送消息或审核请求，仍出现未读红点

模拟本人发送消息、上传文件、请求审核，检查本人侧栏未读数是否为 0；另一账号查看已读状态；切换 Room/刷新/断网恢复之后复核，独立校验 room.last_seq / last_read_seq。注意正常的其他人未读状态不能误删。

### P0-04 输入框首字符丢失 + 数值安全

每次从房间切换/刷新后立即聚焦输入框，在 `12mm`、`16mm`、`M20`、`USD 1,200` 等测试文本上运行多次，比较输入框、真实事件记录及对方看到的内容；监控草稿恢复、输入事件顺序、IME 组合输入。不得只验证按下 Enter 后“有一条消息”。若界面缺乏消息修订/撤回，单列 P0 需求：限时修改及撤回，保留旧内容、修改人、修改时间及 AI 摘要的来源版本，避免无声覆盖历史。**AI 不可把被更正的错误数值作为确定性事实。**

### P0-05 多方确认真实语义

在文件审核前后测试：
- “确认”与“要求修改”有清楚的确认/取消机会；
- “要求修改”必须给出理由；
- “请各方审核”不能被快速重复触发而刷屏（服务端幂等或去重）；
- 确认绑定明确的文件版本及哈希；
- 用户新增 v2 后，v1 历史确认仍在，但当前 v2 不能显示旧版已获批。

## 2. P1 用户体验与信任场景

要求每条至少有手工复现步骤和自动测试候选，不需要为每个细节都新建重型测试框架。

| 编号 | 场景 / 期望 |
|---|---|
| P1-01 | 上传文件名大小写原样展示：`Joint_Plate_Drawing_Rev0.pdf` 不能显示成全小写；内部存储对象 key 可另行安全规范化 |
| P1-02 | 点击文件卡片直接预览 PDF/图片，能回到聊天；版本比较两边真正打开原始文件 |
| P1-03 | UI 中文时 AI 总结默认中文；英文消息翻译默认中文，可手动选择目标语言，不能不经提示翻成原文语言 |
| P1-04 | AI 建议拆分产生后，滚动到结果并给清晰反馈；不经确认绝不自动拉人建群 |
| P1-05 | 确认/要求修改应呈独立系统事件卡片：谁、哪家组织、什么文件和版本、时间、状态；hash 折叠进详情 |
| P1-06 | 邀请能看到 pending 状态、复制成功提示、关闭/完成入口、可撤销及过期；如没有邮件服务，直说“复制链接后自行发送”，不要假装邮件已送达 |
| P1-07 | 链接可点击，`@` 成员提及正确；普通用户能理解中文角色名称与导出证据名称 |
| P1-08 | 新建项目简化冗余“+”菜单，提交后给加载反馈；项目/主房间同名时不重复展示 |
| P1-09 | URL 包含或可靠编码房间 ID，刷新、收藏、共享深链可回到有权限的 Room |
| P1-10 | 正确设置页面语言；连续消息显示合理时间标识；320/390/768/1440 布局无溢出 |
| P1-11 | 手机真机软键盘另列 NOT RUN，不能用浏览器视口缩放冒充已验证 |

## 3. AGY 必须做的“像真人一样探索”而非仅跑脚本

设置 **四个独立模拟角色**：买方负责人 A1、买方工程师 A2、供应商销售 B1、供应商工程师 B2；各自独立 BrowserContext、Cookie、组织权限、项目目标和上下文。

每轮让 AGY Test Director 从测试场景中自主选择下一步，但要限定在可证明的安全边界内：
1. 首次用户：试探空白名称、空格名称、合法项目名、回车键提交。
2. 真实项目行为：A1 邀 B1；B1 回复与提交改名文件；A2 技术审查；B2 修改文件；A1/B1 独立确认；核查版本变更对审核状态的影响。
3. 反复修订：A1 发错规格→人工纠正→AI 再总结，确保来源与数值不失真。
4. 混乱操作：连点“请审核”、切换房间马上输入、刚上传就点预览、断网重连、重刷、按回车、上传同名/异名/空文件、大写文件名。
5. 尝试越权：外部企业用户访问内部 Room 或私有文件；预期权限拒绝，但不得探测任何真实业务账号或生产地址。

**执行独立性要求：** 测试脚本和裁判（Oracle）要同 AGY 的自由探索分开。AGY 可以提议新场景、修补隔离测试代码，但不能自己降低验收标准并将失败改为 PASS。基础检查标准由人类 Owner/独立审核者锁定及签名。浏览器 Trace、网络请求和数据库断言三者尽量互相验证。

## 4. Claude 如何操控 AGY（必须真正验证）

### 4.1 预检查

- 在 JAMESGEAR 上确认 AGY CLI、Node.js、Chrome/Playwright 已安装且可使用。
- 使用已建的 `qa/windows-b`：`agy/mcp-config.json`、`tools/playwright-mcp.cjs`、`agy/test-director-prompt.md`、`runner/run.cjs`。先审查 Windows 安装脚本（从未在 Windows 执行过，尤其 ACL 与存储路径），不要直接管理员运行。
- 核对当前实际 Windows B 权限。过去通过 `windows_agent_ping` 能到达 JAMESGEAR，但 V4 只提供 sandbox/sandbox_ro 与三个自检命令；**ping 不等于允许远程运行 Playwright**。
- Desktop Commander 若离线或额度不足，只记录现状，不要依赖该通路来假装已执行。

### 4.2 最小握手（决定是否真能交给 AGY）

1. Claude 必须能启动一个具有 **仅受限 `sourcerating-playwright` MCP** 的 AGY 会话。
2. 由 AGY 实际调用工具 `list_personas`，保存调用及结果。
3. AGY 使用 A1 执行 `open_session`、`snapshot`、`screenshot`、`close_session`，有真实文件和 Trace。
4. 再运行现有 `baseline_real_e2e,offline_recovery`，并在新测试分支加入新 P0 场景，保留老版基线不变。
5. 若未获得以上记录，即使 Claude 自己完成 100 条 Playwright 测试，也必须报告 **AGY-NOT-CONNECTED**。不可再把“AGY 已安装”“模型回答了方案”当成完成。

### 4.3 最小授权

- 只允许隔离 `sourcerating-e2e` 目录、固定 Playwright profile、合成账号以及 `nunojlfangvnjlwggvvb` 测试项目。
- 严禁 AGY 调任意 Shell、访问其他目录、生产库、真实邮箱、支付服务或客户数据。
- 首次运行优先本机/隔离副本，只有隔离测试租户和 Preview 被明确验证后才测试线上 lab 域名。
- 可用已有 DeepSeek Flash 驱动角色行为，但 DeepSeek 文本 API **不是浏览器执行通道**；必须有真实浏览器工具调用证据。
- 如果所需权限尚未配置，请先提交具体 `blocked` 证据和最小授权变更方案；**不要要求 Owner 为每个新问题重复安装新的浏览器产品或充值 TinyFish**。

## 5. 交付和停止条件

交付物：
- 原有 37/37、29/29 基线回归是否仍通过；
- 新 P0 与 P1 实测矩阵，每项 `PASS / FAIL / NOT RUN` 和复现步骤；
- AGY 工具调用日志（能证实 AGY 自己驱动浏览器）；
- 独立 Oracle 结果与未完成之处；
- 浏览器 Trace、脱敏截图、错误堆栈、关键网络响应、异常发生次数；
- 修复建议按 P0/P1 排序，**独立代码 PR**，不要未经授权直接改产品基线/main/生产；
- 若 AGY 不能接通，说明到底是 Windows B 权限、CLI MCP 配置还是浏览器/账号问题，给出最小可执行措施。

硬停止条件：检测到生产站点或生产数据库、真实外部邀请/通知、付款、非合成账号、客户敏感文件、凭证被记录、非授权目录操作，立即停止并记录 `STOPPED/BOUNDARY`。

**最终判定：** 只有 AGY 在真实隔离浏览器上完成角色操作 + P0 关键业务真实断言 + 独立证据验证，才可以标记 AGY-INTEGRATED / QA-READY。真实 DeepSeek 和手机软键盘若未实测，必须另标 NOT RUN，不允许合并到 PASS。

> 重要：本任务范围是新 QA 框架接通与缺陷复现。严重业务问题在修复前应阻断公开 Beta；没有经过真实新版本审查确认语义验证，禁止将 SourceRating 视为真实工程交付系统。
