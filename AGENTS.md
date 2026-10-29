# AGENTS.md — 给任何接手的 AI（Claude、ChatGPT、DeepSeek……）

这个仓库是 **Platypus** 的代码和计划：一个给学生社团用的“团队型 AI 幕僚长”网站，也是 Juanxi (Steve) Wu 的 ASU Barrett 荣誉论文（STUDY00024727）第 3 阶段的原型。几个 AI 会轮流在这里工作，所以**每次开始前先读这份文件，结束时按第 4 节交接**。

## 0. 当前仓库与 Agent 工作流事实（2026-10-29 验证）

- GitHub 正本：`juanxiwu2005/platypus-officer-hub`。
- `main` 是 Production，当前基线提交仍为 `4dc55ba`。任何 AI 都不得直接修改、推送或合并 `main`。
  **下面提到的所有改动都还没有进入 `main`。**
- **下一个上线版本是 `integration/v1.0`（PR #8）**，它包含 PR #5、#6、#7 的全部内容，
  再加上 S6–S9 和 M3 排序题。只有 Juanxi 说「批准合并」才合并到 `main`，步骤见 `docs/LAUNCH_STEPS.md`。
  新的开发都在 `integration/v1.0` 上做（见第 8.4 节）。
- 当前有 7 个开着的 Draft PR，每个对应一个 Deploy Preview（**预览编号 = PR 编号**）：

  | PR | 分支 | 是什么 | CI |
  | --- | --- | --- | --- |
  | #2 | `feat/ai-native-phase1` | AI-native 三画面原型 | — |
  | #3 | `feat/organization-setup-ai` | DP3：Organization Setup v3 + workspace | 通过 |
  | #4 | `integration/v1.1-fix` | DP4：main + S1/S2/S3 修复（内容已在 PR #8 里）| 最后一次失败（10-27，跑了不到 1 分钟，很可能是当天的 runner 问题，`67345d7` 修好后 #4 没再跑过）|
  | #5 | `integration/dp3-dp4-merge` | **DP5：DP3 + DP4 合并版**，AI 走 ASU AIR，服务器存储已隐藏 | 通过 |
  | #6 | `feat/m2b-ai-intake` | DP6：DP5 + M2a/M2b（Ask 分清任务与活动、AI 预填表单、活动 Plan check）| 旧的 CI 因 `e2e/today.spec.ts:8` 过时而失败；修复在 PR #8 |
  | #7 | `feat/ai-night-mode` | DP5 + Night Mode 工具链 + N1–N6 设计 token（全部已在 PR #8 里）| 通过 |
  | #8 | `integration/v1.0` | **v1.0 集结预览**，预览 https://deploy-preview-8--platypus-officer-hub.netlify.app ，标题「[预览·请勿合并]」 | 通过（2026-10-29）|

  ⚠️ 这些分支**不能改名也不能删**：删 head 或 base 分支都会关闭 PR，重开会拿到新编号，
  旧预览网址永远回不来。`v1` 是 PR #2/#3 的 base，同样不能动。命名规则见第 8 节。
- ⏸ **Night Mode 自 2026-10-28 起暂停**，开发改由人工会话完成。恢复之前先修
  `docs/NIGHT_MODE.md` 第 1 节记下的脚本问题（推送后立刻查 CI 会误判失败、队列不处理残留改动、
  macOS bash 3.2 的变量名问题）。下面关于 Night Mode 的条目保留作为恢复时的说明。
- `scripts/night-mode.mjs` 是唯一可以代表 Night Mode 做 commit、push、读取 CI 和写 PR 评论的控制器；
  OpenCode Agent 自己不能做这些动作。`scripts/night-queue.sh` 是多任务队列（见 `docs/NIGHT_MODE.md` 7d）。
- **编码主力是 `backend-coder`（ASU `glm-5-3`），不是 `orchestrator`。** orchestrator 被配置为
  禁止编辑文件和跑命令，只能派活，而派活在当前环境里会报 `Subagent session not found`。
  原因与取舍记在 `docs/NIGHT_MODE.md` 第 2 节的变更记录里。
- 当前预算：**300 步 / 单条命令 45 分钟 / 5 轮返工**。Agent 能跑的 shell 命令是一份白名单
  （只读命令 + 项目自己的测试），`node`、`curl`、`python` 和复合命令一律拒绝。
  完整清单见 `docs/NIGHT_MODE.md` **7b 运行环境预算卡 —— 写任务文件之前必须先看它**。
- Agent 不能编辑的保护文件：`.env*`、`.git/**`、`.gitignore`、`AGENTS.md`、`docs/NIGHT_MODE.md`、
  `package.json`、`package-lock.json`、`opencode.json`、`scripts/night-mode.mjs`、
  `.nightmode/**`、`.github/**`、`netlify.toml`。
  → **需要装依赖或改 CI 的任务不能走 Night Mode**，必须走普通会话。
- Agent 的模型映射来自用户级 OpenCode 配置，项目级 `opencode.json` 收紧权限并设置 `steps`。
  每次运行以 `opencode debug agents` 为准，不要假设某个模型永远存在。
- Night Mode Agent 通过 OpenCode 调用 ASU AIR；这不等于拥有任意网页访问。控制器单独使用
  GitHub CLI 完成 GitHub 操作。
- 本地 `ASU_AIR_API_KEY` 只存在终端环境中；产品网站使用 Netlify 的 `AI_*` 环境变量。
  两者不能混为一谈，也都不能写进仓库。
- **2026-10-28，Night Mode 首次完整端到端跑通**：编码 → `npm run check` → 独立 Critic
  `APPROVED` → 提交推送 → GitHub CI 通过 → Deploy Preview → `READY_FOR_CLAUDE`。
  在此之前连续五次停在编码阶段，根因与修法全部记在 `docs/NIGHT_MODE.md`。
  未来 AI 必须重新验证，不能假设状态仍然相同。
- ⚠️ **队列运行期间，任何人都不要推送 `feat/ai-night-mode`，包括只改文档的提交。**
  2026-10-27 那一晚 7 个任务全军覆没，唯一原因就是 Claude 在队列运行期间推了一个
  文档提交，本地落后于远端，推送被拒，之后每个任务撞同一面墙。
  云端会话看不到本地在跑什么 —— **开跑前要告诉它一声**。详见 `docs/NIGHT_MODE.md` 7b-2。
- `feat/ai-night-mode` 当前顶端 `94e2882`（N6）。`backup/2026-10-28-queue` 和 `wip/*` 分支
  只存在于 Juanxi 的 Mac 本地，GitHub 上没有。任务库 `docs/night-tasks/` 的 N1–N6 已全部完成。
- 写 Night Mode 任务文件之前，除了 7b 预算卡，还必须看 **`docs/NIGHT_MODE.md` 7c 第 7–9 条**：
  任务的事实对不对不等于它在语义上做得到；一个任务只装一件事；纯重命名要写明不需要新增测试。
- 状态冲突时，先检查 Git/PR/CI，再更新文档；不要用聊天记忆覆盖仓库事实。

## 1. 先读什么（按顺序）

1. `docs/PROGRESS.md` —— 现在做到哪了、谁在做、下一步是什么。
2. `docs/PRODUCT_PLAN.md` —— 已批准的产品计划 v1.0（唯一正本）。工作包和验收标准在第 13 节，范围和砍单顺序在第 12 节。
3. 若任务使用自动开发，读 `docs/NIGHT_MODE.md` 和任务文件 `.nightmode/TASK.md`。
   **写任务文件之前必须先读 `docs/NIGHT_MODE.md` 的 7b（运行环境预算卡）和 7c（任务怎么写）** ——
   2026-10-27 晚五次失败里有四次，根因都是给没量过的运行环境写指令。
4. 按任务再读：`docs/RULES.md`（ASU 规则库）、`docs/SEO_PLAYBOOK_REFERENCE.md`（流程模板来源）、`docs/AI_SETUP.md`（产品 AI 供应商怎么切换）。

## 2. 关于项目负责人

- Juanxi 不写代码。用简单的中文向他解释，一次只讲一步，不用术语；需要他动手的地方写清楚点哪里。
- 他通过**预览网址**验收每个工作包，只回答“可以”或“改哪里”。
- 计划的任何改动都要他同意，并记在 `docs/PROGRESS.md` 的“决定记录”里。

## 3. 硬性规则（不能破）

1. **不放研究数据。** 不提交问卷原始回答、访谈转写、录音、参与者姓名或引语。仓库里只有虚构的演示社团数据。也不要把这些资料贴给任何 AI。
2. **不放密钥。** 产品网站的 API key 只放在 Netlify 环境变量里（见 `docs/AI_SETUP.md`）；Night Mode 的 `ASU_AIR_API_KEY` 只放在本地终端环境里。任何密钥都绝不写进代码、文档、任务文件、提示词或提交记录。
3. **日期只由规则引擎计算。** AI 只能通过白名单操作改数据（见计划第 11 节）、起草提醒、答案和手册；AI 输出里的日期字段一律丢弃。v1.2 起（Juanxi 2026-10-23 批准）：AI 文字里只保留和社团数据里已有日期完全一致的日期，其余遮掉；小改动（改状态、改名、标签、难度、记录联系）以当前查看者的权限立即生效并可撤销，其余改动仍要社长或副社长批准。2026-10-27 M2b（Juanxi 批准）：**任务对所有人开放**——给自己或给别人建任务立即生效、可撤销（给别人的要对方认领）；**建活动**默认只限社长、副社长，社长可在 Settings 开放给指定干部或所有人；新任务的截止日由规则引擎按「今天 + 设置的天数」和社团缓冲计算（`src/engine/taskDates.ts`），AI 仍然不能给任何日期。详见 `docs/PROMPT_STRATEGY.md` 第 0 节。
4. **`main` 分支就是正式网站。** 每次推送到 `main`，Netlify 都会自动上线。当前 Night Mode 工作只在 `feat/ai-night-mode`；其他工作也必须使用 Juanxi 批准的功能分支（命名规则见第 8 节）。**只有 Juanxi 明确批准后才能合并到 `main`。**
5. **AI 供应商（2026-10-27 更新，Juanxi 批准）：**
   - **产品网站**：所有 AI 调用都走 ASU AIR（只在服务器上调用，key 只在 Netlify 环境变量里），只在模型上做选择。路由 v3：Gemma 4 31B 负责较长的结构化设置任务；Muse 负责短对话和编辑（主应用的 Ask、规则、提醒、手册都用它）；GLM 5.3 只在用户主动要求 Deeper review 时使用。**DeepSeek 已移除**（2026-10-29，Juanxi 批准）：代码里没有它的路径，`AI_PRESET=deepseek` 会被直接拒绝；AIR 不可用时，应用用内置的本地回答，不调用任何其他 AI 供应商。模型分工是设计选择，不是已验证的性能排名。详见 `docs/AI_SETUP.md`。
   - **Night Mode 开发 Agent**：同样走 ASU AIR，用本地终端环境里的 `ASU_AIR_API_KEY`。这和产品网站的 Netlify `AI_*` 变量是两套，不能混为一谈。角色与模型映射见第 0 节，以 `opencode debug agents` 为准。
   - 任何有真实参与者的 Phase 3 会话必须使用 ASU AIR（或 IRB 批准的供应商）。
6. **界面文字用英文**（用户是美国学生）；文档用中文。
7. 不做计划第 12 节标为“不做”的功能（例如库存、成员名单）。

## 4. 轮流工作的交接规则

**开始前：**

1. 先运行只读检查：`git status --short --branch`、`git remote -v`，再确认用户批准的目标分支。不要自动切换到 `main`。
2. 如果是 Night Mode：保持在 `feat/ai-night-mode`，读 `docs/NIGHT_MODE.md`，由控制器执行；Agent 不提交、不推送。
3. 如果是普通人工开发：拉取用户批准的功能分支，读 `docs/PROGRESS.md`。若某项写着“进行中”且标了别的 AI，就不要碰它。
4. 普通人工开发开始时，在 `docs/PROGRESS.md` 把任务标为“进行中”，写上 AI 名称和日期，然后在获准分支提交并推送。

**工作中：**

- 小步提交。提交信息格式：`[WP1][ChatGPT] 规则引擎：加入三个截止日`。
- 改了行为就补测试；改了规则就同时改 `docs/RULES.md` 和代码里的规则数组。

**结束时：**

1. 在 `docs/PROGRESS.md` 写清楚：做完了什么、还剩什么、怎么验收（预览网址、要点哪里）、已知问题。
2. 把工作包状态改成“待验收”或“已完成”，在“交接记录”加一行。
3. 推送。如果改了 `docs/PRODUCT_PLAN.md`，在交接记录里注明“需要同步本地备份”。

**没有仓库权限的 AI（例如只在聊天窗口里的 DeepSeek）：** 让 Juanxi 把这份文件和相关章节贴给它，它只输出完整的文件内容或补丁，再由有权限的 AI 提交，并在交接记录里注明来源。

## 5. 本地备份

GitHub 是唯一正本。Juanxi 电脑上的 Honors Thesis 文件夹 `05_Phase3_Prototype/Plan/` 里有一份备份（`Platypus_产品计划_v1.0.md`、`PROGRESS.md`、`RULES.md`，以及本文件的副本 `AGENTS_repo.md`）。能访问他电脑的 AI（目前是 Claude）在每个工作包结束时同步一次；其他 AI 只要在交接记录里写“需要同步本地备份”。

## 6. 现在的代码

`v1` 分支（WP0 之后）：

- **前端：** React 18 + TypeScript + Vite，入口 `src/main.tsx`，用 HashRouter（网址形如 `/#/tasks`，这样 Netlify 不需要通配跳转，不会挡住 `/api/*` 和 `/legacy/`）。
  - `src/routes.ts`：10 个页面和每页要回答的那一个问题。`src/components/Layout.tsx`：顶栏（View as、AI 开关）、演示条（Reset demo）、侧边导航。
  - `src/pages/*.tsx`：每页一个文件。还没做的部分用 `<Coming wp="WPx">` 虚线卡片标出来，做完就删掉对应条目。
  - `src/data/types.ts`（数据模型，计划第 11 节）、`seed.ts`（虚构社团 Desert Founders Society）、`store.tsx`（只存在浏览器 localStorage，键 `platypus.v1.demo`，改了数据结构就把 `SCHEMA_VERSION` 加 1）、`rules.ts`（R01–R16，必须和 `docs/RULES.md` 一起改）。
  - `src/lib/dates.ts`：日期工具。
- **规则引擎（WP1，`src/engine/`）：** 只有这里能算日期，AI 不能。
  - `calendar.ts`：ASU 工作日、假期、期末周、学期（数据和出处见 `docs/RULES.md` 末尾）；干部的“工作日”还要去掉期末周、学期之间和本人的忙碌周。
  - `playbooks.ts`：活动流程模板。来自 SEO 的 OA101/OA102/OA201、T-90/60/30/14 清单和 R01–R16。每个步骤有负责职能、锚点（`rule` = ASU 规则给出官方截止日；`target` = 社团惯例时点）、预计用时、依赖和适用条件；`buildEventNodes()` 把模板变成节点。
  - `schedule.ts`：`computeSchedule(state)` 先倒推（官方截止日 − 社团缓冲、社团时点、下游最晚开始日的前一个工作日，取最早的），再顺推（人设的社团截止日；上游没完成就把下游往后推），最后给出问题：红色 = 赶不上 ASU 截止日或排到活动之后；黄色 = 过了社团截止日或最晚开始日、被上游推迟、没有负责人。每个日期都有一句“为什么”。`applySchedule()` 把日期写回节点，store 每次改动后都会调用。
  - 演示从固定日期 **2026-10-22（周四）** 开始（`DEMO_TODAY`），所以示例活动的日期对每个人都一样；WP3 的模拟时钟从这里往后走。
- **活动页（WP1）：** `src/pages/Events.tsx`，三种视图：流程图（`src/components/flow/FlowChart.tsx`，React Flow，按岗位分泳道，横轴是日期）、甘特图（`Gantt.tsx`）、列表；点步骤打开 `src/components/NodePanel.tsx` 侧栏，可改负责人、社团截止日、用时、RACI、Why、材料链接。
- **测试：** `npm test`（Vitest 单元测试，`src/test/`）；`npm run e2e`（Playwright，`e2e/`，桌面和手机两种尺寸）；`npm run check` 三样一起跑。GitHub Actions（`.github/workflows/ci.yml`）每次推送都会跑。
- **旧版：** v0.1 单文件原型移到了 `public/legacy/index.html`，网址 `/legacy/`，保留不动。
- **WP2 今日页：** `CommandBar.tsx` 逐条审核白名单变更单；`src/lib/commands.ts` 双重过滤 AI 日期。`NudgeComposer.tsx` 和 `src/lib/nudges.ts` 生成并检查五段提醒；`command.mts`、`nudge-draft.mts` 沿用现有供应商适配器。
- **WP3 任务与干部端：** `src/data/taskWorkflow.ts` 管认领、四种状态、带草稿延期、贡献和 RACI 通知；`src/engine/followup.ts` 管逐日模拟、3/5/7/8/10 天私下跟进；恢复排程仍由 `schedule.ts` 计算。Tasks 有列表/看板/甘特，通知只显示当前角色自己的记录。
  - `src/lib/officerLinks.ts` 与 `src/pages/Officer.tsx` 提供一次性签名的**同浏览器演示链接**；只绑定一个任务和负责人，一次操作后失效。`demoLinkKey` 是运行时随机的本地演示密钥，不是供应商 key，不发到 AI。跨设备验证和真实身份验证留到 v1.5。
  - WP3 当时的演示结构版本为 3（WP4 已升到 4）；旧版浏览器数据恢复种子。Reset demo 清空状态、通知、申请和链接。验收与下一位说明见 `docs/WP3_ACCEPTANCE.md`；本机已通过 146 个单元测试和 62 个页面测试，原有测试保留。
- **WP4 设置与团队：** `Setup.tsx` 五步设置，`Join.tsx` 五问同浏览器邀请，`Settings.tsx` 编辑社团和本人偏好；`src/data/settings.ts` 统一验证与写入，`src/engine/team.ts` 计算工作量、贡献和会议交集。`org.workspace` 只保存演示渠道、链接、说明与小型虚构附件，不连接真实账户，附件不发给 AI。个人缓冲关闭后用默认一天，仅本人可见数值解释。
  - 岗位名称沿用同一个 role ID，流程道和 Handoff 手册目录同步；完整手册和换届仍为 WP5。结构版本 **4**；本机通过 **174 个单元测试 + 76 个页面测试**，原测试保留。验收和后续入口见 `docs/WP4_ACCEPTANCE.md`。
- **WP5 经费、规则、交接、关系、预测：** `src/engine/forecast.ts` 为固定种子 1,000 次纯函数；日期继续走 `schedule.ts`，包括预测完成日期、换届派生日期和经费决定日。Today 按预测概率排前三项，默认颜色/两条原因，展开才有比例。`personalBuffer()` 只用有完成日期的本社团记录渐进调整，Settings 只给本人解释；可关闭，换届默认重置。
  - `/api/ask` 只让 AI 选服务器 R01–R16，正文从真实规则记录重建；`RuleQuestion` 在 Rules/Today 共用。`/api/preflight` 与浏览器共用 `src/lib/preflight.ts` 的确定性 R11/R12 检查。`Feedback` 报错存在本浏览器，Rules 底部管理员队列查看。
  - `src/data/handoff.ts` / `src/lib/handbook.ts` 管换届和来源：AI 只选 task/interview ID，逐条显示来源原文；保存来源快照，变更后必须重审；卸任干部本人确认，再由社长批准。只用新编虚构示例访谈，不能读研究资料。完成交接转移未完成任务，联系人保留岗位 ID，个人缓冲不传给新人。
  - 结构版本 **5**，本机完整检查通过 **233 个单元测试 + 90 个页面测试**。原有测试保留；`evals/rules.json` 为 40 题，`scripts/eval-rules.mjs` 支持真实接口评估，CI 用模拟供应商。**真实 AI 验收未完成**：Netlify 访问受阻，Juanxi 要求停止登录尝试，已停止。不要把模拟 40/40 或本地示例手册称为 DeepSeek/AIR 验收；详见 `docs/AI_TESTS.md` / `docs/WP5_ACCEPTANCE.md`。
- **服务器：** `netlify/functions/*.mts`：`/api/health`、`/api/ask`、`/api/parse-brief`、`/api/plan/draft`、`/api/replies/classify`；`netlify/lib/ai.mts` 是 AI 供应商适配器，换供应商只改环境变量。
- **部署：** `netlify.toml` 构建命令 `npm run build`，发布目录 `dist`，Node 22。
- 正式网址：https://platypus-officer-hub.netlify.app （`main`，截至 2026-10-27 为提交 `4dc55ba`）。Night Mode 的 Draft PR #7 预览是 https://deploy-preview-7--platypus-officer-hub.netlify.app；每次使用前重新检查 PR 和预览状态。

## 6b. v1.1 改版后的代码地图（2026-10-23，覆盖上面关于页面的旧描述）

- 外框：`src/components/Layout.tsx`（顶栏、Demo 小标、铃铛、导航）+ `src/components/rail/`（`RailContext.tsx` 右栏状态；`Rail.tsx` 两个标签和详情分发；`AskPanel.tsx` 对话；`ChangeCard.tsx` 变更单审核）。
- 组件：`src/components/ui/`。AI：`src/lib/assistant.ts`（浏览器）、`src/lib/chatCards.ts`（共用过滤）、`netlify/functions/chat.mts`（`/api/chat`）。v1.2：`src/lib/aiContext.ts` 把“当前查看者能看到的全部数据”整理给 AI（不含别人的个人缓冲、私信、文件、演示密钥）；`src/data/sharedPool.ts` 是虚构共享池，只读（`/api/pool` 端点已在 S2 删除）；小改动走 store 的 `aiAutoApply` / `undoAuto`，大改动走 `reviewChange`。旧的 `/api/command`、`/api/ask`、`/api/nudge/draft` 仍在用。
- 设置流程（M4 的一部分）：`src/pages/Setup.tsx` 五步（Your club → Semester goals → Officer roles → Invite & workspace → First event）；没有部门，任务按岗位分配，AI 读所有岗位的职责；`src/components/setup/ConstitutionStep.tsx` 上传/粘贴/示例章程；`src/lib/constitution.ts`（提示词 `CONSTITUTION_SYSTEM`、`sanitizeRead` 过滤、`readLocally` 浏览器内规则读取、`structureFromRead` 变成岗位）；`src/data/structure.ts`（汇报关系、职责模板、由岗位名推出活动功能，纯函数）；`src/engine/orgChart.ts` + `src/components/setup/OrgChart.tsx`（自动组织架构图，只有岗位名和汇报线）；`src/lib/localDocs.ts`（浏览器 IndexedDB，存章程文字，Reset demo 时清空）；`netlify/functions/constitution.mts`（`/api/setup/constitution`，不存储、不碰 `serverStorage`）。数据：`Role.reportsToId/duties`、`Person.asuId`（虚构，9999 开头，不发给 AI）。
- 组织自己的活动工作流（设置第 5 步 + Settings → Workflow）：`src/engine/workflow.ts`（应用/撤销改动、检查是否违反 ASU 规则、分配岗位、纯函数）、`src/lib/workflowAi.ts`（提示词和回答清洗）、`netlify/functions/workflow.mts`（`/api/setup/workflow`，不存储）、`src/components/setup/WorkflowPanel.tsx`（同一张可编辑地铁图 `MetroChart` 的模板模式 + 步骤详情）/ `WorkflowReview.tsx`；存在 `org.eventWorkflow`，新建活动用 `orgSteps(state)`。AI 只提建议，ASU 规则步骤不能被改（`isLocked`）。
- 会议时间（Team 页）：`src/components/MeetingFinder.tsx`，When2meet 样式——左边涂自己每周的空闲时间（存到 `freeSlots`），右边按人数着色并可点选；计算在 `src/engine/team.ts`（`whoIsFree`、`cellsToSlots`、`availabilityGrid`）。Google Calendar 连接留到以后。
- 流程图原地编辑（Events → Flow → Edit flow）：`src/lib/flowEdit.ts`（拖到两步之间、断线、删除，纯函数，只改“等待哪些步骤”）+ `MetroChart.tsx` 的编辑模式 + store 的 `addEventStep` / `removeEventStep` / `restoreEventNodes`。不用 React Flow。
- 流程图：`src/components/flow/metro.ts`（纯布局，有单元测试）+ `MetroChart.tsx`。看板：`src/data/board.ts`。
- 页面测试：`e2e/helpers.ts` 有 `resetDemo`、`demoClock`、`ask`。本机没有下载浏览器时用 `PW_CHROMIUM=<chromium 路径>`。

## 6c. v1.0 新增的部分（2026-10-29，`integration/v1.0`）

- **设计 token 与护栏：** token 都在 `src/styles.css` 的 `:root`，说明见 `docs/DESIGN_TOKENS.md`。`.stylelintrc.json` 只管 `src/styles.css`；`eslint.config.js` 禁止行内 style（CSS 变量注入和数据驱动的 left/top/width/height 除外）；`src/organization/`、`src/phase1/`、`src/workspace/` 的 CSS 和行内样式暂时排除在外。`npm run check` = lint + build + 单元测试 + 页面测试 + `npm run words`（字数上限见第 7 节第 5 条）。
- **Behind the scenes 开关：** `src/components/Bts.tsx`，开关在顶栏 Demo 小标的菜单里，状态存 localStorage；关闭时来源说明不进 DOM。测试 `e2e/bts.spec.ts`。
- **触屏：** `src/components/ui/index.tsx` 的 `Hover` 在没有鼠标的设备上改为点一下展开。测试 `e2e/touch.spec.ts`。
- **M2b（Ask 分清任务与活动）：** 表单在 `src/components/rail/AskPanel.tsx`、`TaskFields.tsx`；任务的社团截止日由 `src/engine/taskDates.ts` 算；活动 Plan check 是 `src/lib/eventReview.ts` + `netlify/functions/event-review.mts`（`/api/event/review`）；提示词 `src/lib/chatCards.ts`，策略 `docs/PROMPT_STRATEGY.md`。
- **改步骤顺序（原 M3 Edit steps，已删除）：** 现在直接在 Events → Flow 的地铁图上编辑（`MetroChart` + `src/lib/flowEdit.ts`：拖点、双击点/线、右键菜单、Undo）。界面只写步骤的 `dependsOn`、`estDays`、`phase`、`phaseOrder`，通过 store 的 `applyStepEdits` / `addEventStep` / `removeEventStep` / `restoreEventNodes` 写入（进交互日志）；日期仍由 `schedule.ts` 算。图在电脑上从左到右，只有手机（视口 ≤700px）竖排。测试 `e2e/flow-edit.spec.ts`、`src/test/flowEdit.test.ts`。
- **其他：** 新记录的 id 由 `src/lib/ids.ts` 生成（不再用数组长度）。AI 只走 ASU AIR，`AI_PRESET=deepseek` 会被拒绝（`netlify/lib/ai.mts`）。两套 onboarding 合一的方案 `docs/M4_ONBOARDING_PLAN.md` **还在等 Juanxi 审核，没有实施**。
## 6c. v1.3 社团 CRM（Partners 页，2026-10-29，Juanxi 批准）

- 借鉴开源 CRM Twenty 的数据设计（人和机构分开、时间线、标签、看板），**没有**引入它的代码（它是 AGPL 的完整后端系统）。
- 数据（`src/data/types.ts`，结构版本 **6**）：`Organization`（机构）、`Contact`（联系人，含职位、联系方式、阶段 Cold/Warm/Active/Dormant、来源、引荐人、标签、可见范围）、`Interaction`（互动时间线：谁、何时、做了什么、结果、下一步和日期、关联活动）。联系人仍属于**岗位**（`ownerRoleId`），换届跟岗位走。**没有做 Deal（赞助进度）**，等核心稳了再加。
- 逻辑全在 `src/data/crm.ts`（纯函数，有 `src/test/crm.test.ts`）；权限放 `src/data/permissions.ts`（`canLead` 从 `changeReview.ts` 移到这里，旧位置仍可导入）。
- 权限：任何人能添加联系人/机构和写互动记录；负责人或社长/副社长改资料；只有社长/副社长能删除、改负责岗位。`visibility: "leads"` 的联系人只有社长/副社长、负责人和创建者能看到——**AI 看到的也一样**（`aiContext.ts`、`commandContext` 都用 `visibleContacts`）。演示里没有普通社员账号，所以“仅干部可见”实际是“社长/副社长 + 负责人”。
- 界面：`src/pages/Partners.tsx`（People 表 / Board 看板 / Organizations 三个视图；All·Mine·Overdue 预设；类型、负责人、标签筛选；搜索含标签和邮箱）；右栏详情 `src/components/crm/ContactDetail.tsx`、`OrgDetail.tsx`（`useRail().show({ kind: "partner" | "org", id })`）；共用小部件 `crm/parts.tsx`（失焦自动保存的 Field、互动表单、时间线）。
- AI 的 `add_contact` 和 `mark_contacted` 仍然可用（机构名按名字查找或新建）。

## 7. 界面规则（2026-10-23 简化改版，Juanxi 批准）

改任何页面前先读这一节，**再读 `docs/DESIGN_TOKENS.md`**（字号、圆角、层级、颜色都只能用 token）。写完先跑 `npm run lint`（Stylelint 管 `src/styles.css`，ESLint 管行内样式），CI 也会跑。依据：《Platypus 简化改版方案》（https://claude.ai/artifact/QhCthf71crEC62bBua5zJD）。

1. **三栏布局：** 左导航、中间内容、右栏。右栏有两个标签：**Ask**（唯一的 AI 入口，`src/components/rail/`）和 **Details**（点任何东西打开的详情）。不要在页面里再放 AI 输入框。
2. **只用 5 个组件拼页面**（`src/components/ui/`）：状态色块 `StatusPill`、进度链 `Chain`、表格 `.tbl`、悬停卡 `Hover`/`Info`、右栏详情（`useRail().open(...)`）。
3. **三级交互：** 看（颜色）→ 停（悬停卡，最多 3 行）→ 点（右栏详情）。不再新增 ▶ 展开和选项卡。
4. **文字：** 页面标题 1–2 个词；一张卡最多“标题 1 行 + 信息 1 行 + 状态色块”；原因、假设、出处放进悬停或 Help；字号不小于 14px。
5. **字数上限（主区，`npm run words` 量，Juanxi 2026-10-29 批准改为两个数，超任何一个 CI 就红）：** 每页两个上限——"一眼看到的"和"页面总字数（含悬停卡、折叠内容）"。Today 160 / 450、Events 180 / 420、Rules 170 / 560、Tasks 130 / 130、Team 130 / 290、Funding 160 / 160、Handoff 120 / 120、Partners 120 / 120、Settings 150 / 150。新增内容超了就先删别的，不要靠把文字藏起来过线。
6. **6 种任务状态与颜色全站统一：** Not claimed 灰、To do 蓝、Working on it 橙、Waiting 紫、Stuck 红、Done 绿（名称和颜色可在 Settings → Board 改，含义不变）。

## 8. 分支命名与 Deploy Preview（2026-10-27 定，Juanxi 批准）

改分支之前**必读这一节**。之前分支名字五花八门（`claude/platypus-perf-ui-polish-74k1ul`、`fix/setup-v3-completion`、`feat/activity-workspace-v1` 和 `feat/organization-setup-ai` 还是同一个提交的两个名字），导致没人说得清哪个分支是哪个预览。

### 8.1 命名格式

```
<类型>/<短横线英文描述>
```

| 类型 | 用途 | 例子 |
| --- | --- | --- |
| `feat/` | 新功能 | `feat/organization-setup-ai` |
| `fix/` | 修 bug | `fix/task-create-entry` |
| `design/` | 视觉、设计系统、token | `design/token-scale` |
| `docs/` | 只改文档 | `docs/audit-report` |
| `chore/` | 依赖、CI、脚本 | `chore/stylelint` |
| `integration/` | 集结分支，会开 PR 做预览 | `integration/v1.1-fix` |
| `release/` | 定版候选 | `release/v1.0` |
| `archive/` | 冻结留档，不再改 | `archive/v0.1-2026-10-21` |

**硬性要求：**

1. 全小写，单词之间用 `-`。不用下划线、不用中文、不用大写字母。
2. **不准带 AI 的名字，不准带随机串。** `claude/xxx-74k1ul` 这种是反面教材。
3. 一个分支只做一件事。做完就合并、然后删掉。
4. 描述用名词或动词短语，三到五个词，让人一眼看出在做什么。

### 8.2 ⚠️ 开着 PR 的分支不准改名，也不准删

**Deploy Preview 的编号就是 PR 的编号**（`deploy-preview-3` ↔ PR #3）。

在 GitHub 上，**改名 = 新建 + 删除**。而删掉一个分支会连带关闭用到它的 PR：

- 删掉 PR 的 **head 分支** → 那个 PR 被关闭
- 删掉 PR 的 **base 分支** → 那个 PR 也被关闭

PR 一关，它的 Deploy Preview 网址就作废，而且**重开会拿到一个新编号，旧网址回不来**。

**所以：先合并或关闭 PR，再改名或删除。** 顺序反了就救不回来。

每次动分支前先跑一遍，确认它没有被任何 PR 用到：

```
gh api "repos/juanxiwu2005/platypus-officer-hub/pulls?state=open" \
  --jq '.[] | "PR #\(.number): head=\(.head.ref)  base=\(.base.ref)"'
```

### 8.3 当前的分支（2026-10-29）

| 分支 | 是什么 | 能不能动 |
| --- | --- | --- |
| `main` | 正式网站。推上去就上线 | 只有 Juanxi 批准才能合并（见第 3 节规则 4）|
| `v1` | 内容和 `main` 相同 | ❌ **不能删不能改名** —— 它是 PR #2 和 #3 的 base，删了会关掉 Deploy Preview 3 |
| `integration/v1.1-fix` | **Deploy Preview 4**（PR #4）= main + S1/S2/S3 修复 | ❌ 改名会毁掉 DP4 |
| `feat/organization-setup-ai` | **Deploy Preview 3**（PR #3）= v1 + `src/phase1/` + `src/organization/` + `src/workspace/` | ❌ 改名会毁掉 DP3 |
| `feat/ai-native-phase1` | Deploy Preview 2（PR #2）| ❌ 改名会毁掉 DP2 |
| `feat/ai-night-mode` | **Deploy Preview 7**（PR #7）= DP5 + Night Mode 工具链 + N1–N6 设计 token | ❌ 改名会毁掉 DP7 |
| `integration/dp3-dp4-merge` | **Deploy Preview 5**（PR #5）= DP4 + DP3 合并版（M1）：AI 走 AIR、服务器存储隐藏 | ❌ 改名会毁掉 DP5 |
| `feat/m2b-ai-intake` | **Deploy Preview 6**（PR #6，base `main`）= DP5 + M2a + M2b：Ask 分清任务与活动、AI 预填表单、活动 Plan check | ❌ 改名会毁掉 DP6 |
| `integration/v1.0` | **Deploy Preview 8**（PR #8，base `main`）= PR #7 + PR #6 合并版，再加 S6–S9、M3 排序题、删除 DeepSeek。预览 https://deploy-preview-8--platypus-officer-hub.netlify.app | ❌ 改名会毁掉 DP8 |

**最接近「下一个上线版本」的是 `integration/v1.0`（DP8）**，它已经包含 DP3、DP4、DP5、DP6、DP7 的内容。
上线后哪些 PR 可以关、关了之后哪些分支可以删，见 `docs/LAUNCH_STEPS.md` 第 5 节。

2026-10-29 核对：以前记的冗余分支（`fix/s1-ux-bugs`、`fix/s2-safety`、`fix/s3-perf`、
`claude/platypus-perf-ui-polish-74k1ul`、`fix/setup-v3-completion`、`feat/activity-workspace-v1`、
`docs/m2a-prompt-strategy`）在 GitHub 上都已经不存在了，不用再处理。

### 8.4 以后新开分支

上线之前，新的开发直接在 `integration/v1.0` 上做；要单独做一件事就从它开分支，不要从 `main` 开：

```
git fetch origin
git checkout -b fix/<描述> origin/integration/v1.0
```

合并到 `main` 之后，改为从 `main` 开分支。

做完推自己的分支，**不要自己合并**。Juanxi 在 GitHub 上看过再合。

## 9. AI-native Phase 1 设计检查点（2026-10-25，Juanxi 明确确认）

本次新架构为 AI-native、Activity-centered、Organization Context driven。用户最新要求优先于第 7 节旧界面规则；例外仅用于 `/phase1/*`，旧页保留原行为。新壳允许中心 AI composer、内容块与渐进显示，主要视觉参考仅 Apple HIG / monday / Notion Projects。

分支 `feat/ai-native-phase1` 从最新 v1 创建。只做三个可点击高保真画面、虚构 Constitution 建议审核、自定义岗位能力映射、两类流程预览与底层设计说明。`src/phase1/` 是隔离的前端演示，不是正式业务模型。保持确定性日期引擎与所有旧测试，不删除旧页、不改 main。

**画面完成后必须停止等 Juanxi 验收；不得自动接正式 API/数据模型、完整 planner、生产数据库、真实账户、长期 Conversation storage 或正式 Handoff。** 详见 `docs/phase1/ARCHITECTURE.md` 和 `HANDOFF.md`。旧独立任务、固定 RoleFunction 及聊天存储仍有设计债，不能把新壳中的检查当作整个旧应用已改造。


## 10. Organization Setup AI 增量（2026-10-25，覆盖第 9 节本次范围的停止条件）

Juanxi 在检查原型后明确要求继续实施并上线：章程/岗位/职责驱动的 AI onboarding，PDF/Word/粘贴/虚构示例，部门分组多岗位矩阵，隐藏 RACI，可编辑成员与 Exec Board 流程，真实 AI、每步线上保存、组织指导文档和 prompt 审核。该授权覆盖此增量所需的 API 与线上存储，不代表批准合并 main、真实身份系统、完整 planner、长期对话存储或 Handoff。

- 分支 `feat/organization-setup-ai`，草稿 PR #3（base v1）；main 与旧分支保留。
- `/phase1/setup` 使用 `src/organization/` + `/api/org/setup`、`/api/org/ai`；`/phase1/setup-legacy` 保留前一版设置，旧数据键不迁移或重置。
- Netlify Blobs 保存隔离的测试工作区；HttpOnly 随机 cookie、修订号与 ETag 防覆盖；草稿与已批准快照分开。仅虚构测试数据；访问会话有效期与归档保留分离，到期不删除历史，跨设备组织账户尚未实现。
- 提示词正本 `src/organization/prompts.ts`，五阶段带版本；前端可查看精确 prompt，最终 Review 明确提醒 Juanxi 审阅。具体数据包/原因见 `docs/organization/PROMPTS.md`。
- 旧测试完整保留；前一版 Phase 1 设置检查转到 setup-legacy，新行为单独测试。区分自动模拟、真实文件解析与线上真实模型结果。
- 详细交接与已验证限制见 `docs/organization/HANDOFF.md`。不得把新 onboarding 的数据存储称为整个旧应用已经迁移数据库。
- **2026-10-27 M1（Juanxi 决定）：这套服务器存储（含 Activity workspace）默认隐藏**，开关 `ORG_SETUP_ENABLED`（不设 = 关）：端点返回 404 且不执行存储代码，`/#/phase1/` 只剩本地示例。代码和测试保留，见 `docs/AI_SETUP.md` 第 4 节。


## 11. 数据基础优先与测试节制（2026-10-26，Juanxi 最新要求）

**数据记录/管理/治理是底层；组织配置在其上；AI 是读取、提出建议的上层。** 新功能必须先持久化输入与操作，再调用 AI；操作、原件、交互/对话、AI 请求与结果、采用或拒绝、错误、配置历史均应带服务器时间戳与来源并可归档。不要把最新快照等同于历史，不得因会话到期自动清除档案。共享应是受控功能，当前私有工作区不自动对外或跨组织共享。

当前范围为新版 Organization Setup：`org-archive.mts`、`storage.mts` 的追加式事件、客户端 `archive.ts`、AI job/input/result 记录、分块原件与 SHA-256 校验、导出与原件下载。旧业务页为参考，尚未全面迁移成新组织数据库；真实账号、组织成员权限、跨组织共享/分析及正式交接仍需后续实施，不能谎称已上线。

速度优先的新默认模型是 `muse-glimmer-30b`；`glm-5-3` 仅在用户主动选择 Deep review/stronger model 时调用，路由版本 v2。不要自动升级慢模型或启动额外 AI 评估。Juanxi 要求停止新增真实 AI 测试，主要由他实操验收；必要构建和小范围离线/模拟检查不消耗 AIR 额度。保留 GitHub CI，不重复无必要的全量测试。最新交接见 docs/organization/HANDOFF.md 与 DATA_FOUNDATION.md。

## 12. Organization Setup v3（2026-10-26，Juanxi 最新反馈优先）

- 五章：Constitution → Your team（部门、组织架构图）→ Responsibilities（部门/岗位职责、Check）→ Activity workflow → Review。移除 Board work 设置章，原字段和历史保留。右侧 AI 必须先提出白名单变更，用户批准后才应用。
- Prompt 不属于产品 UI：服务端正本 `netlify/lib/organization/prompts.mts`；在开发聊天中交给 Juanxi 审核。`src/organization/prompts.ts` 仅用于旧客户端兼容，不得重新导入网页。
- `setupLogic.ts` 负责稳定 ID、手动字段保护、局部引用修复和确定性 JSON 编译。JSON 是机器可读配置，可由 Python 读取；不执行模型生成的 Python。确认时服务器重新编译，不能信任客户端提交的 compiled。
- 返回/前进无修改应为零 AI 调用；已有职责/流程不得整段清空。上游职责变化只标记相关节点；删除岗位须提示、只移除失效引用。所有变更、请求、错误、批准与原件继续归档。
- JSON 失败必须区分输出上限、空内容、流未完成和语法错误。服务端先归档原始回复及 finish reason/字数/token/首字/总耗时，再解析和验证；不得静默补全缺失语义，不自动重复收费请求。原生 schema 被明确拒绝时最多降级一次。
- Juanxi 最新恢复授权：允许少量虚构数据的真实 AI 冒烟测试，以诊断格式错误；不恢复整套真实评估。默认 Muse，只有明确 Deeper review 使用 GLM。测试与排队推断必须区分，不能把首字等待直接称为供应商排队。

### v3.1 实测补充
AIR 接受 json_schema 仍可能不遵循形状；必须在 prompt 给精确字段，并在本地验证。Muse 请求 none 实际返回 low，不能把配置等同于执行。路由v3：Gemma 长结构任务、Muse 短编辑、GLM 主动深度。已观察到的 organization/name/department_id/duties/quotes 别名可严格翻译；不能补造缺失职责。详见 V3_CHANGELOG。

## 13. F1–F7 审计修复（2026-10-26，Juanxi 已批准执行）

用户批准独立 Worktree 多 Agent 实施审计方案；本次从 feat/organization-setup-ai@54e5823 在 fix/setup-v3-completion 集成，不改 main。数据/AI/UI 各有唯一文件负责人，主 Agent 维护共享契约、文档和批准配置的工作区消费；独立 Review 复核。当前事实以 docs/organization/F1_F7_IMPLEMENTATION.md 为准，旧六章、页面 prompt 与 v2 路由描述仅历史。

- 未保存完整草稿按私有 workspace 本地保护；内部导航保存成功才离开。409 必须保留本地副本并由人决定，不能自动用新 revision 覆盖远端。不要把操作事件当成能直接恢复的完整草稿。
- 层级重接/断开也属于人工决定。纯展示字段不使职责检查无谓失效；语义变化只复核实际相关节点。确认前必须明确处理 needsReview；允许保留未分配步骤，但必须记录未解决项。
- Check 按语义输入复用，包括空风险；进入后自动一次，明确 Skip 不谎称取消已开始计费的请求。所有 AI 变更仍需批准。
- selection 是服务器验证的 screen/entityType/entityId 数据；不能据它授予权限。requestId 标识一个显式用户动作，网络重放复用；新ID才代表主动重试。
- 原文和失败 transport 指标先归档，再解析模型 JSON。区分本站任务等待和供应商等待，不能从首字直接断言排队。不得为本轮回归自动调用真实AI或做额外收费比较。
- `/phase1` 消费服务器 approved.compiled，不读取未确认 draft，不把配置写入旧 localPreviewRepository。示例只能显式在 `?example=1` 或 setup-legacy 使用；旧 Today/Tasks 等仍是独立旧业务。
- 完整 Board planner、真实账号、跨组织共享和旧业务数据库迁移仍超出本轮；不把模板名称称为已实现规划器。正式合并/发布仍需 Juanxi 批准。


## 14. Activity Workspace（2026-10-26，用户已授权实施）

用户选A1首页/B1活动列表/C2时间轴，批准独立Worktree多Agent全方案，见docs/organization/ACTIVITY_WORKSPACE_PLAN.md。共享schema和路由由主Agent拥有，Data/Schedule/UI/AI/Setup分别维护唯一文件，独立Review；先契约后并行。首页重点事项必须从现有任务确定性排序、默认3项可展开，不做AI摘要。AI通过同一受验证命令操作业务数据/调表单/创建Member和Executive工作项；不能直写数据库。私有测试actor不等于真实登录。保留旧演示；不改main，不自动真实AI评测。
