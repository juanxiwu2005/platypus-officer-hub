# DX-25 完成时刻：进度链生长、圆点弹一下、环形进度、角标

- 阶段 5　大小 M　风险 中　R 级 R2　依赖：DX-02、DX-05　并行伙伴：DX-23、24
- 分支：`design/dx-25-done-moment`　样式文件：`src/styles/dx-25-done-moment.css`　对应细节：D27 D48 D49 D50

## 为什么
整个计划里**唯一一处"惊喜"**：把任务标为 Done 的那一刻。Apple Delight 原则："The result of getting the other seven right, not confetti tacked on top"。Emil §4：用户主动做出的动作，可以带一点回弹（阻尼约 0.8）。

## 要做的事
1. **`Chain`（进度链）**（`ui/index.tsx` 的 `Chain` 函数）：
   - 某一站在**本次会话里**从非完成变成完成时：它左边的连线从左向右"长出来"（`transform: scaleX(0→1)`，原点在左，`var(--dur-base)`），圆点用 `--spring-pop` 弹一下（`scale 1→1.2→1`）。
   - **页面刚加载、路由切换、重新挂载时一律不播放**（用"上一次的状态"的 ref 判断，只比较同一个实例里的前后变化）。
   - 同时给"有风险"的圆点加形状标记（一个小感叹号，用 SVG，不加文字），修复进度链里风险点只靠红圈的问题。
2. **`Ring`**：`stroke-dasharray` 在**数值变化时**过渡 400ms，第一次渲染不动。
3. **导航角标**（`chrome/SideNav.tsx` 里 Tasks 的未读数）：数字变化时轻轻弹一下（120ms）。
4. 减少动效：只有颜色变化，没有位移、缩放、生长。
5. 不做彩带、不做声音、不做震动、不循环。
6. 看板卡片落到 Done 列时的高亮**不在这个包里**（Tasks.tsx 归 DX-24），列在报告里作为后续建议。

## 可以改的文件
`src/components/ui/index.tsx`（仅 `Chain`、`Ring`）、`src/components/chrome/SideNav.tsx`、`src/styles/dx-25-done-moment.css`。

## 验收
- `today.spec.ts`、`events.spec.ts`、`tasks.spec.ts`、`wp5.spec.ts`、`touch.spec.ts`、`a11y.spec.ts` 桌面 + 手机绿。
- 新测试 `e2e/dx-25-done.spec.ts`：① 刚加载页面时 `document.getAnimations()` 里没有这些动画；② 把一个任务标为 Done 之后，Today 里对应进度链那一段出现动画；③ 减少动效时没有。
- Juanxi 怎么验：Tasks 里把一个任务标为 Done，回到 Today，那一站的线向前"长"一段、圆点弹一下；刷新页面时不会重播。

## 回滚
R2。
