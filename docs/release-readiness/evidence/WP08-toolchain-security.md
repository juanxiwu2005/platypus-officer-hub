# WP08 工具链安全验收证据

2026-11-01。独立分支 `codex/rr-wp08-toolchain`，工作树 `rr-wp08-toolchain`；显式 `git fetch origin integration/v1.0` 后，HEAD 和 FETCH_HEAD 均为 `1975bc122f5823e033c29493a5d20ce84b85ec23`。未修改 PROGRESS、main 或其他工作包，未推送，真实 AIR 调用为 0。

## 升级与兼容迁移

所有生产依赖声明保持原样。以下为 lockfile 的实际版本；开发依赖使用精确版本，Node 下限明确为 `^22.13.0 || >=24.0.0`，与 ESLint 10 / jsdom 的要求一致。CI 继续使用 Node 22、ubuntu-24.04 和既有门禁，仅更新了引用旧 Playwright 版本的 runner 注释。

| 工具 | 原版本 | 最终版本 |
| --- | --- | --- |
| Vite | 5.4.11 | 7.3.7 |
| @vitejs/plugin-react | 4.3.4 | 5.2.0 |
| Vitest / @vitest/mocker | 2.1.8 | 4.1.12 |
| tinypool | 1.1.1 | 新 Vitest 已不依赖，移除 |
| esbuild | 0.21.5 | 0.28.2 |
| Rollup | 4.65.0 | 4.65.0 |
| ESLint | 9.14.0 | 10.14.0 |
| eslint-plugin-react | 7.37.2 | 迁为 eslint-plugin-react-x 5.28.8 |
| typescript-eslint | 8.14.0 | 仅使用其 @typescript-eslint/parser 8.72.1 |
| minimatch（全部路径） | 3.1.5 / 9.0.9 | 11.0.3 |
| Stylelint | 16.10.0 | 17.16.0 |
| TypeScript | 5.6.3 | 5.9.3 |
| jsdom | 25.0.1 | 29.1.1 |
| @netlify/functions | 2.8.2 | 6.0.3 |
| @playwright/test | 1.56.1 | 1.64.1 |
| @axe-core/playwright | 4.10.2 | 4.14.0 |
| @testing-library/react | 16.1.0 | 16.3.3 |
| @types/node | 22.10.2 | 22.20.5 |
| @types/react | 18.3.12 | 18.3.31 |
| @types/react-dom | 18.3.1 | 18.3.7 |

采用 Vite 7 的安全更新与匹配的 React 插件，继续使用 Rollup 和 WP09 的原有 manualChunks；没有改变 lazy import、chunk 限制或 warning 设置。Vite/Vitest 共用配置改从 `vitest/config` 导入 defineConfig。Vitest 4 已取消 `--minWorkers`，本包使用 `--maxWorkers=2`，没有改变测试 timeout。

TypeScript 5.9 把 ArrayBuffer 与 SharedArrayBuffer 的视图类型区分开：archive 下载的 chunks 明确为 `Uint8Array<ArrayBuffer>[]`，实际来源仍是原有 `Uint8Array.from`；生产安全测试同样收紧字节与 reader 的类型。Vitest 的 spyOn 重载变化通过结构化的 `mock.calls` 参数类型兼容。没有改变运行时操作、测试输入或断言；严格后端类型检查通过。

### lint 护栏与 minimatch

ESLint 9.39.5 在 npm 上已标记停止支持；原 React 插件 7.37.5 的 peer 范围仍不包含 ESLint 10，而且依赖 callable 形态的 minimatch 3。最终迁为支持 ESLint 10 的 react-x 插件：`react/jsx-key` 对应的集合 key 检查由 `react-x/no-missing-key` 保留。两条 `no-restricted-syntax` 的 selector、message、严重性以及所有排除路径完全保留；Stylelint 配置未修改。

用独立临时依赖树的原版 ESLint 9.14.0 / React 插件 7.37.2，与最终工具树对照 20 个样例：map 表达式、块 return、条件/逻辑表达式、Array.from、数组和 Fragment 的原有违规均被继续捕获，带 key 与合法 style 均通过；新规则额外捕获原版默认遗漏的 flatMap 与 `<>`。`scripts/lint-guardrails.mjs` 加入 lint:js，持续检查这 20 个样例、4 个原有排除路径和下述 66 个 matcher API 断言。

minimatch advisory 为 [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)，影响 `<11.0.1`。当时 registry 最新 3.x 为 3.1.5、10.x 为 10.2.6，仍在范围内。逐个检查消费者后，只对以下依赖添加明确的 11.0.3 override：

- `eslint@10.14.0 → minimatch@11.0.3`
- `eslint → @eslint/config-array@0.23.5 → minimatch@11.0.3`
- `@typescript-eslint/parser → @typescript-eslint/typescript-estree@8.72.1 → minimatch@11.0.3`

三者使用的都是保留的 `Minimatch` 或 `minimatch` 具名 API；没有把需要旧 callable API 的消费者强行替换。除了全仓库 lint，持久化脚本在每条依赖链上检查 globstar、brace、dot、路径排除和 flipNegate，共 66 次断言。另以 minimatch 10.2.6 与 11.0.3 对照项目的 9 个 glob、12 个路径、4 组选项：432 组函数/构造器结果全部相同。`npm ls --all` 无依赖错误，`npm ls minimatch --all` 仅有这三条 11.0.3 路径。

解除 override 的条件：对应上游直接发布包含已修复 minimatch 的版本后，去掉该条 override，再执行 matcher 对照与全部 lint；没有 audit ignore、legacy-peer-deps 或强制 audit fix。

## 审计与门禁

| 审计 | critical | high | moderate | low | 总计 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 升级前完整 audit | 2 | 1 | 13 | 1 | 17 |
| 升级后完整 audit | 0 | 0 | 0 | 0 | 0 |
| 升级前生产 audit | 0 | 0 | 0 | 0 | 0 |
| 升级后生产 audit | 0 | 0 | 0 | 0 | 0 |

没有漏洞例外。`npm ci` 仍显示生产链 `@netlify/blobs → @netlify/otel → @opentelemetry/sdk-trace-node / sdk-trace-base@2.12.0` 的两条弃用提示；该依赖链原已存在，不是 audit 漏洞，也未用关闭提示来隐藏。生产依赖版本未改动。

环境为 Node **v22.23.4**、系统 Chromium `/usr/bin/chromium`；使用独立 node_modules。命令均通过以下包装在 Node 22 下运行：

```sh
npm exec --yes --package=node@22 -- sh -c 'node --version && npm ...'
```

最终结果：

- `npm ci`：通过，439 个安装包，无 peer 冲突。
- `npm run lint`：通过，包含 Stylelint、ESLint 和新增的护栏验证；无规则、忽略范围或严重性放宽。
- `npm run build`：通过，所有 JS chunk 小于原 500 kB 警告阈值，未隐藏 warning。
- `npm run typecheck:netlify`：通过，保持 strict。
- `npm test -- --maxWorkers=2 --reporter=json --outputFile=/tmp/rr-wp08-unit-final.json`：**56 文件 / 808 测试通过，0 失败、0 跳过**，与基线 808 相同。
- `npm exec playwright test -- --list`：前后均 **440 项 / 27 文件**；两份完整列表逐字节一致，没有删除或修改 e2e 文件与正式配置。
- 下列浏览器矩阵：**44 通过，0 失败、0 skip、0 flaky、0 重试**。
- `git diff --check`：通过。

浏览器使用从正式配置派生、未提交的临时 `playwright.wp08.config.ts`，只改为独立端口 4805/4806、结果目录和 reuseExistingServer=false；原有测试与 webServer timeout 全部保持。CI=1、workers=2、retries=0；选择命令为：

```sh
CI=1 PW_CHROMIUM=/usr/bin/chromium \
PLAYWRIGHT_JSON_OUTPUT_NAME=/tmp/rr-wp08-e2e-final.json npm run e2e -- \
  -c playwright.wp08.config.ts \
  e2e/smoke.spec.ts e2e/production-security.spec.ts e2e/bundle-performance.spec.ts \
  e2e/bundle-organization-setup.spec.ts e2e/organization-setup.spec.ts \
  --grep '(smoke|production-security|bundle-performance|bundle-organization-setup)\.spec\.ts|reads and archives real' \
  --workers=2 --retries=0 --reporter=line,json
```

此矩阵完整运行 smoke、路由安全和两套分包检查，另在 desktop-storage/mobile-storage 读取并归档仓库中的 PDF、Word 和 TXT 虚构示例文件。API 离线模拟，没有真实 AIR；未执行旧 storage 图中依赖 force 的场景。WP05/06 的全页无障碍、字数及其业务回归由阶段主 agent 集成后验证，本包未声称完整 440 项全跑通过。

## 新 Vite 的包体与首屏

| 资源 | 最终字节 | 本地 gzip 字节 |
| --- | ---: | ---: |
| 主入口 index-CixrRcaG.js | 363,606 | 114,889 |
| react-runtime-B_WGhzlv.js | 142,530 | 45,815 |
| 首屏 JS 合计 | **506,136** | **160,704** |

主入口从阶段一的 371,806 字节降至 363,606 字节，仍严格小于原始 500,000 字节断言。桌面和手机的实际初始网络均只请求上述两份 JS，不请求 PhaseOne、OnlineSetup、PDF 实现或 worker。gzip 为最终文件的本地计算值，不代表本地 preview 的传输编码。

Rollup AST 检查确认：入口唯一静态 import 为 react-runtime；runtime 没有 import 或 export-from，没有回引应用的循环。保留可见 loading、唯一 main、polite status、延迟路由的 Axe 检查、直接访问/刷新/Back/Forward，以及只在选 PDF 后加载实现与 worker 的策略。PDF JS 实现为 437.62 kB；worker 仍是独立约 1,264.34 kB 的异步资产，不进入首屏，没有提高门槛或隐藏警告。

本地原始产物为 `/tmp/rr-wp08-{ci,lint-final,build-final,backend-final,unit-final,e2e-final}.log`、完整/生产审计 `audit-after.json` / `audit-prod-after.json`、`unit-final.json`、`e2e-final.json`、`lint-comparison.json`、`bundle-static.json`、前后 Playwright 列表与 `browser-results/` 下网络附件（均使用 `/tmp/rr-wp08-` 前缀）。源提交只包含依赖、必要配置/类型兼容、护栏脚本与本证据，不包含临时配置或运行产物。
