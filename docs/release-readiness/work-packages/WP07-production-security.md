# WP07 — 生产依赖安全

## Agent 提示词

你负责生产依赖安全升级。开始前读取 `AGENTS.md`、README、manifest，fetch 最新阶段基线并报告 SHA。不得使用 `main`，不得运行不受控的 `npm audit fix --force`，不得顺便升级 WP08 负责的开发工具。

### 审核基线中的已知问题

- `react-router-dom` 6.28.0 / `@remix-run/router`：开放重定向与 protocol-relative redirect/XSS 公告。
- Zod 3.x：超大 constrained collections 可能导致内存耗尽。

### 要求

- 升级 React Router 到修复且兼容的版本。
- 升级 Zod 到安全版本；若跨 major，完整迁移客户端和服务端调用，并补解析失败、超大输入和拒绝路径测试。
- 检查 redirect 只接受受控内部路径或明确白名单。
- 更新并保持 `package.json`/`package-lock.json` 一致。
- 不得使用 audit ignore 掩盖生产漏洞。

### 验收标准

1. `npm audit --omit=dev` 的 high/critical 均为 0。
2. `npm ci`、`npm run lint`、`npm run build`、`npm test` 通过。
3. Netlify Functions/后端库严格 TypeScript 检查通过。
4. 路由、无效解析和超大 payload 有回归测试。
5. `git diff --check` 通过。
6. 创建一个 `[RR-WP07][Codex]` 提交，报告升级前后版本和 audit 结果。
