# Settings → Workflow 编辑器重新设计

2026-11-19（America/Phoenix），Claude（主会话 + 三个 worktree Agent：A 画布、B 页面框架和右侧面板、C 页面测试）。沿用 PR #14 / preview14，不合并 `main`，schema 23 不变，0 次真实 AI，0 封邮件。

## 用户决定

1. 先只改 Settings → Workflow；Juanxi 确认满意后，再把新排版移植到 Plan 活动图。
2. 这一轮只做浅色；深色只用 token，没有验收。
3. 这一轮就做批量分配（Select steps → Assign N steps）。

## 改之前的问题

- 每个团队每 4 个步骤就折行，蛇形往返；标准 46 步模板挤成左边一根高柱子，右边空着，主线和 Start 跑出首屏。
- 团队名是表单下拉框，三个 Operations 看不出区别，没有步骤数，底色太淡。
- 两行 13 个同样大小的按钮，模板动作和画布动作混在一起。
- 模板选择器看不出哪个是 Platypus 预设、哪个是本社团的、哪个是默认。
- 步骤名从单词中间断开（Accessibili ty、Attendanc e）。
- 没有 Plan / Prepare / Event day / Close 的时间方位。
- 内容区限宽 1180px。

## 交付

**模板层（页面头部）**
- `Saved workflow` 分成 `Platypus preset` 和 `Your organization` 两组，旁边有 Preset / Default / Draft / Version N 标签。
- `New workflow ▾`：Blank workflow / Copy of preset。
- 大号名称输入框 + 自动保存状态；`Save draft`、唯一主按钮 `Save version`、`More ▾`（Duplicate workflow / Use by default / Apply role teams / Teams）。
- Workflow 这一页内容区放宽到 1600px。

**画布工具栏**
- 左：`Undo`｜`Flow | Quick entry`｜`1-day | 2-day`。
- 右：`Select steps`、`+ Task`（主按钮）、`Add ▾`（Team branch / Full check / Event day）、缩放 `− 85% + Fit`。
- `Connect` 搬到任务 Details 里，叫 `Connect on canvas`。

**画布（新文件 `laneLayout.ts`、`lane-editor.css`，类名 `wfx-`）**
- 每个团队一行；超过 10 个步骤才折行。标准模板最长一行 8 个，不折行。
- 每一行放到“总高度增长最少”的一边，能复用空行就复用，主线保持在中间。
- 顶部固定的时间段标题：Plan → Prepare → Event day → Close。
- 团队卡片左上角是标签按钮 “Operations · 7 steps”，右边一个 `+`；6 种固定团队颜色。
- 步骤名两行截断，不再从单词中间断开；完整名字在提示和读屏名称里。
- 图例：Core step / Conditional step / Team area / Event day。
- 打开时默认 85%（不够宽就在画布里左右滚动）；`Fit` 看全图。

**右侧 Team assignment 面板（点团队标签打开）**
- 标题 “Finance path” + 步骤数；Team 下拉；Team roster（映射到这个团队的岗位的现任干部名字，只在页面上显示）；Starts at / Joins at。
- `+ Select steps` → 在画布上点选步骤 → `Assign N steps`，一次 Undo 撤回整批；Escape 退出。
- Description（新的可选字段 `details`，最多 400 字）；`Delete team branch`（有步骤时不能删）。

**数据**
- 团队分支多了可选字段 `details`；旧数据没有这个字段也能正常读写。
- 新命令 `moveMilestoneTasks`：批量移动，真实任务 ID、条件、岗位、工期都不变。

## Plan 没有变

`src/components/flow/`、`milestoneLayout.ts`、`milestoneLayout.test.ts`、`milestone-editor.css` 和 `4d6290e` 相比没有任何改动；Plan 继续用旧排版。

## 验证

- 单元/组件：相关 15 个文件 139 项全过；全套 2051 项中 2049 过，失败的 `calibration.test.ts`（超时）和 `uiLog.test.tsx` 在 `4d6290e` 上同样失败。
- lint（含样式守卫）、前后端类型、生产 build 通过；入口 498,36x / 550,000 字节，没有变（Workflow 是懒加载）。
- 页面测试（Playwright，桌面 + 手机）：Settings 工作流相关 11 个文件，桌面 52 过，手机 51 过 + 1 个原有的仅桌面跳过；其中新增 `e2e/workflow-settings-layout.spec.ts` 5 项（每个团队一行、时间段顺序、步骤名不断词、批量分配 + 一次 Undo 复原、菜单与焦点、手机无横向溢出、axe 严重/关键 0）。
- Plan 那一侧的 10 个页面测试文件：169 过、15 跳过、18 失败；在 `4d6290e` 上跑同样的文件，同样 17 项失败；多出的 `a11y.spec.ts:286`（手机）在两边都是 3 次里只过 1 次（不稳定的旧测试）。所以这次没有让 Plan 变坏，但这些旧失败需要以后另外处理。
- 截图：`docs/prototypes/workflow-settings-redesign/`（改前 `before-desktop.png`；改后 `desktop-default.png`、`desktop-fit.png`、`desktop-team-assignment.png`、`mobile-default.png`）。

**测试改写说明（Agent C）：** 按新界面改了找按钮的方式，没有删除或跳过任何行为检查。另外有几项测试检查的界面在这次之前就已经没有了（Details 第一项是 Task name；Settings 画布不再画依赖箭头；Remove prerequisite 不再禁用，而是点了以后被 ASU 规则拒绝；条件分支对话框只在 Plan 的 Edit flow 里），这些测试改成检查现在真实的行为；三项条件分支测试移到了 Plan 的 `e-speaker` 活动上。

## 怎么验收

1. 打开 preview14 → Settings → Workflow（模板 Speaker series）。
2. 看整体：每个团队一行，主线在中间，顶部有 Plan / Prepare / Event day / Close；点 `Fit` 看全图。
3. 点 Finance 的标签 → 右边出现 Finance path、成员名字。
4. 点 `+ Select steps`，在图上点 3 个别的团队的步骤 → `Assign 3 steps` → 这 3 个步骤移到 Finance 行。
5. 点 `Undo` → 3 个步骤回到原来的位置。
6. 打开 `More` 和 `Add` 两个菜单，看按钮是否找得到。

## 没做 / 已知限制

- Plan 活动图还是旧排版；等 Juanxi 确认后移植。
- 深色没有验收。
- 批量分配如果违反学校规则（例如 R06：Food Exception Permit 要等 Budget），会被拒绝，错误显示在画布上方，但右侧面板里的 “N steps selected” 没有提示原因。
- 打开预设模板约 0.5 秒后会自动存一份 Draft（原有行为）。
- 1440 宽的屏幕上，标准模板在 85% 时要左右滚动；`Fit` 时可以看全图，但字比较小。
- 两个单元测试（`calibration.test.ts` 超时、`uiLog.test.tsx`）在改动之前的 `4d6290e` 上就失败，和这次无关。
- 这次没有连到 Juanxi 的电脑，**需要同步本地备份**。
