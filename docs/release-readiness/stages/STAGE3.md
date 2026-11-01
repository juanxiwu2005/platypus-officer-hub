# 第三阶段入口 — 最终发布认证

## 给阶段主 agent 的完整提示词

在 GitHub 仓库 `juanxiwu2005/platypus-officer-hub` 执行 DP8 发布准备第三阶段。使用 GPT-6.1 XHigh。

1. 读 `AGENTS.md`、release-readiness README、manifest、WP10 完整提示词，以及 `docs/PROGRESS.md` 中前两阶段交接。
2. `git fetch origin`，在干净 worktree 中只检出最新 `origin/integration/v1.0`。报告完整/短 SHA，确认 WP01–WP09 的阶段提交均已集成。禁止使用或修改 `main`。
3. 严格执行 WP10 的全部检查。可以用子 agent 做只读审查或并行测试分析，但最终结论和任何修复由一个发布认证 worktree 统一负责，避免多分支再次分叉。
4. 任何失败都要先判断是产品缺陷、测试漂移、环境限制还是外部服务限制；只能修复前两类。禁止 skip、提高 timeout、删除断言、降低门禁、force click 或 audit ignore。
5. 如发现集成回归，在当前认证分支做最小修复、补回归测试并创建 `[RR-WP10][Codex]` 提交，然后重新跑受影响检查和完整发布门禁。
6. 不自动调用真实 AIR。制作可由 Juanxi 在 Deploy Preview 8 手工执行的真实 AI smoke checklist，并明确它未自动完成。
7. 只有 WP10 所有硬门禁通过，才统一更新 `docs/PROGRESS.md`，fetch 确认远端未前进，然后快进推送 `HEAD:integration/v1.0`。绝不 force push，绝不推送或合并 main。
8. 最终报告必须按底层逻辑、数据架构、前端、后端、安全、交互、无障碍、性能分类，列出命令、计数、跳过原因、GitHub Checks 状态和远端最终 SHA。
9. 结论措辞只能是“可以申请 Juanxi 批准合并 main”或“仍不可合并”；本阶段本身无权合并 main。
