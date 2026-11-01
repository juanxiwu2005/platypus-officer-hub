# 回滚登记表

整合人每合并一个工作包，就在这里加一行；每回滚一次，就更新那一行的"状态"并写原因。
回滚方式见 `README.md` 的 R0–R5。`dx/dx-NN-merged` 标签指向"合并提交"。

| 工作包 | 状态 | 合并提交 | 标签 | 合并日期 | 回滚命令（R2）| 回滚日期 / 原因 |
| --- | --- | --- | --- | --- | --- | --- |
| DX-01 | 未开始 | | `dx/dx-01-merged` | | `git revert -m 1 dx/dx-01-merged` | |
| DX-02 | 未开始 | | `dx/dx-02-merged` | | `git revert -m 1 dx/dx-02-merged` | |
| DX-03 | 未开始 | | `dx/dx-03-merged` | | `git revert -m 1 dx/dx-03-merged` | |
| DX-04 | 未开始 | | `dx/dx-04-merged` | | `git revert -m 1 dx/dx-04-merged` | |
| DX-05 | 未开始 | | `dx/dx-05-merged` | | `git revert -m 1 dx/dx-05-merged` | |
| DX-06 | 未开始 | | `dx/dx-06-merged` | | `git revert -m 1 dx/dx-06-merged` | |
| DX-07 | 未开始 | | `dx/dx-07-merged` | | `git revert -m 1 dx/dx-07-merged` | |
| DX-08 | 未开始 | | `dx/dx-08-merged` | | `git revert -m 1 dx/dx-08-merged` | |
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
| `dx/phase-0-before` … `dx/phase-6-before` | 每个阶段开始前集成分支的位置 | |
