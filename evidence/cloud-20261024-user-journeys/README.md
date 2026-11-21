# 云端真人流程模拟：交 Claude Lead 独立复核

这是一名单写者 Codex 在原云环境实际运行 Chromium 的隔离功能验收。12 组 canary 当前为 **10 PASS、2 BLOCKED**；不是公网交付、真实身份供应方/邮件验收，也不是多模型盲测。完整逐项目标、步骤、实际结果、应用 SHA、依赖和证据见 [journey-matrix.json](journey-matrix.json)。先定义的 [canary-spec.json](canary-spec.json) 保留原样；各运行目录保留当时的失败和结果，没有覆盖为 PASS。

模型请求为 **Astra / max**。系统标识为基于 GPT-6 的 Codex；本执行器没有实际服务型号/effort 遥测或原地切换回执，不能证明已切换。未创建执行者、环境或通知器。Lead 尚无本轮独立复核结论/ACK；由父端送达。

| App/用户目标 | 隔离结果 | 期望与实际重点 | 证据位置（在各自仓库） |
|---|---|---|---|
| SR-01 邮箱绑定邀请、登录、取消 | BLOCKED | 已有合成用户真实登录；Cancel 没有创建 RPC；signup=false。完整邀请加入未调用受阻网关 | SR `final/` |
| SR-02 发消息、刷新、退出重登、错误恢复 | PASS | 丢 ACK/断网后保留同一消息 ID，数据库只有一条；取消丢弃保留草稿；迟到 ACK 不显示到另一房间 | SR `final/`、`reload-regression/` |
| SR-03 询价创建与回读 | PASS | 双击提交及并发同键重放不重复，买方读取实际内容，供应方刷新恢复；下载索引核实关联 open 任务 | SR `final/` |
| SR-04 第二用户/房间隔离及分析入口 | PASS | RLS 拒绝越权；伪造组织被拒；分析只读已保存且可见的指定事件，伪造正文 400；canonical/staging/task 全行前后相同 | SR `final/` |
| SR-05 导出证据与完整附件归档 | BLOCKED | 浏览器确实下载并解析实际 evidence JSON；含附件字节的完整归档仍依赖受阻网关 | SR `final/synthetic-evidence-index.json` |
| SR-06 恢复密码与错误链接 | PASS | 本地真实 Auth：旧密码失败、新密码可登录；过期/消费过链接拒绝；未替换主项目登录。用本地生成的恢复 grant，无发信 | SR `recovery/` |
| LUSH-01 登录/取消/退出重登 | PASS | 真实应用 OIDC 验签/回调及 PG 账号；供应方为明确的合成签名适配器；退出后受保护读 401 | LUSH `retest/` |
| LUSH-02 fork/半天/来源未知 | PASS | 东京与巴厘岛样例、Cancel、Back、半天分支；保持来源 pending，不生成伪真实天气/替代场所；390px 无横向溢出 | LUSH `retest/` |
| LUSH-03 保存、刷新、旧行程恢复、第二会话 | PASS | 实际 PG 文档/节点一致；重登及新浏览器上下文回读 | LUSH `retest/` |
| LUSH-04 实际导出与账户隔离 | PASS | 下载完整账号文档与源字段；Bob 读/写 Alice 被拒，导入 Alice 备份被拒，Bob 状态不变 | LUSH `retest/synthetic-workspace-export.json` |
| LUSH-05 断网/丢 ACK/双击/超时 | PASS | 同操作键只增加一次 PG revision；离线队列刷新保留；应用实际 10 秒超时后 DB 未变，显式重试成功 | LUSH `retest/`、`timeout-clean/` |
| LUSH-06 恢复后 App 会话撤销 | PASS | 缺浏览器邮件配置时仍可执行服务端恢复；新 OIDC 登录撤销旧 App 会话及早先待完成登录，Bob 与已保存行程不受影响 | LUSH `retest/` |

“手机”指真实 Chromium 的 390×844 响应式视口，桌面包括 1280/1600px；未声称测试物理手机键盘、原生 Android 生命周期或屏幕阅读器。上述 PASS 的依赖边界见每条 JSON；所有账号和业务内容均为合成数据。代码可构建/浏览器流程可用不代表托管绑定已完成。

## 实际修复与失败归因

- **SR `c7d00a767b46e4a2d4041f27d93cd66f782ee43d`**：发送前保存按账号/房间/消息 ID 分开的不可变请求；刷新后显式同 ID 重试；存储失败不发送，跨房间迟到响应不混入；丢弃/编辑先确认，退出清理对应用户记录。新增四项隔离、不可变、多标签和存储失败检查。
- 同一 SR 提交把 `/api/project-room/analyze` 契约改为严格 `{roomId,eventId}`，服务端在调用任何供应方前按调用者 RLS 重新读取事件，不再信任客户端正文/context。也移除把 `Latest message` 元信息误匹配为 `late` 风险的输入包装。当前前端和现有 E2E 调用者同步更新；不是上线了真实 AI。
- **LUSH `67ca2d78279232ab73d3417d09c9b45b77109c37`**：App 会话恢复入口原先被无关的浏览器邮件 SDK 缺配置一起隐藏。现在根据真实同源 session API 的 OIDC 模式提供原有安全动作；没有替换供应方、添加凭据或开启未配置的邮件表单。
- LUSH 首轮 LUSH-06 是产品失败，修复后六组全部通过。首轮 LUSH-04 是测试定位器错误：UI 已在持久化状态区域报告跨账号拒绝，测试却寻找 alert；改为检查实际区域并保留相同的前后数据不变断言，未降低安全标准。
- SR 首轮/中间复测存在默认选择历史合成房间的测试干扰。已显式选择固定房间并加发送前限制；不把那个失败单独当作产品缺陷证据。另建**只用于对照构建的 detached Git worktree**，同一写者从原分支起点 `bb840a8` 对照复现。原版丢弃按钮直接清空待确认记录，取消测试失败；独立最小刷新复现：原版 bb840a8 在刷新后的 Retry 断言失败（5 秒）；修复版 c7d00a7 同一复现 PASS，见 SR `baseline-reload/` 与 `reload-regression/`。原仓库、分支和八个容器不受影响。未用旧 runner 的自动修复/跳过断言功能。
- 对照 worktree 复用既有依赖。Turbopack 因依赖符号链接越出其项目解析根而构建失败，保留日志；使用 Next 官方 `--webpack` 构建同一原版应用进行有限诊断。当前待交付版本使用原 `npm run build` 成功，未改其构建根、权限或托管配置。

## 89 项历史包边界

从原私有 agent-bus 固定提交 `be53a086cc4e4ebce75401cc350f446cac30884a` 取到原 ZIP：46539 bytes，SHA256 `b45a4952d05ebc73fa6ac1a260a2d74b4221347eff2a684e0d5336faf6050d6a`。CRC、17 个成员路径和高置信凭据规则检查通过；89 个唯一案例均声明 SYNTHETIC_ONLY。原包保留在 `/workspace/source-handoff-20261024/blind-eval-20261024/`，未执行包内脚本，也没有退回其 95ccfe4 基线。

旧 runner 先发请求后检查 canonicalWrite 且放行任意 vercel.app，**本轮没有运行 --live**。实际 runner 在发请求前固定 127.0.0.1 应用/本地 Auth 和合成租户，剥离模型/服务端凭据；受阻 Edge 路径直接禁止调用。实际分析只使用规则，`modelEvidence=false`；数据库实际行也做了前后比较，没有仅凭响应旗标判定无副作用。

SR 的 [blind-risk-selection.json](blind-risk-selection.json) 列出全部 89 项和选取的 16 项风险：**2 PASS / 49 BLOCKED / 38 NOT_RUN**。这两个 PASS 是隔离安全断言的适配复现，不是整包在线盲测通过。42 个 AI 提取项全部 BLOCKED；完整 RFI 版本闭环、真实模型超时、附件签名 URL 等没有偷换成其他局部通过。LUSH 仅借用方法，其六组旅行 canary 不能称为被原 89 项覆盖。使用现有 Playwright；没有为缺少真实模型安装 Promptfoo 或引入新的编排/付费框架。

## 公网验收及最小外部门槛

本轮没有取得一个可声明“全功能可用”的公网 Preview。loopback 测试服务已关闭，可按下方重跑；它们不是对外访问地址。历史 `https://lushupai-v2-staging.vercel.app` 是既有资源线索，不是本轮已验证部署。SourceRating 继续使用 Vercel team `jamescheng2022s-projects`、App 项目 `sourcerating` / `prj_Ra2cBP9kmKANgMm5xIFEXlV2c5IS`，应用根 `apps/web`，不是网站项目。

1. **SR 网络与托管**：父端通过受支持的原环境设置完成已批准 kong-only 项并回读生效；本轮未重试 Edge→kong，也未发布混合 revision 3。原环境 ID `ccarenv_b64_Y2NhcmVudl85MDlhZmM5Nzk5ZDg4MTkxYjM4MjkyZDhkN2Y0MDkzMA`。既有 relay 一行精确分支协调提案仍未应用，实际 Host=VERCEL_URL、项目/origin 守卫和 `enable_signup=false` 均保持。正确隔离后端以及 Preview 中 `NEXT_PUBLIC_SUPABASE_URL` 与 anon/publishable 公开 key 的绑定仍需授权配置；stage2 `fzrberkeoizarduwuisp` 仍暂停，不能把暂停当成缺构建变量的原因。Free 两名额已占用，不暂停 p1、不新购资源。
2. **LUSH 安全发布**：父端最后确认 `jwejjhudbwvrtpmieuli` ACTIVE_HEALTHY；它的 `lushupai_preview` 仍 version1/004 未应用。隔离测试 version2 不等于托管迁移。既有受限 runtime 无 DDL 权限。按原迁移执行稿、托管备份/恢复能力及排除旧回调/实例条件另行批准后才能迁移；本轮不导出客户行、不迁移、不新建角色。继续当前安全后端前向修复/维护方案，代码 SHA 不是验收过的回滚部署，不能回退到会绕过撤销的旧回调。
3. **LUSH 托管/身份**：通过已允许的资源材料确认现有 staging 代码分支与正式 Preview 来源；不要重试被拒的部署/env 元数据。使用现有 OIDC/Postgres Vercel adapter，不当静态站或 SQLite 分支部署。代码消费的变量与精确回调依据在 `docs/DEPLOYMENT.md`：`NODE_ENV`、`AUTH_MODE`、`NODEJS_HELPERS`、`APP_ORIGIN`、`OIDC_ISSUER`、`OIDC_CLIENT_ID`、`DATABASE_URL`、一个 DB CA 设置；公开 PKCE 客户端不能默认索要新 secret。浏览器邮件功能另需同身份项目的 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`。回调为 `<APP_ORIGIN>/api/v1/auth/callback`，恢复重定向 `<APP_ORIGIN>/oauth/recovery`；只有现有域名绑定被确认后才采用完整 staging URL，不能据历史名称擅自改提供方设置。
4. **真实依赖**：验证/恢复邮件仅建议批准测试收件人 `rivercheng1021@gmail.com`，目前未批准、未发送。真实 AI 需要明确适用的隔离模型调用授权及凭据/额度；本轮没有调用付费模型。20 个来源页仍停在原 proxy 403 边界，来源核实 **0/20**、真实来源路线验收 **0/10**；前端 pending 标记通过不改变这两个计数。不能换工具绕过。

本轮无新增收费资源、真实扣款或生产部署。现有 Free 名额限制不变；没有承诺未知托管配额足以最终交付。完成上述外部条件后仍需实际公网新用户、真实身份/批准邮箱、邀请/附件/业务闭环验收及已验收维护/回滚部署；父端与 Lead 可据本报告独立复核。

## 证据与保留

每条运行的 `journeys.json`、截图、真实下载内容、网络记录及 `trace-receipt.json` 都在本仓库。分享 trace 清除了 OAuth code/state、密码、cookie/token，移除无需回放执行的 JS bundle；保留 DOM/CSS/截图、步骤、HTTP 状态与时间。原始 ZIP 未改动，留在忽略的 `.data/journey-traces/`，不能提交原始认证材料。清理版本有独立 SHA256，已检查 ZIP CRC 和 trace JSONL；需要打开时使用既有 `playwright show-trace <trace-N.zip>`。

原 8 个容器与 3 个数据卷 ID/名称集合保持一致，见 before/after。没有新 Docker 层；复用的 native PostgreSQL 测试库已停止，合成测试数据与快照保留。暂存对照目录属于本轮，未覆盖原分支。全程没有触及用户本机、Paseo、生产/客户数据或先前被拒的权限。

## Lead 在原云环境独立重跑 SR

先确认 `/workspace/sourcerating` 仍为 `codex/cloud-launch-20261023`，当前代码包含上述修复；停止其他该 App 测试写入后串行执行。使用原八容器的合成测试 Auth/Postgres（127.0.0.1:54321），不需要 Edge/kong 权限。不得运行旧包 --live 或现有 runner 的默认完整网关模式。

```bash
cd /workspace/sourcerating/apps/web
S2_EVIDENCE_DIR=/workspace/sourcerating/evidence/lead-sr-new-run \
S2_SUPABASE_CLI=/workspace/tools/bin/supabase \
S2_SUPABASE_WORKDIR=/workspace/sr-stack \
S2_BROWSER_PATH=/usr/bin/chromium \
S2_PLAYWRIGHT_MODULE=/workspace/tools/node_modules/playwright \
S2_PASSWORD_FILE=/workspace/secrets/s2-local-passwords.json \
node scripts/s2-web-e2e.cjs canary
```

当前 `.next` 是本报告代码的真实 production build。如代码改变，应重新构建：从既有 `supabase status -o json --workdir /workspace/sr-stack` **在进程内**读取 API_URL/ANON_KEY，先断言 URL 等于上述 loopback，再只把它们作为 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 传给 `npm run build` 子进程，禁止输出 status 内容或落盘凭据。不要使用缺配置假值，不继承模型密钥/VERCEL/relay 配置。`node --test scripts/pending-message.test.cjs` 是四项存储边界检查。

`S2_CANARY_FILTER=SR-06` 仅重跑真实本地恢复；`S2_CANARY_FILTER=SR-02-reload` 是独立的最小刷新对照，不会自动跳过其他失败后制造 PASS。首次基线/修复后的所有原始结果保留。用全新 evidence 目录避免覆盖。然后执行 `python3 scripts/scrub-journey-traces.py <本次目录> /workspace/secrets/s2-local-passwords.json`，只提交脱敏 trace；原始 trace 留在忽略目录。现有用户名只属于本地 synthetic fixture，不是公开注册/邀请已通过的证据。
