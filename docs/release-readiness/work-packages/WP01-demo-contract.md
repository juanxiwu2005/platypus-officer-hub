# WP01 — Demo 日期、种子与路由契约

## Agent 提示词

你负责修复因 Demo 日期、种子事件和 Funding 路由变化导致的陈旧测试契约。

开始前读取 `AGENTS.md`、本目录 README 和 manifest。执行 `git fetch origin`，确认 worktree 从阶段主 agent 指定的最新 `origin/integration/v1.0` SHA 创建，报告短 SHA。不得使用 `main` 或其他 agent 的 worktree。

### 负责范围

- `e2e/smoke.spec.ts`
- `e2e/recovery.spec.ts`
- `e2e/safety.spec.ts`
- `e2e/m2b.spec.ts`
- `e2e/bts.spec.ts`
- `e2e/today.spec.ts`
- 必要的测试 helper/fixture

### 要求

- 不得把生产种子改回 2026-10-22。
- 测试应从当前种子、页面状态或共享 fixture 推导日期，避免再次硬编码 Demo 日期。
- `/funding` 已重定向到 `/events`；验证新契约，不得恢复独立 Funding 页面。
- 修正事件数量、默认截止日、导出状态、模拟时钟和 Reset demo 的预期。
- 保留真正的业务断言：时钟推进/重置、导出前后状态、默认任务截止日、AI-off fallback、页面无运行错误。
- 若发现真实产品缺陷，可以修复，但必须加入回归测试并在交付报告中区分“测试漂移”和“产品缺陷”。
- 禁止 skip、删除断言、盲目增加 timeout 或放宽到无意义 locator。

### 验收标准

1. 上述六个 spec 在 desktop 和 mobile 项目全部通过。
2. owned tests 不再无理由硬编码旧日期 `2026-10-22`、`2026-10-23`、`2026-10-27`、`2026-10-29`。
3. `/funding` 重定向行为有明确断言。
4. `npm run lint`、`npm test`、`git diff --check` 通过。
5. 不减少测试数量或覆盖的业务行为。
6. 创建一个 `[RR-WP01][Codex]` 提交，返回 commit SHA、修改文件、测试命令和结果。
