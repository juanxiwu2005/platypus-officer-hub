# 第二阶段入口 — 无障碍、字数门禁与工具链安全

## 给阶段主 agent 的完整提示词

在 GitHub 仓库 `juanxiwu2005/platypus-officer-hub` 执行 DP8 发布准备第二阶段。使用 GPT-6.1 High；工具链大版本迁移复杂时可用 XHigh。

1. 先读 `AGENTS.md`、release-readiness README、manifest，以及第一阶段在 `docs/PROGRESS.md` 的最新交接。
2. 读取 manifest 中第二阶段的三个完整工作包：WP05、WP06、WP08。
3. `git fetch origin`，只使用最新 `origin/integration/v1.0`，报告完整/短 SHA。确认第一阶段六个 `[RR-WPxx]` 工作包已集成；如不完整，停止并报告，不得猜测补做。
4. 创建三个 sub-agent 和三个独立 worktree/分支：
   - `codex/rr-wp05-a11y`
   - `codex/rr-wp06-words`
   - `codex/rr-wp08-toolchain`
5. 三个 worktree 从同一最新远端 SHA 创建。每个 agent 只执行对应工作包，不更新 `docs/PROGRESS.md`，不合并其他分支，不使用 `main`。
6. 等待并逐一审查 diff、commit 和验收证据。禁止通过禁用 Axe、提高字数/包体限制、audit ignore、skip 或 timeout 伪造结果。
7. 从最新远端建立独立集成 worktree，按 WP05 → WP06 → WP08 顺序 cherry-pick；逐处解决冲突并在每个包后运行目标测试。
8. 全部集成后至少执行：
   - `npm ci`
   - Node 22 下 `npm run lint`、`npm run build`、`npm test`
   - `npm run words`
   - `e2e/a11y.spec.ts` desktop/mobile
   - Rules/Events/smoke 相关 Playwright
   - `npm audit --omit=dev` 和完整 `npm audit`
   - `git diff --check`
9. 阶段主 agent统一更新 `docs/PROGRESS.md`，记录第二阶段提交、测试、audit 结果和任何有依据的例外。
10. 推送前 fetch。只有能安全快进且阶段验收通过时，推送 `HEAD:integration/v1.0`；绝不 force push，绝不推送 main。失败时保留分支并报告。
11. 不调用真实 AIR。结束时报告新的远端 SHA、三个包 commit、测试结果，以及是否具备进入 WP10 的条件。
