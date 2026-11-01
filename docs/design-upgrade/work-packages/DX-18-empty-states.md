# DX-18 空状态文案与下一步（除 Tasks、Events）

- 阶段 3　大小 S　风险 低　R 级 R2　依赖：DX-01　并行伙伴：DX-15～17、19
- 分支：`design/dx-18-empty-states`　对应细节：D25

## 为什么
现有的空状态只说"现在没有"，不说下一步。例如 `Funding.tsx`："Nothing needs action."；`Partners.tsx`："No contacts match."、"No organizations match."；`Today.tsx`："No finished steps yet this week."。Apple `writing.md` 和 Lens 5：空屏要邀请下一步。

## 要做的事
1. **先审计，再改**：`grep -rn "<Empty" src/pages src/components` 列出每一处空状态和它所在页面（不含 `Tasks.tsx`、`Events.tsx`，它们归 DX-16、DX-15），在报告里贴出清单。
2. 每条改成"一句说明 + 如果有对应动作就给一个按钮或链接"。例如 "No contacts match. **Clear filters**"（点了清除筛选）。没有合适动作的就保持一句话，不要硬加。
3. 文字用英文，沿用现有语气（短、直接）。**不增加字数**：每页 `npm run words` 的"一眼看到"和"总字数"都不能比现在多（Partners 的上限是 120/120，要先量出剩余额度）。
4. 不加插图，不加图标。
5. 不改任何数据结构，不改按钮行为之外的逻辑。

## 可以改的文件
`src/pages/Today.tsx`、`Team.tsx`、`Funding.tsx`、`Handoff.tsx`、`Partners.tsx`、`Rules.tsx`、`Settings.tsx`（仅空状态那几行）。
**不准碰**：`Tasks.tsx`、`Events.tsx`、`ui/index.tsx` 里的 `Empty` 组件本身（如果需要加参数，写进报告）。

## 验收
- `today.spec.ts`、`crm.spec.ts`、`wp5.spec.ts`、`word-budgets.spec.ts`、`a11y.spec.ts` 桌面 + 手机绿；`npm run words` 前后对比表放进报告。
- Juanxi 怎么验：在 Partners 里搜一个不存在的名字，提示里有"清除筛选"的链接。

## 回滚
R2。
