# SourceRating Project Room B｜DeepSeek × AGY CLI × Claude 真人角色验收测试总交接
**日期：2026-11-14｜Owner：James｜性质：QA 编排与执行交接｜状态：待本地 AGY MCP 接通**

> 本文件是 DeepSeek、AGY CLI、Claude 共用的唯一测试任务书。先证明工具可用，再执行测试。不得把模型回答、CLI smoke、固定 Playwright 脚本成功混称为“AGY 真人测试完成”。

## 0. 本轮目标

让四个独立合成用户像真实 B2B 项目成员一样使用 Project Room B，完成邀请、群聊、图纸上传、版本更新、双方确认、提出修改、纠错、AI 总结、断网恢复和权限隔离。AI 应尽量不打扰沟通，但记录准确、版本与审批关系可追溯。

本轮优先验证并复现四个真实用户测试暴露的风险：
1. 从文件 Rev0 的“上传新版本”按钮上传改名的 Rev1，系统却创建了另一份新文件；旧版仍显示绿色“已确认”。
2. 上传新版本时出现 React #185 / Maximum update depth exceeded，后续预览按钮失效。
3. 用户自己发送消息或审核请求后，自己侧栏也出现未读红点。
4. 首次输入字符偶发丢失（例：用户输入 12mm，消息变成 1mm）；AI 随后把错误数字当成事实。需验证输入、纠错、历史留痕和 AI 摘要的来源版本。

同时回归已有的双组织、四账号、子房间、文件哈希、双边确认、AI 私有面板、证据导出、断网恢复与权限隔离。

## 1. 当前已核实的环境状态（2026-11-14）

### 1.1 仓库与基线

- GitHub：`Jamescheng2022/sourcerating`
- 现有 QA 分支：`qa/windows-b-e2e-20261114`
- QA 分支 HEAD：`99a533347b2bdb9b775635c3028aa41bd8e1b993`
- 被测产品原始基线：`3c8584fc4bd82c33204072cb3e067d52fe68429c`
- QA 框架：`qa/windows-b/`
- 原验收报告：`docs/WINDOWS_B_E2E_20261114.md`
- 原验收：浏览器 37/37、数据库 Oracle 29/29；这只证明原有测试集，不覆盖本文件新增的改名版本、首字符、本人未读等边界。
- 原测试套件仅登记 `baseline_real_e2e`、`offline_recovery`。
- 原标准：`qa/windows-b/acceptance/criteria.json`；禁止测试 Agent 自行降低标准或改写该文件。

### 1.2 站点与数据边界

- 唯一允许的 staging：`https://sourcerating-room-lab.vercel.app/project-room-b`
- 唯一允许的 Supabase 测试项目：`nunojlfangvnjlwggvvb`
- 明确禁止：生产/受保护项目 `qnozpurjtgkmwtvsrjoi`、历史 stage2 `fzrberkeoizarduwuisp`、其他 Supabase/Vercel 项目。
- 只使用本机 `secrets/users.json` 中的四个合成账号 `a1/a2/b1/b2`。不把密码、token、service role key、Cookie、签名下载 URL 写入 Git、Trace、截图或报告。
- 不发真实邮件、不联系真实客户、不付款、不执行真实采购/审批、不清理非本轮创建的数据。
- 如当前 staging 账号并非四个合成账号，立即 STOP；不要用 James 的个人账号替代四个角色进行自动化。

### 1.3 Windows B / Agent 通路的实测状态

- JAMESGEAR 的 Windows Direct B ping 成功；这只证明桥接 ping 通。
- 本机 AGY CLI 已安装；固定 smoke job `89c6294ed2b1400bac30981abb4197dc` 返回 `LINK_TEST_AGY_OK`、returncode 0。只证明 AGY CLI 能启动，不证明 MCP 浏览器工具已注册。
- DeepSeek Flash 固定 smoke job `84b1173a78304965ba3ecca719f127f9` 返回 `DEEPSEEK_TEST_DIRECTOR_READY`、returncode 0。只证明 DeepSeek 文本调用可用。长测试规划请求 job `24e2925ff605499b8b283e4fa5937dd3` 因 `provider_timeout` 失败，不能当作 DeepSeek 已完成规划。
- 当前 ChatGPT 到 Windows B 的 `agent_query` 明确为 tool-disabled text-only：不能执行终端、文件修改、提交或发布。
- V3 允许工作区目前只有 `lushupai-v2`，`local_tests_enabled=false`，没有 SourceRating 测试 profile。
- V4 只列出 `sandbox`（可写/执行）和 `sandbox_ro`（只读）；固定命令仅 `ro_echo`、`selftest_echo`、`selftest_sleep`。尚无 SourceRating 专用执行 profile。
- Desktop Commander 的 JAMESGEAR 设备当前显示 Offline；不要将它当作可用执行通道。
- 本任务应由用户电脑上的本地 AGY CLI 直接加载受限 MCP 完成；如果无法加载，报告最小阻塞，不得假装已执行。

### 1.4 现有受限 Playwright MCP

现有文件：
- `qa/windows-b/agy/mcp-config.json`
- `qa/windows-b/agy/test-director-prompt.md`
- `qa/windows-b/tools/playwright-mcp.cjs`
- `qa/windows-b/profile/sourcerating_playwright_e2e.json`
- `qa/windows-b/runner/run.cjs`
- `qa/windows-b/acceptance/criteria.json`
- `qa/windows-b/oracle/`

MCP 配置只允许一个服务器 `sourcerating-playwright`。**不要再安装一个没有审查的通用 Playwright MCP，不要给 AGY 同时开放任意 shell 或全盘 filesystem。**

现有 18 个工具：
`list_personas`、`open_session`、`goto`、`snapshot`、`click`、`click_text`、`click_testid`、`fill`、`press`、`wait_for_text`、`upload_fixture`、`set_offline`、`reload`、`screenshot`、`close_session`、`list_suites`、`run_suites`、`read_evidence`。

当前配置文件里的默认 `B_URL=http://localhost:3100`；如使用 staging，应在本机私有 MCP 配置中将其设为 `https://sourcerating-room-lab.vercel.app`（host 已在 profile allow-list），不要把本机 secrets 写回 GitHub。测试后保留实际 target 和 app commit 记录。

**已经确认的测试工具缺口，必须先解决或如实标记 NOT RUN：**
1. `upload_fixture` 只有 `pdf-a/pdf-b` 两个 fixture，二者文件名都为 `qa-drawing.pdf`；无法验证 Rev0/Rev1 改名场景。
2. `upload_fixture` 固定上传到聊天输入框 `data-testid=file-input`，不能上传到版本面板的 `data-testid=version-input`。
3. MCP wrapper 没有显式 Console/React error 读取工具；应为每个 persona 的 page 加 `console`、`pageerror` 记录并写入脱敏 `logs/console.jsonl`，或使用已审查的 runner/preload 采集。不得只凭截图宣称 React #185 未出现。
4. 新 P0 套件尚未登记在 profile；当前 `run_suites` 只允许已登记的两个入口。

**测试 Harness 扩展建议（只能由 Owner/获批工程执行者修改，AGY Test Director 不得自行修改被 pin 的判定文件）：**
- 新增固定 fixture：`rev0` → `QA_Joint_Plate_Rev0.pdf`，`rev1` → `QA_Joint_Plate_Rev1.pdf`；PDF 内容也必须不同，以确保 SHA-256 不同。
- 把 `upload_fixture` 增加受限参数 `target: "composer" | "version"`；只允许两个固定 testid，不接受任意 selector/path/file。
- 给每个 browser context 记录 console/pageerror；过滤 query、auth header、Cookie、token、签名 URL。
- 新增固定 suites，例如 `p0_file_lineage`、`p0_message_integrity`，加入 profile allow-list、acceptance criteria、Oracle SQL 和 expectations。
- 所有新增/修改后的 QA 判断文件必须由 Owner 审阅，然后运行 `node qa/windows-b/runner/pin.cjs`，把输出的 `QA_INTEGRITY_ROOT_SHA256` 存到 Owner 管理的机器级环境变量/MCP server 环境中；不能把真实 hash 或账号密码提交到仓库。
- 新建 QA 分支，不改 `main`、不改原产品基线。产品修复另开产品修复分支。

## 2. Agent 分工与协作协议

### DeepSeek Flash — Test Director / Scenario Designer

负责：
- 将业务目标拆成测试步骤、边界条件、反例、并发/重试场景。
- 为 A1/A2/B1/B2 生成彼此独立的角色目标和自然语言行为，不让四个角色共享同一段上下文。
- 阅读 AGY 返回的结构化证据，提出下一步验证或复现步骤。
- 对 AI 总结中的事实、数字、矛盾、修订前后关系做语义审查。
- 若宿主确实暴露 AGY/Playwright 工具，可按工具实际名称调用；必须先列工具清单。若没有工具，只能生成任务包，绝不能声称点击过浏览器。

不负责：
- 不充当数据库 Oracle。
- 不修改 PASS 标准。
- 不因模型自己认为“合理”而把失败改成通过。

### AGY CLI — Browser Operator / Synthetic Personas

唯一负责真实浏览器交互：
- 必须从 `sourcerating-playwright` MCP 发现工具。
- 必须用 A1/A2/B1/B2 四个独立 BrowserContext。
- 通过 snapshot 找控件，通过 click/fill/press/upload_fixture 操作。
- 保存每个 Persona 的 screenshot 和 trace。
- 只可在 allow-list 中访问 staging/测试库。
- 不可访问生产、不可以任意 shell、不能修改 profile/criteria/oracle/runner/tool server。
- 不得只生成测试计划；必须实际调用工具，或明确报 `AGY_MCP_NOT_REGISTERED`。

### Claude CLI — Independent Auditor / Code Reviewer

负责：
- 独立阅读产品代码、QA Harness、Trace、Console、网络证据和 Oracle 结果。
- 判断是产品缺陷、测试脚本缺陷还是环境问题。
- 对 DeepSeek 的语义判断和 AGY 的操作记录进行交叉审查。
- 复核修复分支的 diff，确保没有把旧确认删除、把错误消息覆盖或降低标准。
- Claude 若没有浏览器 MCP，不得冒充执行者；其审查必须基于证据文件。

### Owner（James）

负责：
- 提供/确认四个合成账号（仅存本机 secrets）。
- 审核 MCP 配置、QA Harness 修改、pin hash、只读 Oracle 连接。
- 批准任何需要扩大权限的变更。
- 不需要把密码/API key 发给模型或写入聊天。

### 消息交接格式

每次 Agent 交接必须包含：
```json
{
  "task_id": "SRB-YYYYMMDD-###",
  "from": "deepseek|agy|claude|owner",
  "to": "deepseek|agy|claude|owner",
  "run_id": "run-...",
  "repo_sha": "...",
  "target": "https://sourcerating-room-lab.vercel.app",
  "db_ref": "nunojlfangvnjlwggvvb",
  "persona": "a1|a2|b1|b2|null",
  "scenario_id": "P0-01",
  "status": "PASS|FAIL|NOT RUN|STOPPED",
  "evidence": ["runs/<id>/..."],
  "observed": "...",
  "next_action": "..."
}
```
没有证据路径的 PASS 一律无效。

## 3. Gate 0–6 执行流程

### Gate 0 — 环境与权限预检

Owner/本地工程执行者：
1. 确认仓库位于专用目录 `D:\AgentWorkspaces\sourcerating-e2e\repo`，分支是 `qa/windows-b-e2e-20261114` 或本次 Owner 批准的 QA 执行分支。
2. `git status --short --branch`；工作区有不明改动先 STOP。
3. 检查 Node、Chrome、项目依赖、`@playwright/test` 可解析；不要运行未审查的安装脚本。
4. 审查 `qa/windows-b/windows/install.ps1`。该脚本在真实 Windows 主机上尚未执行过；不能未经审查就以管理员身份运行。
5. `B_URL` 只能是 staging 或明确的 localhost；`B_SUPABASE_URL` 必须指向 `nunojlfangvnjlwggvvb`。
6. 确认 `secrets/users.json` 恰有四个合成账号，keys 为 a1/a2/b1/b2；禁止提交该文件。
7. 检查无 service-role key、无生产 DSN、无真实邮箱名单。
8. 确认 Owner 已 pin Harness；没有 `QA_INTEGRITY_ROOT_SHA256` 则停止，不能关闭完整性保护。

### Gate 1 — MCP 工具发现

在 AGY CLI 的实际 MCP 工具面板/工具清单中，必须看到唯一服务器 `sourcerating-playwright` 和上文 18 个工具（若 Harness 已获批扩展，可有新增的固定工具）。若未看到：
- 输出 `AGY_MCP_NOT_REGISTERED`；
- 报告 AGY 当前 MCP config 的真实路径、server stderr、Node 路径、缺失模块或启动错误；
- 不要安装未经审查的通用浏览器 MCP，不要新增 shell/filesystem server 作为绕过。

### Gate 2 — AGY 真实握手

由 AGY 本人实际调用：
1. `list_personas`，结果只能包含 a1/a2/b1/b2 的合成邮箱。
2. `list_suites`，核对当前只登记的 suites。
3. `open_session(persona=a1)`，检查登录成功。
4. `snapshot(persona=a1)`，保存首屏截图。
5. `close_session(persona=a1)`，确认 trace 文件生成。
6. 在 `read_evidence` 中读取对应记录。

必须提供真实工具调用历史、截图路径和 Trace 文件路径。只有这一步通过才可称为 `AGY_BROWSER_MCP_CONNECTED`。AGY smoke 的 `LINK_TEST_AGY_OK` 不能替代本 Gate。

### Gate 3 — 原基线回归

AGY 调用 `run_suites(suites="baseline_real_e2e,offline_recovery")`。
读取 `verdict.json`、`report.md`、`results.json`、`logs/console.jsonl`、Oracle 结果。旧基线不通过时，先区分环境与产品问题，不要直接进入新测试并掩盖基线回归。

### Gate 4 — 四角色真实业务旅程

角色固定：
- A1：买方负责人，负责项目、邀请、审核和最终决策。
- A2：买方工程师，负责图纸检查、提出修改和复核。
- B1：供应商销售/项目接口，负责回复、上传报价/图纸和确认收到。
- B2：供应商工程师，负责技术意见、改图、重新提交。

四人必须有各自独立 BrowserContext、登录态和消息视角。不得把一个账号改名冒充四个角色。

顺序：
1. A1 登录，建立测试项目和主 Room。
2. A1 邀请 B1；B1 用自己的合成账号接受并加入其企业；验证 A1/A2 与 B1/B2 的企业身份和权限。
3. A1/A2/B1/B2 在同一主 Room 讨论测试规格，互相发送消息；每人刷新后历史保持。
4. A1 上传 Rev0 文件（固定 fixture），记录文件 ID、逻辑资产/lineage 标识、version、SHA、source event。
5. A2 与 B1 分别代表两家公司提交对 Rev0 的确认；两家公司状态必须独立。
6. A2 从 Rev0 对应文件卡片点“上传新版本”，上传**不同文件名**的 Rev1 fixture。
7. 断言 Rev1 属于同一逻辑文件资产、版本号连续、supersedes 正确、SHA 与 Rev0 不同；不能变成新逻辑文件。
8. 断言 Rev0 的确认历史保留，但显示“历史版本确认/已被取代”，不再代表当前图纸批准；Rev1 从未确认状态开始。
9. B2 提出修改理由并上传 Rev2；再次确认状态正确。
10. A1/A2/B1/B2 分别发送消息，发送者自己的未读数不得因自己的消息增加；对方未读/已读符合实际。
11. 通过键盘逐键输入 `12mm`、`M20`、`USD 1,200`；比对输入框、事件记录和对方视图，字符必须完全一致。
12. 发送一条故意错误的合成规格，再发送明确纠正消息；AI 总结必须标记纠正后的有效值，引用正确来源，并将旧值标成已更正/冲突历史，不得把旧错误值当作当前结论。
13. 若产品已有消息编辑/撤回功能，测试限时编辑/撤回及历史记录；若无，报告 `NOT IMPLEMENTED`，不要伪造操作成功。
14. 请求审核重复点击、要求修改空理由、取消确认、确认正确版本等边界均要测试。
15. 切换子房间、断网、恢复、刷新，验证消息顺序、去重、文件/权限范围。

### Gate 5 — P0/P1 专项测试

**P0-01 文件改名版本：** `QA_Joint_Plate_Rev0.pdf` → `QA_Joint_Plate_Rev1.pdf`。必须通过数据库断言稳定 lineage/asset 关系、版本号、supersedes、哈希和两组织确认。文件名不是唯一身份键。

**P0-02 React #185：** 上传/版本上传重复至少 10 次，收集 `console`、`pageerror`、Trace、截图；上传后预览/面板按钮仍可操作。任何 `Maximum update depth exceeded` 都是 FAIL。

**P0-03 自己消息未读：** A1 发消息、上传、请求审核后，A1 自己侧栏未读应为 0；B1 未读按真实阅读状态变化。刷新、切换 Room、Realtime 和补拉后再测。

**P0-04 首字符/数值：** 每次切换房间后立即聚焦，逐键输入；至少 30 次，包含第一次输入、连续输入、IME 中文组合输入、发送中收到 realtime 消息。比较原始 DOM value、事件 payload 和接收方文本。任何字符差异均 FAIL。

**P0-05 审批语义：** “要求修改”必须填写理由；“请审核”防连点重复；新版本确认必须重置；旧版确认只保留为历史事实。

**P1：** 文件名大小写、PDF/图片在线预览、AI 默认语言与目标语言选择、AI 拆分建议自动滚动、确认系统事件卡片、邀请 pending/复制反馈/关闭与撤销、链接可点击、@提及、角色名称一致、证据导出人类可读、项目创建 loading、重复项目名布局、URL 深链、`html lang`、消息时间标记、移动端 390/768/1440。真机软键盘必须单独在真实手机上测试，桌面视口不能冒充真机。

### Gate 6 — 独立数据库 Oracle / 最终裁判

- 只用 `qa/windows-b/oracle/setup-readonly-role.sql` 配置的只读账号；DSN 仅存在本机环境变量 `ORACLE_DATABASE_URL`，不发给 DeepSeek/AGY/Claude，不进 Git。
- Oracle 只允许项目 `nunojlfangvnjlwggvvb`；脚本已检查 DB host/project ref。禁止用 Supabase service role 代替只读账号。
- 现有 Oracle 的 `snapshot` 模式和人工生成的结果快照不能算独立数据库验证；本轮尽量运行真实 read-only `pg` 模式。
- 新增检查至少包括：Rev0/Rev1 lineage 一致、version 连续、supersedes 正确、SHA 对应原始对象、Rev0 确认仍存在且标记历史、Rev1 无继承确认、本人 last_read_seq/unread 不增加、事件序号/哈希链无断裂、移除成员不能读取文件和事件。
- SQL 预期必须在测试前由 Owner/独立审查者锁定。测试 Agent 不可看到失败后改 SQL 让它通过。
- Claude 对照 trace + Console + 网络响应 + Oracle，做独立分类：产品缺陷 / 测试 Harness 缺陷 / 环境阻断 / 无法判断。

## 4. 证据格式与判定

每个场景一条 JSON 记录，至少包含：
```json
{
  "run_id": "run-20261114-...",
  "scenario_id": "P0-01",
  "status": "PASS",
  "repo_sha": "...",
  "app_commit": "...",
  "target_origin": "https://sourcerating-room-lab.vercel.app",
  "db_ref": "nunojlfangvnjlwggvvb",
  "persona": "a2",
  "browser_context": "a2-context-...",
  "action_index": 7,
  "action": "upload Rev1 from version panel",
  "expected": "same logical asset, next version, old confirmation historical only",
  "observed": "...",
  "repeat": {"attempts": 10, "reproduced": 10},
  "trace": "runs/<id>/traces/a2.zip",
  "screenshots": ["runs/<id>/screenshots/a2-rev1.png"],
  "console_log": "runs/<id>/logs/console.jsonl",
  "network_evidence": ["request-id-or-redacted-record"],
  "oracle_checks": ["files.same_lineage", "confirm.latest_unconfirmed"],
  "redacted": true,
  "reviewer": "claude"
}
```

状态定义：
- `PASS`：预期、真实 UI 行为、后端数据与独立证据全部一致。
- `FAIL`：至少一项可重复违反预期，或关键证据确认错误。
- `NOT RUN`：工具/账号/环境/设备不可用；必须说明原因，不得算通过。
- `STOPPED`：触发安全边界、越权或数据泄露，立即停止。
- `BLOCKED`：可选状态，表示尚未满足前置条件；最终汇总时仍不是 PASS。

证据不得含密码、token、Cookie、完整签名 URL、真实客户数据、真实邮件地址。Trace 必须先检查是否有敏感信息，再归档。

## 5. 停止条件

出现任一情况立刻 STOP：
- 请求触及生产/未授权 Supabase、Vercel host；
- 出现真实用户、真实客户数据或真实邮箱；
- 自动发送邮件、付款、真实采购或外部审批；
- AGY 试图调用任意 Shell/全盘文件系统/未批准 MCP；
- 密钥、Cookie、授权头或签名 URL 进入证据；
- 发现权限隔离失效、跨组织泄露或删除真实数据风险。

STOP 后保留最少必要脱敏证据，不要继续探测。

## 6. 缺陷修复与二次验收

- P0 发现后先标记外部公开 Beta 为 HOLD；不把旧的 37/37 当作 P0 已通过。
- 产品修复另开分支，例如 `fix/project-room-file-lineage-20261114`；QA Harness 改动另开 `qa/real-user-p0-20261114`。不要混淆产品代码与测试框架。
- 先加回归用例，再改产品；一项根因一项修复，保留修复前失败 Trace。
- 文件版本修复必须按稳定文件资产/lineage 标识归版本，不能依赖上传文件名；旧版确认不删除，只能准确标记适用的版本。
- 输入修复要保留事件历史和更正记录；AI 摘要必须区分原始陈述、纠正陈述、确认事实和未解决争议。
- 修复后运行旧基线 + 新 P0 + Oracle；Claude 独立审核 diff 和证据。
- 不允许直接 push main、未经 Owner 批准的 PR merge 或生产部署。

## 7. 给 DeepSeek 的完整启动 Prompt（复制本段）

你是 SourceRating Project Room B 的 Test Director。请阅读本文件全部内容，并严格遵守 Gate 0–6。你负责测试设计、四个 Persona 的独立目标、自然语言行为、反例、并发与重试场景，读取 AGY 的证据并决定下一步测试。先检查当前宿主实际暴露的工具清单：如果有 AGY CLI/Agent 工具和受限 `sourcerating-playwright` MCP，必须使用实际发现的工具名调用；不要臆造工具。如果没有，你只能生成可复制给 AGY CLI 的原子任务包，明确标记 `NO_BROWSER_TOOL`，不能声称已操作浏览器。AGY 是唯一浏览器操作员，Claude 是独立审查员，你不是 Oracle。所有测试只限 staging 和合成库。四个 Persona 必须独立上下文。首先完成 Gate 0/1/2 握手，再做基线和 P0；工具未接通不得跳过。每一步把 task_id、scenario_id、persona、操作、预期、观察、证据路径、状态和下一步写成 JSON 交接。失败不降低标准，不修改 oracle/criteria，不碰生产/main。P0 FAIL 时建议 HOLD Beta，建立修复分支并添加回归测试。最终给出 PASS/FAIL/NOT RUN/STOPPED 矩阵和明确未完成项。

## 8. 给 AGY CLI 的完整启动 Prompt（若 DeepSeek 不能调 AGY，直接复制本段）

你是 SourceRating Project Room B 的 Browser Operator / 真人角色模拟测试员。你的唯一浏览器工具是当前会话真实发现的 `sourcerating-playwright` MCP。**第一步先列出你实际可用的 MCP 工具及来源，然后调用 `list_personas`、`list_suites`。如果没有该服务器或工具，立即输出 `AGY_MCP_NOT_REGISTERED` 和启动错误，不要写一份假装执行的报告。**

严格只用 a1/a2/b1/b2 四个合成账号，每人独立 BrowserContext；只访问 `https://sourcerating-room-lab.vercel.app` 和绑定的合成 Supabase `nunojlfangvnjlwggvvb`。不要访问任何其他 URL，不要使用个人账号，不要发真实邮件，不要付款，不要改 main。你没有权限修改 criteria、oracle、profile、runner、MCP server；遇到测试工具缺口就报告，不要绕过。

按本文件 Gate 0–6 执行。先用 A1 做最小握手：`open_session` → `snapshot` → `screenshot` → `close_session`，确保真实 trace 保存。再运行已批准的 `baseline_real_e2e,offline_recovery`。然后按四角色旅程执行 P0/P1。若当前 `upload_fixture` 不能指定 Rev0/Rev1 不同文件名或不能把 fixture 上传到 `version-input`，明确报告 `HARNESS_GAP`，等待 Owner/工程执行者更新受限工具；不能用同名文件测试冒充改名版本测试。

所有消息输入至少一次用 `press` 逐键输入 `12mm`、`M20`，对比发送方、接收方、数据库事件；每个关键操作截图，关闭会话前保存 Trace。每个失败至少复现 3 次（输入丢字至少 30 次）；记录复现率。你不能自己判定数据库 Oracle 通过，必须读取独立只读 Oracle 结果。报告里每一项都写 PASS/FAIL/NOT RUN/STOPPED，附 trace/screenshot/console/oracle 证据路径。P0 失败绝不隐藏，不得把“刷新后恢复”当修复。

## 9. 给 Claude 的独立审查 Prompt（复制本段）

你是独立 QA Auditor，不是本轮浏览器操作员。读取本文件、产品 commit、QA Harness diff、AGY 的 trace/screenshot/console/network logs、Oracle 结果。逐条核验 AGY 是否真的调用 MCP、四个账号是否独立、是否仅访问 allow-list、证据是否脱敏。独立检查 P0：改名 Rev1 是否同一 lineage；旧确认是否保留但不再代表当前版本；新版本是否无继承确认；本人未读是否正确；消息输入是否逐字一致；React #185 是否出现；AI 是否引用纠正后的消息。对每个问题分类为 PRODUCT_BUG / HARNESS_BUG / ENV_BLOCKED / INCONCLUSIVE。不得修改证据或判定标准。没有 trace/Oracle 的项目必须标 NOT RUN。输出可复核审计报告和最小修复建议。

## 10. 本轮完成标准

只有同时满足以下条件才标记 `AGY_REAL_USER_QA_PASS`：
1. AGY 工具调用历史证明它本人操作受限浏览器 MCP；
2. 四个合成账号的独立上下文真实走完旅程；
3. 新增改名版本、审批历史、未读、输入准确性、React #185 等 P0 测试均有可复核结果；
4. 独立只读 Oracle 对关键数据库事实通过；
5. Claude 独立审查证据，未发现边界违规；
6. 旧基线回归通过。

真实模型回答质量、真手机软键盘若未测试，单独标 `NOT RUN`，不得混入 PASS。

**当前结论：AGY CLI 与 DeepSeek 文本 API 均已 smoke PASS；AGY Playwright MCP 连接、四 Persona 真人操作、新 P0 套件、真实只读 Oracle 仍未验证。**
