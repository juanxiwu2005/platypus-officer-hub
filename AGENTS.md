# AGENTS.md — 给任何接手的 AI（Claude、ChatGPT、DeepSeek……）

这个仓库是 **Platypus** 的代码和计划：一个给学生社团用的“团队型 AI 幕僚长”网站，也是 Juanxi (Steve) Wu 的 ASU Barrett 荣誉论文（STUDY00024727）第 3 阶段的原型。几个 AI 会轮流在这里工作，所以**每次开始前先读这份文件，结束时按第 4 节交接**。

## 1. 先读什么（按顺序）

1. `docs/PROGRESS.md` —— 现在做到哪了、谁在做、下一步是什么。
2. `docs/PRODUCT_PLAN.md` —— 已批准的产品计划 v1.0（唯一正本）。工作包和验收标准在第 13 节，范围和砍单顺序在第 12 节。
3. 按任务再读：`docs/RULES.md`（ASU 规则库）、`docs/SEO_PLAYBOOK_REFERENCE.md`（流程模板来源）、`docs/AI_SETUP.md`（AI 供应商怎么切换）。

## 2. 关于项目负责人

- Juanxi 不写代码。用简单的中文向他解释，一次只讲一步，不用术语；需要他动手的地方写清楚点哪里。
- 他通过**预览网址**验收每个工作包，只回答“可以”或“改哪里”。
- 计划的任何改动都要他同意，并记在 `docs/PROGRESS.md` 的“决定记录”里。

## 3. 硬性规则（不能破）

1. **不放研究数据。** 不提交问卷原始回答、访谈转写、录音、参与者姓名或引语。仓库里只有虚构的演示社团数据。也不要把这些资料贴给任何 AI。
2. **不放密钥。** API key 只放在 Netlify 的环境变量里（见 `docs/AI_SETUP.md`），绝不写进代码、文档或提交记录。
3. **日期只由规则引擎计算。** AI 只能通过白名单操作改数据（见计划第 11 节）、起草提醒、答案和手册；AI 输出里的日期字段一律丢弃。v1.2 起（Juanxi 2026-10-23 批准）：AI 文字里只保留和社团数据里已有日期完全一致的日期，其余遮掉；小改动（改状态、改名、标签、难度、记录联系）以当前查看者的权限立即生效并可撤销，其余改动仍要社长或副社长批准。
4. **`main` 分支就是正式网站。** 每次推送到 `main`，Netlify 都会自动上线。11/8 之前，所有 v1 的工作都在 `v1` 分支上做，**只有 Juanxi 批准后才能合并到 `main`**。
5. **AI 供应商：** 开发时用 DeepSeek，只处理虚构数据；有真实参与者的 Phase 3 会话必须用 ASU AIR（或 IRB 批准的供应商）。
6. **界面文字用英文**（用户是美国学生）；文档用中文。
7. 不做计划第 12 节标为“不做”的功能（例如库存、成员名单）。

## 4. 轮流工作的交接规则

**开始前：**

1. 拉取最新代码：`git fetch origin && git checkout v1 && git pull`。
2. 读 `docs/PROGRESS.md`。如果某个工作包写着“进行中”且标了别的 AI，就不要碰它，避免冲突。
3. 在 `docs/PROGRESS.md` 里把你要做的工作包标为“进行中”，写上你的名字（例如 ChatGPT、Claude、DeepSeek）和日期，然后提交并推送。

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
- 正式网址：https://platypus-officer-hub.netlify.app （`main`，仍是 v0.1）。`v1` 的预览：draft PR #（见 `docs/PROGRESS.md`）里 Netlify 给出的 Deploy Preview 网址。

## 6b. v1.1 改版后的代码地图（2026-10-23，覆盖上面关于页面的旧描述）

- 外框：`src/components/Layout.tsx`（顶栏、Demo 小标、铃铛、导航）+ `src/components/rail/`（`RailContext.tsx` 右栏状态；`Rail.tsx` 两个标签和详情分发；`AskPanel.tsx` 对话；`ChangeCard.tsx` 变更单审核）。
- 组件：`src/components/ui/`。AI：`src/lib/assistant.ts`（浏览器）、`src/lib/chatCards.ts`（共用过滤）、`netlify/functions/chat.mts`（`/api/chat`）。v1.2：`src/lib/aiContext.ts` 把“当前查看者能看到的全部数据”整理给 AI（不含别人的个人缓冲、私信、文件、演示密钥）；`src/data/sharedPool.ts` 是服务器上的虚构共享池，只读，`/api/pool` 可取；小改动走 store 的 `aiAutoApply` / `undoAuto`，大改动走 `reviewChange`。旧的 `/api/command`、`/api/ask`、`/api/nudge/draft` 仍在用。
- 流程图：`src/components/flow/metro.ts`（纯布局，有单元测试）+ `MetroChart.tsx`。看板：`src/data/board.ts`。
- 页面测试：`e2e/helpers.ts` 有 `resetDemo`、`demoClock`、`ask`。本机没有下载浏览器时用 `PW_CHROMIUM=<chromium 路径>`。

## 7. 界面规则（2026-10-23 简化改版，Juanxi 批准）

改任何页面前先读这一节。依据：《Platypus 简化改版方案》（https://claude.ai/artifact/QhCthf71crEC62bBua5zJD）。

1. **三栏布局：** 左导航、中间内容、右栏。右栏有两个标签：**Ask**（唯一的 AI 入口，`src/components/rail/`）和 **Details**（点任何东西打开的详情）。不要在页面里再放 AI 输入框。
2. **只用 5 个组件拼页面**（`src/components/ui/`）：状态色块 `StatusPill`、进度链 `Chain`、表格 `.tbl`、悬停卡 `Hover`/`Info`、右栏详情（`useRail().open(...)`）。
3. **三级交互：** 看（颜色）→ 停（悬停卡，最多 3 行）→ 点（右栏详情）。不再新增 ▶ 展开和选项卡。
4. **文字：** 页面标题 1–2 个词；一张卡最多“标题 1 行 + 信息 1 行 + 状态色块”；原因、假设、出处放进悬停或 Help；字号不小于 14px。
5. **字数上限（主区，`scripts/word-count.mjs` 量）：** Today ≤ 160、Events ≤ 180、Rules ≤ 170、Tasks ≤ 130、Team ≤ 130、Settings 每块 ≤ 125。新增内容超了就先删别的。
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

### 8.3 当前的分支（2026-10-27）

| 分支 | 是什么 | 能不能动 |
| --- | --- | --- |
| `main` | 正式网站。推上去就上线 | 只有 Juanxi 批准才能合并（见第 3 节规则 4）|
| `v1` | 内容和 `main` 相同 | ❌ **不能删不能改名** —— 它是 PR #2 和 #3 的 base，删了会关掉 Deploy Preview 3 |
| `integration/v1.1-fix` | **Deploy Preview 4**（PR #4）= main + S1/S2/S3 修复 | ❌ 改名会毁掉 DP4 |
| `feat/organization-setup-ai` | **Deploy Preview 3**（PR #3）= v1 + `src/phase1/` + `src/organization/` + `src/workspace/` | ❌ 改名会毁掉 DP3 |
| `feat/ai-native-phase1` | Deploy Preview 2（PR #2）| ❌ 改名会毁掉 DP2 |

**Juanxi 重点关注的是 DP3 和 DP4，合并方案见 `docs/EXECUTION_PLAN_2026-10-27.md`。**

### 8.4 以后新开分支

从 `integration/v1.1-fix` 开，不要从 `main` 开：

```
git fetch origin
git checkout -b fix/<描述> origin/integration/v1.1-fix
```

做完推自己的分支，**不要自己合并**。Juanxi 在 GitHub 上看过再合。
