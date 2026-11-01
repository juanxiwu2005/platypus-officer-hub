# DX-19 详情切换交叉淡入 + 页面淡入

- 阶段 3　大小 S　风险 中　R 级 R2　依赖：DX-01、**DX-09**（它们改同一批文件，必须在 DX-09 之后）　并行伙伴：DX-15～18
- 分支：`design/dx-19-detail-swap`　样式文件：`src/styles/dx-19-detail-swap.css`　对应细节：D14 D15

## 要做的事
1. **右栏详情切换**（`Rail.tsx` 的 `DetailView`）：`key` 变化时，新内容 120ms 淡入（只用透明度）；不做退场、不动布局、不影响滚动位置重置和焦点移动（现有的 `scrollTo` 和 `focus()` 逻辑保持）。
2. **页面淡入**（`Layout.tsx` 的 `<main>`）：路由变化时，`main` 的直接子元素 140ms 淡入。**只做淡入，不做滑动、不做退场**，不能让导航"变慢"（Apple `motion.md`：常用操作不要让人等动画）。
   - 实现方式：用路径作为 `key` 重新挂载，或者给 `main > *` 一个只在路由变化时添加的 class。**不要**对所有 `main > *` 永久写动画（页面内部有条件渲染的卡片出现时也会跟着闪）。
3. 减少动效：两者都不动。
4. 保持：`<main id="main" tabIndex={-1}>`、跳转到主内容的焦点管理、`lastPath` 的右栏收起逻辑。

## 可以改的文件
`src/components/Layout.tsx`、`src/components/rail/Rail.tsx`（仅 `DetailView`）、`src/styles/dx-19-detail-swap.css`。

## 验收
- `smoke`、`today`、`tasks`、`events`、`a11y`、`recovery` 桌面 + 手机绿；任何页面快速连点导航不卡、不闪白。
- 新测试 `e2e/dx-19-swap.spec.ts`：切换导航后新页面内容的 `opacity` 在过渡中、300ms 内到 1；在 Today 里点不同的任务，右栏详情有淡入。
- Juanxi 怎么验：点左侧导航换页，新页面柔和地出现（不是滑动）；点不同任务，右栏内容淡入。

## 回滚
R2。
