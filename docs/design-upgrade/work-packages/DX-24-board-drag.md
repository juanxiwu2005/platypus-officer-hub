# DX-24 看板指针拖拽 + 让位 + 弹簧 + 键盘

- 阶段 5　大小 L　风险 **高**　R 级 R2　依赖：DX-16　并行伙伴：DX-23、25
- 分支：`design/dx-24-board-drag`　样式文件：`src/styles/dx-24-board-drag.css`　对应细节：D43 D44

## 为什么
**读到**：Tasks 看板用浏览器自带的拖放（`draggable`、`onDragStart`、`onDrop`），只有一个半透明虚影；落下去没有动画，其他卡片不让位；手机上是否能拖**待实测**。Emil §2（1:1 跟手、记住抓取点）、§10（8–10px 才算拖动）。

## 要做的事
1. 新建 `src/lib/dragSort.ts`：一个小的拖拽工具（Hook），**数据层不变**：落下时仍然调用 `Tasks.tsx` 里现有的 `move(id, status, beforeId)`，**不改 store、不改 `SCHEMA_VERSION`**。
2. 手感：
   - `pointerdown` 之后移动 ≥8px 才算开始拖（避免和点击冲突）；用 `setPointerCapture`；卡片跟随指针 1:1，保持抓取点偏移，不跳到卡片中心。
   - 被拖的卡片原位留一个"空位"，其他卡片用 150ms 位移让位；目标列高亮边框。
   - 松手：落位用弹簧（`--spring-ui`，阻尼 1.0——这里没有"甩"的动作，所以不要回弹）；`Esc` 取消并原路回去。
   - 靠近看板左右边缘时自动横向滚动（参考 `MetroChart.tsx` 的做法：边缘 40px，每帧 18px）。
3. **触屏**：长按约 250ms 才开始拖，避免和滚动冲突；`touch-action` 只在拖动时设为 `none`。手机上原有的"下拉选择状态"的方式（`select`）保留，不拿掉。
4. **键盘**：卡片获得焦点后，`Alt + ←/→` 移到相邻状态列（和流程图 `Alt + 方向键` 一致）；移动后用 `aria-live="polite"` 播报 "Moved X to Y"。
5. 与 DX-16 的空列收窄配合：收窄的列必须能作为放置目标（用指针位置命中检测，不要靠 `onDragEnter`）。
6. 保持：权限（谁能拖谁的卡）、`data-testid="board-card"`、`aria-label` 的列名。

## 可以改的文件
`src/pages/Tasks.tsx`（看板拖放那一段）、`src/lib/dragSort.ts`（新）、`src/styles/dx-24-board-drag.css`、`src/test/dragSort.test.ts`（新，纯逻辑的单元测试）。

## 验收
- `tasks.spec.ts` 里现有的 `dragTo` 断言要继续通过（Playwright 的 `dragTo` 发的是鼠标事件，新实现必须响应）；`activity-workspace.spec.ts`、`a11y.spec.ts`、`touch.spec.ts`、`word-budgets.spec.ts` 桌面 + 手机绿。**不能放宽断言，也不能给测试加 `force: true`**（WP10 刚把这类强制点击清掉）。
- 新测试 `e2e/dx-24-drag.spec.ts`：① 拖动中被拖卡片的 `transform` 随指针变化；② 其他卡片在拖动时有位移；③ `Esc` 取消后数据不变；④ 键盘 `Alt+→` 改变状态且有播报；⑤ 拖到收窄的空列也能放下。
- Juanxi 怎么验：电脑上拖一张卡到另一列，卡片跟着鼠标走，别的卡片让开一个位置，松手轻轻落下；键盘也能移。

## 回滚
R2。DX-26 依赖它的工具，先撤 DX-26。

## 注意
- 如果实现中发现必须改 store 才能做到，**停下来**，写进报告交给整合人。
