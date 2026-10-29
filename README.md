# Platypus Officer Hub

Platypus 是一个面向学生社团的 AI 运营工作台，也是 Juanxi (Steve) Wu 的 ASU Barrett 荣誉论文 Phase 3 原型。前端使用 React、TypeScript 和 Vite；确定性规则引擎负责日期与风险计算；AI 只在受控范围内起草、解释和提出变更。

**Production:** https://platypus-officer-hub.netlify.app （由 `main` 部署；目前是 2026-10-23 合并的 v1）

**v1.0 集结预览（Draft PR #8，`integration/v1.0`）：** https://deploy-preview-8--platypus-officer-hub.netlify.app

> **2026-10-29 状态：** `integration/v1.0` 把设计 token（N1–N6）、护栏（Stylelint / ESLint / 字数 / 无障碍，S6）、Behind the scenes 开关（S7）、触屏卡片（S8）、M2b 的 AI 预填表单、排序题编辑器 Edit steps（M3）和"DeepSeek 已移除"都集合在一起，等 Juanxi 说"批准合并"才会进入 `main`。**Night Mode 自动开发队列已暂停**（2026-10-28 起；原因和三个已知脚本问题见 `docs/NIGHT_MODE.md` 第 1 节），之后的开发由人工会话完成。真实 AI 的验收边界见 `docs/AI_TESTS.md`；上线步骤见 `docs/LAUNCH_STEPS.md`。

## 给人类：现在已经有什么

- 产品代码、规则、测试和部署配置都在这个仓库；GitHub 是唯一正本。
- （Night Mode 暂停中）本地曾接通 ASU AIR，并通过 OpenCode 调用一组分工明确的 Agent。
- `scripts/night-mode.mjs` 是控制器：检查环境，调用 Agent 编码，运行完整本地测试，调用独立 Critic，提交并推送，再等待 GitHub CI。
- 只有本地检查、独立 Review 和 GitHub CI 全部通过，控制器才会在 Draft PR 留下 `READY_FOR_CLAUDE`。
- 它永远不会自动合并 `main`，也不会自动部署 Production；最后仍需 Claude 和 Juanxi 人工检查。

## 给所有 AI：先读这里

无论使用 Codex、Claude、OpenCode、Gemini、Copilot、DeepSeek 或其他 AI，都按这个顺序读取：

1. [`AGENTS.md`](AGENTS.md) — 项目事实、硬性边界、代码地图和交接规则。
2. [`docs/PROGRESS.md`](docs/PROGRESS.md) — 已完成、待验收和已知缺口。
3. [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md) — 已批准的产品范围。
4. 若运行自动开发，再读 [`docs/NIGHT_MODE.md`](docs/NIGHT_MODE.md)。
5. 若改 ASU 规则或 AI 供应商，再读 [`docs/RULES.md`](docs/RULES.md) 或 [`docs/AI_SETUP.md`](docs/AI_SETUP.md)。

`AGENTS.md` 和 `docs/NIGHT_MODE.md` 是跨 AI 的正本。`CLAUDE.md`、`GEMINI.md` 和 `.github/copilot-instructions.md` 只是入口，不另建一套规则。

## Night Mode：最短使用方法

要求：Node 22、已安装依赖、GitHub CLI 已登录、OpenCode 可用、`ASU_AIR_API_KEY` 已在当前终端环境加载。密钥绝不能写进任务文件或仓库。

```bash
cd /Users/Dirofs/AI-Projects/platypus-night-mode
mkdir -p .nightmode
cp docs/NIGHT_MODE_TASK_TEMPLATE.md .nightmode/TASK.md
nano .nightmode/TASK.md
node scripts/night-mode.mjs --doctor
node scripts/night-mode.mjs --task-file .nightmode/TASK.md
```

多个任务排队过夜（一个失败不拖垮整晚，详见 `docs/NIGHT_MODE.md` 7d）：

```bash
mkdir -p .nightmode/queue      # 把任务文件放进去，按文件名排序执行
caffeinate -dimsu bash scripts/night-queue.sh
```

⚠️ **写任务文件之前先读 `docs/NIGHT_MODE.md` 的 7b（运行环境预算卡）和 7c（任务怎么写）。**

详细的角色分工、网络权限、三轮返工、停止条件和输出文件见 [`docs/NIGHT_MODE.md`](docs/NIGHT_MODE.md)。

## 安全边界

- 不提交 API key、`.env`、研究数据、参与者信息、真实成员名单、访谈材料或录音。
- 所有演示数据必须是虚构的。
- AI 不得直接计算或修改官方日期；日期来自确定性规则引擎。
- `main` 是 Production，不允许 Agent 直接修改或合并。
- OpenCode Agent 可以通过已配置的 ASU AIR 调用模型，但它们的 shell 不是任意联网终端：未知命令默认拒绝，不能用 `curl`、`wget`、`brew` 等自行访问网络或改系统。
- 产品网站的 AI 供应商由 Netlify 的 `AI_*` 环境变量决定；Night Mode 开发 Agent 使用本地 `ASU_AIR_API_KEY`。这是两套独立配置。

## 开发与验证

```bash
npm ci
npm run build
npm test
npm run e2e
npm run check
```

`npm run check` 会依次运行 Stylelint 和 ESLint（`npm run lint`）、TypeScript/Vite 构建、Vitest 单元测试、桌面/手机 Playwright 测试（含无障碍扫描）和字数检查（`npm run words`）。GitHub Actions 在 PR 上运行同一套。改界面前先读 [`docs/DESIGN_TOKENS.md`](docs/DESIGN_TOKENS.md)：字号、圆角、层级、颜色只能用 token。

## 主要目录

- `src/` — React 前端、数据模型、规则引擎和浏览器端 AI 护栏。
- `netlify/functions/` — `/api/*` 服务器函数。
- `netlify/lib/ai.mts` — 产品 AI 供应商适配器（默认 ASU AIR，路由 v3；DeepSeek 已移除）。
- `e2e/`、`src/test/` — 页面测试与单元测试。
- `docs/` — 产品计划、进度、规则、验收记录和 Night Mode 操作手册。
- `scripts/night-mode.mjs` — Night Mode 控制器。
- `opencode.json` — 项目级 Agent 权限白名单。
- `.github/workflows/ci.yml` — GitHub CI。

## 当前不应被误解的事实

- CI 使用模拟 AI；CI 通过不等于真实供应商回答质量已验收。
- `READY_FOR_CLAUDE` 只代表自动闸门通过，不代表可以合并或上线。
- Draft PR #6、#7、#8 都还没有进入 `main`；#8 包含 #6 和 #7 的全部内容。
- 最新的真实 AI 验证边界记录在 [`docs/AI_TESTS.md`](docs/AI_TESTS.md)。
