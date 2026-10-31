# WP08 — 开发与 CI 工具链安全

## Agent 提示词

你负责开发和 CI 工具链中的 high/critical 漏洞。本包属于第二阶段，必须从已经集成 WP07 的最新 `origin/integration/v1.0` 创建 worktree。开始前读取 `AGENTS.md`、README、manifest，fetch 并报告 SHA。不得使用 `main`，不得无审查运行 `npm audit fix --force`。

### 重点依赖

- Vitest / tinypool
- Vite / esbuild
- ESLint / minimatch
- 完整 `npm audit` 报告中的其他开发依赖

### 要求

- 逐项升级到受支持的安全版本，处理配置/API/测试兼容性变化。
- 保持 Node 22 CI 兼容。
- 不得删除 lint 规则、测试文件或测试覆盖来换取通过。
- 若 advisory 确无上游修复，必须证明不进入 production bundle，并记录依赖链、风险和解除条件；仍优先消除。

### 验收标准

1. 完整 `npm audit` critical 为 0，原则上 high 也为 0。
2. `npm audit --omit=dev` 保持 high/critical 为 0。
3. `npm ci` 通过。
4. Node 22 下 `npm run lint`、`npm run build`、`npm test` 通过。
5. Playwright 配置能列出并运行测试，测试数量未减少。
6. `git diff --check` 通过。
7. 创建一个 `[RR-WP08][Codex]` 提交，报告 audit 前后结果及任何例外。
