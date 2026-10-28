# Night Mode V1 — 多 Agent 自动开发手册

Night Mode 让一组 ASU AIR Agent 在受保护的功能分支完成一个**已经批准、范围明确**的任务，并经过本地测试、独立 Review 和 GitHub CI。它不会合并 `main`，也不会部署 Production。

## 1. 当前状态（2026-10-27 快照）

| 项目 | 已验证事实 |
| --- | --- |
| GitHub 仓库 | `juanxiwu2005/platypus-officer-hub` |
| Production 分支 | `main`，基线 `4dc55ba` |
| 自动开发分支 | `feat/ai-night-mode` |
| 人工闸门 | Draft PR [#7](https://github.com/juanxiwu2005/platypus-officer-hub/pull/7) |
| 控制器 | `scripts/night-mode.mjs` |
| 项目权限 | `opencode.json` |
| 运行环境 | Node 22；GitHub CLI 已登录；OpenCode；本地依赖已安装 |
| 只读自检 | `DOCTOR PASS · branch feat/ai-night-mode · Draft PR #7` |
| 远程检查 | PR #7 GitHub CI 和 Deploy Preview 在 2026-10-27 通过 |

这是带日期的快照，不是永久承诺。每次运行都必须重新执行 `--doctor`，完成后重新检查 PR 和 CI。

## 2. 谁负责什么

| 层 | 责任 | 不能做什么 |
| --- | --- | --- |
| Juanxi | 批准任务范围；最后验收；决定是否合并 | 不需要写代码 |
| Claude / 人工 Reviewer | 在 `READY_FOR_CLAUDE` 后检查 diff、预览和风险 | 不能把自动通过等同于合并批准 |
| 编码 Agent（`CODING_AGENT`，当前 `backend-coder`） | 读取任务，自己改源代码和测试，跑白名单内的测试 | 不能 commit、push、merge、改保护文件，不能访问项目外目录、密钥、部署或依赖配置 |
| `code-critic` | 独立只读 Review，输出 `APPROVED` 或 `REJECTED` | 不能修改文件 |
| Night Mode 控制器 | 自检、完整测试、生成 review patch、最多三轮返工、commit、push、等待 CI、写 PR 评论 | 不能 merge 或部署 Production |
| GitHub CI | 在 Ubuntu 24.04 / Node 22 上重新安装依赖并运行构建、单元和 Playwright 测试 | 不调用真实收费/ASU 模型，不证明模型回答质量 |

### 2026-10-28 变更：编码主力从 `orchestrator` 换成 `backend-coder`

**原因（实测，不是推测）：** 2026-10-27 晚两次运行都停在编码阶段，报错一致：

```
✗ Dead CSS cleanup + Empty swap failed
Error: Subagent session not found: ses
```

`opencode debug agents` 显示 `orchestrator` 的权限里 `edit: * → deny`、`shell: * → deny`，
它的系统提示词也写明「you never write code, edit files or run commands yourself」。
也就是说**它在设计上只能派活**，而在这台机器上派活必定失败（子 Agent 会话建不起来，
错误里的 `ses` 是被截断的会话 ID）。改任务文件绕不过去。

**改了什么：** `scripts/night-mode.mjs` 新增常量 `CODING_AGENT`，初次编码和返工两处
（原 298、353 行）改用它；默认值 `backend-coder`（mode `all`，可作主 Agent，
模型 ASU `glm-5-3`）。两处提示词里的「delegate」改成「自己做，不要委派」。

**没有改什么：** `code-critic` 仍由控制器在第 341 行单独调用，**独立审查这道闸门完整保留**。
保护文件禁改、九条命令的 shell 白名单、完整 `npm run check`、三轮上限、GitHub CI、
永不 merge/部署 —— 全部不变。

**代价：** 失去多 Agent 分工（但它在这个环境里本来就不工作）；`backend-coder` 的系统
提示词偏后端，做前端/CSS 任务属于用错工种，靠任务文件写具体来弥补。这是权宜之计。
长期应修复 OpenCode 的委派问题，或在用户级配置里加一个通用的 primary 编码 Agent，
届时只需改 `CODING_AGENT` 一个常量。

**谁批准的：** Juanxi，2026-10-28，按本文件第 10 节要求由人明确提出。

---

当前 Agent/模型映射来自用户级 OpenCode 配置，未来可能更换。项目只依赖角色名称，不应依赖某个模型永远存在。运行时用下面的命令查看实际映射：

```bash
opencode debug agents
```

2026-10-27 的主要映射记录在根目录 `AGENTS.md` 第 0 节。

## 3. 一次运行的完整流程

```text
Juanxi 批准 TASK.md
        ↓
doctor 检查仓库 / 分支 / Draft PR / Node / 权限 / 依赖
        ↓
编码 Agent（backend-coder）→ 直接改代码和测试 → 产生未提交改动
        ↓
npm run check（build + unit + desktop/mobile Playwright）
        ↓
独立 code-critic 只读审查 diff
        ↓
失败：把真实错误交回编码 Agent，最多共 3 轮
        ↓
通过：控制器 commit + push
        ↓
GitHub CI 重新检查
        ↓
通过：PR 评论 READY_FOR_CLAUDE
        ↓
Claude + Juanxi 人工检查；只有 Juanxi 可批准合并
```

任何环节失败都会停止或进入受限返工。不会自动绕过测试、降低断言、换分支、合并或部署。

## 4. 网络和密钥到底怎么工作

- OpenCode 通过本地环境变量 `ASU_AIR_API_KEY` 调用 ASU AIR 模型。密钥值永远不进入任务、提示词、日志、Git 或 PR。
- Agent 的 shell 权限默认拒绝。它们只可以运行白名单里的构建、测试、Playwright 和只读 Git 命令。
- 因此，Agent **不能把 shell 当成任意联网终端**，不能自行运行 `curl`、`wget`、`brew`，也不能访问项目外文件。
- 控制器不是编码 Agent。它单独调用 `git` 和 `gh` 完成 commit、push、查看 PR 与等待 CI。
- “能调用 ASU AIR”不等于“能随意浏览互联网”。若任务需要外部资料，必须先由人类明确批准来源与范围，并在 Night Mode 之外准备好经过核对的输入。
- 产品网站自己的 AI 由 Netlify `AI_PRESET`、`AI_MODEL`、`AI_API_KEY` 等变量控制；与 Night Mode 的本地 `ASU_AIR_API_KEY` 相互独立。

## 5. 启动前必须满足

控制器会拒绝不安全的启动条件：

- 当前目录必须是这个仓库。
- 当前分支必须正好是 `feat/ai-night-mode`。
- 工作区必须干净。
- `origin` 必须是 `juanxiwu2005/platypus-officer-hub`。
- 必须有从该分支到 `main` 的 Open Draft PR。
- Node 主版本必须是 22。
- `git`、`gh`、`node`、`npm`、`opencode` 必须可用，GitHub CLI 必须已登录。
- `node_modules` 必须已经存在；Night Mode 不自动安装或升级依赖。
- `opencode.json` 必须默认拒绝外部目录和未知 shell 命令；关键权限必须通过动态检查。

如果在非交互环境找不到 OpenCode，但用户终端可以使用，确认其可执行文件目录已在 `PATH` 中。当前安装位置是 `~/.opencode/bin/opencode`；不要把 API key 写进命令。

## 6. 安全边界

- 只允许仓库 `juanxiwu2005/platypus-officer-hub` 和分支 `feat/ai-night-mode`。
- 任务只能使用虚构演示数据；不得放入研究资料、参与者信息或真实成员数据。
- Agent 不得读取或修改 `.env*`、`.git/**`、`.github/**`、`.nightmode/**`、依赖文件、Netlify 设置或 Night Mode 自身安全文件。
- 保护文件包括 `AGENTS.md`、`docs/NIGHT_MODE.md`、`opencode.json`、`scripts/night-mode.mjs`、`package*.json` 和 `netlify.toml`。
- 控制器在 commit 前会再次检查保护路径；检测到保护文件变化就拒绝提交。
- 每轮命令最长 20 分钟；本地验证或 CI 失败最多共 3 轮。
- 永远不自动 merge，不修改 `main`，不触发 Production 部署。

## 7. 每次怎么运行

在仓库目录执行：

```bash
mkdir -p .nightmode
cp docs/NIGHT_MODE_TASK_TEMPLATE.md .nightmode/TASK.md
nano .nightmode/TASK.md
```

任务必须写清楚 Goal、Files、Constraints 和 Done means。不要写 API key、研究材料或参与者信息。

先运行只读自检：

```bash
node scripts/night-mode.mjs --doctor
```

只有看到 `DOCTOR PASS` 才开始：

```bash
node scripts/night-mode.mjs --task-file .nightmode/TASK.md
```

## 8. 如何理解结果

1. `READY_FOR_CLAUDE`：本地完整检查、独立 Critic 和 GitHub CI 都通过；等待 Claude 和 Juanxi 检查。**不是合并许可。**
2. `NIGHT MODE STOPPED`：安全条件不满足，或三轮内没有通过。没有尝试 merge 或 Production 部署。
3. 安全检查失败：在编码前停止，不产生应用代码。

运行日志保存在被 Git 忽略的 `.nightmode/`，包括 `check.log`、`review.patch`、`review.txt`、`last-failure.log` 和 `ready-comment.md`。它们用于本地诊断，不应提交。

## 9. 当前明确不包含

- Claude 自动 Review。
- 自动创建 PR、把 Draft 转为 Ready、合并 PR 或删除分支。
- 自动 Production 部署。
- 自动安装或升级依赖。
- 修改 GitHub Secrets、Netlify 环境变量或系统设置。
- 任意网页浏览或自动采集外部资料。
- 使用真实研究数据进行测试。

## 10. 修改这套工作流时的规则

Night Mode 自己不能修改自己的安全边界。只有人类明确要求后，受信任的控制器/维护者才可以修改 `AGENTS.md`、本文件、`opencode.json`、`scripts/night-mode.mjs` 或 `.github/**`。每次修改后至少要：

1. 重新运行 `node scripts/night-mode.mjs --doctor`。
2. 检查 `git diff`，确认没有密钥和范围外文件。
3. 推送到 Draft PR，等待 GitHub CI。
4. 更新带日期的状态快照；不要把一次通过写成永久保证。
