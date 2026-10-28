# Goal

修一个可演示的 bug：在 Settings → Board 改任务状态的颜色时，Today 的进度链圆点和
Events 流程图的「当前」圆点不会跟着变，因为它们的颜色写死在 CSS 里。
顺带消掉品牌色与状态色之间重复定义的「同义不同色」。

⚠️ 这一轮会改变视觉，Juanxi 必须自己看预览验收。

# Files

- src/styles.css
- src/components/ui/statusDefaults.ts
- src/components/flow/MetroChart.tsx（只改颜色来源，不改结构）
- src/pages/Handoff.tsx（只改硬编码的状态色）

# Constraints

- 只使用虚构演示数据。
- 不修改依赖、部署、GitHub Actions、密钥、研究数据或 Night Mode 安全文件。
- 不修改或合并 main。
- 不改布局、不改字号、不改间距、不改圆角。
- 不要碰 src/organization/、src/phase1/、src/workspace/。
- **不改 6 个状态的名称和含义**（AGENTS.md 第 7 节第 6 条）。
- **改完不要回头重读文件去「核对基线」。**
- 不确定的一律保留，并写进交接记录。

# Done means

## 1. 修 `--st-now` 未定义的 bug

src/styles.css 里 `.chain .dot.now` 引用了 `var(--st-now, #3a6fd8)`，
但 `--st-now` 在整个仓库里**从来没有被定义过**，所以永远落回硬编码的蓝色。

→ 在 :root 里定义 `--st-now`，值取「To do」状态色。

## 2. 让流程图圆点跟随 Settings 的颜色

src/components/flow/MetroChart.tsx 里，圆点的颜色来自 CSS 的写死值，
而 `useStatusStyles()` 已经能拿到用户在 Settings 里设的颜色
（文件里已经在用它做 aria-label 和悬停卡文字）。

→ 让圆点的颜色也走 `useStatusStyles()`。
→ 验证方式：在 Settings → Board 把「To do」改成别的颜色，
  Today 的进度链圆点和 Events 流程图的「当前」圆点应该跟着变。
  用 Playwright 测试覆盖这条，不要靠人工截图。

## 3. 消掉硬编码的蓝

同一个蓝 `#3a6fd8` 被写死在至少 4 个地方：
`statusDefaults.ts` 的 accepted、PALETTE、`styles.css` 的 `.chain .dot.now`、
`styles.css` 的 `.m-dot.now`。

→ 在 :root 加一个 token（建议 `--info`），让这些地方都引用它。
→ `statusDefaults.ts` 里的 PALETTE 是用户可选调色板，保留它的字面值不动。

## 4. 消掉「同义不同色」

品牌 token 和状态色对同一个含义各有一个值：

| 含义 | 品牌 token | 状态色 |
| --- | --- | --- |
| 迟了/卡住 | `--late #b42318` | blocked `#c0362f` |
| 完成 | `--good #1a7f37` | done `#237a42` |
| 注意/进行中 | `--warn #8f5206` | in_progress `#b25c00` |

→ 每个含义只留一个值。
→ ⚠️ 6 个状态色现在**全部通过 WCAG AA**（白字对比度 4.72–5.82:1）。
  改完每一个都要重算对比度，**低于 4.5:1 的不准用**。
  在交接记录里列出改后的 6 个数字。

## 5. src/pages/Handoff.tsx 里硬编码的 3 个状态色改成走 token

（搜 `#237a42`、`#3a6fd8`、`#5f6763`）

## 6. 验收

- `npm run check` 必须通过，a11y 测试必须继续通过。
- 新增 Playwright 测试：改 Settings → Board 的颜色后，进度链圆点跟着变。
- 在交接记录里写：改后 6 个状态色的对比度数字、动了哪些文件、
  以及**请 Juanxi 重点看 Today 和 Events 两页**。

# Out of scope

- 不做字号、间距、圆角、z-index。
- 不修对比度不合格的那几处（那是 T5）。
- 不碰 src/engine/、netlify/、src/data/。
