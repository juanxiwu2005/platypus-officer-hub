# Night Mode V1 — 多 Agent 自动开发手册

Night Mode 让一组 ASU AIR Agent 在受保护的功能分支完成一个**已经批准、范围明确**的任务，并经过本地测试、独立 Review 和 GitHub CI。它不会合并 `main`，也不会部署 Production。

## 1. 当前状态（2026-10-28 快照）

| 项目 | 已验证事实 |
| --- | --- |
| GitHub 仓库 | `juanxiwu2005/platypus-officer-hub` |
| Production 分支 | `main`，基线 `4dc55ba`（本文件涉及的任何改动都还没进 `main`）|
| 自动开发分支 | `feat/ai-night-mode`，**已并入 DP5**（`integration/dp3-dp4-merge`），所以它包含 S1/S2/S3 和 M1 的全部成果 |
| 人工闸门 | Draft PR [#7](https://github.com/juanxiwu2005/platypus-officer-hub/pull/7)，预览 https://deploy-preview-7--platypus-officer-hub.netlify.app |
| 控制器 | `scripts/night-mode.mjs`（单任务）、`scripts/night-queue.sh`（队列，见 7d）|
| 项目权限 | `opencode.json` |
| 运行环境 | Node 22；GitHub CLI 已登录；OpenCode；本地依赖已安装 |
| 编码主力 | `backend-coder`（ASU `glm-5-3`）。原来是 `orchestrator`，它被禁止编辑文件，详见第 2 节的变更记录 |
| 预算 | 300 步 / 45 分钟 / 5 轮，详见 **7b 运行环境预算卡** |
| **端到端** | **2026-10-28 首次完整跑通**：编码 → `npm run check` → 独立 Critic `APPROVED` → 提交推送 → GitHub CI `pass`（7 分 3 秒）→ Deploy Preview → PR 评论 `READY_FOR_CLAUDE` |

这是带日期的快照，不是永久承诺。每次运行都必须重新执行 `--doctor`，完成后重新检查 PR 和 CI。

### 2026-10-28 首次端到端成功之后发现的两个问题（都还没修）

1. **`review.patch` 可能不完整。** 如果改动在本轮开始前就已经提交，控制器生成的
   `review.patch` 只剩下本轮新增的部分，Critic 会收到一份残缺的 diff。
   这次 Critic 自己察觉了并改为直接读工作区，所以结论仍然正确 —— **但那是运气，不是设计**。
   Critic 的原话建议：控制器应保证 `review.patch` 始终包含真实代码 diff 以便审计。

2. **可能存在绕过 shell 白名单的代码执行入口。** 本次运行中 `code-critic` 尝试通过一个
   `execute` 工具跑 `require('child_process').execSync(...)`，而 `opencode.json` 的
   `bash` 白名单只管 `shell` 这个 action。它随后改用 Read/Grep 完成了工作，
   但**这条路径是否真的被拦住，没有验证过**。
   → 下次检查 `opencode debug agents` 输出里除 `shell` 之外有没有别的可执行 action
   （如 `execute`、`code`、`run`），有就一并 deny。

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

### 2026-10-28 变更：放开预算，不放开安全边界

**原因：** 换成 `backend-coder` 之后编码阶段确实跑起来了（自己读文件、自己跑 `git status`、
自己 Grep），但连续两次仍然停在编码阶段，原因是**预算**不是安全：

```
"backend-coder": { "steps": 15 }
```

而控制器的提示词要求它开工前先读 `AGENTS.md`、`PROGRESS.md`、`PRODUCT_PLAN.md`、
`RULES.md`、`NIGHT_MODE.md`、`TASK.md` —— 六步没了，只剩九步干活。而"把 14 处手写空状态
换成 `<Empty>`"光是每个文件读一次改一次就要 20 步以上。**任务在 15 步里装不下。**

**改了什么：**

| 文件 | 改动 | 为什么不是安全问题 |
| --- | --- | --- |
| `opencode.json` | 五个编码 Agent 的 `steps`：15 → **300** | 步数只决定能干多少活，不决定能干什么 |
| `opencode.json` | shell 白名单新增只读与测试命令：`ls` `cat` `head` `tail` `wc` `grep` `rg` `find` `git grep` `git ls-files` `npx tsc` `npx vitest` `npm run lint` | 全是只读或跑项目自己的测试，不写文件、不联网、不改系统 |
| `scripts/night-mode.mjs` | `COMMAND_TIMEOUT_MS`：20 → **45 分钟** | 300 步配 20 分钟会被时间掐死，等于没放开 |
| `scripts/night-mode.mjs` | `MAX_CYCLES`：3 → **5** | 返工次数，不是权限 |

**明确没有改的（安全边界，一条都没动）：**

- 保护文件禁改：`.env*`、`.git/**`、`.gitignore`、`AGENTS.md`、`docs/NIGHT_MODE.md`、
  `package.json`、`package-lock.json`、`opencode.json`、`scripts/night-mode.mjs`、
  `.nightmode/**`、`.github/**`、`netlify.toml`
- 禁止 `node` / `curl` / `wget` / `brew` 等任意命令（白名单仍然默认 deny）
- `external_directory` 仍为 deny
- Agent 不能 commit、push、merge、部署
- 独立 `code-critic` 审查
- 完整 `npm run check`
- GitHub CI
- 永不自动合并 `main`，永不部署 Production

**保留了强制读文档的提示词。** 曾考虑砍掉它来省步数，被 Juanxi 否决，理由正确：
每次 `opencode run` 都是全新会话，模型没有上一次的记忆，必须自己把规则读进来。
病根是步数太低，不是读文档太多。

**代价：** 300 步 + 45 分钟意味着单次运行可能消耗更多 ASU 额度，也可能跑更久。
这是刻意的取舍——与其反复在半路被掐断、什么都没产出，不如让它一次做完。

**谁批准的：** Juanxi，2026-10-28。

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

## 7b. 运行环境预算卡（2026-10-28 实测）

**写任何任务文件之前先看这张卡。** 2026-10-27 晚连续五次失败里有四次，根因都是
「给一个没量过的运行环境写指令」—— 任务要求的东西超出了 Agent 实际能做的范围。
这张卡就是那份测量结果。

| 项目 | 当前值 | 在哪里改 |
| --- | --- | --- |
| 单次运行步数 | **300** | `opencode.json` 各 agent 的 `steps` |
| 单条命令超时 | **45 分钟** | `scripts/night-mode.mjs` `COMMAND_TIMEOUT_MS` |
| 返工轮数 | **5** | `scripts/night-mode.mjs` `MAX_CYCLES` |
| 编码主力 | **`backend-coder`**（ASU `glm-5-3`） | `scripts/night-mode.mjs` `CODING_AGENT` |
| 开工前固定开销 | **约 6 步**（控制器要求先读 AGENTS / PROGRESS / PRODUCT_PLAN / RULES / NIGHT_MODE / TASK） | 控制器 prompt |

**Agent 能跑的 shell 命令（其余一律拒绝）：**

```
git status*   git diff*   git log*   git show*   git branch --show-current*
git grep*     git ls-files*
npm test*     npm run build*   npm run e2e*   npm run check*   npm run lint*
npx playwright test*   npx tsc*   npx vitest*
ls*  cat*  head*  tail*  wc*  grep*  rg*  find*
```

**不能跑** `node`、`npx`（上面三个除外）、`curl`、`wget`、`brew`、`python`，
也**不能跑复合命令**（带 `&&` 的会被拒，要拆成单条）。

**Agent 不能编辑：** `.env*`、`.git/**`、`.gitignore`、`AGENTS.md`、`docs/NIGHT_MODE.md`、
`package.json`、`package-lock.json`、`opencode.json`、`scripts/night-mode.mjs`、
`.nightmode/**`、`.github/**`、`netlify.toml`。

→ 所以**需要装依赖、改 CI、改 AGENTS.md 的任务不能走 Night Mode**（例如加 stylelint/eslint、
定版改文档）。那些走普通会话。

---

## 7b-2. ⚠️ 队列运行期间，任何人都不要推送这个分支

**2026-10-28 的教训，代价是整晚七个任务全军覆没。**

那一晚 T1 实际上**完全成功**了：611 个单元测试 + 276 个页面测试通过，
`code-critic` 给了 `STATUS: APPROVED`，控制器也提交了。然后：

```
! [rejected]  feat/ai-night-mode -> feat/ai-night-mode (fetch first)
NIGHT MODE STOPPED: git push origin feat/ai-night-mode failed with exit code 1
```

原因：**Claude 在队列运行期间往同一个分支推了一个文档提交。** 本地落后于远端，
推送被拒，控制器把推送失败当致命错误，任务算失败。后面每个任务撞同一面墙。

**五个任务做完了活、过了测试、过了独立审查，然后因为一次无关的文档推送被判失败。**

### 规矩

1. **队列跑起来之后，不要再往 `feat/ai-night-mode` 推任何东西** —— 包括只改文档的提交。
   要改就等队列结束，或者推到别的分支。
2. 开跑前先 `git pull`，确保本地就是远端最新。
3. 云端会话（Claude）尤其要注意：它看不到你本地在跑什么。**开跑前告诉它一声。**

### 控制器这边也已经加固（2026-10-28）

推送被拒不再直接判死。现在会：`fetch` → `rebase` 到新的远端顶端 →
**重新跑一遍完整检查**（测试是在旧基础上过的，换了地基必须重验）→ 再推。

rebase 冲突或重验失败就停下，**提交留在原地交给人**，永不 force-push，
也永不推送没在落地位置上验证过的代码。

---

## 7c. 任务文件怎么写（踩过的坑）

1. **调查交给人，Night Mode 只做机械改动。**
   「先查出哪些 CSS 没人用，再删掉」会把 300 步全花在查上。正确做法是人先查好，
   任务里直接给清单。2026-10-27 晚两次失败都是这个。

2. **不要在任务里描述文件的当前状态。**
   写了「styles.css 共 718 行」，Agent 改完变成 626 行，再回头一读就认为出了问题，
   于是停下来查 git 而不是继续干活。只写要达到什么结果。

3. **明确禁止改完回头「核对基线」。** 直接写进 Constraints。

4. **别让它读用不到的大文件。** 不需要改 `styles.css` 的任务就写明「不要读 styles.css」。

5. **人给的清单也可能错 —— 让它有权质疑。**
   我给的死代码清单里 `b1/b2/b3` 是错的：`Team.tsx` 用 `` `band b${BAND[...]}` ``
   动态拼类名，字符串 `"b1"` 在源码里出现 0 次，文本搜索查不到。
   是 `backend-coder` 动手前发现并报告的。
   → 任务里保留「不确定的一律保留并写进交接记录」这类出口，不要逼它盲从。

6. **动态拼接的类名是反复出现的陷阱。** 核对「某个 class 还有没有人用」时，
   除了搜字面量，还要扫源码里所有 `` `前缀${...}` `` 模板，看能拼出什么。
   已知点：`Team.tsx` 的 `` band b${...} ``、`MetroChart.tsx` 的 `` m-${key} `` 和
   `` has-${severity} ``、`WorkDetail.tsx` 的 `` aw-task-${status} ``。

---

## 7d. 任务队列：一个走不通，换下一个

单跑 `night-mode.mjs` 一次只做一个任务，失败就整晚停在那里。队列解决这个。

```bash
mkdir -p .nightmode/queue
# 把任务文件放进去，按文件名排序执行
#   .nightmode/queue/01-fontscale.md
#   .nightmode/queue/02-spacing.md
#   .nightmode/queue/03-radius-z.md

caffeinate -dimsu bash scripts/night-queue.sh
```

`caffeinate` 让 Mac 不睡；队列跑完它自己退出。

**失败隔离：** 任务失败不停队列，继续下一个。只有**声明了依赖**的任务才会被跳过：

```markdown
# Depends on: 01-fontscale.md
```

被依赖的任务失败或被跳过时，这个任务也跳过 —— 不在坏地基上继续。没声明依赖的照常跑。

**结果去向：**

| 目录 | 内容 |
| --- | --- |
| `.nightmode/done/` | 跑通的任务 |
| `.nightmode/failed/` | 失败的（`.md`）和被跳过的（`.skipped.md`） |
| `.nightmode/logs/` | 每个任务的完整输出 |

**队列不会绕过任何安全闸门。** 每个任务仍然各自走完整的 doctor → 编码 → 测试 →
Critic → CI。队列只决定「下一个跑哪个」。

**队列自己也查保护文件。** 控制器的保护文件检查只在它自己提交时生效；队列存 WIP
提交时会再查一遍（见下），发现保护文件被改就**停下整个队列**，不偷偷存进分支。

---

## 7e. 中断后的进度分流：哪些留，哪些重做

控制器只在全部闸门通过后才提交。**所以失败时改动留在工作区** —— 它没丢，但也没验证过。

而下一个任务的 doctor 要求工作区干净。队列的做法是先把半成品存成一个提交：

```
[WIP-UNVERIFIED][queue] <任务名> 中断时的半成品
```

**这个提交没过测试、没过 Critic、没过 CI。它只是「存着别丢」。**

### 第二天怎么分流

**第一步：看它到底改了什么**

```bash
git log --oneline --grep='^\[WIP-UNVERIFIED\]'
git show --stat <那个提交>
```

**第二步：对照任务文件的 Done means 逐条判断**

| 情况 | 怎么办 |
| --- | --- |
| 某一条已完整做完，且和别的条目互不依赖 | **留**。单独挑出来，补测试，正常提交 |
| 做到一半（比如 14 处只换了 6 处） | **留着当起点**，写一个新任务「剩下 8 处在这几个文件」，比重做快 |
| 改动和失败原因直接相关（例如它为了绕过报错改坏了测试） | **丢**。这类改动的前提本身是错的 |
| 看不出它想干什么 | **丢**。看不懂的半成品不值得留 —— 重跑一次比读懂它便宜 |

**第三步：执行**

```bash
# 全部留下 → 把 WIP 提交改成正常提交（先补测试、先跑 npm run check）
npm run check && git commit --amend -m "[S4][Night Mode] <说清楚做了什么>"

# 全部丢弃 → 回退那个提交，保留在 reflog 里可找回
git revert --no-edit <那个提交>

# 部分留 → 回到那个提交之前，只挑想要的改动，其余不要
git reset --soft <那个提交>^    # 改动回到暂存区，逐个挑
```

⚠️ **不要用 `git checkout -- . ; git clean -fd` 来「重新开始」。** 那会把上一次的
全部成果一起扔掉。2026-10-27 晚我们差点因此丢掉一次已经做完的 CSS 清理。
**保存进度的办法是提交，不是清空。**

### 一条经验

中断**不等于**白干。2026-10-27 晚最后一次「失败」的运行，其实已经把 14 处
`<Empty>` 替换全部做完了 —— 它只是在收尾时被自己改过的文件绕晕、提前结束了回合。
那些改动完整保留在工作区，提交之后下一轮运行发现没活可干，直接通过了全部闸门。

**所以：失败之后，先看 `git status` 和 `git diff`，再决定要不要重做。**

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
- 修改保护文件（`AGENTS.md`、`package.json`、`.github/**`、`netlify.toml` 等），
  所以需要装依赖或改 CI 的任务必须走普通会话，不能走 Night Mode。
- 修改 GitHub Secrets、Netlify 环境变量或系统设置。
- 任意网页浏览或自动采集外部资料。
- 使用真实研究数据进行测试。

## 10. 修改这套工作流时的规则

Night Mode 自己不能修改自己的安全边界。只有人类明确要求后，受信任的控制器/维护者才可以修改 `AGENTS.md`、本文件、`opencode.json`、`scripts/night-mode.mjs` 或 `.github/**`。每次修改后至少要：

1. 重新运行 `node scripts/night-mode.mjs --doctor`。
2. 检查 `git diff`，确认没有密钥和范围外文件。
3. 推送到 Draft PR，等待 GitHub CI。
4. 更新带日期的状态快照；不要把一次通过写成永久保证。
