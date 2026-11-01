# DX-15 Events 版面：列表收窄、边缘提示、留白审计

- 阶段 3　大小 M　风险 中　R 级 R2　依赖：DX-01　并行伙伴：DX-16～19
- 分支：`design/dx-15-events-layout`　样式文件：`src/styles/dx-15-events-layout.css`　对应细节：D18 D19

## 为什么
**看到**：1440 宽、右栏打开时 Events 是四列（导航 196 + 活动列表 220 + 内容 + 右栏 380），流程图只剩约 550px，右侧标签被切掉。
**约束（不能违反）**：① **活动名称列表必须保留**（Juanxi 2026-10-31 明确要求）；② 流程图顶部的留白是**有意**留给悬停卡的（PROGRESS 2026-10-31），不能直接删；③ 不动 AI 右栏的默认行为（见 `DETAIL_LIST.md` K-3）。

## 要做的事
1. **列表收窄**：`.events-layout` 在"右栏打开且视口 <1500px"时，把活动列表列从 220px 收到约 168px（只改列宽，名称仍然完整可读，过长用省略号 + `title`）。
2. **流程图"还有更多"的提示**：`.metro` 横向可滚动时，在右边缘加一条渐隐遮罩（用 `mask-image`，不用颜色），滚到尽头自动消失。需要一小段脚本检测滚动位置（只改 `Events.tsx` 里 Flow 视图的外壳，不进 `MetroChart.tsx`，那个归 DX-22）。
3. **留白审计**（只测量，再决定）：量出悬停卡（`.m-card`，宽 250、`bottom: 18px`）弹出时需要的顶部高度；如果现在的顶部留白比它多出 >24px，就把多余的收掉；**不确定就不改**，把测量结果写进报告。顺便量切换条（Flow/List/Budget）和图之间那 ~58px 的间距来自哪个规则。
4. 使用 `100dvh` 替换 `.event-nav` 的 `max-height: calc(100vh - …)`。
5. 手机（<860px）的活动选择器不变。

## 可以改的文件
`src/pages/Events.tsx`（只动列表/Flow 外壳）、`src/styles/dx-15-events-layout.css`。**不准碰**：`MetroChart.tsx`、`metro.ts`、`.m-*` 选择器。

## 验收
- `events.spec.ts`、`flow-edit.spec.ts`、`feel.spec.ts`（流程图悬停卡）、`today.spec.ts`、`a11y.spec.ts`、`word-budgets.spec.ts` 桌面 + 手机绿。
- 新测试 `e2e/dx-15-events.spec.ts`：1440 宽右栏打开时，活动列表宽度 ≤180 且全部活动名可见；流程图右边出现渐隐遮罩，滚到最右后消失。
- `dx-shots`：1440 宽 Events（右栏开/关）前后对比。
- Juanxi 怎么验：Events 页右栏打开时，中间的流程图更宽；右边缘有渐隐提示表示还能往右拖；活动列表还在。

## 回滚
R2。
