# DX-21 看板列头减饱和

- 阶段 4　大小 S　风险 中　R 级 **R1 可用**　依赖：DX-16　并行伙伴：DX-20、22
- 分支：`design/dx-21-board-headers`　样式文件：`src/styles/dx-21-board-headers.css`　对应细节：D22

## 为什么
**看到**：6 条饱和色块横在看板顶部，和"地铁线"这个产品招牌抢戏（Apple Craft 透镜："勇气只花在一处"）。

## 要做的事
1. `.board-col > header`：背景改成 `--surface`（或 `--surface-2`），文字用 `--ink`，左边一个彩色圆点（颜色仍然来自每列的 `--pill`，也就是 Settings → Board 里用户设的颜色），数字徽标用 `--surface-2` 底。
2. **Stuck** 列保持一点警示：圆点加一圈 `--late-soft` 光晕，文字不变。
3. **`StatusPill`（状态色块）不改**，它在表格里、卡片里仍然是 monday 风格的实心色块。
4. **深色模式必须重新算对比度**：用户状态色没有深色版本（`DESIGN_TOKENS.md` 5.2）。圆点是图形，要求 ≥3:1。我估算 Not claimed 的 #5f6763 压在深色 `--surface-2`（#1d2322）上约 2.8:1，**不达标**。办法：圆点外加 1.5px 的浅色描边，或者深色模式下保持原来的实心列头。把计算结果（浅色 6 种 + 深色 6 种）写进报告。

## 可以改的文件
只有 `src/styles/dx-21-board-headers.css`。

## 验收
- `tasks.spec.ts`、`a11y.spec.ts`（含颜色对比度检查）桌面 + 手机绿。
- Juanxi 怎么验：看板顶部不再是一排大色块，列名清爽，只有小圆点带颜色。**不喜欢就回滚 DX-21，不影响其他。**

## 回滚
R1：注释 `index.css` 里的 DX-21 一行。
