# WP05 无障碍与键盘验证

日期：2026-11-01。独立分支：`codex/rr-wp05-a11y`。开始时显式 fetch `refs/heads/integration/v1.0:refs/remotes/origin/integration/v1.0`，HEAD 与远端均为 `1975bc122f5823e033c29493a5d20ce84b85ec23`。未操作 main、未推送、未调用真实 AIR。

## 产品修复与回归

- Owners 的 Escape 只消费当前候选列表；右栏尊重已处理的按键。回归在修改前的生产构建明确失败：输入 `Jordan, Treas`、Enter、Escape 后 `task-form` 消失。修复后检查列表关闭、表单仍在、输入仍有焦点、三位 owner 标签及 `Create 2 tasks` 保留。
- 流程节点的真实按钮尺寸从 20×20 改为 token `--s7`（24×24），保留完整 WCAG 2.2 AA Axe 检查。
- 手机流程布局原先以 `abs(row) * 2 + offset` 折叠桌面泳道，Event Lead 和 Special Event 同时落在 row 10。Axe 实测 Backup 被 Accessibility Check 部分遮挡，只剩 24×10.7px 可点空间。现在手机所有活跃路线使用独立连续泳道；新增全模板布局单测，页面扫描覆盖 setup 所有步骤。
- 流程动作菜单现在真正隔离背景，Tab/Shift+Tab 在菜单内循环；Escape 消费事件并恢复流程节点焦点。手机从菜单打开 Details 时，先释放背景并恢复节点焦点，再交给右栏，保证再次 Escape 回到节点。
- 手机/平板右栏增加显式 Tab 循环，保留背景 inert、Escape 关闭与触发按钮焦点恢复。手机流程编辑的 Enter 直接打开详情；手指 tap 保留动作菜单。
- 切换到另一个页面触发的详情时，更新焦点恢复记录；右栏内部打开的嵌套编辑器仍保留页面触发元素。回归连续从两个流程节点打开详情，Escape 必须回到第二个节点。
- 补审实测只读 Funding 面板：Pixel 7 下 Sam/Jordan 展开 `Pre-submission check` 后，从原生 summary 按一次 Tab 均落到 BODY。11 个 fieldset 子控件匹配 `:disabled`，却没有自身 `disabled` 属性；原候选筛选同时漏掉 summary、纳入这些不可聚焦控件。新增回归在原构建两项均失败。现在纳入原生 summary，以有效 `:disabled`、visibility 及原 hidden/inert/尺寸条件筛选；回归明确检查 summary → Ask 和 Ask → summary，并逐次验证 25 次 Tab + 25 次 Shift+Tab 都留在 rail，Escape 返回 Funding application。
- 无障碍测试迁移到当前 TaskDetail、默认 Board、Events → Budget → Funding application、Settings → Workflow / Tasks。保留并扩展键盘断言：单次完整 Tab 遍历的区域顺序、输入框和 textarea 中 `/` 不抢焦点、Board 从卡片经 Details 的 Done 按钮完成任务。
- 删除 `flow-edit.spec.ts` 原有手机 `target-size` 结果过滤。没有增加 Axe 过滤、禁用规则、skip、force click 或延长 timeout。

对应交互要求：WCAG 2.1.1 键盘可操作、2.1.2 可退出焦点区域、2.4.3 焦点顺序与关闭后恢复、2.5.8 目标尺寸。Axe 自动扫描覆盖 WCAG 2.0/2.1/2.2 A/AA；这不代替人工读屏和完整 WCAG 认证。

## 可复现环境与命令

Node `22.23.4`；独立 `npm ci`；Chromium `/usr/bin/chromium`；本包基线工具 `@axe-core/playwright 4.10.2`（axe-core 4.10.3）、Playwright `1.56.1`。

所有 npm 检查均以 `npm exec --yes --package=node@22 -- sh -c '…'` 执行。临时 Playwright 配置继承仓库原配置，仅选择 desktop/mobile 项目、把 baseURL/preview 改成独占 4505 或 4506 端口、`reuseExistingServer: false`，沿用原 30 秒测试超时；临时文件不提交。

临时配置内容（另一份只把 4506 换为 4505）：

```ts
import config from './playwright.config'
export default {
  ...config,
  use: { ...config.use, baseURL: 'http://localhost:4506' },
  webServer: [{ command: 'npx vite preview --port 4506 --strictPort', url: 'http://localhost:4506', reuseExistingServer: false, timeout: 60000 }],
  projects: config.projects?.filter(p => p.name === 'desktop' || p.name === 'mobile'),
}
```

```sh
npm ci
npm run lint
npm run build
npm test
PW_CHROMIUM=/usr/bin/chromium npx playwright test --config .pw-wp05-regression.config.ts e2e/a11y.spec.ts --workers=2
PW_CHROMIUM=/usr/bin/chromium npx playwright test --config .pw-wp05.config.ts e2e/flow-edit.spec.ts e2e/m2b.spec.ts --workers=2
git diff --check
```

## 验证结果

- `npm ci`、lint、build：通过。
- 首轮产品修复的单元测试：56 个文件、809 项全部通过（含新增手机泳道回归），28.40 秒。只读 Funding 补审修订按阶段主 agent 指示没有重复无关全量单元，最终集成负责复跑。
- 补审修订后 `a11y.spec.ts` desktop/mobile 全量复验：61 通过、3 个原有设备排除，57.5 秒；所有扫描的 WCAG A/AA violation 为 0（包括 serious/critical 与 target-size）。新增 Sam/Jordan × desktop/mobile 四项均使用 412×915 手机实际视口并全部通过。3 个排除仍是 desktop 项目不重复手机专属案例、mobile 项目不重复两个平板专属案例，未新增排除。
- 补审修订后再次执行 Node 22 下的 `npm run lint`、`npm run build`：通过；浏览器复验命令为 `PW_CHROMIUM=/usr/bin/chromium npx playwright test --config .pw-wp05-late.config.ts e2e/a11y.spec.ts --workers=2`，临时配置同上、端口 4505。
- `flow-edit.spec.ts` + `m2b.spec.ts` desktop/mobile：29 通过、3 个原有手机鼠标操作排除，52.4 秒。
- `git diff --check`：通过。

## 集成边界

WP06 同时修改 `MetroChart.tsx` 的 tooltip 按需挂载、focus/hover 描述关联；已直接协调，本包修改菜单、键盘点击、布局与尺寸。集成后须保留两包行为并重跑所有 Axe 与键盘断言。

WP08 将升级 Playwright/Axe；本包没有改 package.json、lock 或工具链配置。最终集成必须使用升级后的工具再次验证，不能把本包旧基线结果当成新工具链结果。字数门禁由 WP06 完成；发布认证与真实 AIR 保留给后续阶段/人工授权。
