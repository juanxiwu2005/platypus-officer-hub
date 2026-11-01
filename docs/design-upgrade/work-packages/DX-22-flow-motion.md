# DX-22 流程图节点改 `transform` + 弹簧落位

- 阶段 4　大小 M　风险 中　R 级 R2　依赖：DX-01　并行伙伴：DX-20、21
- 分支：`design/dx-22-flow-motion`　样式文件：`src/styles/dx-22-flow-motion.css`　对应细节：D46 D47

## 为什么
**读到**：`.metro .m-node { transition: left .3s ease, top .3s ease }`——`left/top` 会触发重新布局，普通缓动；而连线是直接跳的，所以节点在滑、线在跳，不同步。Emil §11：只动 `transform` 和 `opacity`。
**要保留的优点（不要重写）**：`setPointerCapture`、6px 起拖阈值、边缘自动滚动、Alt+方向键移动、右键菜单、撤销。

## 要做的事
1. 节点定位：`MetroChart.tsx` 里给 `.m-node` 的内联样式从 `left/top` 改成 CSS 变量 `--x`、`--y`（ESLint 允许 `--` 开头的变量）；CSS 里 `left: 0; top: 0; transform: translate(var(--x), var(--y))`。节点本身宽高为 0，里面的点和标签相对它定位，不受影响。
2. 落位过渡：`transition: transform var(--dur-slow) var(--spring-ui)`（节点位置变化只有"落位"这一种来源）；`prefers-reduced-motion` 时无过渡。
3. 连线：落位期间 `<svg>` 里的路径用 150ms 淡出再淡入（或者整个 svg 在落位 `--dur-slow` 内保持 `opacity: .6`），让线和点"同时换位"，而不是点在滑线在跳。选一种方案，在报告里写理由。
4. 拖动中 `.m-gap.is-near` 的吸附：`transform: scale` 过渡 `var(--dur-press)`，不再瞬变大小（现在是直接改 `width/height`，改成固定大小 + `scale`）。
5. 不改 `metro.ts` 的布局计算；不改任何 `data-testid`。

## 可以改的文件
`src/components/flow/MetroChart.tsx`（只动定位和样式变量）、`src/styles/dx-22-flow-motion.css`。`.m-node`、`.m-gap`、`.m-ghost`、`.metro` 只归这个包。

## 验收
- `flow-edit.spec.ts`、`events.spec.ts`、`feel.spec.ts`（流程图悬停卡）、`a11y.spec.ts`、`src/test/flowEdit.test.ts`、`metro` 布局的单元测试桌面 + 手机绿；**图测试里"真实曲线命中点击"（WP10 刚改好）必须保持**。
- 新测试 `e2e/dx-22-flow.spec.ts`：拖一个步骤到另一个缝隙后，节点在过渡中的 `transform` 不是终点值；稳定后位置正确；减少动效时直接到位。
- Juanxi 怎么验：Events → Edit flow，拖一个点到别的位置，松手后点平滑落位，线不会"跳一下"。

## 回滚
R2。
