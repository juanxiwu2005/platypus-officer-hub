# WP04 — Setup、Team、Settings 与移动端遮挡

## Agent 提示词

你负责组织 Setup、Team、Settings 及移动端控件被遮挡的问题。开始前读取 `AGENTS.md`、README、manifest，fetch 并确认最新阶段基线 SHA。不得使用 `main`。

### 负责范围

- `e2e/setup-team.spec.ts`
- `e2e/workflow-setup.spec.ts`
- `e2e/phase1.spec.ts` 中 setup/team 场景
- Settings、组织图、角色管理、邀请成员、meeting finder 相关组件和样式

### 已知真实问题

移动端 Settings 中 `org-canvas`、`roles-manager`、settings nav 或顶部栏会拦截 Undo、Invite officers、Try officer setup 等控件的 pointer events。

### 要求

- 找出布局高度、sticky、z-index、overflow、transform 或滚动定位中的真实根因。
- 保证 375px、390px 和 768px 宽度下可见控件都能真实点击/触控；禁止 force click。
- 更新旧种子数量、旧角色名称、旧流程节点和 meeting finder 日期假设。
- 保持隐私与一致性：私人 buffer/文件/profile 不进入共享请求；批准后才创建 workspace；AI 失败仍可手工完成；保存失败不能伪装成功；过期或篡改邀请不能修改状态。
- 禁止删除移动测试、skip 或提高 timeout 掩盖布局问题。

### 验收标准

1. `setup-team.spec.ts`、`workflow-setup.spec.ts` 全部通过。
2. `phase1.spec.ts` 的 setup/team 场景通过。
3. 375/390/768px 下 Undo、Invite officers、Settings 分区和组织图均可操作。
4. 日志中不再出现目标控件被 `intercepts pointer events` 阻挡。
5. request-body 隐私断言保留并通过。
6. `npm run lint`、`npm test`、`npm run build`、`git diff --check` 通过。
7. 创建一个 `[RR-WP04][Codex]` 提交，报告根因和验证 viewport。
