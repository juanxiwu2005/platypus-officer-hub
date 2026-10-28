# Night Mode 任务库

这里是已经写好、随时可以投进队列的任务文件。映射表和清单都由人先算好了
（`docs/NIGHT_MODE.md` 7c 第 1 条：调查交给人，Night Mode 只做机械改动）。

用法：

```bash
cd /Users/Dirofs/AI-Projects/platypus-night-mode
git pull
mkdir -p .nightmode/queue
cp docs/night-tasks/T*.md .nightmode/queue/     # 或只挑想跑的
caffeinate -dimsu bash scripts/night-queue.sh
```

| 任务 | 做什么 | 视觉风险 | 预计 | 依赖 |
| --- | --- | --- | --- | --- |
| T1 | z-index 命名化 | **零** | 30 分 | — |
| T2 | 圆角收敛到 4 档 | 低（两处 +2px）| 40 分 | — |
| T3 | 字号收敛到 7 档 | 低（最大 ±1px）| 50 分 | — |
| T4 | 状态色归一 + 修 `--st-now` | **中，需 Juanxi 验收** | 50 分 | — |
| T5 | 对比度修复 | 中 | 40 分 | T4 |
| T6 | 间距收敛（只动奇数值）| 低 | 40 分 | — |
| T7 | 写 `docs/DESIGN_TOKENS.md` | 零（只写文档）| 30 分 | T1 T2 T3 T4 |

**T1 放第一个是有意的**：它零视觉风险，用来验证队列本身是通的。
