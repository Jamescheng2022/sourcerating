# Lead P2 修复与原云端定向复测

已读取 agent-bus 固定提交 `70917a635a1ddb19438519272efd7b0c8fc557d9` 的原始回执，逐字副本见 [lead-receipt.md](lead-receipt.md)。Lead ACK 已取得；SR `c7d00a7` / LUSH `67ca2d7` 是 **STATIC REVIEW_PASS**，原测试工具是 **REVIEW_CHANGES(P2)**。本轮修改仍需 Lead 再审。**Lead 独立 runtime 仍为 NOT_RUN**；以下实际执行全部来自同一个原云端 Codex，没有创建第二写手或本地环境。

P2 证明的是继承环境的可能性，没有证据说明过去发生过真实凭据泄漏。本轮只修复和审查本次测试工具的子进程边界，未修改 App 业务代码、托管配置、凭据或网络策略。

## 修复代码

- LUSH **`afc62ec38d5c76c0594ec67618db9dd8b559be42`**：`Popen(env=...)` 明确只给 fixture `PATH`；fixture 在实际进程内断言完整键集合等于 `[PATH]`。本地 Git、Chromium、native PG 工具也显式使用 PATH 白名单。独立 Python runner 在启动 Playwright driver 前清空自己的非白名单环境；driver 仅再添加库内部的三个 PW 语言/版本标记。调用 shell、平台 Git/代理和生产程序的环境没有被改动。
- SR **`7988ba05d3d209fc019161534f76c1b898d93dbc`**：本地 Next 测试子进程改用明确白名单，新增实际启动前断言。仅允许 PATH、本地 Auth URL/public anon key 和关闭遥测标记。CLI status 只额外获得指向既有本地 Docker socket 的 DOCKER_HOST；浏览器、Git 和测试文件生成器只获得 PATH。既有非 canary 模式的具名 relay 参数仍保留，本轮未运行这些旧模式。
- 两边各 4 项环境探针通过。测试使用自己构造的未知凭据名称、供应方变量及 Node preload 哨兵，未读取/打印真实环境秘密。探针实际启动 Node/Python 子进程，证明未知变量和启动钩子不会继承；缺 PATH/错误 hosted target 在启动前拒绝。SR guard 还验证多出一个合成键即拒绝启动。
- 本轮真实 LUSH 流程故意在父 runner 放入合成 `OIDC_CLIENT_SECRET`、`DATABASE_URL`、`VITE_SUPABASE_URL`、未知变量及不能加载的合成 `NODE_OPTIONS` preload；fixture 与 Playwright 仍正常运行，fixture 回读只见 PATH。SR 父 runner 放入合成供应方/未知变量，Next guard 的实际日志只列出四个允许键。
- 未审查整个系统、其他任务、托管服务或所有旧测试框架。两套 scrub 脚本不启动子进程。原业务构建复用上轮产物，应用源码相对已审功能提交未变；不为此重复全套构建/测试。

LUSH 在复测前另加了两条 UI 就绪断言，明确等待“邮件恢复未配置”提示和 App 恢复按钮同时出现后截图。这项测试强化随本轮证据提交保留。运行时 HEAD、实际 runner SHA256 和既有构建文件指纹记录在 `retained-build.json`；SR 的同一 runner 对照证明在 `runner-comparison.json`（位于 SR 仓库）。这些字段区分 Git HEAD、实际运行文件与业务代码，没有把测试提交当成功能提交。

## 实际命令、退出码与结果

完整 argv、cwd、控制变量名称、时间、退出码和原始输出 SHA256 在 [commands.jsonl](commands.jsonl)。日志保存真实 stdout/stderr，没有把失败改写为通过。

| 定向执行 | 结果 |
|---|---|
| LUSH `python tests/test_child_environment.py` | 退出 0；4 tests OK |
| SR `node --test apps/web/scripts/local-child-env.test.cjs` | 退出 0；4 pass / 0 fail |
| SR 原版 bb840a8，`S2_CANARY_FILTER=SR-02-reload` | **退出 1，预期 FAIL**；刷新后等待 Retry 5 秒失败。已提交的消息仍存在，丢失的是待确认请求/重试入口 |
| SR 修复版，同 runner 的 SR-02-reload、SR-02、SR-04、SR-06 | 退出 0；四条 PASS；同 ID 刷新重试、取消丢弃、离线恢复、迟到 ACK 跨房间隔离、RLS/room-analyze、local Auth 密码恢复 |
| LUSH `JOURNEY_FILTER=lead-p2` | 退出 0；LUSH-04/05/06 PASS；账户隔离、真实导出内容、lost ACK、双击重试、离线恢复、实际 10 秒超时、缺邮件 SDK 时 App 会话恢复及撤销 |
| SR 修改过的五个 JS 文件定向 ESLint | 退出 0 |
| 既有 native PG start / stop | 均退出 0；原库和合成数据保留，无 Docker 新层 |

SR 原版和修复版用相同脚本字节、相同固定合成房间，串行执行；原版的已构建 detached 对照 worktree 被复用，没有覆盖原分支或新建数据库。两边最后的浏览器 HTTP 外部请求与未捕获页面错误记录均为空。原 `s2-web-e2e` 的尾部 `checks:1` 仅计外层登录检查；行程结果须看逐条 SR 输出及 `journeys.json`，不能把它解释为全套通过。

实际恢复使用本地 Auth 生成的 grant，未请求发送邮件。真实邮件与真实身份供应方仍未验收。LUSH 使用真实 production handler、OIDC 验签/PG 数据逻辑和明确的合成签名 issuer；不是实际 Supabase/OIDC 供应方验收。真实模型未调用，`modelEvidence=false`。

## 当前旅程矩阵

见 [journey-matrix.json](journey-matrix.json)，包括精确运行 SHA/目标、步骤、依赖、期望/实际、证据定位和前轮证据来源。本轮 12 项为 **6 PASS / 2 BLOCKED / 4 NOT_RUN**；额外的 SR 最小回归单列为原版预期 FAIL → 修复版 PASS。按最新已有证据汇总仍为前后两轮合计 10 PASS / 2 BLOCKED，**不是本轮重新跑了 10 项**。

| 行程 | 本轮 | 说明 |
|---|---|---|
| SR-01 | BLOCKED | 邀请网关未调用 |
| SR-02 | PASS | 刷新/重试/取消/离线/迟到 ACK |
| SR-03 | NOT_RUN | 原询价结果保留，未重复 |
| SR-04 | PASS | 跨房间 RLS、身份伪造、严格绑定事件分析及状态不变 |
| SR-05 | BLOCKED | 含附件完整归档网关未调用 |
| SR-06 | PASS | 本地密码恢复、旧密码拒绝、新密码登录及主身份保持 |
| LUSH-01/02/03 | NOT_RUN | 只做账户/一条行程/第二会话的必要准备，不重复这些完整旅程 |
| LUSH-04 | PASS | 另一账户读写及恢复他人备份拒绝，导出是实际内容 |
| LUSH-05 | PASS | lost ACK/断网/双击/10 秒超时后明确重试 |
| LUSH-06 | PASS | 无邮件配置仍可恢复；旧会话/先前待完成登录拒绝，Bob 正常 |

## Trace / 截图审查覆盖

共新增 8 个可分享 trace ZIP、17 张截图；原始 trace 留在原云环境忽略目录，旧证据全部保留。分享版本清除了规则识别的认证值并有 raw/shareable SHA256，CRC/JSONL 验证与受限凭据模式扫描见对应 receipt/scan。**这是规则限定的处理，不是未知秘密全量清理证明。**

Codex 人工查看了 4/17 张截图：SR 原版刷新后页面、local Auth 密码更新确认；LUSH 缺邮件配置但可用的 App 恢复入口、Bob 导入 Alice 备份被拒。Bob 长截图被界面缩小显示，细小文字没有逐像素检查。未声称其他截图均被人工查看。

另外查看了 7/8 个 ZIP 的选定请求路径/状态及失败动作摘要，见 [trace-metadata-review.json](trace-metadata-review.json) 与 [review-coverage.json](review-coverage.json)。没有逐帧、逐正文人工审阅；浏览器 trace 不包含 Node 侧的 SDK/API 探针，后者由保留的测试断言、原始进程输出和退出码证明。LUSH 选定记录显示旧会话 401、Bob 跨账户 409、自身读 200、旧 pending callback 401；真实超时记录在 LUSH `timeout-observation.json`。没有把受控断网/超时的 status -1 当作未解释的成功请求。

这些是原云 Codex 的审查，**不是 Lead 已运行测试或完成全量秘密审查**。父端可把原始输出和这些文件交 Lead；Lead 仍需原 cloud 执行附件才能独立 runtime 复测，不应另在用户电脑重建。

## 保留的外部门槛

SR-01/SR-05 不升级：kong-only 未确认生效；未重试被拒 Edge→kong，未发布混合草稿。原 Vercel App 项目/分支/Host/origin 守卫、invite-only/signup=false 不变；SR stage2 暂停与 Preview 缺公开配置仍是分别存在的门槛。

LUSH 托管 version1/004 未应用、旧实例排除及托管备份/迁移批准条件不变；真实身份配置和邮件授权仍待完成。来源 proxy403 未重试/换路径；来源 0/20、真实来源路线验收 0/10 不变。原演示卡片/待核样例不能算真实路线或支付验收。没有新的可声明完整可用的公网 Preview，没有生产部署、恢复/迁移托管库、新增付费资源或真实扣款。

原环境 revision 2 已实际连接，路径 `/workspace/sourcerating`、`/workspace/lushupai-v2`，均在 `codex/cloud-launch-20261023`。before/after 对比原 8 容器和 3 数据卷 ID/名称集合相同；已停止本轮临时测试服务和 native PG，数据保留。模型请求为 Astra/max；系统标识为基于 GPT-6 的 Codex，服务型号/effort 遥测仍不可核实。

## 原云端复测入口

逐子进程白名单/实际证明见 [subprocess-audit.json](subprocess-audit.json)。沿用 [上轮原环境命令及固定 fixture 路径](../cloud-20261024-user-journeys/README.md)，新的控制项如下；输出目录必须换成不存在的新目录，避免覆盖证据。没有原 cloud 执行附件时不能在用户本地重建。

```bash
cd /workspace/sourcerating/apps/web
S2_CANARY_FILTER=SR-02-reload,SR-02,SR-04,SR-06 \
S2_EVIDENCE_DIR=/workspace/sourcerating/evidence/lead-p2-next-sr \
S2_SUPABASE_CLI=/workspace/tools/bin/supabase \
S2_SUPABASE_WORKDIR=/workspace/sr-stack \
S2_BROWSER_PATH=/usr/bin/chromium \
S2_PLAYWRIGHT_MODULE=/workspace/tools/node_modules/playwright \
S2_PASSWORD_FILE=/workspace/secrets/s2-local-passwords.json \
node scripts/s2-web-e2e.cjs canary
```

原版对照只在保留的 `/workspace/sourcerating-baseline-canary` 执行 `SR-02-reload`，使用相同脚本字节，预期退出 1；具体脚本 SHA256 与应用/build ID 见 `runner-comparison.json`。禁止切换原开发分支到旧代码。原始执行输出位于 `sr-baseline/raw-output.log`、`sr-fixed/raw-output.log`，环境探针输出位于 `environment-unit.log`。
