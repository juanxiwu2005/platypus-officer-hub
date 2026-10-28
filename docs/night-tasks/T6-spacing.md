# Goal

把 src/styles.css 里那些明显随手写的奇数间距值收敛到相邻的常用值。
只动奇数值，常用的偶数值（4/8/12/16/20/24）一律不碰，所以位移最多 1px。

# Files

- src/styles.css

# Constraints

- 只使用虚构演示数据。
- 不修改依赖、部署、GitHub Actions、密钥、研究数据或 Night Mode 安全文件。
- 不修改或合并 main。
- 只改 src/styles.css，不碰任何 .tsx/.ts 文件。
- 不要碰 src/organization/、src/phase1/、src/workspace/ 下的 CSS。
- 不改字号、圆角、颜色、z-index。这一轮只动 padding / margin / gap。
- **改完不要回头重读文件去「核对基线」。**
- 不确定的一律保留，并写进交接记录。

# Done means

## 1. 只做这几个替换，其余间距值一律不动

| 现值 | 换成 | 位移 |
| --- | --- | --- |
| `1px` | `2px` | +1 |
| `3px` | `2px` | −1 |
| `5px` | `4px` | −1 |
| `7px` | `6px` | −1 |
| `9px` | `8px` | −1 |
| `11px` | `12px` | +1 |
| `18px` | `16px` | −2 |
| `22px` | `24px` | +2 |

**不要动**：`2px` `4px` `6px` `8px` `10px` `12px` `14px` `16px` `20px` `24px`
`28px` `40px` `48px`。它们是高频值，动了就是改外观。

⚠️ `18px` 和 `22px` 是 ±2px 的位移，各自只有几处。在交接记录里单独列出改了哪些选择器。

## 2. 加一组间距 token（只加定义，这一轮不强制全站替换）

```
--s1: 2px;   --s2: 4px;   --s3: 6px;   --s4: 8px;
--s5: 12px;  --s6: 16px;  --s7: 24px;
```

在上面加一行注释说明：这是现有高频值归纳出来的，不是理想的 4px 栅格 ——
选择保留观感优先于栅格纯粹。新写样式应该用这些 token。

## 3. 验收

- `npm run check` 必须通过，原有测试一条都不能删、不能改宽松。
- 在交接记录里写：每个奇数值各改了多少处，以及 18px / 22px 改了哪些选择器。

# Out of scope

- 不强制把全部间距换成 token（风险高、收益低）。
- 不做字号、圆角、颜色、z-index。
- 不碰 src/engine/、netlify/、src/data/、任何 .tsx。
