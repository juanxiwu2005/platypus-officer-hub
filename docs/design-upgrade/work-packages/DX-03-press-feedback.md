# DX-03 按下反馈与悬停过渡

- 阶段 1　大小 S　风险 低　R 级 **R1 可用**　依赖：DX-01　并行伙伴：DX-04…08
- 分支：`design/dx-03-press-feedback`　样式文件：`src/styles/dx-03-press-feedback.css`　对应细节：D01 D02

## 为什么
**量到**：按钮、导航、卡片的 transition 都是 `all 0s`，样式表里没有 `:active`。按下去没有任何反馈，界面显得"不跟手"。Emil §1：按下的那一刻就要有反应，不要等松手。

## 要做的事
1. 用 `:active` 做按下反馈（`transition: transform var(--dur-press) var(--ease-out)`）：
   - 有背景的按钮类：`.btn`、`.chip`、`.icon-btn`、`.demo-pill`、`.seg button`、`.crm-seg button`、`.rail-tabs [role="tab"]`、`.settings-nav button`、`.event-nav button`、`.board-add-btn`、`.relay`、`.owner-chip button`：`transform: scale(.97)`。
   - 文字型：`.row-btn`、`.link`、`.group-btn`：用 `opacity: .7`，不缩放（缩放文字行很怪）。
   - `.sidenav a`：按下只变背景（它是高频操作，不加位移）。
   - 禁用的元素（`[disabled]`、`aria-disabled="true"`）不响应。
2. 悬停过渡：`.btn`、`.sidenav a`、`.event-nav button`、`.settings-nav button`、`.crm-seg button`、`.tbl .row-btn` 的背景/颜色用 `var(--dur-fast)` 过渡，全部包在 `@media (hover: hover)` 里。
3. 减少动效：`@media (prefers-reduced-motion: reduce)` 里去掉 `transform`，保留颜色变化。
4. **不要碰** `.ask-fab`（归 DX-09）、`.board-card`（归 DX-16/24）、`.hover-card`（S3 决定）。

## 可以改的文件
只有 `src/styles/dx-03-press-feedback.css`。

## 验收
- 新测试 `e2e/dx-03-press.spec.ts`：`mouse.down()` 之后（不松手）读取 `.btn` 的计算样式，`transform` 不为 `none`；松手后回到 `none`。减少动效模式下 `transform` 始终为 `none`。
- 桌面和手机：`today.spec.ts`、`tasks.spec.ts`、`touch.spec.ts`、`a11y.spec.ts` 绿。
- Juanxi 怎么验：在预览里按住任何一个按钮不放，会轻轻缩小一下；松手回弹。导航栏点击时不会缩，只是背景变深。

## 回滚
R1：注释掉 `src/styles/index.css` 里 DX-03 那一行。R2：`git revert -m 1 dx/dx-03-merged`。

## 注意
- 缩放用在 `inline-flex` 且 `overflow: hidden` 的元素上可能裁切阴影；逐个看。
- 不要写 `transition: all`（守卫会拦）。
