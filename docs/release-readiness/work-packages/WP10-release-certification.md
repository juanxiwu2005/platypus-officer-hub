# WP10 — 最终集成与发布认证

## Agent 提示词

你负责全部工作包合并后的最终发布认证。原则上不增加新功能，只修复集成回归。本包属于第三阶段，必须从最新 `origin/integration/v1.0` 创建干净 worktree。开始前读取 `AGENTS.md`、README、manifest 和前两阶段交接，fetch，确认 HEAD 与远端一致并报告完整/短 SHA。不得使用或修改 `main`。

### 禁止事项

- 不得用 skip、提高 timeout、删除测试、force click、降低字数/安全/包体标准获取绿色结果。
- 不得自动调用真实付费 AIR；只准备人工 smoke checklist。
- 不得在存在失败门禁时声称可合并 main。

### 必须执行

1. `npm ci`
2. Node 22：`npm run lint`、`npm run build`、`npm test`
3. Netlify Functions 与后端库严格 TypeScript 检查
4. `npm run words`
5. 完整 Playwright：desktop、mobile、desktop-storage、mobile-storage
6. `npm audit --omit=dev`
7. 完整 `npm audit`
8. `git diff --check HEAD`
9. `git fsck --no-reflogs --connectivity-only`
10. Secret/private-key 扫描
11. 构建产物大小和 lazy loading 检查
12. 权限允许时读取当前 GitHub Checks

### 验收标准

- lint/build/unit 全部通过。
- Playwright 0 失败；所有 skip 都是既有、明确、有记录的条件跳过，不能新增无理由 skip。
- `npm run words` 通过。
- 生产 audit 0 high/critical；完整 audit 0 critical，原则上 0 high。
- 主入口 chunk 低于 500 kB。
- 工作区干净，HEAD 与最新 `origin/integration/v1.0` 一致。
- 无 secret 泄漏。
- 输出按底层逻辑、数据架构、前端、后端、安全、交互、无障碍、性能分类的发布报告，以及真实 AI 人工 smoke checklist。
- 只有全部硬门禁通过后才能给出“可以申请合并 main”的结论；真正合并 main 仍需 Juanxi 另行明确批准。

如需修复集成回归，创建一个 `[RR-WP10][Codex]` 提交；若无需修改，明确报告无 commit。
