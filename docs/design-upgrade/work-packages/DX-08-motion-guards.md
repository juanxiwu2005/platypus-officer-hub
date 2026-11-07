# DX-08 已有动画补"减少动效"保护

- 阶段 1　大小 S　风险 低　R 级 **R1 可用**　依赖：DX-01　并行伙伴：DX-03～07
- 分支：`design/dx-08-motion-guards`　样式文件：`src/styles/dx-08-motion-guards.css`　对应细节：D37

## 为什么
**读到**：`.typing i` 和 `.ai-wait-mark i` 的 `blink` 是无限循环，主样式表里只有 2 处 `prefers-reduced-motion`（`.spin`、`.m-node`）。Apple `accessibility.md › Be cautious with fast-moving and blinking animations`：开了"减少动效"就要减少重复动画。

## 要做的事
1. `@media (prefers-reduced-motion: reduce)`：`.typing i`、`.ai-wait-mark i` 停成静态（`animation: none; opacity: .6`），文字提示 "Platypus is working"（`AskPanel.tsx` 里已有）保持可见。
2. 把这几处旧过渡的时长换成 token（外观几乎不变）：`.switch input`（.15s → `--dur-fast`）、`.board-col`（.12s → `--dur-fast`）。**不要碰** `.hover-card`、`.m-card`（S3 决定）、`.m-node`（归 DX-22）。
3. 新测试 `e2e/dx-08-reduced-motion.spec.ts`：用 `reducedMotion: "reduce"` 遍历 Today、Events、Tasks、Ask 等待状态，`document.getAnimations()` 里不能有 `iterations === Infinity` 的动画；用 `no-preference` 时 `blink` 仍然存在（证明没有误伤）。

## 可以改的文件
`src/styles/dx-08-motion-guards.css`、`e2e/dx-08-reduced-motion.spec.ts`（新）。

## 验收
- 新测试绿；`feel.spec.ts`（悬停卡零延迟）绿。
- Juanxi 怎么验：把电脑设为"减少动态效果"，让 Ask 等待回复，圆点不再闪。

## 回滚
R1 或 R2。
