# 阶段、工作包与依赖

大小：S = 半天以内，M = 约一天，L = 一天以上。风险：低 / 中 / 高。
"R 级"见 `README.md` 的回滚表：**R1** = 纯样式，可以注释一行 `@import` 立刻关掉；**R2** = 必须用 `git revert`。所有工作包都支持 R2。

## 总览

| 阶段 | 主题 | 包 | 能同时开几个 worktree |
| --- | --- | --- | --- |
| **0** | 地基（先做，做完才能并行）| DX-01、DX-02 | 2 |
| **1** | 手感：按下反馈、触屏、字体、保护 | DX-03 … DX-08 | 6 |
| **2** | 空间感：右栏、菜单、提示条、折叠、加载 | DX-09 … DX-14 | 6 |
| **3** | 版面：Events、Tasks、Ask、空状态、详情切换 | DX-15 … DX-19 | 5 |
| **4** | 手机外壳、列头、流程图动效 | DX-20 … DX-22 | 3 |
| **5** | 材质、拖拽、完成时刻 | DX-23 … DX-25 | 3 |
| **6** | 收尾：Partners 拖拽、文档与合并样式 | DX-26、DX-27（先 26 再 27）| 1 + 1 |

**阶段之间是串行的**：上一阶段合并、整合验收、Juanxi 点头，才开下一阶段。**阶段内是并行的**：同一阶段的包彼此不改同一个文件。

## 全部工作包

| 包 | 名称 | 阶段 | 大小 | 风险 | R 级 | 依赖（必须先合并）|
| --- | --- | --- | --- | --- | --- | --- |
| DX-01 | 地基：样式分文件、动效 token、测试端口、截图脚本、样式守卫 | 0 | M | 中 | R2 | — |
| DX-02 | 把 `Layout.tsx` 拆成独立文件（纯搬家）| 0 | M | 中 | R2 | — |
| DX-03 | 按下反馈与悬停过渡 | 1 | S | 低 | R1 | DX-01 |
| DX-04 | 触屏点击区 ≥44px | 1 | S | 低 | R1 | DX-01 |
| DX-05 | 风险点加形状（不再只靠颜色）| 1 | S | 低 | R2 | DX-01 |
| DX-06 | 字体细节：字距、等宽数字、手机小字、折行 | 1 | S | 低 | R1 | DX-01 |
| DX-07 | 页面元信息、点击高亮、滚动穿透 | 1 | S | 低 | R2 | DX-01、DX-03 |
| DX-08 | 已有动画补"减少动效"保护 | 1 | S | 低 | R1 | DX-01 |
| DX-09 | 右栏滑入滑出 + Ask 按钮 + 安全区 + `dvh` | 2 | L | 高 | R2 | DX-01、DX-02 |
| DX-10 | 菜单进出（Demo 菜单、铃铛）| 2 | S | 低 | R2 | DX-01、DX-02 |
| DX-11 | Toast 进出 | 2 | S | 低 | R2 | DX-01、DX-02 |
| DX-12 | 手机悬停卡底部弹层动画 | 2 | S | 低 | R1 | DX-01 |
| DX-13 | 折叠区展开动画 | 2 | S | 低 | R1 | DX-01 |
| DX-14 | 加载骨架 + 延迟显示 | 2 | S | 低 | R2 | DX-01 |
| DX-15 | Events 版面：列表收窄、边缘提示、留白审计 | 3 | M | 中 | R2 | DX-01 |
| DX-16 | Tasks 看板版面：空列收窄、Done 列可见、卡片悬停 | 3 | M | 中 | R2 | DX-01 |
| DX-17 | Ask 面板：空状态居中、新消息进入 | 3 | S | 低 | R2 | DX-01 |
| DX-18 | 空状态文案与下一步（除 Tasks、Events）| 3 | S | 低 | R2 | DX-01 |
| DX-19 | 详情切换交叉淡入 + 页面淡入 | 3 | S | 中 | R2 | DX-01、DX-09 |
| DX-20 | 手机顶栏瘦身（20a）+ 底部导航（20b，需批准）| 4 | L | 高 | R2 | DX-02、DX-09、DX-10 |
| DX-21 | 看板列头减饱和 | 4 | S | 中 | R1 | DX-16 |
| DX-22 | 流程图节点改 `transform` + 弹簧落位 | 4 | M | 中 | R2 | DX-01 |
| DX-23 | 半透明顶栏 + 阴影层级 token | 5 | M | 中 | R1 | DX-01、DX-02；若合并了 20b 则含底栏 |
| DX-24 | 看板指针拖拽 + 让位 + 弹簧 + 键盘 | 5 | L | 高 | R2 | DX-16 |
| DX-25 | 完成时刻：进度链生长、圆点弹一下、环形进度、角标 | 5 | M | 中 | R2 | DX-02、DX-05 |
| DX-26 | Partners 看板拖拽（沿用 DX-24 的工具）| 6 | M | 中 | R2 | DX-24 |
| DX-27 | 文档收口 + 样式守卫补全 + 合并小样式文件（需批准）| 6 | M | 低 | R2 | 全部 |

## 回滚顺序表（撤一个之前，先撤依赖它的）

| 要撤 | 要先撤（如果已合并）|
| --- | --- |
| DX-01 | 所有其他包（它是地基。一般不撤；真要撤等于整套撤）|
| DX-02 | DX-09、10、11、20、23、25 |
| DX-05 | DX-25 |
| DX-09 | DX-19、DX-20 |
| DX-10 | DX-20 |
| DX-16 | DX-21、DX-24、DX-26 |
| DX-24 | DX-26 |
| DX-20 | DX-23（如果它包含了底栏的部分）|
| 其余 | 无 |

## 文件归属表（并行时谁能改什么）

一个文件在同一阶段里只归**一个**包。表里没列的文件，不要碰。

| 文件 / 选择器 | 归谁 | 说明 |
| --- | --- | --- |
| `src/styles.css`、`src/styles/index.css` | **没人**（DX-01 只改 `index.css` 一次）| DX-27 才可能合并 |
| `package.json`、`playwright.config.ts`、`.stylelintrc.json`、`scripts/word-count.mjs` | DX-01 | |
| `src/main.tsx` | DX-01 | 只加一行引入 |
| `src/components/Layout.tsx` | DX-02（拆分）→ DX-09（右栏、按钮）→ DX-19（页面淡入）→ DX-20（手机外壳）| 按阶段串行 |
| `src/components/chrome/TopBar.tsx` | DX-02 → DX-20 → DX-23 | |
| `src/components/chrome/SideNav.tsx` | DX-02 → DX-20 → DX-25 | |
| `src/components/chrome/DemoMenu.tsx`、`Bell.tsx` | DX-02 → DX-10 → DX-20 | |
| `src/components/chrome/Toast.tsx` | DX-02 → DX-11 | |
| `src/components/rail/Rail.tsx`、`RailContext.tsx` | DX-09 → DX-19 | |
| `src/components/rail/AskPanel.tsx` | DX-17 | |
| `src/components/ui/index.tsx` | `RiskDot`：DX-05；`Hover`：DX-12（默认不改它；真需要时先写进报告）；`Chain`、`Ring`：DX-25 | 不同阶段，不同函数 |
| `src/components/RouteLoading.tsx` | DX-14 | |
| `src/components/flow/MetroChart.tsx`、`metro.ts` | DX-22 | |
| `src/pages/Events.tsx` | DX-15 | |
| `src/pages/Tasks.tsx` | DX-16 → DX-24 | 看板部分 |
| `src/pages/Today.tsx`、`Team.tsx`、`Funding.tsx`、`Handoff.tsx`、`Rules.tsx`、`Settings.tsx` | DX-18（只改空状态那几行）| |
| `src/pages/Partners.tsx` | DX-18（空状态）→ DX-26（拖拽）| |
| `src/lib/dragSort.ts`（新）| DX-24 | DX-26 复用，不改它 |
| `index.html` | DX-07 | |
| `.ask-fab`、`.rail`、`.rail-*` 选择器 | DX-09 | 其他包不要给它们写样式 |
| `.menu`、`.menu-wrap`、`.badge`（铃铛）| DX-10（动效）；DX-23 只写阴影 | 属性不重叠 |
| `.toast` | DX-11 | |
| `.hover-card`（桌面）| **没人**（S3 决定零延迟）| 只有 DX-12 的 `(hover: none)` 部分 |
| `.board-col`、`.board-card`、`.board` | DX-16（布局、悬停）；DX-21（列头 `> header`）；DX-24（拖动状态）| |
| `.m-node`、`.m-gap`、`.m-ghost`、`.metro` | DX-22 | |
| `.topbar` | DX-20（尺寸）；DX-23（背景、模糊、底线）| 属性不重叠 |

## 每个阶段的启动方式

### 阶段开始前（整合人做，一次）

```bash
git fetch origin
git switch design/ux-upgrade && git pull
git merge origin/main               # main 经常有新提交，每个阶段开始前合一次（用 merge，不用 rebase）
npm ci && npm run check             # 起点必须全绿；不绿就先停下来告诉 Juanxi
git tag dx/phase-N-before
git push origin design/ux-upgrade --tags
node scripts/dx-shots.mjs before-pN http://localhost:<端口>   # 阶段 0 之后才有这个脚本
```

然后给本阶段每个包各开一个 worktree（命令见 `README.md`），分别发"启动口令"。

### 对整合 agent 的口令（每阶段一份）

```
你是整合人。阶段 N。读 AGENTS.md、docs/design-upgrade/README.md、docs/design-upgrade/PHASES.md。
1. 确认 design/ux-upgrade 已合并 origin/main，npm run check 全绿，打好 dx/phase-N-before。
2. 给本阶段每个工作包开 worktree（分支 design/dx-NN-<短名>，端口各不相同），
   并行启动执行 agent（口令模板在 README.md）。
3. 等它们都推送了自己的分支和 reports/DX-NN.md。逐个审阅 diff：只动了"可以改的文件"吗？
   有没有削弱测试？有没有写裸毫秒或裸颜色？不合格的退回，不要自己默默改。
4. 按编号从小到大 --no-ff 合并，每合并一个就打 dx/dx-NN-merged 标签，登记 ROLLBACK_LOG.md。
5. 阶段末跑一次完整 npm run check（Node 22），再跑 dx-shots（after）。有红的：用 dx/dx-NN-merged 标签二分，
   找出是哪个包，用 R2 撤掉它，告诉 Juanxi。不要修一个"顺手"的东西把红盖住。
6. 在 docs/PROGRESS.md 写一条阶段交接：做了什么、预览网址和要点哪里、已知问题、每个包的回滚方式。
   写"需要同步本地备份"。推送 design/ux-upgrade。不开 PR（Juanxi 要预览时会说）。不碰 main。
7. 停下，等 Juanxi 验收。
```

### 预览网址

需要在 Netlify 上看效果时，Juanxi 对 session 说"开一个 Draft PR 做预览"。标题写「[预览·请勿合并]」，base 是 `main`（和 PR #8 一样的做法）。之后每次推送 `design/ux-upgrade`，同一个预览网址会自动更新。**不要删除或改名这个分支**，否则预览编号会作废（`AGENTS.md` 第 8.2 节）。
