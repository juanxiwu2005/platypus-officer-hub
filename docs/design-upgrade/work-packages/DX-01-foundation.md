# DX-01 地基：样式分文件、动效 token、测试端口、截图脚本、样式守卫

- 阶段 0　大小 M　风险 中　R 级 R2　依赖：无　并行伙伴：DX-02
- 分支：`design/dx-01-foundation`　对应细节：D38 D39 D40 D51 D56 D57 D58

## 为什么
后面 25 个包要同时改界面。如果大家都改 `styles.css` 和同一批测试配置，一定冲突；回滚也没法按功能切。这个包什么画面都不改，只把"地基"铺好。**做完以后页面必须逐像素不变。**

## 要做的事
1. **样式分文件**
   - 新建 `src/styles/index.css`，按顺序 `@import` 下面这些文件；新建这些文件，每个只有一行注释头：`dx-00-tokens.css`，以及 `dx-NN-<短名>.css`，NN 和短名取自 `PHASES.md` 的分支名：03 press-feedback、04 touch-targets、05 risk-shapes、06 type-details、07 shell-meta、08 motion-guards、09 rail-motion、10 menu-motion、11 toast-motion、12 touch-hover-sheet、13 details-motion、14 loading-skeleton、15 events-layout、16 board-layout、17 ask-panel、18 empty-states、19 detail-swap、20 mobile-shell、21 board-headers、22 flow-motion、23 glass-topbar、24 board-drag、25 done-moment、26 crm-drag。
   - 在 `src/main.tsx` 里 `./styles.css` 之后加 `import "./styles/index.css"`（这是整个计划里唯一一次改这个文件）。
2. **动效 token**（写在 `dx-00-tokens.css` 的 `:root`，不准写 hex）
   - 时长：`--dur-press: 100ms; --dur-fast: 150ms; --dur-base: 220ms; --dur-slow: 320ms`
   - 曲线：`--ease-out`（进入，快进慢停）、`--ease-in-out`（位移）
   - 弹簧：`--spring-ui`（阻尼 1.0，无回弹，约 0.35 秒到位）、`--spring-pop`（阻尼约 0.8，轻微回弹，约 0.4 秒）。用 CSS `linear(...)` 写，**数值用脚本算出来**（把弹簧公式采样 30–40 个点），脚本放 `scripts/spring-linear.mjs`，并在文件里注释生成参数。不要手编数字。
   - "减少动效"：`@media (prefers-reduced-motion: reduce) { :root { --dur-press: 1ms; --dur-fast: 1ms; --dur-base: 1ms; --dur-slow: 1ms; --spring-ui: linear; --spring-pop: linear } }`
3. **样式检查**
   - `package.json`：`"lint:css": "stylelint \"src/styles.css\" \"src/styles/*.css\""`。
   - `.stylelintrc.json` 加一个 `overrides`，只对 `src/styles/*.css` 生效：禁止 `transition: all`；禁止对 `left|top|right|bottom|width|height|margin|padding` 做 transition；`transition` 和 `animation` 里不准出现裸的毫秒或秒（必须是 `var(--dur-*)`）；`color-no-hex` 照旧生效。
   - 写 3 个"故意违规"的小样本检查守卫真的会红（放 `src/test/` 或 `scripts/` 里的快速测试，不要留在产品样式里）。
4. **测试端口与默认减少动效**
   - `playwright.config.ts`：端口读 `PW_PORT`（默认 4173）、`PW_STORAGE_PORT`（默认 4174）；`webServer` 命令用这两个端口；`use.reducedMotion` 默认 `"reduce"`。
   - `package.json` 的 `preview` 脚本端口读 `PW_PORT`，默认 4173，保持 `--strictPort`。
   - `scripts/word-count.mjs` 的端口读 `WORDS_PORT`，默认 4177。
   - 不设环境变量时，行为和以前完全一样（CI 不受影响）。
5. **截图脚本** `scripts/dx-shots.mjs`：用法 `node scripts/dx-shots.mjs <标签> <基础网址>`。1440×900 和 390×844（2 倍）× 浅色 / 深色 × `/`、`/events`、`/tasks`、`/team`、`/rules`、`/partners`、`/handoff`、`/settings`，另外加"右栏关着"和"右栏开着"。输出到 `dx-shots/<标签>/`。把 `dx-shots/` 加进 `.gitignore`。支持 `PW_CHROMIUM`。动画一律关闭（`reducedMotion: "reduce"`）。
6. **回滚登记**：`ROLLBACK_LOG.md` 已有，不用建。打基线标签 `dx/baseline`（指向开始时 `design/ux-upgrade` 的位置）。

## 可以改的文件
`package.json`、`playwright.config.ts`、`.stylelintrc.json`、`.gitignore`、`scripts/word-count.mjs`、`scripts/dx-shots.mjs`（新）、`scripts/spring-linear.mjs`（新）、`src/main.tsx`（只加一行）、`src/styles/*`（新）、`src/test/` 里新增守卫测试。
**不准碰**：`src/styles.css`、任何 `.tsx` 组件。

## 验收
- `npm run check` 全绿；`dx-shots` 在改动前后对比：PNG **字节一致**（有差异要逐个解释，通常是时间戳或随机数据，需要在脚本里固定）。
- 用 `PW_PORT=5101 PW_STORAGE_PORT=5201` 在两个 worktree 里同时跑同一个测试，互不影响（报告里写出验证过程）。
- 3 个故意违规的样本都被样式检查拦住。
- Juanxi 看到的东西：**什么都没变**。这是对的。

## 回滚
R2。撤掉之后样式回到单文件，后面所有包都要一起撤（见依赖表）。

## 注意
- 小文件在 `styles.css` 之后加载，所以同样优先级下它们会覆盖旧规则。引入顺序就是编号顺序。
- `no-duplicate-selectors` 只在单个文件里生效；跨文件的重复选择器靠"文件归属表"人工管。
