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
| DX-09 | 未开始 | | `dx/dx-09-merged` | | `git revert -m 1 dx/dx-09-merged` | |
| DX-10 | 未开始 | | `dx/dx-10-merged` | | `git revert -m 1 dx/dx-10-merged` | |
| DX-11 | 未开始 | | `dx/dx-11-merged` | | `git revert -m 1 dx/dx-11-merged` | |
| DX-12 | 未开始 | | `dx/dx-12-merged` | | `git revert -m 1 dx/dx-12-merged` | |
| DX-13 | 未开始 | | `dx/dx-13-merged` | | `git revert -m 1 dx/dx-13-merged` | |
| DX-14 | 未开始 | | `dx/dx-14-merged` | | `git revert -m 1 dx/dx-14-merged` | |
| DX-15 | 未开始 | | `dx/dx-15-merged` | | `git revert -m 1 dx/dx-15-merged` | |
| DX-16 | 未开始 | | `dx/dx-16-merged` | | `git revert -m 1 dx/dx-16-merged` | |
| DX-17 | 未开始 | | `dx/dx-17-merged` | | `git revert -m 1 dx/dx-17-merged` | |
| DX-18 | 未开始 | | `dx/dx-18-merged` | | `git revert -m 1 dx/dx-18-merged` | |
| DX-19 | 未开始 | | `dx/dx-19-merged` | | `git revert -m 1 dx/dx-19-merged` | |
| DX-20 | 未开始（20a / 20b 分两个提交，可单独撤）| | `dx/dx-20-merged` | | `git revert -m 1 dx/dx-20-merged` | |
| DX-21 | 未开始 | | `dx/dx-21-merged` | | `git revert -m 1 dx/dx-21-merged` | |
| DX-22 | 未开始 | | `dx/dx-22-merged` | | `git revert -m 1 dx/dx-22-merged` | |
| DX-23 | 未开始 | | `dx/dx-23-merged` | | `git revert -m 1 dx/dx-23-merged` | |
| DX-24 | 未开始 | | `dx/dx-24-merged` | | `git revert -m 1 dx/dx-24-merged` | |
| DX-25 | 未开始 | | `dx/dx-25-merged` | | `git revert -m 1 dx/dx-25-merged` | |
| DX-26 | 未开始 | | `dx/dx-26-merged` | | `git revert -m 1 dx/dx-26-merged` | |
| DX-27 | 未开始 | | `dx/dx-27-merged` | | `git revert -m 1 dx/dx-27-merged` | |

## 阶段标签

| 标签 | 含义 | 已打 |
| --- | --- | --- |
| `dx/baseline` | 计划文档提交之后、任何代码改动之前（`77c94ee`）| 仅本地（推不上去）|
| `dx/phase-0-before` | 阶段 0 开始前（= baseline）| 仅本地 |
| `dx/phase-1-before` | 阶段 1 开始前（`8c70057`）| 仅本地 |
| `dx/phase-2-before` … `dx/phase-6-before` | 每个阶段开始前集成分支的位置 | 未到 |

## 回滚演练记录

| 日期 | 演练 | 结果 |
| --- | --- | --- |
| 2026-11-01 | 在临时 worktree 里对集成分支顶端先后执行 `git revert -m 1 dx/dx-02-merged`、`git revert -m 1 dx/dx-01-merged`，每步之后跑 `tsc` | 两步都干净、无冲突；撤 DX-02 后 `Layout.tsx` 回到 168 行；两个都撤后，`src`、`package.json`、`playwright.config.ts`、`.stylelintrc.json`、`scripts`、`.gitignore` 与 `77c94ee` **逐字一致**（`git diff` 为空）。临时 worktree 已丢弃，没有推送 |
| 2026-11-01 | 阶段 1：在临时 worktree 里对合并后的历史从后往前执行 `git revert -m 1 dx/dx-08-merged` … `dx-03-merged`（六个）| 六步都干净、无冲突；`tsc` 通过；撤完后 `src`、`package.json`、`playwright.config.ts`、`.stylelintrc.json`、`scripts`、`index.html`、`.gitignore`、`e2e` 与 `dx/phase-1-before` **逐字一致**。另测只撤 DX-05：干净，`tsc` 通过，`RISK_SHAPE` 已消失。临时 worktree 已丢弃 |

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
git push origin dx/baseline dx/phase-0-before dx/phase-1-before dx/dx-01-merged dx/dx-02-merged dx/dx-03-merged dx/dx-04-merged dx/dx-05-merged dx/dx-06-merged dx/dx-07-merged dx/dx-08-merged
# 2. 工作包分支（可选；这些提交已经在 claude/determined-johnson-yrdxwf 的历史里）
git push origin 8a941e68f9039cd90230d88fa169e1ee26138ad7:refs/heads/design/dx-01-foundation
git push origin 84f29c19f84c85363fcd08a36d5bd26b68106564:refs/heads/design/dx-02-split-layout
git push origin 2fd91d65c0b7ce173ca4aea4e4e79d822cced8d8:refs/heads/design/dx-03-press-feedback
git push origin d50dd30430ac258fa4261a2572bf2723cf58bfca:refs/heads/design/dx-04-touch-targets
git push origin 09e6c1d69a31d1eb097821a92ef0fba2ee9f31cd:refs/heads/design/dx-05-risk-shapes
git push origin cf21d37047bc989c0c30e720e6546f0b0c738882:refs/heads/design/dx-06-type-details
git push origin aa4fc035aab7c423f51111391aac4944f4581f23:refs/heads/design/dx-07-shell-meta
git push origin 1889e2c0f3053540d3d8c4b27edad31ebc57f445:refs/heads/design/dx-08-motion-guards
```
