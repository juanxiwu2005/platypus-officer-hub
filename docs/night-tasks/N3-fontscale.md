# Goal

把 src/styles.css 里零散的字号收敛到 7 档 token。每一处位移都在 ±1px 以内，
所以整体观感应该看不出变化。

# Files

- src/styles.css

# Constraints

- 只使用虚构演示数据。
- 不修改依赖、部署、GitHub Actions、密钥、研究数据或 Night Mode 安全文件。
- 不修改或合并 main。
- 只改 src/styles.css，不碰任何 .tsx/.ts 文件。
- 不要碰 src/organization/、src/phase1/、src/workspace/ 下的 CSS。
- 不改间距、圆角、颜色、z-index。这一轮只动 font-size。
- **改完不要回头重读文件去「核对基线」。**
- 不确定的一律保留，并写进交接记录。

# Done means

## 1. 在 :root 里加这 7 个 token

```
--fs-xs: 12px;    --fs-sm: 13px;    --fs-md: 14px;    --fs-base: 15px;
--fs-lg: 18px;    --fs-xl: 21px;    --fs-2xl: 26px;
```

## 2. 按这张表替换每一处 font-size

| 现值 | 换成 | 位移 |
| --- | --- | --- |
| `10px` | `var(--fs-xs)` | +2px（只有 1 处，且 AGENTS.md §7.4 要求字号不要太小，往上是对的）|
| `11px` | `var(--fs-xs)` | +1px |
| `11.5px` | `var(--fs-xs)` | +0.5px |
| `12px` | `var(--fs-xs)` | 0 |
| `12.5px` | `var(--fs-sm)` | +0.5px |
| `13px` | `var(--fs-sm)` | 0 |
| `13.5px` | `var(--fs-md)` | +0.5px |
| `14px` | `var(--fs-md)` | 0 |
| `14.5px` | `var(--fs-base)` | +0.5px |
| `15px` | `var(--fs-base)` | 0 |
| `.95rem` | `var(--fs-base)` | ≈0 |
| `16px` | `var(--fs-base)` | −1px |
| `17px` | `var(--fs-lg)` | +1px |
| `18px` | `var(--fs-lg)` | 0 |
| `19px` | `var(--fs-lg)` | −1px |
| `20px` | `var(--fs-xl)` | +1px |
| `21px` | `var(--fs-xl)` | 0 |
| `22px` | `var(--fs-xl)` | −1px |
| `26px` | `var(--fs-2xl)` | 0 |
| `clamp(26px, 3.2vw, 34px)` | **保持原样** | — |

⚠️ 那个 `clamp(...)` 是响应式大标题，不要换成 token，保留它。

## 3. 验收

- `npm run check` 必须通过，原有测试一条都不能删、不能改宽松。
- 在交接记录里写：原来几种字号、现在几种、有没有表里没列到的值（有就列出来并保留原样）。

# Out of scope

- 不做间距、圆角、颜色、z-index。
- 不碰 src/engine/、netlify/、src/data/、任何 .tsx。
