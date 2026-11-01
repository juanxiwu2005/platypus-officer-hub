# WP05 — 跨应用无障碍与键盘操作

## Agent 提示词

你负责跨应用无障碍、焦点管理和键盘交互。本包属于第二阶段，必须从已经集成 WP02、WP03、WP04 的最新 `origin/integration/v1.0` 创建 worktree。开始前读取 `AGENTS.md`、README、manifest，fetch、报告基线 SHA，不得使用 `main`。

### 负责范围

- `e2e/a11y.spec.ts`
- 通用详情面板、dialog/right rail、导航和焦点管理
- 必要的全局或组件级无障碍样式

### 要求

- 将测试更新到当前产品结构，不得恢复旧 DOM。
- 打开详情后焦点进入详情；Escape 关闭并返回触发元素。
- Tab 顺序符合视觉和阅读顺序；被 modal/right rail 覆盖的页面不能获得焦点。
- 流程节点和主要控件满足触控目标尺寸；Board 有无需拖拽的键盘路径。
- `/` 快捷键聚焦 Ask 时不能劫持正在输入的文本框。
- Axe 不得有 serious/critical violation。不得禁用 target-size 或其他规则来过关。
- 禁止 force click、skip、删除键盘断言或无意义放宽 locator。

### 验收标准

1. `e2e/a11y.spec.ts` 在 desktop/mobile 全部通过。
2. 主要页面 Axe serious/critical 为 0。
3. 流程节点不再报告 target-size violation。
4. right rail/dialog 的打开、Escape、焦点恢复和手机焦点 trap 均有断言。
5. `npm run lint`、`npm test`、`npm run build`、`git diff --check` 通过。
6. 创建一个 `[RR-WP05][Codex]` 提交，报告修复的 WCAG/交互问题。
