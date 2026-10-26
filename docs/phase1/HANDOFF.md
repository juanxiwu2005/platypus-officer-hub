# Phase 1 原型交接与验收

2026-10-25 · Codex · **待 Juanxi 画面验收，到此停止。**

## 打开预览

- 新原型入口：`/#/phase1`。
- 本机可点击预览：http://127.0.0.1:4173/#/phase1 （预览服务运行期间可用）。
- [草稿 PR #2](https://github.com/juanxiwu2005/platypus-officer-hub/pull/2)（目标 v1）已创建。当前未收到 Netlify 部署状态；远端链接未确认，不使用旧 PR #1 作为本次预览。GitHub CI 状态以 PR 页面为准，本机完整检查已通过。
- 旧版入口 `/` 原样保留，可从 Open legacy workspace 返回。

## 五步验收

1. **Home**：点 Plan a member activity → Review workflow，检查首页入口是否清楚。
2. **Organization setup**：点 Continue → Use fictional example，试 Accept / Edit / Reject，看建议下方的章程原文。
3. **Responsibilities**：接受一条与 Marketing 冲突的外部联系建议后，选择保留人工分工或使用章程建议；确认后才更新组织资料。也可 Skip constitution 走简短路径。
4. **Activity**：切换 Demo organization A/B，比较公司的负责人；试 List/Board、点任务、改变演示状态、Review plan → Approve preview。
5. **手机与恢复**：中途刷新设置，应停在当前步骤。试保留一个 Needs confirmation 的负责人，确认资料后在 Activity 中问公司联系由谁负责，系统应只问一个选择题，缺少负责人时不能批准计划。

回复“可以”或“改哪里”即可。无需读代码。

## 交付内容与修改文件

| 文件 | 内容 |
|---|---|
| `src/App.tsx` | 仅新增隔离的 `/phase1/*` 路由，旧路由不变 |
| `src/phase1/PhaseOne.tsx` | 三个画面、统一 composer、五步设置、建议审核、自定义岗位、分工和流程预览 |
| `src/phase1/phase1.css` | 独立样式、桌面/手机、对比度、触控与键盘焦点 |
| `src/phase1/model.ts` | 前端预览模型、七个高层能力组和虚构 Constitution |
| `src/phase1/logic.ts` | scope 分工、候选校验与原文映射、人工优先、两类流程和现有日期引擎的预览桥接 |
| `src/phase1/repository.ts` | 前端演示 repository/localStorage adapter，草稿与批准快照分开、组织和账户范围、7 天保存策略 |
| `src/phase1/phase1.test.ts` | 26 项新增单元检查 |
| `e2e/phase1.spec.ts` | 17 项场景，各跑桌面和手机，共 34 项新增页面检查 |
| `public/phase1/fictional-constitution.txt` | 可用于上传的虚构样例 |
| `docs/phase1/ARCHITECTURE.md` | 六层模型、完整字段设计、复用/重写清单、接口边界、迁移与数据治理 |
| `docs/phase1/HANDOFF.md` | 本交接、验收和已知限制 |
| `docs/PROGRESS.md` | 方向变化、本次状态、测试、预览和下一位边界 |
| `docs/PRODUCT_PLAN.md` | 增加新方向说明，历史计划保留 |
| `AGENTS.md` | 新原型的明确规则及停止条件 |

截图位于本地 `output/playwright/phase1-{home,setup,workspace}-{desktop,mobile}.png`；输出目录不提交仓库。预览之外未修改旧 schema、规则条目、旧页面和旧测试。

## 验证结果

完整 `npm run check` 成功：

- TypeScript 检查与 Vite 构建通过。
- Vitest：**279/279**，包含原有 253 与新增 26。
- Playwright：**141 通过，13 跳过**。新增 34 项全部通过；13 项是原测试已有的手机重复无障碍/悬停跳过，不是删除或放宽旧测试。
- 新检查覆盖：A/B 分工、多能力岗位、Constitution schema allowlist/证据/敏感字段、人工与章程冲突、上下文权限策略、Activity 分类、两类流程、一个不确定性问题、AI 日期过滤、迁移检查、无私人信息交接、草稿恢复/过期/已批准快照、桌面/手机、键盘、44px 触控、上传和跳过 Constitution、三画面 axe AA 扫描。
- 手动查看了桌面首页、桌面 Activity 与手机设置截图；修正辅助文字对比度、List/Board 尺寸与跳转入口。
- 本次没有真实 AI 测试，没有用户首次使用计时，没有生产权限测试。26 项模型测试只验证局部预览逻辑，不是正式 API 或真实迁移已完成的证据。

## 已知限制

1. **Constitution 是本地演示提取器**，只识别有限虚构句式；不是 AIR/DeepSeek。仅支持 txt/md/粘贴，无 PDF/Word/OCR。
2. **Activity 是两份可操作的流程预览**。用户一句话只做场景分类与选项追问，不是完整开放式 planner。批准和任务状态仅用于本地预览，不写旧 Store。
3. 新预览可演示按组织/账户检查 repository 权限，但 localStorage 与演示账户不构成生产安全边界。未实现真实登录、数据库或服务端组织隔离。
4. 没有执行旧数据迁移；只提供策略和保留原记录的纯检查函数。旧 Tasks/Funding/Handoff 等行为仍保留，在旧入口中还存在独立任务与旧存储方式。
5. 本次未保存新的对话日志，未正式重构 Handoff；只演示已确认组织内容可进入交接的过滤边界。
6. 五分钟、至少 80% 点击完成和低认知负担都需要首次使用者实测；没有预先宣称达标。
7. 日期来源是未修改的既有规则引擎与虚构人工锚点。本次未重新复核 ASU 政策。
8. 7 天保存为设备端最后保存起算、读取时清理；不是服务器自动删除承诺。关闭站点存储时只能在内存使用，页面明确提示。
9. 远端预览可能沿用 Netlify 访问保护；不尝试登录、不改变保护设置。本机预览为备用验收入口。

## 下一阶段

先等待画面验收。后续若明确授权，按原要求进入 Member Activity planner，再是 Executive Operations、Single AI Workspace/导航、真实数据库/账户/长期记忆、正式 Handoff。正式接入时实施完整 schema、服务端校验、版本化 ChangeSet、可回退迁移，不能直接把演示 adapter 当生产后端。

main 与 v1 未改写；本次代码只在 `feat/ai-native-phase1`。
