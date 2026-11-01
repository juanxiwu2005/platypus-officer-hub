# 第一阶段入口 — 并行修复核心契约、交互、安全和性能

## 给阶段主 agent 的完整提示词

在 GitHub 仓库 `juanxiwu2005/platypus-officer-hub` 执行 DP8 发布准备第一阶段。使用 GPT-6.1 High；WP07 如可单独配置，使用 XHigh。

1. 先读根目录 `AGENTS.md`、`docs/release-readiness/README.md` 和 `docs/release-readiness/manifest.json`。
2. 读取 manifest 中第一阶段的六个完整工作包：WP01、WP02、WP03、WP04、WP07、WP09。不得依赖聊天里可能过时的摘要。
3. 执行 `git fetch origin`，只使用最新 `origin/integration/v1.0`。报告完整和短 SHA，并验证审核基线 `7d84fa4` 是其祖先。禁止使用、修改或推送 `main`。
4. 明确使用多 agent：创建六个 sub-agent，每个只负责一个工作包。为每个 agent 创建独立 worktree 和分支：
   - `codex/rr-wp01-contract`
   - `codex/rr-wp02-events`
   - `codex/rr-wp03-tasks`
   - `codex/rr-wp04-setup`
   - `codex/rr-wp07-prod-security`
   - `codex/rr-wp09-performance`
5. 六个 worktree 必须从同一个最新远端 SHA 创建。把 worktree 的绝对路径和对应工作包文件交给各 agent；禁止它们在共享根目录修改文件或互相合并。
6. 阶段主 agent 在子 agent 工作期间不修改它们负责的文件。子 agent 不更新 `docs/PROGRESS.md`，也不推送 `main`。
7. 等待六个 agent 完成。逐一审查 diff、提交 SHA、测试证据和工作包验收标准。缺少证据或用弱化测试过关时退回原 agent 修正。
8. 从最新 `origin/integration/v1.0` 创建单独集成 worktree，按 WP01 → WP02 → WP03 → WP04 → WP07 → WP09 顺序 cherry-pick。禁止使用 `ours/theirs` 整体覆盖解决冲突；按当前产品契约逐处解决。
9. 每集成一个包运行其目标测试。全部集成后至少执行：
   - `npm ci`
   - Node 22 下 `npm run lint`、`npm run build`、`npm test`
   - 第一阶段涉及的 Playwright spec（desktop/mobile）
   - `npm audit --omit=dev`
   - bundle 大小检查
   - `git diff --check`
10. 第一阶段不要求提前完成 WP05/WP06/WP08，因此不要通过篡改 a11y、word budget 或开发 audit 标准来让它们假绿；如顺带已通过，如实记录。
11. 验收通过后，由阶段主 agent 在 `docs/PROGRESS.md` 添加一条第一阶段交接记录，创建一个仅含必要集成/文档更新的提交。
12. 推送前再次 fetch；只有远端仍是集成基线或能安全 rebase 时，才快进推送 `HEAD:integration/v1.0`。绝不 force push。若远端有未知新提交或任何阶段验收失败，不推送半成品，保留分支并报告。
13. 不自动调用真实 AIR。结束时报告：远端新 SHA、六个工作包 commit、测试结果、未解决风险和第二阶段是否可开始。
