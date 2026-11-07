# DX-26 Partners 看板拖拽（沿用 DX-24 的工具）

- 阶段 6　大小 M　风险 中　R 级 R2　依赖：DX-24　并行伙伴：无（和 DX-27 先后做）
- 分支：`design/dx-26-crm-drag`　样式文件：`src/styles/dx-26-crm-drag.css`　对应细节：D45

## 要做的事
1. `src/pages/Partners.tsx` 的 Board 视图：把 `draggable` + `onDragStart` + `onDrop` 换成 DX-24 的 `useDragSort`（**只调用，不修改** `dragSort.ts`；缺什么能力就写进报告交给整合人）。
2. 保持权限：只有 `canEditContact(state, c)` 为真的卡片能拖；`visibility: "leads"` 的联系人仍然只对有权限的人可见（AI 看到的也一样）。
3. 卡片上已有的"阶段 `select`"（`crm-card-foot select`）保留，作为键盘和手机的备用路径。
4. 沿用 DX-24 的手感：让位、弹簧落位、`Esc` 取消、`Alt+←/→`、`aria-live` 播报。

## 可以改的文件
`src/pages/Partners.tsx`（Board 拖放那一段）、`src/styles/dx-26-crm-drag.css`。

## 验收
- `crm.spec.ts`、`a11y.spec.ts`、`word-budgets.spec.ts`、`touch.spec.ts` 桌面 + 手机绿，断言不放宽。
- 新测试 `e2e/dx-26-crm-drag.spec.ts`：拖动改变阶段；无权限的卡片不能拖；`Esc` 取消。
- Juanxi 怎么验：Partners → Board，拖一个联系人到另一个阶段，手感和 Tasks 看板一样。

## 回滚
R2。
