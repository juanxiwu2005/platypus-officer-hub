# DP8 发布准备修复计划

本目录是 `integration/v1.0`（Deploy Preview 8）进入 `main` 前的修复任务正本。它把 2026-10-31 审核发现的问题拆成 10 个可独立执行、可验收的工作包，并提供三个阶段入口。

## 自动发现入口

任何新 Codex/ChatGPT 会话都应按以下顺序读取：

1. 仓库根目录 `AGENTS.md`
2. `docs/release-readiness/manifest.json`
3. 当前阶段文件：
   - 第一阶段：`docs/release-readiness/stages/STAGE1.md`
   - 第二阶段：`docs/release-readiness/stages/STAGE2.md`
   - 第三阶段：`docs/release-readiness/stages/STAGE3.md`
4. 阶段文件列出的工作包提示词

`manifest.json` 是机器可读索引；工作包的完整范围和验收标准只以 `work-packages/` 下对应文件为准。

## 阶段与依赖

| 阶段 | 工作包 | 并行方式 |
| --- | --- | --- |
| 1 | WP01、WP02、WP03、WP04、WP07、WP09 | 六个隔离 worktree 并行 |
| 2 | WP05、WP06、WP08 | 第一阶段集成后，三个隔离 worktree 并行 |
| 3 | WP10 | 单一发布认证 worktree |

所有阶段只允许修改 `integration/v1.0`。`main` 是 Production，未经 Juanxi 单独明确批准，任何 agent 都不得修改、推送或合并 `main`。

## 共同硬规则

- 每次开始先 `git fetch origin`，以最新 `origin/integration/v1.0` 为基线并报告短 SHA。
- 不使用旧 worktree、旧 agent 分支或聊天记忆覆盖 GitHub 事实。
- 并行任务必须使用不同 worktree 和不同分支。
- 禁止用 `skip`、`fixme`、删除断言、盲目提高 timeout、`force` click、提高字数/包体门槛或 audit ignore 来伪造绿色结果。
- 不自动调用真实付费 AIR；真实 AI 验收保留为人工步骤。
- 每个工作包只产生一个范围清晰的提交，提交前执行该包要求的测试和 `git diff --check`。
- 子 agent 不更新 `docs/PROGRESS.md`，由阶段主 agent 在集成完成后统一更新，避免并行冲突。
- 阶段主 agent只有在该阶段验收通过后才能快进推送 `origin/integration/v1.0`；失败时保留工作分支并报告，不推送半完成集成。
