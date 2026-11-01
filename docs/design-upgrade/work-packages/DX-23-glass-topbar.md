# DX-23 半透明顶栏 + 阴影层级 token

- 阶段 5　大小 M　风险 中　R 级 **R1 可用**　依赖：DX-01、DX-02（如果合并了 20b，也包含底栏）　并行伙伴：DX-24、25
- 分支：`design/dx-23-glass-topbar`　样式文件：`src/styles/dx-23-glass-topbar.css`　对应细节：D34 D35 D36

## 为什么
**读到**：顶栏是实心 `--surface` 加 1px 底线；至少 6 种手写的 rgba 阴影，只有一个 `--shadow` token。Emil §12：导航栏和工具栏用半透明材质，内容从下面滑过，用边缘渐变代替硬分割线；"大的面更厚：更强的模糊、更深的阴影"。Apple `materials.md`：只用在**浮动的功能层**，不用在内容上，也不要在半透明上再叠半透明。

## 要做的事
1. **顶栏材质**：`.topbar { background: color-mix(in srgb, var(--surface) 80%, transparent); backdrop-filter: blur(16px) saturate(1.4); }`。底线 `border-bottom` 只在页面滚动之后出现（`is-scrolled`：用一个 1px 的哨兵元素加 `IntersectionObserver`，或者支持时用 `animation-timeline: scroll()`；挑简单的，在报告里写理由）。
2. **回退**：
   - `@supports not (backdrop-filter: blur(1px))`：实心 `--surface`。
   - `@media (prefers-reduced-transparency: reduce)`：实心、不模糊。
   - `@media (prefers-contrast: more)`：实心 + 明显边框（`--ink` 的 30%）。
3. **阴影 token**（写在小文件的 `:root`，不用 hex，用 `rgb(0 0 0 / .x)`）：`--elev-1`（卡片抬起，很淡）、`--elev-2`（菜单、悬停卡）、`--elev-3`（右栏浮层、Toast、对话框）。深色模式下阴影更重、不透明度更高。
4. **只替换以下元素的阴影**：`.menu`、`.m-menu`、`.owner-suggest`、`.toast`、`.rail`（浮层状态）、`.panel`。**不替换** `.ask-fab`（归 DX-09）、`.hover-card`（深色实心小卡，保持）。
5. **不要**给菜单、悬停卡、内容卡片加模糊（它们是实心的，避免叠加）。
6. 如果 20b 底部导航已合并：它用同样的材质。
7. 深色模式检查：模糊后文字对比度仍 ≥4.5:1（用滚动到页面中间、顶栏下面有彩色色块时的截图验证）。

## 可以改的文件
`src/components/chrome/TopBar.tsx`（只加滚动状态）、`src/styles/dx-23-glass-topbar.css`。`.topbar` 的背景和底线只归这个包。

## 验收
- `a11y.spec.ts`（含对比度）、`smoke`、`today`、`touch` 桌面 + 手机绿。
- 新测试 `e2e/dx-23-glass.spec.ts`：滚动前 `.topbar` 无底线、滚动后有；`emulateMedia({ reducedTransparency: "reduce" })`（若 Playwright 版本支持，否则用样式检查）下背景是实心。
- Juanxi 怎么验：Today 向下滚，卡片从半透明顶栏下面滑过，顶栏出现一条细线。系统开了"降低透明度"后顶栏变实心。

## 回滚
R1 或 R2。
