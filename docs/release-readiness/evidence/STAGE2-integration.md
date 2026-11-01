# DP8 第二阶段集成验收

2026-11-01（UTC）。本记录为三个独立工作包集成后的最终证据；各工作包证据里的源分支计数、版本及包体属于集成前记录。

## 基线、隔离与提交

首先执行 `git fetch origin`；因 origin 默认 fetch refspec 只覆盖默认分支，随后显式 fetch `refs/heads/integration/v1.0:refs/remotes/origin/integration/v1.0`。唯一基线为最新远端 **1975bc122f5823e033c29493a5d20ce84b85ec23 / 1975bc1**。已逐一用祖先检查确认第一阶段六包在该远端内：

| 第一阶段包 | 已集成 commit |
| --- | --- |
| WP01 | 2f3c922787fccf12ad4144e8d1c829c2486027c8 |
| WP02 | a653a4c290ed5c5d819e8bbfa1526030076ddc15 |
| WP03 | 7819d87c02fd89917dbc10ad2f25ae77a8b675dc |
| WP04 | f329ba68c6cadfa6fc7875d6e9c2638f574b7a16 |
| WP07 | 707eb195d1423557d622362d49cc0228f52ee129 |
| WP09 | 83a699521fac28fb4c4a597e7ef3b7abab3c8243 |

按要求完整阅读 AGENTS、README、manifest、STAGE2 与最新第一阶段交接；按 manifest 自动读取 WP05/06/08。三个 sub-agent 的 worktree、分支和源 commit 独立，均从上述同一基线出发，每包一个 commit；主 agent 在第四个 worktree 按 WP05 → WP06 → WP08 cherry-pick -x。

| 包 | 源分支 / worktree | 独立源 commit | 集成 commit |
| --- | --- | --- | --- |
| WP05 | codex/rr-wp05-a11y / rr-wp05-a11y | a383c06738011b4ea5660d6e024ba5f8aff51038 | 76f3f2a3bbc131bdfecc9db49a4daf8ab1147ee7 |
| WP06 | codex/rr-wp06-words / rr-wp06-words | 4a23825e57e6f56067178f141ce96e5b6402414a | 817582daf44d7b1bd001e2e287ab868d5285dc1c |
| WP08 | codex/rr-wp08-toolchain / rr-wp08-toolchain | 85687dccfe10917f1eba849ef5aa5c45a8f56a60 | 5540c66bda560c2ab2826cae4e662b68b09922e6 |

集成分支 `codex/rr-stage2-integration`，worktree `rr-stage2-integration`。MetroChart 唯一冲突逐行合并，保留 WP05 的触摸/键盘区分、焦点管理与 WP06 的按需 tooltip、aria-describedby，不采用整文件覆盖。每包后验证：WP05 的 a11y/flow-edit/m2b 90 通过、6 原有设备排除；WP06 的 Rules/Events/wp5/smoke/word-budgets 62 通过，words 通过；WP08 后执行下述完整阶段门禁。

主 agent 进一步发现并修复只读 Budget 焦点陷阱：候选元素使用原生 :disabled（含禁用 fieldset），包含 summary；Sam/Jordan 双向 Tab 与 Escape 桌面/手机均覆盖。该修正已进入最终 WP05 源 commit 后重新集成。

新版 Axe 4.14 暴露品牌与 Handoff 的真实 label-content-name-mismatch。主 agent 在 **ccaf517fd54cccd629927eba74e428c2eafe49c4** 与 **6e9be85292554cebd978b818e40c237f5bf31616** 分别移除覆盖可见内容的冗余 aria-label，使用原生内容命名；品牌加入文本空格，交接卡补充读屏用途 handbook 并保留头像、进度与阶段。品牌新增测试验证修改组织名、原始 Axe 扫描及键盘回首页（6 目标项通过）；Handoff 扫描与完整签署业务 4 项通过，另经 WP05 agent 只读复核。

## 最终门禁

环境：Node **v22.23.4**，`/usr/bin/chromium`（154）。npm 命令通过 `npm exec --yes --package=node@22 -- sh -c '…'` 执行。先完成生产构建，再启动浏览器；运行期间不重建其 dist。原始 Playwright 配置不改，workers=2、retries=0。

| 门禁 | 最终结果 |
| --- | --- |
| npm ci | 通过，439 包；锁文件与独立源包一致 |
| npm run lint | 通过；Stylelint、ESLint，另 20 JSX/style 样例、4 原有排除、66 matcher API 断言通过 |
| npm run build | 通过；TypeScript 和 Vite，未提高包体阈值 |
| npm test -- --maxWorkers=2 | 56 文件 / **809 通过**，0 失败、0 skip |
| npm run typecheck:netlify | 通过，strict 保留 |
| npm run words | 全部 9 个真实路由通过；Funding 已重定向到 Events，删除重复别名条目，未提高任何阈值或修改统计方法 |
| a11y desktop/mobile | **63 通过**、3 原有设备排除，0 原始 Axe 违规（66 项） |
| 阶段目标 E2E | **350 通过 / 10 原有设备排除 / 0 失败 / 0 flaky / 0 重试**，共 360 项，4.6 分钟 |
| npm audit --omit=dev | critical/high/moderate/low 均 0 |
| 完整 npm audit | critical/high/moderate/low 均 0（基线 17 项 → 0） |
| Playwright --list | **464 项 / 28 文件**，基线 440 项 / 27 文件，无测试删除 |
| git diff --check | 通过 |

最终 word count（visible / all；阈值保持原样）：Today 109/404，Events 149/171，Rules 50/166，Tasks 56/56，Team 129/259，Handoff 39/71，Partners 79/99，Settings 120/120，Help 442/442（原有信息页宽限）。Rules 64 条原始来源仍可通过搜索、分类和真实分页全部访问；新增测试遍历 All/9 分类共 27 个分页视图，最宽 74/268，仍低于 170/560。Event owner/status/三个日期和规则来源保留于按需 hover/focus 卡片及详情，没有用 CSS 隐藏全文来凑字数。

最终入口 `index-NvA6n9JZ.js` **364,430 字节**（本地 gzip 115,194），react-runtime **142,530**（gzip 45,815），首屏两份 JS 总计 **506,960** 字节。500,000 字节门禁针对入口，未把总和误报为入口。Rollup AST：入口仅静态引用 runtime，runtime 无 import/export-from 回引。桌面与手机实际网络附件均确认仅请求上述两份 JS，未提前请求 PhaseOne/OnlineSetup/PDF。保留 lazy loading、可见 loading、单 main、polite status、直接访问/刷新/Back/Forward、PDF 实现与 worker 仅在选择 PDF 后请求。

最终矩阵完整运行 a11y、word-budgets、smoke、recovery、safety、m2b、bts、today、events、flow-edit、feel、touch、wp5、tasks、rehearsal、setup-team、workflow-setup、phase1、production-security、bundle-performance、bundle-organization-setup；另选择 organization-setup 的来源、PDF/Word/TXT 真文件读取归档、草稿恢复与导航/保存失败/冲突目标场景。项目分布 desktop=162、mobile=162、desktop-storage=18、mobile-storage=18。全部 API 离线模拟，0 次真实付费 AIR。

10 项排除均为原有明确设备适用性：a11y 3（desktop 不跑手机整页覆盖，mobile 不重复平板2）、feel 2（手机不跑 hover/桌面焦点样式）、flow-edit 3（手机不跑鼠标拖动/宽布局连线）、touch 2（desktop 不跑手机触摸）。无新增 skip/fixme、删除断言、force click、增加 timeout、禁用 Axe/过滤违规、提高字数/包体限制或 audit ignore。旧 flow-edit target-size 过滤已移除。

本地保留 `/tmp/rr-stage2-final-{lint-build,unit-backend,words,e2e}.log`、`final-e2e.json`、完整/生产 audit JSON、bundle JSON、E2E inventory 与浏览器网络附件。发现失败的轮次也保留：新版 Axe 品牌问题；其后 347 pass /10 原有排除 /3 失败（Handoff 桌面/手机及并行重建时一次 HTTP 导航错误）。修复真实命名并停止并行重建后完整重跑，以下最终结论仅依据最新成功轮次；未只跑失败项就宣称整个阶段通过。曾误写不存在的 typecheck:backend 命令，报 Missing script；随后使用仓库正确 typecheck:netlify 独立及最终复跑均通过，未把命令错误当作成功。

## 剩余风险与第三阶段条件

- WP08 对 ESLint、config-array、typescript-estree 的三条 minimatch 11.0.3 override 是真实升级，未忽略漏洞。上游直接采用安全版本后应逐条解除，并复跑 matcher 对照与 lint。原生产依赖运行时版本未改，仅两项 React 类型包更新；生产链仍有两条已有 OpenTelemetry 弃用提示，audit 为 0。
- 当前是第二阶段目标验收；完整 464 项四项目认证、fsck、secret/private-key 扫描、当前 GitHub Checks、真实 AIR 人工 smoke checklist 仍由 **WP10** 执行。部分未纳入本阶段的旧 storage 图测试仍有 force click，第三阶段须按禁用捷径要求审查并修正可操作性，不得沿用以获取通过。
- 仅本地 Chromium 桌面/模拟手机；物理设备、Safari、线上 DP8 预览/部署尚未新验收；未调用真实 AIR，不宣称线上 AI 或正式发布已认证。需要同步本地备份。
- 第二阶段所有门禁已通过，具备开始第三阶段 WP10 的条件；尚不具备最终发布认证或申请合并的结论。推送前必须再次 fetch，远端仍为基线且能安全 fast-forward 才执行 `git push origin HEAD:integration/v1.0`。不使用、修改、推送或合并 main，绝不 force push。

## 最终浏览器矩阵复现命令

先在 Node 22 下完成 `npm ci && npm run build`，保证运行期间没有其他进程重建 dist。以下命令同样在 Node 22 的 shell 内执行，沿用正式四项目配置与既有 timeout：

```sh
CI=1 PW_CHROMIUM=/usr/bin/chromium npx playwright test \
  e2e/a11y.spec.ts e2e/word-budgets.spec.ts e2e/smoke.spec.ts \
  e2e/recovery.spec.ts e2e/safety.spec.ts e2e/m2b.spec.ts e2e/bts.spec.ts \
  e2e/today.spec.ts e2e/events.spec.ts e2e/flow-edit.spec.ts e2e/feel.spec.ts \
  e2e/touch.spec.ts e2e/wp5.spec.ts e2e/tasks.spec.ts e2e/rehearsal.spec.ts \
  e2e/setup-team.spec.ts e2e/workflow-setup.spec.ts e2e/phase1.spec.ts \
  e2e/production-security.spec.ts e2e/bundle-performance.spec.ts \
  e2e/bundle-organization-setup.spec.ts e2e/organization-setup.spec.ts \
  --grep '(a11y|word-budgets|smoke|recovery|safety|m2b|bts|today|events|flow-edit|feel|touch|wp5|tasks|rehearsal|setup-team|workflow-setup|phase1|production-security|bundle-performance|bundle-organization-setup)\.spec\.ts|source screen|reads and archives real|saved drafts resume|leaving within the autosave|real browser Back and Forward|real browser Back stays|shell veto and setup save|a failed navigation save|a conflicting online revision|unsent assistant and new-role|direct hash navigation saves|failed direct hash navigation|unsent inputs block Home|local recovery storage failure' \
  --workers=2 --retries=0 --reporter=line,json
```
