# Goal

把 src/styles.css 里的裸 z-index 数字换成有名字的 token，让叠放顺序一眼能读懂。
数值一个都不改，所以界面不会有任何变化。

# Files

- src/styles.css

# Constraints

- 只使用虚构演示数据。
- 不修改依赖、部署、GitHub Actions、密钥、研究数据或 Night Mode 安全文件。
- 不修改或合并 main。
- 只改 src/styles.css，不碰任何 .tsx/.ts 文件。
- 不要碰 src/organization/、src/phase1/、src/workspace/ 下的 CSS。
- 不改字号、间距、圆角、颜色。这一轮只动 z-index。
- **改完不要回头重读文件去「核对基线」。** 文件和描述不一致是正常的，那是你刚改的。
- 不确定的一律保留，并写进交接记录。

# Done means

## 1. 在 :root 里加这 12 个 token（数值照抄，不要调整）

```
--z-base: 0;        --z-raised: 1;      --z-sticky: 2;      --z-sticky-hi: 3;
--z-local: 4;       --z-topbar: 20;     --z-overlay: 40;    --z-fab: 45;
--z-toast: 50;      --z-rail: 55;       --z-menu: 60;       --z-tip: 70;
```

## 2. 把现有的裸数字换成对应 token

当前用到的值和位置（照着换，数值不变）：

| 现值 | 换成 | 出现在 |
| --- | --- | --- |
| 0 | `var(--z-base)` | `.chain li::before` |
| 1 | `var(--z-raised)` | `.chain .chain-btn` |
| 2 | `var(--z-sticky)` | `.topbar`、`.detail-bar` |
| 3 | `var(--z-sticky-hi)` | `.gantt-label` |
| 4 | `var(--z-local)` | `.panel`、`.ask-fab` 内部 |
| 20 | `var(--z-topbar)` | `.topbar`、`.m-node:hover/:focus-within` |
| 40 | `var(--z-overlay)` | `.panel` |
| 45 | `var(--z-fab)` | `.ask-fab` |
| 50 | `var(--z-toast)` | `.toast` |
| 55 | `var(--z-rail)` | `.rail` |
| 60 | `var(--z-menu)` | `.menu` |
| 70 | `var(--z-tip)` | `.hover-card` |

如果实际文件里还有上表没列到的 z-index，按数值就近归入最接近的 token，
**但不要改动数值**；无法归类的保留原样并写进交接记录。

## 3. 在 :root 的这组 token 上方加一行注释

说明：数字越大越靠前，顺序是
基底 → 抬起 → 吸顶 → 顶栏 → 浮层 → 悬浮按钮 → 吐司 → 右栏 → 菜单 → 悬停卡。

## 4. 验收

- `npm run check` 必须通过，原有测试一条都不能删、不能改宽松。
- 在交接记录里写：换了多少处、有没有无法归类的。

# Out of scope

- 不做字号、间距、圆角、颜色。
- 不碰 src/engine/、netlify/、src/data/、任何 .tsx。
