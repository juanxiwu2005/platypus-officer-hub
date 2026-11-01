# DX-09 右栏滑入滑出 + Ask 按钮 + 安全区 + `dvh`

- 阶段 2　大小 L　风险 **高**　R 级 R2　依赖：DX-01、DX-02　并行伙伴：DX-10～14
- 分支：`design/dx-09-rail-motion`　样式文件：`src/styles/dx-09-rail-motion.css`　对应细节：D03 D07 D08 D09

## 为什么
**读到**：`Layout.tsx` 里是 `{rail.open && <Rail />}`，直接挂载和卸载；小于 1200px 时它是固定在右侧的浮层，也是"啪"一下出现。这是整个应用里最大的一块会"动"的东西，也是最影响"手感"的一处。Emil §3（可打断）、§7（进出同一条路径）；Apple `motion.md`（"if someone reveals a view by sliding it down from the top, they don't expect to dismiss the view by sliding it to the side"）。

## 要做的事
1. **进出**（`Layout.tsx`、`Rail.tsx`、`RailContext.tsx`）：
   - 关闭时不要立刻卸载：先把 `data-state` 设为 `closing`，等 `transitionend`（兜底：`--dur-base` + 50ms 的定时器）再卸载。减少动效时时长为 1ms，几乎立即卸载。
   - **≤1199px（浮层）**：从右边 `translateX(100%)` 滑到 0，`var(--dur-base)` + `var(--ease-out)`；退场沿同一路径滑回。阴影随之淡入淡出。
   - **≥1200px（并排）**：右栏淡入 + 8px 位移；中间内容列**直接改变宽度**（不做网格列过渡，避免整页每帧重排）。如果实测列宽过渡不卡，可以在报告里提出作为 A/B 方案，由 Juanxi 选；默认用直接改变宽度。
   - **可打断**：打开过程中再点关闭，要从当前位置反向，不要先播完。用 CSS 过渡切换 `data-state` 自然就能做到；不要用 `@keyframes`。
2. **Ask 圆按钮 `.ask-fab`**：关闭右栏时淡入 + 轻微放大；打开右栏时淡出。加 `:active` 缩小。底部位置改成 `calc(18px + env(safe-area-inset-bottom))`。
3. **`100vh` 改 `100dvh`**：`.rail` 的高度（`calc(100vh - var(--topbar-h) - 28px)`）。
4. **保持不变的行为（高风险点，逐条回归）**：
   - 小于 1200px 时的焦点处理：打开时焦点进右栏、关闭时回到打开它的按钮；Tab 陷阱；Escape 关闭；页面背景 `inert`；点页面外面关闭（平板）。
   - **关闭一开始就要解除背景的 `inert`**，不要等动画结束，否则退场的 200ms 里页面点不动。
   - `data-testid="rail"`、`tab-ask`、`tab-details`、`ask-toggle`、`.ask-fab` 不变。

## 可以改的文件
`src/components/Layout.tsx`、`src/components/rail/Rail.tsx`、`src/components/rail/RailContext.tsx`、`src/styles/dx-09-rail-motion.css`。
`.ask-fab`、`.rail`、`.rail-*` 的样式**只**归这个包。

## 验收
- 完整回归：`smoke`、`today`、`tasks`、`events`、`touch`、`a11y`、`m2b`、`feel`、`bts`、`recovery` 在桌面 + 手机项目全绿，**包括那些关心右栏是否可见的断言**（在默认减少动效模式下行为必须和以前一致）。
- 新测试 `e2e/dx-09-rail.spec.ts`（`reducedMotion: "no-preference"`）：① 打开后 `.rail` 的 `transform` 在过渡中间值不是 `none` 也不是终点值；② 打开中途点关闭，最终卸载且没有残留的 `inert`；③ 平板宽度下关闭的过程中点页面也能响应；④ 减少动效时直接出现。
- Juanxi 怎么验：电脑上点右上角 "Ask Platypus"，右栏平滑出现；窄窗口或手机上，圆形按钮点开后面板从右边滑入，点 ✕ 滑回去。

## 回滚
R2：`git revert -m 1 dx/dx-09-merged`。DX-19、DX-20 依赖它，要先撤它们。

## 注意
- 这是整个计划里最容易出问题的包。如果实现里发现必须改很多测试才能通过，**停下来**，把原因写进报告交给整合人，不要硬改测试。
