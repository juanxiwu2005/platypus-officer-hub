# Goal

消掉一个从来没被定义过的 CSS 变量 `--st-now`，并把写死在 4 处的同一个蓝色
收敛成两个 token。**这一轮不改变任何视觉效果**，所有颜色的最终呈现值保持不变。

# Files

- src/styles.css

**不要读** src/components/、src/pages/、src/organization/、src/phase1/、src/workspace/
下的任何文件。这一轮只改 src/styles.css 一个文件。

# Constraints

- 只使用虚构演示数据。
- 不修改依赖、部署、GitHub Actions、密钥、研究数据或 Night Mode 安全文件。
- 不修改或合并 `main`。
- 只改 src/styles.css，不碰任何 .tsx/.ts 文件。
- **不要改 src/components/ui/statusDefaults.ts。** 那里的 6 个状态色和 PALETTE
  是用户可改的数据，字面值必须保持原样。
- **不要碰深色主题的那两段**（`@media (prefers-color-scheme: dark)` 和
  `:root[data-theme="dark"]`）。这一轮不给新 token 加深色版本 —— 见下面第 1 条的理由。
- 不改字号、间距、圆角、布局、z-index。
- **改完不要回头重读文件去「核对基线」。** 文件和任务描述不一致是正常的 —— 那是你刚改的。
- 不确定的一律保留，并写进交接记录。

# Done means

## 1. 在 `:root` 里加这两个 token

```
--info: #3a6fd8;
--info-glow: rgba(58,111,216,.18);
```

在它们上面加一段注释，照抄下面这段意思（可以用你自己的话，但这三点都要在）：

- 这是**时间轴/图表**用的蓝，表示「现在走到这里」。
- 它**不是**状态色。进度链和流程图的 `.now` 圆点由 `nodeStop()` 算出来的
  图表状态（`done` / `now` / `todo` / `risk`）决定，那是从排期和风险推出来的，
  6 个用户状态是多对一压到它上面的。所以**不存在**与它对应的状态色，
  也不要试图让它跟随 Settings → Board 里用户设的颜色。
- 故意不给它深色主题的覆盖值，因为现状就是深浅主题共用这个蓝。
  这一轮只做重命名，不改观感。

## 2. 替换下面这 4 处，替换后呈现的颜色必须完全不变

| 位置 | 现在的写法 | 换成 |
| --- | --- | --- |
| `.chain .dot.now` 的 `background` | `var(--st-now, #3a6fd8)` | `var(--info)` |
| `.chain .dot.now` 的 `border-color` | `var(--st-now, #3a6fd8)` | `var(--info)` |
| `.chain .dot.now` 的 `box-shadow` 颜色 | `rgba(58,111,216,.18)` | `var(--info-glow)` |
| `.m-dot.now` 的 `background` 和 `border-color` | `#3a6fd8` | `var(--info)` |
| `.m-dot.now` 的 `box-shadow` 颜色 | `rgba(58,111,216,.18)` | `var(--info-glow)` |
| `.m-dot.now.risk` 的 `background` | `#3a6fd8` | `var(--info)` |

`.m-dot.now.risk` 的 `border-color: var(--late)` **保持不动**。

⚠️ `var(--st-now, #3a6fd8)` 这个写法里，`--st-now` 在整个仓库里从来没有被定义过，
所以它永远落回后面那个 `#3a6fd8`。换成 `var(--info)` 之后呈现值一模一样，
但不再有一个假装可配置、实际永远不生效的变量。

## 3. 改完 `--st-now` 必须在整个 src/ 里一次都不出现

## 4. 验收

- `npm run check` 必须通过。
- **不需要新增任何测试。** 这一轮是纯重命名，没有行为变化可测。
  不要为了凑交付去发明测试，也不要改动或放宽任何现有测试。
- 在交接记录里写：
  - 改了哪几行
  - 确认 `--st-now` 已从 src/ 完全消失
  - 确认 `statusDefaults.ts`、深色主题两段、`Handoff.tsx` 都没有被动过

# Out of scope

- **不改 `src/pages/Handoff.tsx`。** 它第 61 行内联了 `#237a42` / `#3a6fd8` / `#5f6763`
  三个值。那三处该不该跟随用户的状态色是一个产品语义问题，要 Juanxi 决定，
  不在这一轮里做。
- **不做「消掉同义不同色」。** `--late/--good/--warn` 和 blocked/done/in_progress
  状态色看起来重复，实际是两套不同约束的系统：品牌 token 用在浅色底的**文字**上
  且有独立的深色主题值，状态色用在色块上压**白字**且没有深色版本。
  合并会让深色主题下的文字对比度崩掉（白字在 `#f08a80` 上只有 2.43:1）。
  **不要做这件事。**
- 不做字号、间距、圆角、z-index。
- 不碰 src/engine/、netlify/、src/data/、任何 .tsx。

---

## 预算估计

一个文件，约 6 处替换加一段注释。读文件 + 改文件 + 跑一遍 check，
正常在 20 步以内。预算 300 步，远够。
