# Goal

把 src/styles.css 里零散的圆角数值收敛到 4 档 token，外加药丸和正圆两种形状。

# Files

- src/styles.css

# Constraints

- 只使用虚构演示数据。
- 不修改依赖、部署、GitHub Actions、密钥、研究数据或 Night Mode 安全文件。
- 不修改或合并 main。
- 只改 src/styles.css，不碰任何 .tsx/.ts 文件。
- 不要碰 src/organization/、src/phase1/、src/workspace/ 下的 CSS。
- 不改字号、间距、颜色、z-index。这一轮只动 border-radius。
- **改完不要回头重读文件去「核对基线」。**
- 不确定的一律保留，并写进交接记录。

# Done means

## 1. 在 :root 里加这 6 个 token

```
--r-xs: 4px;      --r-sm: 8px;      --r-md: 12px;     --r-lg: 14px;
--r-pill: 999px;  --r-circle: 50%;
```

现有的 `--radius: 14px` 保留不动（很多地方在用），并在它旁边注明它等同于 `--r-lg`。

## 2. 按这张表替换每一处 border-radius

| 现值 | 换成 | 位移 |
| --- | --- | --- |
| `0` | 保持 `0`，不要换 token | — |
| `3px` | `var(--r-xs)` | +1px |
| `4px` | `var(--r-xs)` | 0 |
| `5px` | `var(--r-xs)` | −1px |
| `6px` | `var(--r-sm)` | **+2px** |
| `8px` | `var(--r-sm)` | 0 |
| `9px` | `var(--r-sm)` | −1px |
| `10px` | `var(--r-md)` | **+2px** |
| `12px` | `var(--r-md)` | 0 |
| `14px` | `var(--r-lg)` | 0 |
| `var(--radius)` | 保持原样 | 0 |
| `999px` | `var(--r-pill)` | 0 |
| `50%` | `var(--r-circle)` | 0 |

⚠️ 表里只有两处是 +2px 的位移（`6px` 和 `10px`）。其余都在 ±1px 以内，看不出来。
在交接记录里**单独列出 6px 和 10px 各改了多少处**，方便 Juanxi 重点看这些地方。

## 3. 验收

- `npm run check` 必须通过，原有测试一条都不能删、不能改宽松。
- 在交接记录里写：原来几种圆角值、现在几种、6px 和 10px 各改了多少处。

# Out of scope

- 不做字号、间距、颜色、z-index。
- 不碰 src/engine/、netlify/、src/data/、任何 .tsx。
