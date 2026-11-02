# Onboarding 回滚记录

| 包 | 合并提交 | 回滚方式 |
| --- | --- | --- |
| OB-01 | `a3e3c16` | `git revert -m 1 a3e3c16` |
| OB-02 | `0452655` | `git revert -m 1 0452655` |
| OB-03 | `d9b302c` | `git revert -m 1 d9b302c` |
| 阶段 0 补齐（OB-01/03 的修复） | 见 `git log` 中 `[OB-01/03][Claude] 补齐阶段 0` | **先撤它**，再撤 OB-03、OB-01；`git revert <SHA>` |
| OB-07 | `18e8d0a`（另有修复提交：示例提醒去掉写死的日期，撤包前**先撤它**） | `git revert -m 1 18e8d0a` |
| OB-04 | `97abaa3` | `git revert -m 1 97abaa3` |
| OB-06 | `b7147a1`（另有修复提交：样式守卫覆盖 ob-*.css、默认第一场活动改春季日期，撤包前先撤它） | `git revert -m 1 b7147a1` |

| OB-05 | `39c033b` | `git revert -m 1 39c033b` |
| OB-08 | `8c1e0b9` | `git revert -m 1 8c1e0b9` |
| OB-09 | `d203f75`（另有修复提交：`draft.clear()` 取消待保存的定时器、去掉 Confirm 里的绕法，撤包前**先撤它**） | `git revert -m 1 d203f75` |
| OB-10 切换 | `cdbc6d5`（把 Start walkthrough 指向新流程；流程版本 ob-2） | `git revert cdbc6d5`，则 Start 回到旧设立页；**R1 更快：不开入口开关即可让全站回到以前** |
| OB-01 进度链修复 | `76e46d5` | `git revert 76e46d5`（撤 OB-01 前先撤它） |

**回滚演练（2026-11-02）：** 在临时 worktree 里把阶段 2、3 的 18 个主线提交从后往前全部撤销：无冲突，`src`、`e2e`、样式文件与阶段 2 开始前（`89952fd`）逐字一致，`tsc` 通过。

