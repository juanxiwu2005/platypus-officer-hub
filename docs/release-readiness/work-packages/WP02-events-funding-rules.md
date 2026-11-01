# WP02 — Events、Funding 合并与 Rules 交互

## Agent 提示词

你负责修复 Events、已并入 Events 的 Funding 流程、Rules 页面及相关浏览器测试。开始前读取 `AGENTS.md`、README、manifest，fetch 最新远端，确认 worktree 基线并报告短 SHA。不得使用 `main`。

### 负责范围

- `e2e/events.spec.ts`
- `e2e/flow-edit.spec.ts`
- `e2e/feel.spec.ts`
- `e2e/touch.spec.ts` 中 Events/Funding 场景
- `e2e/wp5.spec.ts`
- Events、Rules、事件预算相关生产组件

### 要求

- 对照当前产品意图，替换失效的 `node-panel`、旧流程节点 ID、旧事件日期和旧 Funding 页面契约。
- Funding 不再是独立页面；预算查看、申请状态、Plan B 和人工进度应在 Events 中可用。
- 验证流程节点可用鼠标、触控和键盘打开；事件日期变化会重算计划；Flow/List 使用同一数据；预算表在桌面和手机可用；编辑、Undo、刷新持久化和 Reset 正常。
- Rules 中相似的 “Ask Platypus” 操作必须有唯一、稳定、可访问的名称。不得用模糊 locator 掩盖重复名称。
- 优先使用 role、accessible name 和稳定业务 test id。
- 禁止恢复重复 Funding 页面、force click、skip、删除断言或单纯增加 timeout。

### 验收标准

1. `events.spec.ts`、`flow-edit.spec.ts`、`feel.spec.ts`、`wp5.spec.ts` 全部通过。
2. `touch.spec.ts` 的 Events/Funding 场景在 mobile 通过。
3. desktop/mobile 均验证日期重算、预算、流程编辑、持久化和 Reset。
4. Rules 同类按钮 accessible name 唯一。
5. `npm run lint`、`npm test`、`npm run build`、`git diff --check` 通过。
6. 创建一个 `[RR-WP02][Codex]` 提交并返回证据。
