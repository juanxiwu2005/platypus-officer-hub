# DX-04 触屏点击区 ≥44px

- 阶段 1　大小 S　风险 低　R 级 **R1 可用**　依赖：DX-01　并行伙伴：DX-03、05…08
- 分支：`design/dx-04-touch-targets`　样式文件：`src/styles/dx-04-touch-targets.css`　对应细节：D04 D05

## 为什么
**量到**：手机上 `.icon-btn` 高 32px；代码推算 `.btn` 约 33px、`.chip` 约 28px。Apple 移动端默认点击区 44，最小 28（`accessibility.md`）。现有 `a11y.spec.ts` 只要求 24px（WCAG 2.5.8）。

## 要做的事
全部写在 `@media (pointer: coarse)` 里，**桌面一个像素都不变**：
1. 主要控件最小高度 44px：`.btn`、`.chip`、`.icon-btn`（宽高都要）、`.seg button`、`.crm-seg button`、`.sidenav a`、表单的 `input`/`select`（非复选框）、`.demo-pill`。
2. 表格和卡片里密集的小控件不低于 32px：`.tbl .btn.small`、`.board-card` 里的按钮、`.owner-chip button`。
3. 极小控件用透明伪元素把热区扩到 ≥32px，不改外观：`.swatch`（20px）、`.info`（16px）、`.chain-btn`、复选框所在的 `label` 整行可点。
4. 相邻可点元素间距 ≥8px。
5. 每改一处，检查 390px 宽下没有横向滚动（`noOverflow` 为 0），且 `word-budgets.spec.ts` 不受影响。

## 可以改的文件
只有 `src/styles/dx-04-touch-targets.css`。不准碰 `.ask-fab`、`.rail`（归 DX-09）。

## 验收
- 新测试 `e2e/dx-04-targets.spec.ts`（只在手机项目跑）：对 Today、Tasks、Events、Team、Partners，量所有 `button, a, select, input:not([type=checkbox]), [role=tab]` 的 `getBoundingClientRect`，主要控件 ≥44，其余 ≥32；列出例外并在报告里逐个解释。
- `a11y.spec.ts`、`touch.spec.ts` 手机项目绿。桌面项目的截图前后字节一致。
- Juanxi 怎么验：用手机或浏览器的手机模式打开预览，按钮明显更好点，页面没有变宽。

## 回滚
R1：注释掉 `index.css` 里 DX-04 那一行。R2：`git revert -m 1 dx/dx-04-merged`。

## 注意
- 一些表格行高已经是 44px（`.tbl td`），里面的按钮不要再撑高行。
- 不要用 `min-height` 把 `select` 撑得和旁边的按钮不齐。
