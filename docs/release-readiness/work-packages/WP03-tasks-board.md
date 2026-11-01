# WP03 — Tasks、Board 与任务详情

## Agent 提示词

你负责修复 Tasks、Board、任务详情和相关 E2E。开始前读取 `AGENTS.md`、README、manifest，fetch 并确认最新阶段基线 SHA。不得使用 `main` 或修改其他工作包拥有的测试文件。

### 负责范围

- `e2e/tasks.spec.ts`
- `e2e/rehearsal.spec.ts` 中任务操作场景
- Tasks、Board、任务详情、延期申请相关组件
- 必要的 feature-scoped 样式

### 必须验证

- 领取未分配任务；Waiting、Need help、Done 状态更新。
- 延期草稿、提交和社长批准。
- Table、Board、Timeline 使用同一任务数据。
- Board 拖拽和键盘替代操作。
- 自定义状态名称；新任务不能直接创建为完成。
- 普通成员不能移动不属于自己的任务。
- 刷新后状态保持；手机上可操作。

### 要求

- 移除对已经不存在的 `my-tasks`、旧 `move-menu` 等 DOM 契约的依赖，使用当前稳定语义。
- 如果旧功能已经由 Activity workspace 替代，验证等价业务结果，不恢复重复 UI。
- 不得弱化权限、持久化或状态转换断言。
- 禁止 skip、force click、删除断言或只提高 timeout。

### 验收标准

1. `tasks.spec.ts` 在 desktop/mobile 全部通过。
2. `rehearsal.spec.ts` 的任务领取、状态更新和完成路径通过。
3. 鼠标、键盘、移动端各有至少一条状态变更路径。
4. 状态在 reload 后保持，权限负面测试保留并通过。
5. `npm run lint`、`npm test`、`npm run build`、`git diff --check` 通过。
6. 创建一个 `[RR-WP03][Codex]` 提交，区分产品修复与测试迁移。
