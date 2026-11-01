# Goal

修 src/styles.css 里对比度不达标的几处，让颜色在弱视和色弱条件下也能读。

# Files

- src/styles.css

# Constraints

- 只使用虚构演示数据。
- 不修改依赖、部署、GitHub Actions、密钥、研究数据或 Night Mode 安全文件。
- 不修改或合并 main。
- 只改 src/styles.css，不碰任何 .tsx/.ts 文件。
- 不要碰 src/organization/、src/phase1/、src/workspace/ 下的 CSS。
- 不改布局、字号、间距、圆角。
- **改完不要回头重读文件去「核对基线」。**
- 不确定的一律保留，并写进交接记录。

# Done means

## 1. 文字对比度（WCAG AA 要求 4.5:1）

`--good` 配在 `--good-soft` 背景上是 **4.44:1**，差 0.06 就达标。
用在 `.tag.good`（变更卡的 Approved 标签）和 `.save-status.ok`（Settings 的 Saved 提示）。

→ **改 token 本身**，不要像现在这样用硬编码值单独补某一处。
→ 改完把 styles.css 里那个用硬编码深绿单独修 `.days.good` 的补丁删掉。

## 2. 非文字对比度（WCAG 1.4.11 要求 3:1）

| 元素 | 现在 | 目标 |
| --- | --- | --- |
| 黄色风险点 `#e3a008` 配白底 | 2.26:1 | ≥3:1 |
| Team 工作量中档条（`.band.b2 i` 的黄）| 1.74:1 | ≥3:1 |
| 流程图主线未完成段 `.m-line.main` | 1.85:1 | ≥3:1 |
| 进度链/流程图空心点边框 `--edge` | 2.59:1 | ≥3:1 |

⚠️ 黄色是三色风险系统里唯一不达标的一档，而黄色恰好是色弱用户最依赖的，优先修。

## 3. 全站 1px 边框 `--line` 先不要动

它配白底只有 1.29:1，但加深会让整个界面明显变「重」，和 Juanxi 要的
「简洁、高级」相反。

→ **不要改 `--line`。** 如果你认为某处必须靠边框传达状态或可点击性，
  在交接记录里写出来，建议用粗细或背景区分，交给 Juanxi 决定。

## 4. 验收

- `npm run check` 必须通过，a11y 测试必须继续通过。
- 在交接记录里列出改前改后的对比度数字（每一条都要有数）。

# Out of scope

- 不改 `--line`。
- 不做字号、间距、圆角、z-index。
- 不碰 src/engine/、netlify/、src/data/、任何 .tsx。
