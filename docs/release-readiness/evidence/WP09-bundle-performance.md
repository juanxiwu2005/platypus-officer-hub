# WP09 分包验收证据

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

## 集成限制

当前基线的 smoke 仍期望 `/funding` 标题 Funding，而应用已重定向 Events；另一个场景读取已删除的 `my-tasks` testid，当前 Board 实际已正确显示 Maya 的任务。这两类测试交由 WP01 迁移。phase1 的 Organization B 场景仍寻找旧的 “Meet the speaker or partner” 任务，现有标准 playbook 已替换为 38 个步骤并分页展示；交由 WP04 按职责契约迁移。WP09 保留这三类失败，不通过削弱断言制造通过。

包体需要在 WP07 的 Router 安全升级合入后重新测量。真实付费 AIR、线上 Deploy Preview、真实身份与跨组织数据不属于本次离线分包验收。
