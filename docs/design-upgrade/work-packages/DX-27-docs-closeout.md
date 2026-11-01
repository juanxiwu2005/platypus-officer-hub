# DX-27 文档收口 + 样式守卫补全 + 合并小样式文件（需批准）

- 阶段 6　大小 M　风险 低　R 级 R2　依赖：全部　并行伙伴：无（最后做）
- 分支：`design/dx-27-docs-closeout`　对应细节：D32 D53 D54 D55

## 要做的事
1. **文档**（这是唯一允许改这几个文件的包）：
   - `docs/DESIGN_TOKENS.md`：补"动效 token"（`--dur-*`、`--ease-*`、`--spring-*`）、"阴影层级"（`--elev-*`）、"小样式文件的结构和归属规则"；对齐 h1 的说明（默认：把文档改成和代码一致的固定 `--fs-2xl`；Juanxi 要改成 clamp 的话单独做）。
   - `AGENTS.md`：第 7 节加一小节"动效规则"（时长走 token；必须有减少动效版本；只动 `transform`/`opacity`；可被打断；常用操作不加动画；桌面悬停卡零延迟）；在第 1 节的读文档清单里加一行指向 `docs/design-upgrade/README.md`；**核实后**更新第 0 节里过时的 `main` 事实（写进去的每个提交都要用 git 实际查过）。
   - `docs/PROGRESS.md`：写一条总的收口记录；"需要同步本地备份"。
2. **守卫补全**：把前面各包发现的"不该再出现"的写法加进样式检查（例如小文件里不准出现 `!important`、不准给 `.hover-card`（桌面）加延迟）。每加一条都要有"故意违规"的样本验证它会红。
3. **合并小样式文件（需要 Juanxi 明确同意才做，且单独一个提交）**：把已验收通过的 `src/styles/dx-*.css` 合回 `src/styles.css`（用一块 `/* ===== v1.2 design upgrade ===== */` 分隔），删掉 `src/styles/` 和 `index.css`、`main.tsx` 里那一行引入。要求：`dx-shots` 前后 PNG **字节一致**。**合并之后，R1 快速关闭就不能用了**（回滚只能 R2）；这一点要在报告里写清楚，所以合并只在整套都验收之后做。
4. 写 `reports/SUMMARY.md`：27 个包各自的状态、预览网址、已知问题、`ROLLBACK_LOG.md` 的最终状态。

## 可以改的文件
`docs/DESIGN_TOKENS.md`、`AGENTS.md`、`docs/PROGRESS.md`、`docs/design-upgrade/**`、`.stylelintrc.json`、`src/styles/*`（仅第 3 步）、`src/styles.css`（仅第 3 步）。

## 验收
- `npm run check` 全绿；`dx-shots` 前后字节一致（第 3 步）；文档里每个提交号、每个数字都能用命令复现。

## 回滚
R2。
