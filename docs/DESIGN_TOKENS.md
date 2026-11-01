# Platypus 设计 token

**改任何界面之前先读这份文档。新样式只能用 token，不准在 CSS 里写死数值。** 所有 token 都定义在 `src/styles.css` 的 `:root`（浅色）和两段深色主题里；6 个状态色例外，在 `src/components/ui/statusDefaults.ts`。

本文所有数值都是 2026-10-29 从这两个文件里实际读出来的；对比度数字是用 WCAG 公式脚本算的（N5 的"改前改后"来自 `docs/PROGRESS.md` 里 N5 的交接记录）。文字达标线 4.5:1，图形（圆点、线、色条）达标线 3:1。

---

## 1. 字号 `--fs-*`

| token | 值 | 什么时候用 |
| --- | --- | --- |
| `--fs-xs` | 12px | 最小的辅助字：标签、徽标、角注 |
| `--fs-sm` | 13px | 表格、次要信息、小按钮 |
| `--fs-md` | 14px | 常规正文、输入框（AGENTS.md §7.4：字号不小于 14px 是目标，12–13 只给辅助字）|
| `--fs-base` | 15px | 页面基础字号 |
| `--fs-lg` | 18px | 小标题 |
| `--fs-xl` | 21px | 区块标题 |
| `--fs-2xl` | 26px | 大数字、强调 |

页面大标题 `h1` 用固定的 `var(--fs-2xl)`（26px），手机上 `.page-head h1` 用 `var(--fs-xl)`；**不再随屏幕宽度连续变化**（文档以前写的 `clamp(26px, 3.2vw, 34px)` 早已不是代码里的样子，DX-27 按代码改正文档；想要 clamp 版本需要 Juanxi 另行决定）。`font:` 简写里的字号（`body` 的 `15px/1.55`、`.board-col > header h2` 的 `600 13.5px/1.3`）没有换成 token，是已知的例外。

## 2. 圆角 `--r-*`

| token | 值 | 用在什么元素上 |
| --- | --- | --- |
| `--r-xs` | 4px | 很小的块：甘特条、对话气泡的尖角、小标签 |
| `--r-sm` | 8px | 输入框、小标签、色块、菜单项、焦点框 |
| `--r-md` | 12px | 按钮、导航项、卡片（任务卡、看板卡、悬停卡、流程图卡）、提示条 |
| `--r-lg` | 14px | 最大的面板；等同旧变量 `--radius`（保留，别删）|
| `--r-pill` | 999px | 药丸形状 |
| `--r-circle` | 50% | 正圆（圆点、头像）|

`0` 不用 token，直接写 `0`。

## 3. 层级 `--z-*`（数字越大越靠前）

从低到高：

| token | 值 | 说明 |
| --- | --- | --- |
| `--z-base` | 0 | 基底 |
| `--z-raised` | 1 | 抬起一点 |
| `--z-sticky` | 2 | 吸顶 |
| `--z-sticky-hi` | 3 | 更高的吸顶 |
| `--z-local` | 4 | 局部覆盖（如甘特表头）|
| `--z-dropdown` | 5 | 表单里的下拉建议框（`.owner-suggest`，M2b 的负责人选择）。**新加的理由：** 它原来写死 `z-index: 5`，现有 token 里没有语义最接近的（`--z-local` 4 是表头吸顶，`--z-topbar` 20 太高），改成 4 会和它同层、改成 20 会盖过不该盖的东西，所以按原值 5 单独加一档，外观不变 |
| `--z-topbar` | 20 | 顶栏 |
| `--z-overlay` | 40 | 浮层 |
| `--z-fab` | 45 | 悬浮按钮（Ask）|
| `--z-toast` | 50 | 吐司提示 |
| `--z-rail` | 55 | 右栏 |
| `--z-menu` | 60 | 菜单 |
| `--z-tip` | 70 | 悬停卡（最高）|

## 4. 间距 `--s*`

| token | 值 | token | 值 |
| --- | --- | --- | --- |
| `--s1` | 2px | `--s5` | 12px |
| `--s2` | 4px | `--s6` | 16px |
| `--s3` | 6px | `--s7` | 24px |
| `--s4` | 8px | | |

**这不是理想的 4px 栅格。** 这 7 档是从界面里已经最常用的数值归纳出来的，保持现有外观比栅格整齐更重要。新样式用这些 token；旧规则没有强制迁移（还有 10px、14px、20px、28px 等偶数值留在老规则里）。

## 5. 颜色

### 5.1 品牌与语义色（浅色 → 深色）

| token | 浅色 | 深色 | 说明 |
| --- | --- | --- | --- |
| `--bg` | #fbfaf7 | #0f1312 | 页面底色 |
| `--surface` | #ffffff | #171c1b | 卡片底色 |
| `--surface-2` | #f3f1ec | #1d2322 | 次级底色 |
| `--lane` | #f6f4ef | #141918 | 泳道/轨道底 |
| `--ink` | #1b1f1d | #eceeed | 正文字 |
| `--muted` | #5b625e | #a2aaa6 | 次要文字 |
| `--line` | #e5e2da | #2a312f | 1px 边框（故意很淡，**不要加深**）|
| `--accent` | #0f766e | #3fb8a8 | 品牌色 |
| `--accent-ink` | #0b5a54 | #7fd6ca | 品牌色文字 |
| `--accent-soft` | #e4f1ef | #14302c | 品牌浅底 |
| `--on-accent` | #ffffff | #06201d | 压在品牌色上的字 |
| `--warn` / `--warn-soft` | #8f5206 / #fbf0dc | #e7a74a / #33270f | 注意（文字/底）|
| `--late` / `--late-soft` | #b42318 / #fbe7e5 | #f08a80 / #3a1c19 | 迟了/卡住（文字/底）|
| `--good` / `--good-soft` | #197d36 / #e3f4e7 | #6fcf8a / #15301d | 完成（文字/底）|
| `--edge` | #878f8b | #5f6965 | 空心点、虚线头像、甘特竖线的边 |
| `--risk-yellow` | #ba8306 | #e3a008 | 风险黄点、Team 中档条 |
| `--mline-main` | #888e8b | #b9c0bc | 流程图主线未完成段 |
| `--warn-line` | #e8cf9c | 同浅色 | 琥珀色 Demo 小标的边框（S6 新增，原来写死）|
| `--on-solid` | #ffffff | 同浅色 | 压在实心色块上的字：状态色块、角标、看板列头（S6 新增，原来写死 #fff）|
| `--on-dark-warn` | #ffb4ab | 同浅色 | 永远是深色的悬停卡里的警告字（S6 新增）|
| `--info` / `--info-glow` | #3a6fd8 / rgba(58,111,216,.18) | 同浅色 | 时间轴蓝，见 5.3 |

对比度（文字配对，浅色 / 深色）：

| 配对 | 浅色 | 深色 |
| --- | --- | --- |
| `--ink` 配 `--bg` | 15.96 | 16.06 |
| `--muted` 配 `--bg` | 6.00 | 7.87 |
| `--accent` 配 `--bg` | 5.24 | 7.69 |
| `--warn` 配 `--warn-soft` | 5.51 | 6.97 |
| `--late` 配 `--late-soft` | 5.53 | 6.36 |
| `--good` 配 `--good-soft` | 4.56 | 7.45 |
| `--on-accent` 配 `--accent` | 5.47（白）| 7.01 |

图形对比度（N5 改后，取 `--bg`、`--surface`、`--lane` 三种底里最低的；达标线 3:1）：

| 项目 | 浅色改前 → 改后 | 深色（没改）|
| --- | --- | --- |
| `--good` 配 `--good-soft`（文字）| #1a7f37 → #197d36，4.44 → **4.56** | #6fcf8a，7.45 |
| 风险黄 `--risk-yellow` | #e3a008 → #ba8306，2.05 → **3.01** | #e3a008，8.29（配 bg）|
| 流程图主线 `--mline-main` | #b9c0bc → #888e8b，1.69 → **3.04** | #b9c0bc，10.1（配 bg）|
| `--edge` | #9aa39e → #878f8b，2.36 → **3.02** | #5f6965，3.29（配 bg）/ 3.03（配 surface）|

深色主题里黄色和主线故意保留原值：它们在深色底上已经很清楚，加深反而变差。

### 5.2 6 个状态色（不在 styles.css，在 `statusDefaults.ts`）

这是 Settings → Board 里用户可以改名、改色的**默认值**。每个状态色压白字，没有深色版本（它是用户数据，不随主题变）。

| 状态（界面文字）| 默认色 | 白字压在它上面 | 它当文字配 `--bg` | 它当文字配 `--surface` |
| --- | --- | --- | --- | --- |
| Not claimed | #5f6763 | 5.82 | 5.58 | 5.82 |
| To do | #3a6fd8 | 4.72 | 4.53 | 4.72 |
| Working on it | #b25c00 | 4.75 | 4.55 | 4.75 |
| Waiting | #8656cc | 4.98 | 4.77 | 4.98 |
| Stuck | #c0362f | 5.51 | 5.28 | 5.51 |
| Done | #237a42 | 5.34 | 5.11 | 5.34 |

`statusDefaults.ts` 里的 `PALETTE`（用户可选的 10 个颜色）要求每个都保持白字 4.5:1 以上，新增颜色前先算。

### 5.3 重要：`--late/--good/--warn` 和状态色是两套系统，**不要合并**

它们看起来重复（红、绿、橙都有两份，色值还略有不同），其实约束不同：

| | `--late` / `--good` / `--warn` | 6 个状态色 |
| --- | --- | --- |
| 用在哪 | 浅色底上的**文字**，以及边框、浅底 | 色块上压**白字** |
| 深色主题 | **有**独立值（#f08a80、#6fcf8a、#e7a74a）| **没有**，是用户存的数据 |

合并会让深色主题崩：深色 `--late` 是 #f08a80，白字压在它上面只有 **2.43:1**；而状态色没有深色版本，不可能随主题变。理由全文见 `docs/night-tasks/README.md` 的「T4 为什么是任务写错了，不是 Agent 失败」。

同理，**`--info` 蓝不是状态色**。流程图和进度链的 `.now` 圆点来自 `nodeStop()` 算出的图表状态（done / now / todo / risk），由排期和风险推出来；6 个用户状态是多对一压到它上面的，所以不存在对应的状态色，也不要让它跟着 Settings → Board 变。它故意没有深色覆盖值（深浅共用 #3a6fd8：配 `--bg` 4.53，配深色底 3.96，都过图形 3:1）。

> 还有一处未决：`src/pages/Handoff.tsx` 第 61 行内联了 3 个状态色（#237a42 / #3a6fd8 / #5f6763），该不该跟随用户状态色是产品问题，等 Juanxi 决定。

---

## 6. 为什么是这些值

这些档位是**从现有界面里归纳出来的，不是推倒重来**。字号原来有 20 种、圆角 12 种、层级 12 种、奇数间距若干，现在收成少数几档，每一处位移基本在 ±1px 内（圆角有两类 +2px：6px→8px、10px→12px；字号有一处 10px→12px）。目标是让界面**可以被描述和评价**，不是改变它的样子。对比度那一轮（N5）是唯一有意改变外观的，用来让图形和绿色文字达到 WCAG AA。

## 7. 给以后改界面的人

1. **新增样式只能用 token。** 颜色、字号、圆角、层级、间距都一样。
2. **确实需要新值时，先在 `:root` 加 token（并在两段深色主题里决定要不要覆盖），再使用；不要写死。**
3. 加颜色 token 前先算对比度：文字 ≥ 4.5:1，图形 ≥ 3:1，浅色和深色分开算，浅色底三种（`--bg`、`--surface`、`--lane`）都算，取最低。
4. 不要加深 `--line`，不要合并 5.3 里那两套颜色，不要给 `--info` 加状态色含义。
5. **深色模式：** 现在跟随系统（`prefers-color-scheme: dark`）。CSS 已经支持用 `data-theme="light"` / `data-theme="dark"` 强制覆盖，但**界面上还没有切换开关**。加新 token 时两段深色（`@media` 里那段和 `:root[data-theme="dark"]`）要同步改。
6. 改完照 AGENTS.md 跑 `npm run check`。

## 8. 自动护栏（S6，2026-10-29 起）

从现在起这些规则由工具自动检查，`npm run check` 和 GitHub CI 都会跑，违反就红：

| 检查 | 命令 | 拦什么 |
| --- | --- | --- |
| Stylelint | `npm run lint:css`（管 `src/styles.css` 和 `src/styles/*.css`）| `font-size` 只能是 `var(--fs-*)`（外加 `inherit`）；`border-radius` 只能是 `0`、`inherit`、`var(--radius)`、`var(--r-*)`；`z-index` 只能是 `var(--z-*)`；`:root` 三段主题之外**不准写 hex 颜色**；**不准出现重复选择器**；`font:` 简写只放行 3 种（见下）|
| ESLint | `npm run lint:js`（`src/` 下的 ts/tsx）| 行内 `style={{...}}` 只能放 CSS 变量（`--xxx`）和数据算出来的 `left/top/width/height`，其余一律写成 `styles.css` 里的 class |
| 字数 | `npm run words` | 只**报告**每页真实字数（含悬停卡、折叠内容），不会因超限失败，也不会要求删字；上限由 Juanxi 决定后再开 `--enforce` |
| 无障碍 | `e2e/a11y.spec.ts`（桌面+手机）| WCAG 2.0/2.1/2.2 A/AA，含触摸目标 24×24；右栏焦点管理 |

**有意放行的例外（逐条写理由）：**

1. `border-radius: 0`：直角不是"圆角档位"，换成 token 没有意义。
2. （已删除，DX-27）`h1` 的 `clamp` 例外：代码里已经没有这种写法，`.stylelintrc.json` 里的放行规则也一并去掉，以后再写会变红。
3. `font-size: inherit`、`border-radius: inherit`：继承父级，不引入新数值。
4. `font:` 简写只放行 `inherit`、`15px/1.55 var(--sans)`（`body`）、`600 13.5px/1.3 var(--sans)`（`.board-col > header h2`）：这两处简写里有意保留的字号，把它们拆开会改变行高，留待以后统一。
5. `:root` 里的 hex：token 的定义本来就要写颜色值。
6. 间距这次**不强制**用 token（旧规则里还有 10px、14px 等），所以没有间距规则。
7. **不检查** `src/organization/`、`src/phase1/`、`src/workspace/` 的 CSS 和行内样式：它们是另一套较老的代码（CSS 约 4,500 行），以后统一再纳入。

**加新样式时：** 先看 `npm run lint` 红在哪，改成 token 或 class，**不要**用 `stylelint-disable` / `eslint-disable` 绕过；确实要例外，在这里加一条并写理由。

## 9. 动效 token `--dur-*` `--ease-*` `--spring-*`（v1.6 界面与动效升级，DX-01 起）

定义在 `src/styles/dx-00-tokens.css`（只有这个文件可以写具体时间）。**写动效只能引用 token，不准写 `150ms` 这样的数字。**

| token | 值 | 用在哪 |
| --- | --- | --- |
| `--dur-press` | 100ms | 按下去的反馈，要"立刻" |
| `--dur-fast` | 150ms | 悬停变色、小淡入淡出、菜单出现 |
| `--dur-base` | 220ms | 面板、抽屉移入 |
| `--dur-slow` | 320ms | 较大的东西落位 |
| `--ease-out` | `cubic-bezier(.2, .8, .2, 1)` | 出现：开始快、结尾软 |
| `--ease-in-out` | `cubic-bezier(.4, 0, .2, 1)` | 从一处移到另一处 |
| `--spring-ui` + `--spring-ui-dur` | `linear(...)`，450ms | 拖拽卡片落位（`src/lib/dragSort.ts`）、流程图节点换位（DX-22）|
| `--spring-pop` + `--spring-pop-dur` | `linear(...)`，480ms | 步骤变成 Done 时圆点"弹"一下（DX-25）|

- 两条弹簧曲线由 `scripts/spring-linear.mjs` 生成（不要手改数值）。
- **减少动效：** 系统设置里开了"减少动效"（`prefers-reduced-motion: reduce`）时，上面所有时间被改成 `1ms`、弹簧改成 `linear`，所以只引用 token 的动效自动变成"几乎瞬时"。脚本里需要时间的地方用 `src/lib/motion.ts` 的 `tokenMs()`（读 token）和 `prefersReducedMotion()`，不要自己写数字。
- 只动 `transform` 和 `opacity`（DX-08 起，样式检查会拦：`transition: all`、写死的时间、给 `left/top/right/bottom/width/height/margin/padding` 加过渡）。

## 10. 阴影层级 `--elev-1/2/3`（DX-23）

定义在 `src/styles/dx-23-glass-topbar.css`，浅色/深色各一套（深色更重，两段深色同步）：

| token | 浅色 | 用在哪 |
| --- | --- | --- |
| `--elev-1` | `0 1px 2px / .06` + `0 2px 6px / .05` | 最轻的一档。**目前还没有地方用**，先留着（查证：`grep -rn "var(--elev-1" src`）|
| `--elev-2` | `0 4px 12px / .10` + `0 12px 28px / .08` | 菜单（`.menu`、`.m-menu`）、负责人建议框、`.panel`、被拖起的卡片（Tasks、Partners）|
| `--elev-3` | `0 12px 40px / .18` | 吐司 `.toast`；宽度 1199px 以下浮在页面上的右栏 |

新写阴影先选这三档，不够再来这里加，不要在组件里写 `box-shadow: 0 8px ...`。

## 11. 小样式文件的结构和归属（DX-01 起）

- `src/styles.css` 仍是正本；v1.6 的每个工作包把自己的样式写在**自己的小文件** `src/styles/dx-NN-<名字>.css`，由 `src/styles/index.css` 在 `styles.css` 之后按顺序 `@import`（`src/main.tsx` 引入的是 `index.css`）。
- **一个文件只属于一个包**，别的包不能改它。想关掉某个包的样式（R1 快速关闭）：把 `index.css` 里它那行 `@import` 注释掉。
- 小文件和 `styles.css` 一样要通过 `npm run lint:css`（`font-size`/圆角/层级/hex 规则），另外 `dx-01` 以后的文件还多几条：不准 `transition: all`、不准写死时间、不准给布局属性加过渡、**不准 `!important`**；桌面上的 `.hover-card` 不准有任何延迟（`src/test/dxStyleGuard.test.ts` 里有故意违规的样本，证明这些守卫真的会变红）。
- `dx-00-tokens.css` 是例外：它是定义 token 的地方，允许写具体时间。
- 哪个包做了什么、怎么撤销：`docs/design-upgrade/README.md` 和 `docs/design-upgrade/ROLLBACK_LOG.md`。
- 把这些小文件合回 `styles.css` 是 DX-27 的第 3 步，**需要 Juanxi 明确同意**，目前**没有做**；合并之后 R1 快速关闭就不能用了。
