# DX-16 Tasks 看板版面：空列收窄、Done 列可见、卡片悬停

- 阶段 3　大小 M　风险 中　R 级 R2　依赖：DX-01　并行伙伴：DX-15、17～19
- 分支：`design/dx-16-board-layout`　样式文件：`src/styles/dx-16-board-layout.css`　对应细节：D20 D21

## 为什么
**看到**：1440 宽 + 右栏打开时，6 列看板只能看到 5 列，最有成就感的 Done 列被挤出屏幕；"My tasks"下大部分列是空的，下面一大片空白。
**约束**：6 种任务状态与颜色全站统一（`AGENTS.md` 7.6）；每一列都要保留，不能删；每一列的 "+ Add task" 必须可达。

## 要做的事
1. **空列收窄**：卡片数为 0 的列收成约 56px 的窄条（竖排标题 + 数字 0），其余列平分剩下的空间，保证 6 列同时在屏幕里。以下情况自动展开：鼠标拖动中经过（`onDragEnter`）、键盘焦点进入列内、点击窄条的标题按钮。展开收起用 `var(--dur-base)` + `var(--ease-out)` 的 `flex`/`grid` 列宽过渡（只在列宽上做，列内容不动画）。
2. 窄条不是"消失"：它是一个 `<button>`，有 `aria-expanded`、名字里带状态名和 "0 tasks"，Tab 可达。
3. **列最小高度**：`min-height: min(60vh, 520px)`，让拖放目标够大。
4. **卡片悬停**：`.board-card:hover` 边框变 `--accent`（仅 `@media (hover: hover)`），用 `var(--dur-fast)`。
5. 手机（<860px）保持 78vw 横向吸附的布局，**不做**空列收窄（手机上本来就一列一列看）。
6. 不改拖放逻辑（归 DX-24）：`draggable`、`onDragStart`、`onDrop` 不动，收窄的列也必须能接受放下。

## 可以改的文件
`src/pages/Tasks.tsx`（看板那一段）、`src/styles/dx-16-board-layout.css`。**不准碰**：`.board-col > header`（归 DX-21）、拖放事件处理。

## 验收
- `tasks.spec.ts`（里面有 `dragTo`）、`activity-workspace.spec.ts`、`a11y.spec.ts`、`word-budgets.spec.ts`、`touch.spec.ts` 绿。
- 新测试 `e2e/dx-16-board.spec.ts`：1440 宽右栏打开时，6 列都在视口内；把一张卡拖到收窄的空列上能放下并展开；键盘 Tab 到窄条并按 Enter 能展开。
- Juanxi 怎么验：Tasks 页能一眼看到全部 6 列，包括 Done；空列是一条窄条，点一下或拖东西过去会展开。**不喜欢就告诉我，回滚 DX-16。**

## 回滚
R2。DX-21、DX-24、DX-26 依赖它，要先撤。
