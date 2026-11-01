# 回滚登记表

整合人每合并一个工作包，就在这里加一行；每回滚一次，就更新那一行的"状态"并写原因。
回滚方式见 `README.md` 的 R0–R5。`dx/dx-NN-merged` 标签指向"合并提交"。

| 工作包 | 状态 | 合并提交 | 标签 | 合并日期 | 回滚命令（R2）| 回滚日期 / 原因 |
| --- | --- | --- | --- | --- | --- | --- |
| DX-01 | **已合并**（阶段 0）| `9d5a9f0` | `dx/dx-01-merged` | 2026-11-01 | `git revert -m 1 dx/dx-01-merged` | |
| DX-02 | **已合并**（阶段 0）| `f1dbd24` | `dx/dx-02-merged` | 2026-11-01 | `git revert -m 1 dx/dx-02-merged` | |
| DX-03 | **已合并**（阶段 1）| `055af30` | `dx/dx-03-merged` | 2026-11-01 | `git revert -m 1 dx/dx-03-merged` | |
| DX-04 | **已合并**（阶段 1）| `39aab5a` | `dx/dx-04-merged` | 2026-11-01 | `git revert -m 1 dx/dx-04-merged` | |
| DX-05 | **已合并**（阶段 1）| `b5ee333` | `dx/dx-05-merged` | 2026-11-01 | `git revert -m 1 dx/dx-05-merged` | |
| DX-06 | **已合并**（阶段 1）| `0187d36` | `dx/dx-06-merged` | 2026-11-01 | `git revert -m 1 dx/dx-06-merged` | |
| DX-07 | **已合并**（阶段 1）| `775264a` | `dx/dx-07-merged` | 2026-11-01 | `git revert -m 1 dx/dx-07-merged` | |
| DX-08 | **已合并**（阶段 1）| `eb55e5a` | `dx/dx-08-merged` | 2026-11-01 | `git revert -m 1 dx/dx-08-merged` | |
| DX-09 | **已合并**（阶段 2）| `d419447` | `dx/dx-09-merged` | 2026-11-01 | `git revert -m 1 dx/dx-09-merged` | |
| DX-10 | **已合并**（阶段 2；合并后另有修复提交 `6f62b17`，撤 DX-10 时它也要一起撤）| `5a32bf7` | `dx/dx-10-merged` | 2026-11-01 | `git revert -m 1 dx/dx-10-merged` | |
| DX-11 | **已合并**（阶段 2）| `b54de9b` | `dx/dx-11-merged` | 2026-11-01 | `git revert -m 1 dx/dx-11-merged` | |
| DX-12 | **已合并**（阶段 2）| `e8ff3ec` | `dx/dx-12-merged` | 2026-11-01 | `git revert -m 1 dx/dx-12-merged` | |
| DX-13 | **已合并**（阶段 2）| `4b118e7` | `dx/dx-13-merged` | 2026-11-01 | `git revert -m 1 dx/dx-13-merged` | |
| DX-14 | **已合并**（阶段 2）| `d83af1f` | `dx/dx-14-merged` | 2026-11-01 | `git revert -m 1 dx/dx-14-merged` | |
| DX-15 | **已合并**（阶段 3）| `d89d959` | `dx/dx-15-merged` | 2026-11-01 | `git revert -m 1 dx/dx-15-merged` | |
| DX-16 | **已合并**（阶段 3）| `e6618b8` | `dx/dx-16-merged` | 2026-11-01 | `git revert -m 1 dx/dx-16-merged` | |
| DX-17 | **已合并**（阶段 3）| `8613954` | `dx/dx-17-merged` | 2026-11-01 | `git revert -m 1 dx/dx-17-merged` | |
| DX-18 | **已合并**（阶段 3）| `12f079e` | `dx/dx-18-merged` | 2026-11-01 | `git revert -m 1 dx/dx-18-merged` | |
| DX-19 | **已合并**（阶段 3）| `a5fcff5` | `dx/dx-19-merged` | 2026-11-01 | `git revert -m 1 dx/dx-19-merged` | |
| DX-20 | **已合并**（阶段 4，仅 20a）| `cc6a3d6` | `dx/dx-20-merged` | 2026-11-01 | `git revert -m 1 dx/dx-20-merged` | |
| DX-21 | **已合并**（阶段 4）| `f6bd79a` | `dx/dx-21-merged` | 2026-11-01 | `git revert -m 1 dx/dx-21-merged` | |
| DX-22 | **已合并**（阶段 4）| `bfafc89` | `dx/dx-22-merged` | 2026-11-01 | `git revert -m 1 dx/dx-22-merged` | |
| DX-23 | **已合并**（阶段 5）| `0e93cd6` | `dx/dx-23-merged` | 2026-11-01 | `git revert -m 1 dx/dx-23-merged` | |
| DX-24 | **已合并**（阶段 5）| `8ac5b82` | `dx/dx-24-merged` | 2026-11-01 | `git revert -m 1 dx/dx-24-merged` | |
| DX-25 | **已合并**（阶段 5）| `7ef5a87` | `dx/dx-25-merged` | 2026-11-01 | `git revert -m 1 dx/dx-25-merged` | |
| DX-26 | **已合并**（阶段 6）| `255c009` | `dx/dx-26-merged` | 2026-11-01 | `git revert -m 1 dx/dx-26-merged` | 用 DX-24 的 `dragSort.ts`：要撤 DX-24 必须先撤它 |
| DX-27 | **已合并**（阶段 6，第 3 步未做）| `7c27bea` | `dx/dx-27-merged` | 2026-11-01 | `git revert -m 1 dx/dx-27-merged` | 只含文档、`.stylelintrc.json`、`dxStyleGuard.test.ts`；撤了以后 `AGENTS.md` 第 0 节回到过期的说法 |

## 阶段标签

| 标签 | 含义 | 已打 |
| --- | --- | --- |
| `dx/baseline` | 计划文档提交之后、任何代码改动之前（`77c94ee`）| 仅本地（推不上去）|
| `dx/phase-0-before` | 阶段 0 开始前（= baseline）| 仅本地 |
| `dx/phase-1-before` | 阶段 1 开始前（`8c70057`）| 仅本地 |
| `dx/phase-2-before` | 阶段 2 开始前（`17af284`）| 仅本地 |
| `dx/phase-3-before` | 阶段 3 开始前（`a13f037`）| 仅本地 |
| `dx/phase-4-before` | 阶段 4 开始前（`8e7cdf3`）| 仅本地 |
| `dx/phase-5-before` | 阶段 5 开始前（`d4bcbda`）| 仅本地 |
| `dx/phase-6-before` | 阶段 6 开始前（`d8b0cbb`）| 仅本地 |

## ⚠ 有"后续修复提交"的包：撤的时候要**先撤修复，再撤包**

合并之后在整合检查或看截图时发现问题、又补了修复提交的包，修复提交改的是同一批行。直接撤包的合并提交会**冲突**（已实测：DX-10、DX-16 都冲突）。正确顺序是**先撤修复提交，再撤合并**：

| 要撤的包 | 先撤这些修复提交（新的在前）| 再撤 |
| --- | --- | --- |
| DX-10 | `git revert --no-edit 6f62b17` | `git revert -m 1 dx/dx-10-merged` |
| DX-15 | `git revert --no-edit a8775e6` | `git revert -m 1 dx/dx-15-merged` |
| DX-16 | `git revert --no-edit 3972412`，再 `git revert --no-edit a8775e6`（它同时改了 DX-16 的样式）| `git revert -m 1 dx/dx-16-merged` |

（`a8775e6` 同时修了 DX-15 和 DX-16，所以撤其中任何一个都要先撤它；撤 DX-15 但保留 DX-16 时，需要手工保留 DX-16 那部分，遇到这种情况请整合人单独处理。）

## 回滚演练记录

| 日期 | 演练 | 结果 |
| --- | --- | --- |
| 2026-11-01 | 在临时 worktree 里对集成分支顶端先后执行 `git revert -m 1 dx/dx-02-merged`、`git revert -m 1 dx/dx-01-merged`，每步之后跑 `tsc` | 两步都干净、无冲突；撤 DX-02 后 `Layout.tsx` 回到 168 行；两个都撤后，`src`、`package.json`、`playwright.config.ts`、`.stylelintrc.json`、`scripts`、`.gitignore` 与 `77c94ee` **逐字一致**（`git diff` 为空）。临时 worktree 已丢弃，没有推送 |
| 2026-11-01 | 阶段 1：在临时 worktree 里对合并后的历史从后往前执行 `git revert -m 1 dx/dx-08-merged` … `dx-03-merged`（六个）| 六步都干净、无冲突；`tsc` 通过；撤完后 `src`、`package.json`、`playwright.config.ts`、`.stylelintrc.json`、`scripts`、`index.html`、`.gitignore`、`e2e` 与 `dx/phase-1-before` **逐字一致**。另测只撤 DX-05：干净，`tsc` 通过，`RISK_SHAPE` 已消失。临时 worktree 已丢弃 |
| 2026-11-01 | 阶段 2：在临时 worktree 里对合并后的历史从后往前执行 `git revert -m 1 dx/dx-14-merged` … `dx-09-merged`（六个）| 六步都干净；`tsc` 通过；撤完后 `src`、配置、`scripts`、`index.html`、`e2e` 与 `dx/phase-2-before` **逐字一致**。只撤 DX-09 也干净。**注意**：这次演练是在 DX-10 修复提交之前做的；修复提交只动 `dx-10-menu-motion.css` 和 `e2e/helpers.ts`，撤 DX-10 时要连它一起撤（否则 helpers 里的 `aria-expanded` 改动会留下，无害）|
| 2026-11-01 | 阶段 3：对合并后的历史先撤两个修复提交，再从后往前撤 `dx-19-merged` … `dx-15-merged`（五个）| 全部干净；`tsc` 通过；撤完后与 `dx/phase-3-before` **逐字一致**。单撤 DX-17 也干净。**同时发现**：不先撤修复，直接撤 DX-16 会冲突；回头验证 DX-10 同样会冲突（上面的表）|
| 2026-11-01 | 阶段 4：对合并后的历史从后往前撤 `dx-22-merged`、`dx-21-merged`、`dx-20-merged` | 三步都干净；`tsc` 通过；撤完后与 `dx/phase-4-before` **逐字一致**（含 `e2e/helpers.ts` 和被机械替换的 12 个测试文件）。单撤 DX-21 也干净。本阶段**没有**合并后的修复提交 |
| 2026-11-01 | 阶段 5：对合并后的历史从后往前撤 `dx-25-merged`、`dx-24-merged`、`dx-23-merged` | 三步都干净；`tsc` 通过；撤完后与 `dx/phase-5-before` **逐字一致**。单撤 DX-24 也干净。**依赖发现**：单撤 DX-22 git 不冲突，但 `tsc` 报 3 处 "Cannot find module '../../lib/motion'"（DX-24、DX-25 用了它）——所以撤 DX-22 前必须先撤 DX-24、DX-25（已补进 `PHASES.md` 的依赖表）。本阶段没有合并后的修复提交 |
| 2026-11-01 | 阶段 6：对合并后的历史先撤 `dx-27-merged`，再撤 `dx-26-merged`（临时 worktree）| 两步都干净；`tsc` 通过；撤完后与 `dx/phase-6-before` **逐字一致**（`git diff --name-only` 为 0 个文件）。单撤 DX-26（不撤 DX-27）也干净、`tsc` 通过。 |

## 为什么这个会话推不了其他分支和标签（2026-11-01 调查）

| 试了什么 | 结果 |
| --- | --- |
| `git push -u origin <新分支> --tags` | `HTTP 403`，远端挂断 |
| 单独 `git push origin dx/baseline`（只有一个标签）| 同样失败。**所以不是"标签"特殊**，是任何不属于本会话的 ref 都被拒 |
| 推本会话分支 `claude/determined-johnson-yrdxwf` | 一直成功 |
| GitHub 工具（MCP）`create_branch` | 成功（用的是另一套凭证）。`integration/v1.6` 就是这样建出来的 |
| 本机代理状态 `__agentproxy/status` 的失败记录 | 只有无关的 `mcp.uk.definely.com`，**没有 github.com**，说明不是出口代理拦的 |

**结论（推断，不是 GitHub 官方说明）：** 这个会话的 git 推送凭证只被授权写它自己的分支。GitHub 工具有单独的凭证，能建分支、开 PR，但没有"更新已有分支"或"建标签"的工具，所以分支建出来之后我推不进去。

### 补建命令（需要有权限的账号或会话，在仓库里执行）

```bash
git fetch origin claude/determined-johnson-yrdxwf
# 1. 标签（让 git revert -m 1 dx/dx-NN-merged 在 GitHub 上也能用）
git tag dx/baseline 77c94ee732cb07ab7ecda635d2814f6da37b6947
git tag dx/phase-0-before 77c94ee732cb07ab7ecda635d2814f6da37b6947
git tag dx/dx-01-merged 9d5a9f0a2f35ca88371a8b0204f866325a6adebb
git tag dx/dx-02-merged f1dbd2401736b2630e7395807ae22083e94374b6
git tag dx/phase-1-before 8c70057bfaffd1394506c16c438bdbf41d258039
git tag dx/dx-03-merged 055af308552c8c0035d1000f0723b61af92751b7
git tag dx/dx-04-merged 39aab5aeb7f9fca42ad6e05e28a7cbe0a30014a2
git tag dx/dx-05-merged b5ee33311193819c10bb78ae1b13b6a74ef169cc
git tag dx/dx-06-merged 0187d36dd0dacbe866494de54233b5f46a0b3e61
git tag dx/dx-07-merged 775264a829b5b0c2108a303dcf811a399855d9e1
git tag dx/dx-08-merged eb55e5a25cb3db86f969c823b8896b7595217237
git tag dx/phase-2-before 17af284dde66fae2b10d27f805a9724496e10a53
git tag dx/dx-09-merged d4194474f009914337a0a0d9e372c950265d1780
git tag dx/dx-10-merged 5a32bf78e3645346c433afab7a151001aa816b6d
git tag dx/dx-11-merged b54de9b817e5d3b19ea4eb6882d8b4757643df02
git tag dx/dx-12-merged e8ff3ec1c24d20fa5c4fb764456f8e6102d4e802
git tag dx/dx-13-merged 4b118e700c448aed1e624f326f3c106e64e47162
git tag dx/dx-14-merged d83af1fbd7e2d85ea0a32eb4a39c9dc168138967
git tag dx/phase-3-before a13f037ca61a24f8731624d48b53d5d13f77b538
git tag dx/dx-15-merged d89d95989e361f9f3f9ba9d0316c841850f8b28d
git tag dx/dx-16-merged e6618b8058ae3b98cc4dca36834f511071ff23d1
git tag dx/dx-17-merged 8613954992e0888674eb58fb4cc9c13d9965c880
git tag dx/dx-18-merged 12f079e23cd52153e54ee40692f420a0ed205e0b
git tag dx/dx-19-merged a5fcff5e436bfe4e0b5286603aeb084cac2c3faa
git tag dx/phase-4-before 8e7cdf32e68eaf1c9f3239ee8b61a1ba2cf71c7d
git tag dx/dx-20-merged cc6a3d687d70a8bc1850a1045f0cee65d2868028
git tag dx/dx-21-merged f6bd79ab1939ba43083653cb113d4bc7433cd52e
git tag dx/dx-22-merged bfafc89701446364fa67c2cf35b69bc58d645624
git tag dx/phase-5-before d4bcbda5e05478c8297b4f4c2d7ba9228355ccb0
git tag dx/dx-23-merged 0e93cd644cfcf36a349c3d49aaa5e9f995064694
git tag dx/dx-24-merged 8ac5b82bab9a4820b40ab757fcc3fa8cab2e50dc
git tag dx/dx-25-merged 7ef5a877506835367ccbecbee0f3b593a15de30b
git tag dx/phase-6-before d8b0cbb9c9d8405da93519dc3b43f9857c07ed73
git tag dx/dx-26-merged 255c00964616ee604bb2bda0a0b831b5ec2e66aa
git tag dx/dx-27-merged 7c27beac87c6baa48e960dcdade28dc4fc3dd91c
git push origin dx/baseline dx/phase-0-before dx/phase-1-before dx/phase-2-before dx/phase-3-before dx/phase-4-before dx/phase-5-before dx/phase-6-before dx/dx-01-merged dx/dx-02-merged dx/dx-03-merged dx/dx-04-merged dx/dx-05-merged dx/dx-06-merged dx/dx-07-merged dx/dx-08-merged dx/dx-09-merged dx/dx-10-merged dx/dx-11-merged dx/dx-12-merged dx/dx-13-merged dx/dx-14-merged dx/dx-15-merged dx/dx-16-merged dx/dx-17-merged dx/dx-18-merged dx/dx-19-merged dx/dx-20-merged dx/dx-21-merged dx/dx-22-merged dx/dx-23-merged dx/dx-24-merged dx/dx-25-merged dx/dx-26-merged dx/dx-27-merged
# 2. 工作包分支（可选；这些提交已经在 claude/determined-johnson-yrdxwf 的历史里）
git push origin 8a941e68f9039cd90230d88fa169e1ee26138ad7:refs/heads/design/dx-01-foundation
git push origin 84f29c19f84c85363fcd08a36d5bd26b68106564:refs/heads/design/dx-02-split-layout
git push origin 2fd91d65c0b7ce173ca4aea4e4e79d822cced8d8:refs/heads/design/dx-03-press-feedback
git push origin d50dd30430ac258fa4261a2572bf2723cf58bfca:refs/heads/design/dx-04-touch-targets
git push origin 09e6c1d69a31d1eb097821a92ef0fba2ee9f31cd:refs/heads/design/dx-05-risk-shapes
git push origin cf21d37047bc989c0c30e720e6546f0b0c738882:refs/heads/design/dx-06-type-details
git push origin aa4fc035aab7c423f51111391aac4944f4581f23:refs/heads/design/dx-07-shell-meta
git push origin 1889e2c0f3053540d3d8c4b27edad31ebc57f445:refs/heads/design/dx-08-motion-guards
git push origin fd37d68fca92e926946afe1f2d5562986d52d011:refs/heads/design/dx-09-rail-motion
git push origin 8a10f35224157393e21cd38946420c9f447f2f39:refs/heads/design/dx-10-menu-motion
git push origin e6c5009a9af33c3faa3b6046541aab8d40bed4d8:refs/heads/design/dx-11-toast-motion
git push origin 1eb3aea9852b3321b67604dd686c63fc064878b8:refs/heads/design/dx-12-touch-hover-sheet
git push origin eb707ae248c3b6daea3b7d98eee595d22109c57f:refs/heads/design/dx-13-details-motion
git push origin 3efe52c5a39b683637337ba92fbfc7e03e46f7f4:refs/heads/design/dx-14-loading-skeleton
git push origin 5dbb0fad003d98e92394c964cf5a25673ea557a5:refs/heads/design/dx-15-events-layout
git push origin 23a2ccf8c586b484eb262d42dff151e48d48468a:refs/heads/design/dx-16-board-layout
git push origin 0372acdce350361b135ac7fb75460f070134491c:refs/heads/design/dx-17-ask-panel
git push origin 7c58010e7b874867de82442113efda53b11c99ae:refs/heads/design/dx-18-empty-states
git push origin 22eb91f8207d19e9debcf5740af8b095ec3a2652:refs/heads/design/dx-19-detail-swap
git push origin 5a3a8235afe4e3799add6af246e5aa2a2841bc68:refs/heads/design/dx-20-mobile-shell
git push origin 01a2e73219660a8a03790c380c66a70169501e6f:refs/heads/design/dx-21-board-headers
git push origin 012f54b7adda19f169fc3fa832f83c9a3ed6394c:refs/heads/design/dx-22-flow-motion
git push origin c158b065f3fb3559ef52b070a433c621adc0d21d:refs/heads/design/dx-23-glass-topbar
git push origin 248bdcb4aa8194fe4fd66e1c353bc965dd9ef9fd:refs/heads/design/dx-24-board-drag
git push origin 37828546afc583f89bd3d70de6d5b6cc45e7bf24:refs/heads/design/dx-25-done-moment
git push origin 9cb8020c96887c25804af9bbfd414dd003ae23c6:refs/heads/design/dx-26-crm-drag
git push origin 6f050b7234760cd2a51905ec4756862a83d26e52:refs/heads/design/dx-27-docs-closeout
```
