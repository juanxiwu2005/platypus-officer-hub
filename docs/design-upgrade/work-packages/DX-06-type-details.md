# DX-06 字体细节：字距、等宽数字、手机小字、折行

- 阶段 1　大小 S　风险 低　R 级 **R1 可用**　依赖：DX-01　并行伙伴：DX-03～05、07、08
- 分支：`design/dx-06-type-details`　样式文件：`src/styles/dx-06-type-details.css`　对应细节：D28 D29 D30 D31

## 为什么
标题字距现在统一是 `-.01em`。Emil §15 和 Apple `typography.md`：字距要随字号变——大字更紧，小字接近 0。衬线加无衬线的搭配是这个产品最有辨识度的地方，这个包是"磨细节"，不换字体。

## 要做的事
1. 字距：`h1`（26px）约 `-.02em`；`h2`（18px）约 `-.015em`；`h3`（15px）`0`；`.panel h2`、`.funding-detail h2` 按各自字号。写成选择器覆盖，不改 `styles.css`。
2. 等宽数字：日期、金额、计数、百分比统一加 `font-variant-numeric: tabular-nums`。先在 Today、Events、Team、Funding、Handoff 里列出所有这类元素（`.num` 之外的，如 `td.nowrap` 里的日期、`.stat-row b`、`.days`、`.timing`、`.count`），再统一覆盖。
3. 手机（`max-width: 600px`）：`.chain-label`、`.m-tick`、`.m-label span`、`.gantt-tick` 等 12–13px 的小字提到 `var(--fs-md)`。**只能用 token**，样式检查不允许写裸像素；检查提到 14px 以后标签不重叠、不撑出横向滚动。
4. `p`、`.small`、`.muted`、`.empty`、`.hover-card`：`text-wrap: pretty`。
5. 不要改字体族、字重、行高。不要改 h1 的字号（见细节 D32，归 DX-27）。

## 可以改的文件
只有 `src/styles/dx-06-type-details.css`。

## 验收
- 新测试 `e2e/dx-06-type.spec.ts`：读取 h1/h2/h3 的计算 `letter-spacing`，三个值各不相同，且 h1 < h2 < h3（更紧）；Today 里的日期单元格计算样式含 `tabular-nums`。
- 手机 390 宽：`word-budgets.spec.ts`、`noOverflow` 为 0、`a11y.spec.ts` 绿。
- Juanxi 怎么验：标题看起来更紧凑精致；表格里的日期、金额上下对齐；手机上进度链标签更好读。

## 回滚
R1 或 R2。

## 注意
- 提到 14px 的标签如果造成两行换行，先缩短布局间距而不是缩小字。
