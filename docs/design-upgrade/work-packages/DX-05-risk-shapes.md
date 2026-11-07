# DX-05 风险点加形状（不再只靠颜色）

- 阶段 1　大小 S　风险 低　R 级 R2　依赖：DX-01　并行伙伴：DX-03、04、06…08
- 分支：`design/dx-05-risk-shapes`　样式文件：`src/styles/dx-05-risk-shapes.css`　对应细节：D26

## 为什么
**看到**：Today 的"Needs a nudge"整列都是红点，活动行右边的点也只有颜色。色盲用户分不出红和绿；手机上悬停卡要点一下才看到原因。Apple Lens 1：不能只靠颜色传达信息。

## 要做的事
1. 修改 `src/components/ui/index.tsx` 里的 `RiskDot`（只改这个函数）：
   - 三种状态三个不同形状（用内联 SVG，`currentColor`，不写 hex）：**On track**：圆里一个对勾；**Watch**：三角里一个感叹号；**At risk**：圆角方块里一个叉。
   - 点的尺寸从 11px 提到 14px；颜色仍用现有的 `--good`、`--risk-yellow`、`--late` token。
   - 保留所有现有的 class（`risk red|yellow|green`）、`data-testid="forecast"`、`aria-label`、`withWord` 参数。
2. 不新增任何可见文字（字数预算）。`withWord` 保持原样。
3. 样式写在自己的小文件里，覆盖 `.risk i` 的外观。
4. 深色模式下同样检查对比度（图形 ≥3:1）。

## 可以改的文件
`src/components/ui/index.tsx`（仅 `RiskDot`）、`src/styles/dx-05-risk-shapes.css`。
**不准碰**：`Chain`（归 DX-25）、`Hover`（归 DX-12）、任何页面文件。

## 验收
- `today.spec.ts`、`wp5.spec.ts`（里面有对 `.risk.red` 的断言）、`a11y.spec.ts`、`events.spec.ts` 桌面+手机绿。
- 新测试 `e2e/dx-05-shapes.spec.ts`：三种状态渲染出三个互不相同的 SVG 形状（比较 `outerHTML` 的路径）。
- 把 `dx-shots` 的 Today 图转成灰度，仍能分出三种状态（报告里贴出做法）。
- `npm run words` 不增加。

## 回滚
R2：`git revert -m 1 dx/dx-05-merged`。DX-25 依赖它，先撤 DX-25。

## 注意
- 色块里的字（状态色块 `StatusPill`）不改，它本来就有文字。
