# DP8 第三阶段 · WP10 最终发布认证

2026-10-31（America/Phoenix；执行环境为 2026-11-01 UTC）。本报告只认证 integration/v1.0 的发布准备；真实 AI 人工结果另列。

## 基线与范围

先执行 `git fetch origin`。origin 原有 refspec 仅跟踪默认分支，因此再显式执行 `git fetch origin refs/heads/integration/v1.0:refs/remotes/origin/integration/v1.0`。从远端创建全新、干净 worktree `dp8-stage3-certification-20261101`；起始完整 SHA **1e19af560daaf9ca10ee40670877c5c1b41665d8**，短 SHA **1e19af5**，HEAD 与 origin/integration/v1.0 相等。工作分支为 `release/dp8-final-certification`。

按用户顺序完整读取 AGENTS、release-readiness README、manifest、STAGE3、WP10 和 PROGRESS 中最新两阶段交接；再核对两阶段证据。对以下九项逐一执行 `git merge-base --is-ancestor <commit> HEAD`，全部退出 0：

| 包 | 已集成提交 |
| --- | --- |
| WP01 | 2f3c922787fccf12ad4144e8d1c829c2486027c8 |
| WP02 | a653a4c290ed5c5d819e8bbfa1526030076ddc15 |
| WP03 | 7819d87c02fd89917dbc10ad2f25ae77a8b675dc |
| WP04 | f329ba68c6cadfa6fc7875d6e9c2638f574b7a16 |
| WP05 | 76f3f2a3bbc131bdfecc9db49a4daf8ab1147ee7 |
| WP06 | 817582daf44d7b1bd001e2e287ab868d5285dc1c |
| WP07 | 707eb195d1423557d622362d49cc0228f52ee129 |
| WP08 | 5540c66bda560c2ab2826cae4e662b68b09922e6 |
| WP09 | 83a699521fac28fb4c4a597e7ef3b7abab3c8243 |

本包仅修正两份旧 storage 测试中的五处强制点击：共用 `clickCurve` 在真实 SVG 曲线上找可命中位置，普通 click 保留 Playwright 可操作性检查，并断言选中。汇报关系测试先真实拖到父节点建立关系，再真实拖回空白位置，新增关系不变断言，随后保留重接、删除、manualFields、循环拒绝和 Undo 检查。没有产品行为改动，没有删除断言、增加 timeout、force click、放宽门槛或新增 skip。

一次只读子 agent 负责分析并复核上述测试改动；所有文件改动、复验及最终提交都在同一个认证 worktree。

## 按类别的结果

| 类别 | 证据与边界 |
| --- | --- |
| 底层逻辑 | Node 22 单元测试 56 文件 / 809 项通过，包含日期引擎、v2 工作流、权限、预测、AI 日期过滤与任务状态；未将模型日期作为排程依据。 |
| 数据架构 | 完整四项目矩阵覆盖普通本地演示及显式开启的模拟 storage 构建；包含保存/恢复、409 冲突、不覆盖未保存内容、归档、批准快照、导出和 CRM 可见性。测试使用虚构数据及模拟 API；没有把隐藏服务器存储称为正式多人数据库。 |
| 前端 | Stylelint、ESLint、TypeScript/Vite build、九个实际路由 words 通过；保留 Router 重定向、异常恢复、按需页面与 loading。 |
| 后端 | `npm run typecheck:netlify` 通过；`tsc --showConfig -p tsconfig.netlify.json` 确认 strict=true，覆盖 18 Functions 与 15 个后端库文件。 |
| 安全 | 生产/完整 audit 均 0 漏洞；Gitleaks 扫描当前源文件及 HEAD 可达 267 个历史提交，只有下节的公开 localStorage 键误报；额外私钥标记检查为 0。保留输入大小、白名单、内部重定向与隐藏端点边界。 |
| 交互 | 实际鼠标/键盘/触屏、表单、预算、Owner 选择、Escape、菜单、Undo、Reset、刷新和图重接/删除均保留检查。五处历史强制点击已移除。 |
| 无障碍 | 完整矩阵执行 Axe 与键盘场景，包括普通/只读 Budget 焦点、手机全屏 Rail、平板、品牌与手册名称、懒加载 status。a11y.spec.ts 为 63 通过 / 3 原有设备排除，原始 Axe 违规为 0；其他图/懒加载/设置无障碍检查同样执行。原始 Axe 违规不被过滤。 |
| 性能 | 主入口 364,430 字节（gzip 115,194），低于 500,000；React runtime 142,530（gzip 45,815），首页 JS 合计 506,960。AST 确认入口仅静态引用 runtime，runtime 无 import/export-from 回引。浏览器检查首次不请求 PhaseOne/OnlineSetup/PDF，选择 PDF 后才请求实现与 worker；未改变包体门槛。 |
| 测试和 CI | 最终完整四项目 451 通过 / 13 原有设备排除 / 0 失败 / 0 flaky / 0 重试；共 28 文件、464 项，6.1 分钟。当前远端 Checks 见下节。 |
| 真实 AI 人工验收 | **未执行，0 次真实付费 AIR 调用**。已提供 [DP8 人工清单](WP10-ai-smoke-checklist.md)，区分真实模型响应、本地路由、模拟和 fallback；不把离线结果当成真实 AI 质量认证。 |

## 执行命令与完整门禁

环境：Node **v22.23.4**，Chromium `/usr/bin/chromium`。所有 npm/Playwright 命令通过 `npm exec --yes --package=node@22 -- sh -c '…'` 执行。生产构建完成后才启动浏览器，运行期间不重建 dist；使用正式 playwright.config.ts，仅指定 workers=2、retries=0 与日志 reporter。

| 命令 / 检查 | 最终结果 |
| --- | --- |
| `npm ci` | 通过，439 包；未改 package.json/lockfile。 |
| `npm run lint` | 通过；含 20 JSX/style 样例、4 原有排除和 66 matcher 检查。 |
| `npm run build` | 通过；TypeScript/Vite，生产 source maps 关闭。 |
| `npm test -- --maxWorkers=2` | 56 文件 / 809 通过，0 失败、0 skip。 |
| `npm run typecheck:netlify` | 通过，strict 保留。 |
| `PW_CHROMIUM=/usr/bin/chromium npm run words` | 全部真实路由通过，详见下表。 |
| `CI=1 PW_CHROMIUM=/usr/bin/chromium PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/rr-stage3-final-e2e.json npx playwright test --workers=2 --retries=0 --reporter=line,json` | **451 通过 / 13 原有设备排除 / 0 失败 / 0 flaky / 0 重试**，28 文件 / 464 项，363.9 秒。 |
| `npm audit --omit=dev` / `npm audit` | 两者 info/low/moderate/high/critical/total 全为 0。 |
| `git diff --check HEAD` | 通过；最终提交前后另行复核。 |
| `git fsck --no-reflogs --connectivity-only` | 通过，退出 0。 |
| Gitleaks 8.24.3 / private-key 扫描 | 见下节原始结果及判定。 |
| 构建体积 / AST / 真实首次加载 | 静态检查通过；真实网络检查包含在完整矩阵的 bundle 两份 spec 中。 |

| Words 路由 | visible / all | 未改变的门槛 |
| --- | --- | --- |
| Today | 109 / 404 | 160 / 450 |
| Events | 149 / 171 | 180 / 420 |
| Rules | 50 / 166 | 170 / 560 |
| Tasks | 56 / 56 | 130 / 130 |
| Team | 129 / 259 | 130 / 290 |
| Handoff | 39 / 71 | 120 / 120 |
| Partners | 79 / 99 | 120 / 120 |
| Settings | 120 / 120 | 150 / 150 |
| Help | 442 / 442 | 原有信息页宽限 9999 / 9999 |

Funding 为 Events 的重定向，延续 WP06 只统计一次的契约。

## Secret/private-key 扫描原始结果

- `gitleaks git --log-opts=HEAD --redact --report-format json …`：267 个 HEAD 可达提交、约 5.19 MB，原始 **1 条告警、退出 1**。
- 使用 `git ls-files --cached --others --exclude-standard` 导出当前源文件后 `gitleaks dir … --redact --report-format json …`：原始 **1 条告警、退出 1**。不扫描安装的第三方包或构建产物来混入无关测试凭据。
- 两条均为 `generic-api-key` 对公开 `LOG_KEY` 常量（值为 `platypus.v1.log`）的误报。历史位置为 `d1e80c72cfebc193432b4e82ddfb90f832243df2:src/data/store.tsx:250`；当前为该文件第 442 行。上下文明确只用于 localStorage 交互日志读写，未作为 API 凭据或私钥。**确认的 secret 泄漏为 0**；不伪称扫描器原始零告警，也不添加 ignore/allowlist 或重写历史。
- 逐个源文件额外检查 `BEGIN … PRIVATE KEY` 标记，结果 0。扫描输出均脱敏；没有读取环境 secret 或输出凭据。

## 失败分类与未认证部分

第一次替换强制点击后，目标图测试 3 通过 / 2 原有排除 / 1 失败，原因为测试先把两个节点放在完全相同的位置，连线没有可命中点；归类为旧测试步骤漂移。加入真实移回空白处及关系不变断言后，目标矩阵 **4 通过 / 2 原有排除 / 0 失败**。之后重新运行 lint/build/unit/strict/words/两类 audit 与完整四项目门禁；保留失败轮次日志。

未进行真实 AIR 生成、物理设备/Safari、线上人工操作、规则原文人工复核或 Phase 3 研究验收；这些不能由 Chromium 模拟或 mock 替代。没有关闭 Netlify 访问保护，也没有启用线上服务器存储。

全部本地硬门禁已通过；允许在 fetch 确认远端未前进后普通快进推送 `HEAD:integration/v1.0`。本包采用一个 `[RR-WP10][Codex]` 提交，包含测试修正、认证报告、人工清单及统一交接。远端最终完整 SHA 与推送后的 Checks 状态由主 agent 在最终聊天报告中给出，并验证工作区干净、HEAD 与最新 origin/integration/v1.0 一致；本文件不预先声称尚未完成的远端 CI 通过。

main 未检出、修改、推送或合并；没有使用 force push。需要同步本地备份。

## 四项目、排除原因与 Checks 快照

| 项目 | 通过 | 既有设备条件排除 | 失败/重试 |
| --- | ---: | ---: | ---: |
| desktop | 169 | 3 | 0 / 0 |
| mobile | 165 | 7 | 0 / 0 |
| desktop-storage | 60 | 0 | 0 / 0 |
| mobile-storage | 57 | 3 | 0 / 0 |
| 合计 | 451 | 13 | 0 / 0 |

13 项排除的条件均在基线已存在，本包没有新增或修改 skip：

- a11y 3：desktop 不运行手机全屏 Rail，mobile 不重复两项由 desktop 调整视口完成的平板检查。
- feel 2：手机不重复鼠标 hover 和桌面 Ask 焦点样式。
- flow-edit 3：手机不执行鼠标拖动与宽布局连线操作；触屏/键盘路径另有覆盖。
- touch 2：desktop 不执行手机专用触摸行为。
- organization-setup 3：mobile-storage 不重复桌面额外侧栏历史条目与两项鼠标连接/重接手势；正常 Back/Forward、选择器及无障碍连接在两种尺寸均运行。

提交前读取基线 `1e19af560daaf9ca10ee40670877c5c1b41665d8` 的 GitHub Checks：Netlify deploy-preview **success**；[CI #205](https://github.com/juanxiwu2005/platypus-officer-hub/actions/runs/41261214605) **in_progress**，步骤 npm ci/lint/build/unit/浏览器安装已 success，E2E 仍在运行。不能把本地成功或旧提交检查标为最终新提交的 CI 成功；推送后必须重新查询新 SHA。

## 日志与复现附件

本地运行产物：`/tmp/rr-stage3-ci.log`、`/tmp/rr-stage3-final-gates.log`、`/tmp/rr-stage3-final-e2e.log`、`/tmp/rr-stage3-final-e2e.json`、`/tmp/rr-stage3-final-summary.json`、`/tmp/rr-stage3-audit-{production,full}.json`、`/tmp/rr-stage3-bundle.json`、`/tmp/rr-stage3-fsck.log`、`/tmp/rr-stage3-secrets-{current,history}.{json,log}`、`/tmp/rr-stage3-private-keys.json`。曲线首次失败与成功轮次分别为 `/tmp/rr-stage3-curves*` 和 `/tmp/rr-stage3-curves-final*`。浏览器逐项 trace/网络附件在 worktree 的 `test-results/`，这些生成文件不提交为源码。

桌面/手机 initial-network.json 均实测首页仅请求入口和 runtime 两份 JS，总计 506,960 字节；PDF 延迟加载与两种 storage loading 附件随完整矩阵保留。生产目录 33 个 JS chunk 中最大 437,615 字节，source map 0；PDF worker 是按选择加载的独立 mjs 资源，不混报为主入口。
