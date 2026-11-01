# WP09 分包验收证据

> 最新结果见文末“第一阶段集成复核”：WP07 安全升级合入后，入口为 371.05 kB（gzip 117.25 kB），首页实际 JS 总计 514,197 字节。下文原有测量属于 WP09 独立分支。

2026-11-01，基线 `origin/integration/v1.0` = `5d005072c927a12551636788048fb83ee7be2bca`。已显式 fetch `integration/v1.0` 并确认审核基线 `7d84fa4` 是祖先；工作分支 `codex/rr-wp09-performance`。没有访问、修改或推送 main，没有调用真实 AIR。

## 改动与包体

Today、Ask、任务详情、提醒保留同步加载。其他顶层页面和右栏辅助编辑器按访问加载；PhaseOne 内的组织设置和工作区仍通过既有动态导入加载。两套文档读取器的 PDF/Word 动态导入保留，不在路由访问时预取。

共用 `RouteLoading` 提供可见状态、`role=status`、polite 通知与最小内容高度；顶级独立页面使用 main，已有 main 内的加载状态使用 section。设置保存/导航协调器和存储保护逻辑没有改动。

以下是同一 Node 22 / 原始 lockfile 的 Vite 构建显示值，单位 kB（十进制）；Vite 的显示长度与 UTF-8 响应字节略有差异。

| 资源 | 优化前 | 优化后 | 优化后 gzip |
| --- | ---: | ---: | ---: |
| 主入口 | 722.65（gzip 222.23） | 354.91 | 111.62 |
| React 基础运行库 | 包含在入口 | 142.78 | 45.72 |
| PhaseOne | 包含在入口 | 52.28 | 15.33 |
| OnlineSetup | 83.47，原有异步块 | 83.49 | 25.95 |
| PDF 实现 | 483.74，原有异步块 | 483.74 | 144.81 |

没有调整 `chunkSizeWarningLimit`；最终构建没有超过 500 kB 的 JS chunk 警告。PDF worker 仍约 1,264 kB，仅在选择 PDF 时请求。

`manualChunks` 只匹配 `node_modules/(react|react-dom|scheduler)/`。最终 React 运行库的模块 AST 没有 import，入口唯一静态 import 是该运行库，因此没有运行库回引应用的循环依赖。其他依赖与应用代码由 Rollup 按静态/动态导入图处理。

## 生产网络证据

在全新 Chromium 页面打开 `http://localhost:4903/#/`，等待 Today 和网络空闲，实际初始 JS 请求只有：

| 请求 | 响应正文字节 | 本地计算 gzip 字节 |
| --- | ---: | ---: |
| `/assets/index-CErJPj86.js` | 355,659 | 111,624 |
| `/assets/react-runtime-D6l9FsUX.js` | 142,782 | 45,721 |
| 合计 | **498,441** | **157,345** |

gzip 是对最终文件的本地计算值，不是本次本地服务器的传输编码测量。拆出 React 后，主入口大小不等于首页下载总量；这里分别报告两者。

`e2e/bundle-performance.spec.ts` 对 desktop/mobile 均检查：

- 首页实际脚本请求中没有 PhaseOne、OnlineSetup、PDF 实现或 worker；获取入口响应正文并断言小于 500,000 字节，附件记录所有初始脚本及总量。
- 人为暂停 PhaseOne chunk 响应时，页面有可见 loading、polite status、唯一 main、至少 320px 内容高度，并通过 WCAG 2A/2AA axe 检查；释放响应后正常显示工作区，没有 pageerror。
- 直接访问 `/#/phase1`、刷新、浏览器 Back/Forward 正常。
- 访问 `/setup` 不下载 PDF；选择仓库中的虚构 PDF 后才下载 PDF 实现和 worker，并成功显示已读取文件。该检查拦截所有 API，不需要 AI。

`e2e/bundle-organization-setup.spec.ts` 自然匹配现有 storage 项目的文件名规则。它暂停 OnlineSetup 响应，检查外壳导航仍可见、polite status、唯一 main、axe 无违规，释放后编辑器正常显示，仍未下载 PDF。API 全部离线模拟。

## 验证与复现

环境：Node `v22.23.4`，独立 `npm ci`，Chromium `/usr/bin/chromium`，workers=1，关键回归的普通/存储构建使用独立端口 4903/4904，最终新增检查与持久化证据复验使用 4905/4906；未改 timeout、断言、skip 或点击方式。

- `npm run build`：通过。
- `npm run lint`：通过。
- `npm test -- --maxWorkers=1 --minWorkers=1`：55 文件 / 765 测试通过，包括页面切换期间不重复计算预测的断言。
- `git diff --check`：通过。
- WP09 新增浏览器检查：普通项目 8 项 + storage 项目 2 项通过。
- smoke / phase1 / 组织设置关键回归：100 项中 94 通过、6 失败、0 skip；6 个失败均为下文三类跨包旧测试在 desktop/mobile 各一次。组织设置选定的 34 项全部通过。
- 最终新增检查将网络 JSON 与 loading PNG 写入各测试的 outputDir，便于直接复核；并行运行的持久化证据位置为 `.scratch/wp09-final-results/`。

标准配置可直接运行新增检查：

```sh
npm run build
PW_CHROMIUM=/usr/bin/chromium npm run e2e -- e2e/bundle-performance.spec.ts e2e/bundle-organization-setup.spec.ts --workers=1
```

并行阶段使用未提交的临时 config，复制 `playwright.config.ts` 并仅将端口改为 4903/4904、`reuseExistingServer=false`、workers=1。本次关键回归的完整选择命令为：

```sh
PW_CHROMIUM=/usr/bin/chromium npx playwright test -c playwright.wp09.config.ts \
  e2e/bundle-performance.spec.ts e2e/smoke.spec.ts e2e/phase1.spec.ts e2e/organization-setup.spec.ts \
  --grep '(bundle-performance|smoke|phase1)\.spec\.ts|source screen|reads and archives real|saved drafts resume|leaving within the autosave|real browser Back and Forward|real browser Back stays|shell veto and setup save|a failed navigation save|a conflicting online revision|unsent assistant and new-role|direct hash navigation saves|failed direct hash navigation|unsent inputs block Home|local recovery storage failure'
```

选择涵盖真实 PDF/Word/TXT 解析、无障碍源页面、保存恢复、Back/Forward 成功与失败、shell veto、冲突版本、未发送输入恢复、直接 hash 导航及失败、存储不可用时的离开保护。组织设置原有图形编辑场景包含 force click 和部分 mobile skip；这些与 WP09 无关的场景没有执行，没有修改原 spec。

## WP09 独立分支的历史集成限制（现已解决）

独立分支基线的 smoke 仍期望 `/funding` 标题 Funding，而应用已重定向 Events；另一个场景读取已删除的 `my-tasks` testid，当前 Board 实际已正确显示 Maya 的任务。这两类测试交由 WP01 迁移。phase1 的 Organization B 场景仍寻找旧的 “Meet the speaker or partner” 任务，现有标准 playbook 已替换为 38 个步骤并分页展示；交由 WP04 按职责契约迁移。WP09 保留这三类失败，不通过削弱断言制造通过。

当时的包体需要在 WP07 的 Router 安全升级合入后重新测量，最终结果见下节。真实付费 AIR、线上 Deploy Preview、真实身份与跨组织数据不属于本次离线分包验收。

## 第一阶段集成复核

2026-10-31（America/Phoenix；执行日志使用 UTC，已跨至 2026-11-01），主 agent 在独立 worktree `codex/rr-stage1-integration` 完成六包审查、逐个集成和验收。最新远端基线为 `5d005072c927a12551636788048fb83ee7be2bca`（`5d00507`），审核基线 `7d84fa405e89ec62f4e5b712e0b08409c38caa7c` 的祖先关系已验证。六个子分支均从同一基线创建，每包只有一个源提交；按 WP01 → WP02 → WP03 → WP04 → WP07 → WP09 顺序 cherry-pick，未使用整体 ours/theirs 覆盖。

| 工作包 | 独立工作包提交 | 集成后的提交 |
| --- | --- | --- |
| WP01 | `455ddb6b982bbd690d97dde70c82b787295d230c` | `2f3c922787fccf12ad4144e8d1c829c2486027c8` |
| WP02 | `bbf0c218abc5e6b85b262f8ee6ea166cfb4a42c3` | `a653a4c290ed5c5d819e8bbfa1526030076ddc15` |
| WP03 | `eaeaeacd8162cd16daf5950ab1e3ac73bbcbce72` | `7819d87c02fd89917dbc10ad2f25ae77a8b675dc` |
| WP04 | `304b7b79ff425744f3a260d18b558c512a04c3e0` | `f329ba68c6cadfa6fc7875d6e9c2638f574b7a16` |
| WP07 | `eab4b1a4b864eeaae169676a1a2e74f55cacc8d1` | `707eb195d1423557d622362d49cc0228f52ee129` |
| WP09 | `99513f174eaa92fb79d63a85a1f80524af65f9da` | `83a699521fac28fb4c4a597e7ef3b7abab3c8243` |

共享文件自动合并后逐处复核：Rail 同时保留 Escape、Reset 清理和辅助详情懒加载；样式同时保留 Roles、Budget 绘制边界与 loading；预测测试保留真实导航和全部计算次数断言，并移除 Router 6 的旧 future 参数。

### 最终第一阶段门禁

Node `v22.23.4`，Chromium `/usr/bin/chromium`，使用原始 `playwright.config.ts`，浏览器 workers=2、retries=0：

- 全部集成后重新 `npm ci`；`npm run lint`、`npm run build`、`npm run typecheck:netlify`、`git diff --check` 均通过。
- `npm test -- --maxWorkers=2 --minWorkers=1`：**56 文件 / 808 测试通过**。
- `npm audit --omit=dev`：**0 漏洞**，high/critical/moderate/low 均为 0。
- 第一阶段浏览器矩阵：20 文件、288 项，**281 通过 / 7 项原有设备适用性排除 / 0 失败 / 0 flaky**，无重试。desktop/mobile 各 126 项，desktop-storage/mobile-storage 各 18 项。
- 逐包集成时分别复验 WP01 76/76、WP02 59 通过及 7 原有设备排除、WP03 26/26、WP04 72/72；WP07 的 79 项目标单元和 4 项路由浏览器检查均通过。WP09 的 10 项新检查包含在最终矩阵中。WP01/WP04 已消除前文 WP09 独立分支的六项旧契约失败。
- 375/390/768px 的真实点击/触屏、保存失败、隐私请求、人工流程审批、任务负权限、日期重算、Undo/Reset、导出状态和刷新持久化均在矩阵中验证。
- 入口构建显示值 **722.65 → 371.05 kB**，gzip **222.23 → 117.25 kB**。入口响应为 **371,806 字节**，小于 500,000；React runtime 为 **142,391 字节**。桌面和手机首页均仅请求这两份 JS，合计 **514,197 字节**；未请求 PhaseOne、OnlineSetup 或 PDF。runtime AST 没有 import，入口唯一静态 import 为 runtime，无反向应用依赖。未提高包体门槛，最终构建无超 500 kB 的 JS chunk 警告。

浏览器选择命令（在 Node 22 环境执行）：

```sh
CI=1 PW_CHROMIUM=/usr/bin/chromium PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/rr-stage1-final-e2e.json npm run e2e -- \
  e2e/smoke.spec.ts e2e/recovery.spec.ts e2e/safety.spec.ts e2e/m2b.spec.ts e2e/bts.spec.ts e2e/today.spec.ts \
  e2e/events.spec.ts e2e/flow-edit.spec.ts e2e/feel.spec.ts e2e/touch.spec.ts e2e/wp5.spec.ts \
  e2e/tasks.spec.ts e2e/rehearsal.spec.ts e2e/setup-team.spec.ts e2e/workflow-setup.spec.ts e2e/phase1.spec.ts \
  e2e/production-security.spec.ts e2e/bundle-performance.spec.ts e2e/bundle-organization-setup.spec.ts e2e/organization-setup.spec.ts \
  --grep '(smoke|recovery|safety|m2b|bts|today|events|flow-edit|feel|touch|wp5|tasks|rehearsal|setup-team|workflow-setup|phase1|production-security|bundle-performance|bundle-organization-setup)\.spec\.ts|source screen|reads and archives real|saved drafts resume|leaving within the autosave|real browser Back and Forward|real browser Back stays|shell veto and setup save|a failed navigation save|a conflicting online revision|unsent assistant and new-role|direct hash navigation saves|failed direct hash navigation|unsent inputs block Home|local recovery storage failure' \
  --workers=2 --retries=0 --reporter=line,json
```

完整日志为 `/tmp/rr-stage1-final-{ci,lint-build,unit,backend,e2e}.log`，生产审计为 `/tmp/rr-stage1-final-audit.json`，浏览器原始报告为 `/tmp/rr-stage1-final-e2e.json`，网络及设备排除汇总为 `/tmp/rr-stage1-final-summary.json`，静态包体检查为 `/tmp/rr-stage1-final-bundle.json`。这些本地运行产物不作为仓库源文件提交。

### 留给第二阶段的已知问题

依 STAGE1 第 10 条，以下保留原门槛，如实记录，不算第一阶段已修复：

- **WP05：** 手机任务表单 Owners 输入 `Jordan, Treas` 并 Enter 后，Escape 仍会冒泡并关闭整个 Rail，应只收起候选列表。未执行组织设置旧测试中依赖 force click 的图编辑场景；全面键盘/无障碍认证仍待后续。七项设备排除是原有鼠标悬停/拖拽与手机触屏适用性区分，未新增 skip。
- **WP06：** 补查 `npm run words` 退出 1，四条路由超限：Events all 614/420；Rules visible 324/170、all 1671/560；Team visible 138/130；`/funding` 重定向至 Events 后 all 614/160。未提高字数上限或使用 report-only 掩盖失败。
- **WP08：** 补查含开发依赖的 `npm audit` 退出 1，共 17 项（2 critical、1 high、13 moderate、1 low）；生产依赖审计仍为 0。开发依赖声明未升级，没有 audit ignore。

第一阶段验收通过，可开始 WP05/WP06/WP08。全仓库发布认证 WP10、真实手机/Safari、线上 Deploy Preview 和真实 AIR 人工验收尚未完成；真实 AIR 调用为 **0**，没有推送或合并 main。需要同步本地备份。
