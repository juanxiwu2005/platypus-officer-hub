# DX-10 菜单进出（Demo 菜单、铃铛）

- 阶段 2　大小 S　风险 低　R 级 R2　依赖：DX-01、DX-02　并行伙伴：DX-09、11～14
- 分支：`design/dx-10-menu-motion`　样式文件：`src/styles/dx-10-menu-motion.css`　对应细节：D10

## 要做的事
1. `src/components/chrome/DemoMenu.tsx`、`Bell.tsx`：把 `hidden={!open}` 改成 `data-state="open|closed"`；退场结束（`transitionend` 或兜底定时器）后再设 `hidden`，让 `display: none` 照旧管住读屏和 Tab 顺序。
2. 样式：`.menu` 进入 `opacity 0→1` + `scale(.96)→1` + `translateY(-4px)→0`，`var(--dur-fast)` + `var(--ease-out)`；退场 `var(--dur-press)`（比进入快）。`transform-origin: top right`（贴着触发按钮）；手机上菜单是铺满宽度的固定条（`max-width: 600px`），用 `top center`。
3. 减少动效：只淡入淡出，不缩放不位移。
4. 保持不变：点击外部关闭、Escape 关闭、"Reset demo 要点两次"的 3 秒超时、`data-testid`。

## 可以改的文件
`src/components/chrome/DemoMenu.tsx`、`Bell.tsx`、`src/styles/dx-10-menu-motion.css`。`.menu`、`.menu-wrap` 的**动效属性**只归这个包（阴影归 DX-23）。

## 验收
- `smoke`、`today`、`touch`、`a11y`、`bts` 桌面 + 手机绿（它们大量使用 `demo-menu`、`reset-demo`）。
- 新测试 `e2e/dx-10-menu.spec.ts`：打开瞬间 `opacity` 在 0 和 1 之间；关闭 200ms 后 `hidden` 为真；快速连点两次不会卡在半开。
- Juanxi 怎么验：点顶栏的 "Demo · …" 小标和铃铛，菜单从按钮下方轻轻长出来。

## 回滚
R2。DX-20 依赖它，要先撤 DX-20。
