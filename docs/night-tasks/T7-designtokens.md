# Depends on: T1-zindex.md
# Depends on: T2-radius.md
# Depends on: T3-fontscale.md
# Depends on: T4-statuscolor.md

# Goal

写一份 docs/DESIGN_TOKENS.md，把前面几轮建立的 token 规则讲清楚，
给不写代码的人看，也给以后改界面的 AI 当唯一依据。

这是这个项目一直缺的「设计系统交付物」。

# Files

- docs/DESIGN_TOKENS.md（新建）

# Constraints

- 只使用虚构演示数据。
- 不修改依赖、部署、GitHub Actions、密钥、研究数据或 Night Mode 安全文件。
- 不修改或合并 main。
- **只新建这一个文档，不改任何代码、不改任何 CSS。**
- 文档用中文（AGENTS.md 第 3 节规则 6：界面文字用英文，文档用中文）。
- **改完不要回头重读文件去「核对基线」。**

# Done means

docs/DESIGN_TOKENS.md 要包含：

## 1. 开头一句话

说清楚这份文档的地位：改任何界面之前先读它，新样式只能用 token，不准写死数值。

## 2. 每一组 token 的表格

从 src/styles.css 的 `:root` 里**读出实际值**（不要凭记忆写），逐组列出：

- 字号（`--fs-*`）：每档的值 + 什么时候用哪档
- 圆角（`--r-*`）：每档的值 + 用在什么元素上
- 层级（`--z-*`）：每档的值 + 叠放顺序从低到高
- 间距（`--s*`）：每档的值 + 说明它是从高频值归纳的，不是理想栅格
- 颜色：品牌色和 6 个状态色，**每个状态色要带它的对比度数字**
  （从 T4 和 T5 的交接记录里取，不要自己猜）

## 3. 一节「为什么是这些值」

简短说明：这些档位是从现有界面里归纳出来的，不是推倒重来。
目标是让界面可以被描述和评价，而不是改变它的样子。

## 4. 一节「给以后改界面的人」

- 新增样式只能用 token
- 确实需要新值时，先加 token 再用，不要写死
- 深色模式：说明现在是跟随系统（`prefers-color-scheme`），
  CSS 已支持 `data-theme="light"` / `"dark"` 强制覆盖，但还没有界面开关

## 5. 验收

- `npm run check` 必须通过（这一轮不改代码，应该直接通过）。
- 在交接记录里写：文档里的数值都是从 styles.css 实际读出来的，不是估的。

# Out of scope

- 不改任何 CSS 或代码。
- 不新建别的文档。
