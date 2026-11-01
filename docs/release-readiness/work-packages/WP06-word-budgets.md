# WP06 — 页面字数与信息密度门禁

## Agent 提示词

你负责恢复页面字数门禁并保留信息可发现性。本包属于第二阶段，必须基于已经集成 WP02 的最新 `origin/integration/v1.0`。开始前读取 `AGENTS.md`、README、manifest，fetch、报告基线 SHA，不得使用 `main`。

### 审核基线中的已知失败

- `/events`：总字数 614/420
- `/rules`：可见 324/170，总字数 1671/560
- `/team`：可见 138/130
- `/funding`：已重定向 Events，却仍按旧 Funding 160 总字数上限统计

### 要求

- `/funding` 从独立页面门禁移除或明确作为 `/events` alias，不得恢复重复页面。
- Events 默认只渲染当前需要的信息；次要详情按需展开或选中后渲染，不得删除预算、来源或关键截止日。
- Rules 的分类、搜索或 tabs 只渲染当前选中内容，同时保留全部政策来源可发现。不得只用 CSS 隐藏仍在 DOM 的大段文字作弊。
- Team 精简重复说明但保持角色和责任清楚。
- 除非有明确批准，不得简单提高 LIMITS；不得修改脚本忽略普通用户实际看到的内容。

### 验收标准

1. `npm run words` 完全通过并报告各页面修复前后计数。
2. Funding 不再作为不存在的独立页面重复统计。
3. 政策来源、事件预算和责任信息仍可通过键盘/读屏操作访问。
4. Rules/Events/smoke 相关 Playwright 测试通过。
5. `npm run lint`、`npm test`、`npm run build`、`git diff --check` 通过。
6. 创建一个 `[RR-WP06][Codex]` 提交。
