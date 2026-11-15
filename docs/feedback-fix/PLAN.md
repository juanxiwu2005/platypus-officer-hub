# 测试反馈修复：执行方案（2026-11-14）

> 背景和每个问题的备选方案见 [`../FEEDBACK_PLAN_2026-11-12.md`](../FEEDBACK_PLAN_2026-11-12.md)。本文件是 Juanxi 2026-11-14 选定方案后的**执行细则**。
> **2026-11-15 更新：** Juanxi 明确产品和研究只聚焦两件事：①提醒社团成员工作，②Organization succession（交接）。第 11 节按这两点复核了每个阶段，并改了执行顺序；与本节冲突的旧内容以第 11 节为准。
> 集成分支：`claude/fervent-thompson-e2j5u2`（不碰 `main`）。每个阶段由一个独立 worktree 里的子 agent 完成，Claude（主会话）负责合并、整体回归、`docs/PROGRESS.md` 和 `AGENTS.md`。

## 0. Juanxi 的决定（2026-11-14）

| 问题 | 决定 | 阶段 |
| --- | --- | --- |
| Onboarding 1 Goals | 方案 B：SMART 句子 | FB-2 |
| Onboarding 2 组织架构 | Advisor 用虚线平行连接到 President | FB-2 |
| Onboarding 3 日期引擎 | 按上传的时间表更新 | FB-6 |
| Onboarding 4 Buffer / Why | 不移除 buffer，按用户交互逻辑重做 | FB-3（buffer）、FB-2 + FB-3（每屏 Why）|
| Onboarding 5 Reminders | 方案 A：例子 + 三步图 + 类比 | FB-3 |
| Onboarding 6 最后一步 | 方案 A：一个主按钮，去掉社员预览 | FB-3 |
| 其他 1 截止日 | 方案 A：界面只有一个 Due | FB-4（显示）、FB-5（建任务表单）|
| 其他 2 Create Event | 方案 A：+ New event 直接出表单 | FB-5 |
| 其他 3 AI | A + B：修输出额度；尽量延长时间；给用户"停止思考"按钮 | FB-1 |
| 其他 4 Not claimed | 先保留，不改 | — |
| 其他 5 Details | 方案 A：重排三段 | FB-4 |
| 新增 | 添加任务时能指定人 | FB-5 |

## 1. 阶段和并行关系

| 阶段 | 内容 | 何时跑 | 端口（`PW_PORT` / `PW_STORAGE_PORT`）|
| --- | --- | --- | --- |
| FB-0 | 脚手架（主会话）：空样式文件、`.ob-why`、时间表文件入库、本方案 | 已完成 | — |
| FB-1 | AI 可靠性：输出额度、时间上限、Stop 按钮 | 第一波，并行 | 4201 / 4202 |
| FB-2 | Onboarding 上半：Welcome、Name、Constitution、Goals、Team | 第一波，并行 | 4211 / 4212 |
| FB-3 | Onboarding 下半：First event、Reminders、Confirm、Invite | 第一波，并行 | 4221 / 4222 |
| FB-4 | 任务详情三段 + 界面只有一个 Due | 第一波，并行 | 4231 / 4232 |
| FB-6 | 日期引擎按时间表校准 | 第一波，并行 | 4261 / 4262 |
| FB-5 | + New event；建任务时指定人；建任务只有一个日期 | 第二波（等 FB-1、FB-4 合并后）| 4251 / 4252 |
| FB-7 | 集成（主会话）：合并、整体回归、文档 | 最后 | 4173 / 4174 |

第一波五个阶段的文件互不重叠（见各阶段"独占文件"）。`src/onboarding/copy.ts` 由 FB-2、FB-3 共用，但各改各的块（文件头注释的老规矩）。

## 2. 所有阶段共同遵守

1. 先读 `AGENTS.md` 第 3 节（硬性规则）、第 7 节（界面规则）、7.1（动效规则），再读本文件里自己的那一节。
2. **硬规则：** 界面文字用英文；日期只由规则引擎计算（`src/engine/`），AI 和界面都不自己算日期；不放密钥、研究数据；不发任何真实消息；**不调用正式网站或任何真实 AI 接口**（测试全部用模拟）。
3. **研究记录：** 不新增记录类型（`ui.*` 的种类不变），不改已有 `data-testid`、已有记录字段的含义。确实要动的，写进交付报告的"需要 Juanxi 确认"。
4. **不升 `SCHEMA_VERSION`。** 新字段只能是可选的，旧存档读得进来。
5. 只改自己"独占文件"里的文件；必须碰别人的文件时，改动尽量小，并在报告里列出。**不改** `docs/PROGRESS.md`、`AGENTS.md`、`package.json`、`.github/**`、`netlify.toml`。
6. 样式写进自己的 `src/styles/fb-0N-*.css`（已建好并已导入）；只用 token；不写 `!important`、`transition: all`、裸毫秒。
7. 改了行为就补测试：单元测试放 `src/test/`，页面测试放 `e2e/fb-0N-*.spec.ts` 或改已有 spec。**不准为了变绿而跳过、删除或削弱测试**；旧测试的预期确实因为本次决定而改变时，改预期并在报告里逐条说明。
8. 交付前在自己的 worktree 里跑：`npm run lint`、`npm run build`、`npm run typecheck:netlify`、`npm test`、`npm run words`，以及**和自己改动相关的**页面测试（`PW_CHROMIUM=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome PW_PORT=… PW_STORAGE_PORT=… npx playwright test <specs> --workers=2 --trace off`）。机器只有 4 核、五个阶段同时在跑，所以不要跑全量页面测试（FB-6 例外）。
9. 小步提交到自己的本地分支，信息格式 `[FB-N][Claude] 做了什么`，**不推送**。提交信息里不写模型名字。
10. 交付报告（最后一条回复）：分支名和最后一个提交号；做了什么；每条测试命令的真实结果（通过几个、失败几个、失败的名字）；没做的和原因；需要 Juanxi 确认的；碰到的别人的文件。

---

## 3. FB-1 AI 可靠性

**为什么：** 2026-11-12 的线上诊断：`/api/nudge/draft` 4 秒内返回 `output limit`，两次都是。我们给的输出额度太小（120），模型没写完被截断，代码把截断当失败，所以提醒里的 AI 句子每次都失败。另一类失败是 AIR 慢（15–23 秒）撞上我们自己设的 22 秒上限。

**独占文件：** `netlify/lib/ai.mts`、`netlify/functions/*.mts`（AI 接口）、新文件 `netlify/functions/limit-probe.mts`、`netlify/functions/health.mts`、`src/lib/api.ts`、`src/lib/aiRetry.ts`、`src/lib/assistant.ts`、`src/components/rail/AskPanel.tsx`、`src/components/NudgeComposer.tsx`、新文件 `src/components/AiWait.tsx`、`src/styles/fb-01-ai-wait.css`、`docs/AI_SETUP.md`、`docs/PHASE3_DATA_DICTIONARY.md`（只加一行 `stopped`）、`src/test/aiBudget.test.ts` 及新测试、`e2e/fb-01-*.spec.ts`、`e2e/ai-fallback.spec.ts`。

### 3.1 输出额度（方案 A）

1. `callProvider` 里：走 AIR 时 `maxTokens = max(调用方给的, AIR_MIN_OUTPUT_TOKENS)`，常量默认 **1024**，可用环境变量 `AI_MIN_OUTPUT_TOKENS` 覆盖（夹在 256–4096）。各接口自己对回答长度的检查（例如提醒那句最多 10 个词）不变：额度是"最多能用多少"，不是"要写多少"。
2. **被截断时自动再试一次**（Juanxi 2026-11-14 批准；这是 `AGENTS.md` 第 12 节"不自动重复收费请求"的一个明确例外）：`finish_reason` 是 `length`/`max_tokens`，且 `salvageTruncated` 没留下东西时，用**两倍额度**（上限 4096）再发一次；只在剩余时间 ≥ 5 秒时才试；一次逻辑调用最多发 2 次请求（格式降级和额度重试共用这个名额）。
3. 用量日志 `ai_usage` 多三项（只是数字和固定词）：`maxTokens`、`reasoningTokens`（供应商在 `usage.completion_tokens_details.reasoning_tokens` 里给了才记）、`retry`（`"output_limit"` 或不出现）。用它确认"额度是不是被思考用掉了"。
4. 测试（模拟 `fetch`，不发真实请求）：①第一次 `length`、第二次成功 → 第二次请求体里的 `max_tokens` 是两倍，结果成功；②两次都 `length` → 报 output limit；③调用方给 120 → 实际发出的 ≥ 1024；④剩余时间不够 → 不重试；⑤日志行包含新字段且不含提示词和回答。

### 3.2 时间上限（方案 B）

事实：仓库记的是 Netlify 约 30 秒切断（2026-11-07 线上日志：31.2 秒后 504）；Netlify 现在的文档写同步函数 60 秒。两者不一致，没有重新量之前不能假设 60 秒。

1. `SYNC_AI_BUDGET_MS` 改成函数 `syncAiBudgetMs()`：读环境变量 `AI_SYNC_BUDGET_MS`，夹在 10,000–55,000，**默认 26,000**（在已观察到的 30 秒以内）。所有同步接口用它；`constitution.mts`、`workflow.mts` 里写死的 21,000 改成"预算减 1 秒"。
2. `/api/health` 多返回 `syncBudgetMs`。浏览器的等待时间 = 这个值 + 4 秒（`src/lib/api.ts`：读一次并缓存；读不到用 30 秒）。`aiRetry.ts` 的超时同步。
3. 新接口 `GET /api/limit-probe?s=NN`：只等待 NN 秒（1–58）然后返回 `{ waited }`，不调 AI、不存任何东西；**只有环境变量 `AI_LIMIT_PROBE=on` 时可用，否则 404**。用途：上线后量一次 Netlify 的真实上限，再把 `AI_SYNC_BUDGET_MS` 调到合适的值（例如真是 60 秒就设 50,000）。步骤写进 `docs/AI_SETUP.md`。
4. 测试：环境变量的夹取；health 返回值；probe 默认 404。

### 3.3 等待看得见 + Stop 按钮

1. 新组件 `AiWait`：转圈 + "Thinking… 12 s"（每秒更新；`aria-live` 只在开始时播报一次，不每秒播报）+ **Stop** 按钮。等了 10 秒后多一行 "Complex questions can take up to N s."（N 来自 health 的预算）。动效只用 token。
2. `callApi` 支持 `signal`；`assistant.ts` 的 `respond()`、`reviewEvent()` 接受并传下去。
3. **Ask 面板：** 忙的时候显示 `AiWait`；点 Stop（`data-testid="ask-stop"`）立即中止请求、输入框马上可用，并给出本地回答：聊天 → 用现有的本地兜底回答，来源写 "Platypus · stopped, quick answer from this browser"；表单的补填（refine）→ 表单保留，来源写 "Platypus · AI stopped, filled from your words"；活动 Plan check → 显示规则引擎自己的检查。
4. **提醒编辑器：** "Checking draft…" 期间显示 `AiWait`，按钮叫 **Skip AI line**：立刻用检查过的模板，草稿按钮可用。
5. 研究记录：不新增记录类型。Stop 后的那条 `ui.answer` 用 `answer: "stopped"`（同一种记录的新取值），在 `docs/PHASE3_DATA_DICTIONARY.md` 的 `ui.answer` 处加一行说明。按钮点击本来就会被通用的点击记录记到。
6. 页面测试（用 `page.route` 让 `/api/chat`、`/api/nudge/draft` 迟迟不回）：看到秒数在走；点 Stop 后出现本地回答、输入框可用、迟到的回答不会再冒出来；Skip AI line 后草稿可用；键盘能到达 Stop；a11y 检查通过。

**这一阶段不做：** 章程阅读、手册起草、First event 的 "Plan it" 的 Stop 按钮（它们自动得到更长的时间；`AiWait` 做成可复用，下一轮接上）。

---

## 4. FB-2 Onboarding 上半

**独占文件：** `src/onboarding/gate/Welcome.tsx`、`founder/Name.tsx`、`founder/Constitution.tsx`（只加 Why 行）、`founder/Goals.tsx`、`founder/goals/*`、`founder/Team.tsx`、`founder/team/*`、`src/onboarding/copy.ts` 的 welcome / `name` / `constitution` / `goals` / `team` 块、`src/components/setup/OrgChart.tsx`、`src/engine/orgChart.ts`、新文件 `src/engine/goalDates.ts`、`src/data/types.ts`（只动 `Goal`）、`src/data/settings.ts`（只动目标的校验）、`src/components/SettingsForms.tsx`（只动 `GoalsEditor`）、`src/pages/Today.tsx`（只动目标卡）、`src/styles/fb-02-onboarding-a.css`、相关测试（`src/test/onboardingTeam.test.ts`、目标和组织图的测试、`e2e/ob-04-*`、`e2e/ob-05-*`、`e2e/ob-12-reload.spec.ts` 里组织图的部分）。

### 4.1 每屏一句 Why（黄金圈）

- 标题正下方一行 `<p className="ob-why"><b>Why:</b> …</p>`（样式已在 `fb-00-shared.css`）。文字放进 `copy.ts` 各自块里的 `why`：
  - Name："Your club's name goes on every reminder and handoff note."
  - Constitution："Your constitution says who does what. Platypus uses it to know who to remind and what each role hands over."
  - Goals：（4.2 暂缓，这一屏这次不加 Why）
  - Team："Every task needs one owner. Reminders go to a person, and a role is what gets handed over."
- Welcome 页把现在的一句 `welcomeBody` 换成三行（Why → How → What），每行前面一个小标签：
  - **Why** "Clubs miss deadlines when nobody sees the whole chain, and everything resets at handoff."
  - **How** "Platypus watches every deadline and writes the reminder for you."
  - **What** "Set up your team, your first event and your reminders. About 5 minutes."
- 每屏字数上限从 60 提到 **90**（只改这几屏对应的测试断言；需要 Juanxi 确认，写进报告）。

### 4.2 Goals：SMART 句子（方案 B）—— **暂缓（2026-11-15，见第 11 节），这次不做**

1. 数据：`Goal` 加可选字段 `period?: "week" | "month" | "semester"`。没有它的旧目标照常显示。`validateGoals` 只接受这三个值或缺省。
2. 截止日由引擎给：新文件 `src/engine/goalDates.ts`，纯函数 `termEnd(today)`：今天所在学期的最后一天；在两个学期之间就是下一个学期的最后一天；超出日历范围返回 null（界面此时不显示日期，只显示 "this semester"）。数据来自 `src/engine/calendar.ts` 的 `TERMS`，不要在别处写日期。
3. 三个建议目标改成：Events（`period: "week"`，目标 1，单位 `events`）、Active members（`semester`，40，`members`）、External income（`semester`，500，`USD`）。目标的 id 不变。
4. 每个目标一行显示成一句话，可编辑的部分仍是原来的控件（开关、名字、加减数字、单位）加一个**时间范围下拉**：
   - semester："By **May 8**, reach [500] [USD] in [External income] · [this semester ▾]"
   - week / month："Every [week ▾], hold [1] [events] · until **May 8**"
   - 下拉三项：`each week` / `each month` / `this semester`。日期只来自 `termEnd`。
5. 每行下面三个小标记 **Specific · Measurable · Time-bound**：名字非空 / 目标数 ≥ 1 / 选了时间范围 时各自点亮（没点亮的是灰的，带读屏文字）。屏幕副标题改成 "A good goal says what, how much, and by when."（原来的 "Goals are optional. Progress starts at zero." 的意思保留在 Skip 旁的提示里）。
6. `rowsFrom` / `goalsFrom` 带上 `period`；刷新后保留；Skip、Back、必填 mission 的行为不变。
7. Settings 的 `GoalsEditor` 加同样的下拉。Today 的目标卡在名字后面加小字 "per week" / "per month" / "this semester"（没有 `period` 就不加）；跑 `npm run words` 确认 Today 仍在 160 / 450 内。
8. 测试：`termEnd` 的边界（学期内、学期之间、日历外）；行与目标互转带 `period`；旧目标（无 `period`）校验通过；页面测试：改下拉后句子和三个标记跟着变、刷新保留、手机宽度不横向滚动。

### 4.3 Team：Advisor 用虚线平行连到 President

事实：代码已经支持顾问（`RoleFunction` 有 `advisor`；`orgChart.ts` 给"没有上级的顾问"画一条到社长的虚线），但没有入口，而且顾问方框被排在整张图最右边，离社长很远。

1. Team 屏在 "Add role" 旁加 **Add advisor**：加一个岗位，名字 "Advisor"（重名时 "Advisor 2"），`fn: "advisor"`，`reportsToId: null`，职责用模板。达到岗位上限时禁用。
2. 顾问这一行：不显示 Reports to 下拉，改成静态文字 **Advises the president**；不缩进；排在列表最后；可以删除、可以填人、可以改职责。名字被改得不再是顾问时，按现有规则变回普通岗位。
3. 组织图：顾问方框和 President **同一层、紧挨在右边**（多个顾问依次向右；右边放不下时放左边），用**水平虚线**和 President 相连；它不在汇报链里（没有向下的实线）。图的宽度要把顾问算进去，手机上"打开时社长居中"的行为不变。
4. 图下面加一行图例："Solid line: reports to · Dashed line: advises"。读屏列表里顾问读作 "Advisor, advises the president"。
5. 章程读出的顾问（`isAdvisor`）走同一套显示。
6. 测试：`orgChart` 单元测试（顾问的层和列、虚线边、多个顾问、没有社长时不崩）；页面测试：点 Add advisor → 列表出现一行、图上出现虚线相连的方框、刷新保留、Continue 能过校验。

---

## 5. FB-3 Onboarding 下半

**独占文件：** `src/onboarding/founder/FirstEvent.tsx`、`founder/firstEvent/*`、`founder/ReminderMode.tsx`、`founder/Confirm.tsx`、`founder/confirm/*`、`founder/Invite.tsx`、`founder/invite/*`、`src/onboarding/copy.ts` 的 `firstEvent` / `reminders` / `confirm` / `invite` 块、`src/onboarding/record.ts`（`FLOW_VERSION`）、`src/styles/fb-03-onboarding-b.css`、`docs/PHASE3_DATA_DICTIONARY.md`（流程版本那几节）、`docs/PHASE3_SESSION_RUNBOOK.md`、相关测试（`src/test/onboardingFirstEvent.test.ts`、`onboardingReminderMode.test.ts`、`onboardingInvite.test.ts`、`e2e/ob-06-*`、`ob-09-*`、`ob-10-*`、`ob-11-*`、`p3h-reminder-mode.spec.ts`，以及所有点过 "See what your officers will see" 或 "Keep current demo" 的 spec）。**不改** `src/engine/**`。

### 5.1 Why 行

- First event："Your event becomes the tasks Platypus reminds people about."
- Reminders："So you never have to chase people yourself."
- 写法同 4.1。字数上限：First event 110、Reminders 140、Confirm 和 Invite 仍 60。

### 5.2 Buffer：留着，但让它"拨了看得见"

问题：现在拨 1/2/3/5/7，上面进度链的日期不动，所以没人知道它有什么用。

1. 控件改成三个有名字的选项（数值不变，仍存 `draft.buffer`）：**Tight · 1 day** / **Standard · 3 days**（标 Recommended）/ **Safe · 5 days**。草稿里是 2 或 7 时显示成第四个选中的 "Custom · N days"。Settings 里的五个数值不变。
2. 标题从 "Club buffer" 改成一句问话："How early should your club finish?"；说明："Your club finishes this many working days before each ASU deadline."
3. 下面用**这场活动真实的步骤**展示效果（数据来自同一个预览 `previewFor(..., buffer)`，也就是规则引擎，不自己算）：列出这场活动里有 ASU 截止日的步骤（最多 3 个），每个一行：步骤名 · `ASU deadline Apr 2` · `Your club finishes Mar 30`。换选项时，**日期变了的那一行标出 "moved earlier" / "moved later"**（用读屏也能听到的文字，不只靠颜色）。
4. 一句会跟着变的话："If something slips by up to N working days, you still meet the ASU deadline."；如果当前选项下没有任何一行的日期受它影响，改说："Your plan already finishes earlier than this, so nothing moves."（如实说，不假装有效果）。
5. 这场活动没有任何带 ASU 截止日的步骤时，退回现有的通用例句（`bufferExample`）。
6. 测试：三个选项和 Custom 的显示；换选项后列表里的日期来自引擎且与进度链一致；"nothing moves" 分支；刷新保留；手机排版。

### 5.3 Reminders：例子 + 三步图 + 类比（方案 A）

**不变的（研究可比性）：** 三个选项的标题、顺序、不预选、选了才能 Continue、Skip for now、每个单选按钮的 `data-testid`、存的值、底部 "Demo: no email is ever sent."。

1. 屏幕顶上一张**示例提醒卡**（`aria-label="Example reminder"`），用测试者自己的内容：
   - 收件人：草稿里第一个有名字、不是社长的干部的名（没有就写 "your officer"）。
   - 步骤、活动名和日期：来自预览里那位干部（没有就任意一位）负责的第一个未完成步骤；日期只用引擎给的。
   - 文字："Hi Sam — Book Room & Layout for Welcome Mixer. Due Mar 30. Reply: Done · Waiting on… · Need help."
   - 没有规划活动（跳过了 First event）时用不带日期的通用句："Hi Sam — your next task is ready. Reply: Done · Waiting on… · Need help."
2. 每个选项在标题下面放一条**三步图**（小方块 + 箭头，纯文字和 CSS）和一句**类比**：
   - Send automatically：`Platypus writes` → `Platypus sends` ·"Like a calendar alert."
   - I review, then I send：`Platypus writes` → `You check` → `You send` ·"Like a draft waiting in your outbox."
   - I review, Platypus sends：`Platypus writes` → `You approve` → `Platypus sends` ·"Like approving a scheduled post."
   - 原来的一句说明保留为读屏描述（`aria-describedby`）。
3. 测试：示例卡用了草稿里的名字和引擎日期；跳过活动时的通用句；三个选项的图和类比；原有的 `p3h-reminder-mode` 断言（顺序、不预选、导出值）全部保持通过。

### 5.4 Confirm 和 Invite：一个主按钮，去掉社员预览（方案 A）

1. **Confirm：** 主按钮文字改成 **Create my club**（行为同原 Start workspace）。去掉 "Keep current demo" 按钮。只有当已经建过社团（`replaces` 为真）时，在替换警告下面显示一行文字链接 **Cancel and keep the current club**（行为同原 Keep：记 `keep-demo` 并退出）。Back 保留。
2. **Invite：** 主按钮 **Open my workspace**（记 complete、结束这次 walkthrough 为 `completed`、去 Today）。去掉 "See what your officers will see" 和它的处理函数。复制链接、WhatsApp、Email、干部列表保留。那个孤零零的 ⓘ 改成一行小字。
3. 社员预览 6 屏**不删**：路由和 Demo 菜单里的 "Test Onboarding Page Invite" 照旧可用（不写记录）。
4. `FLOW_VERSION` 升到 **`ob-5`**，注释写明：ob-5 = 社长流程在 Invite 结束，不再接社员预览；Confirm 只有一个主按钮。更新 `docs/PHASE3_DATA_DICTIONARY.md` 和 `docs/PHASE3_SESSION_RUNBOOK.md`。`setupChoice` 的取值不变。
5. 测试：全流程一次尝试在 Invite 结束且 `outcome: "completed"`；首次没有 Cancel 链接、重做时有；Demo 菜单的社员预览仍能走完；所有依赖旧按钮的 spec 改到新路径。

---

## 6. FB-4 任务详情三段 + 界面只有一个 Due

**独占文件：** `src/components/TaskDetail.tsx`、`TaskActions.tsx`、`EventDetail.tsx`、`NodePanel.tsx`（删除）、`src/pages/Events.tsx`（**只动 List 视图的表格和它的说明文字**）、`src/pages/Tasks.tsx`（**只动表格的 Due 列文字**，不动 NewTask 和看板）、`src/lib/nudges.ts`（只动消息里的日期措辞）、`src/styles/fb-04-task-detail.css`、相关测试。**不改** `src/engine/**`、`src/components/rail/AskPanel.tsx`、`TaskFields.tsx`（建任务表单的日期在 FB-5 改）。

### 6.1 一个 Due（方案 A）

原则：**引擎照旧算三个日期**（判断会不会错过学校的硬期限要用），界面只把社团截止日当作唯一的 "Due"。

1. 任何列表、卡片、详情的日期栏只叫 **Due**，值是社团截止日。
2. ASU 截止日只在两处出现：①详情里折叠的 "Why this date"：一句 "ASU needs this by Apr 2. Your club finishes 3 working days earlier."（没有 ASU 规则的步骤不出现这句）；②风险提示：引擎给出的红/黄问题原样显示在详情上部（已有的 `issues`）。
3. "Start by" 不再是并列的日期：在 "Why this date" 里写成 "Reminder goes out Mar 26."（别人的任务仍用现在那句不透露个人缓冲的通用说明）。
4. Events 的 List 视图：列改成 Step / Owner / Status / **Due**（去掉 Start 和 ASU 两列）；有 ASU 风险的行保留红色和悬停原因。
5. 提醒消息（`buildNudge`）的 When 行改成 "Due Mar 30. Best started by Mar 26."，不再带 "ASU …"；主题行不变；`nudgeCheck` 的五段结构不变。服务器的 `nudge-draft.mts` 引用同一个函数，不用另改。
6. 不再有任何地方显示 "ASU deadline"、"Club deadline"、"Due date" 三个并列标签（"Why this date" 里的句子除外）。`officialLabel` 没人用了就删。

### 6.2 详情三段（方案 A）

从上到下：

1. **头部：** 活动名（小字）· 标题 · 状态色块 · 负责人（头像 + 名字）· **Due Mar 30**（过期变红）。不是负责人且有权提醒的人，在这里看到一个次要按钮 **Remind Sam**（原 Remind 的行为和禁用原因不变）。
2. **Your next step：** 只有**一个主按钮**：Not claimed → **I've got it**；其余 → **Mark done**。次要操作排成一行小按钮：Waiting on… · Need help · Need more time（表单行为不变）。预算控制的步骤：Mark done 禁用，旁边 "Complete this step in Event Budget." 和 **Open Event Budget**。没有权限的人看到原来那句说明。紧接着是 **Where to submit** 的链接和 "Open current draft"。
3. **提示区（有才显示）：** 引擎的问题、Waiting on、延期申请待审。
4. **折叠区**（`<details>`，默认收起）：
   - **Why this date**（见 6.1）加这一步的 why。
   - **People**：负责人、批准人、Consulted、Informed（只读）。
   - **Edit**（只有社长/副社长）：名字、负责人下拉、Due 日期（写 `clubDeadlineOverride`，带 "Use recommended (日期)"）、标签。去掉原来那句 "can be changed in the task table"。
   - **Sources**：来源和规则链接。
5. "Copy All Event Details" 从任务详情移到活动自己的详情（`EventDetail.tsx`）。
6. 删除没人用的 `src/components/NodePanel.tsx`（它的可编辑栏位已并入 Edit）。
7. 保留现有的 `data-testid`（`task-detail` 等）和焦点行为（打开时焦点到标题、Esc 关闭）。
8. 测试：负责人、社长、其他干部三种人看到的主按钮和 Edit；预算步骤；Edit 改负责人和 Due 生效且可撤销（走原有的 `updateNode`）；有 ASU 规则的步骤 "Why this date" 里有那句话、没有的没有；Events List 只有四列；提醒消息的新措辞通过 `nudgeCheck`；a11y。受影响的已有 spec（`tasks`、`events`、`dx-13-details`、`dx-19-swap`、`wp5`、`today`、`a11y`、`word-budgets`）要跑并跟进。

---

## 7. FB-6 日期引擎按时间表校准

**输入：** [`event-workflow-calibrated-2027-04-16.tsv`](event-workflow-calibrated-2027-04-16.tsv)（Juanxi 上传，32 步，活动日 2027-04-16：60 人、外部餐饮、USG 经费）。

**独占文件：** `src/engine/schedule.ts`、`src/engine/playbooks.ts`、`src/data/types.ts`（只动 `StepTemplate`、`Node` 的新可选字段）、`src/data/seed.ts`、`src/data/sampleScenario.ts`、`src/engine/workflow.ts`（必要时）、引擎相关测试、`docs/RULES.md`（需要时）、新文件 `docs/feedback-fix/CALIBRATION_REPORT.md`，以及因为示例日期变化而要跟进的页面测试。

### 7.1 怎么读这张表（主会话的解读，Juanxi 的指示是"按我的文件更新"）

文件里每一步有两个日期，换成相对活动日的天数都是整数：

- **Proposed start** = 这一步的窗口打开日（例如 Event Plan T−65、Moderator T−60、Budget Approval T−30、Full Check T−14）。
- **Proposed deadline** = 这一步的社团截止日（"Relative timing" 列，例如 T−60、T−25、T−1）。
- **Effort days** = 要花的工作量，不是窗口长度（Moderator 窗口 35 天、工作量 10 天）。
- **Depends on** = 完成的先后顺序。文件里串联的步骤窗口是重叠的（五个 Plan/Prepare 步骤同是 T−65 → T−60），所以它不可能是"上一步做完下一步才能开始"，只能是"下一步不早于上一步完成"。

### 7.2 引擎改动

1. `StepTemplate` 和 `Node` 加可选字段 `timing?: { startDays: number; dueDays: number; unit?: "calendar" | "business" }`（活动日之前为正、之后为负；缺省 `calendar`）。有它的步骤叫"已校准"。原来的 `anchor` 保留：`rule` 仍给出 ASU 官方截止日，`target` 的标签仍用于说明。
2. **已校准步骤的日期：**
   - 社团截止日 = `min(官方截止日 − 社团缓冲, 活动日 − dueDays)`；落在周末或假日时用前一个工作日（活动后的步骤用后一个工作日）—— 沿用现有 `targetDate` 的规则。
   - 最晚开始日 = 活动日 − `startDays`，落在负责人的非工作日（周末、假日、期末周、学期之间、本人忙碌周）时取更早的那个工作日。个人缓冲**只算超出默认 1 天的部分**（默认设置下结果等于文件；有人把个人缓冲设成 3 天，就再提前 2 个工作日）。说明文字（`explain.latestStart`）照实写。
   - 不再被"下游的开始日"往前挤（倒推那一步跳过已校准的步骤）。
   - 有人改了截止日（`clubDeadlineOverride`）：截止日用人定的；开始日 = `min(校准的开始日, 新截止日 − estDays 个工作日)`。
3. **已校准步骤之间的依赖 = 完成顺序：** 只有当未完成的上游的截止日**晚于**本步骤的截止日时，本步骤才被顺延到上游的截止日（同一天允许），并照旧标 "Moved later…"。上游或下游有一方不是已校准步骤时，沿用现有规则（上一步完成后的下一个工作日才能开始）。
4. **收尾阶段：** 已校准且 `dueDays` 为 0 的收尾步骤可以在活动当天开始和截止（Headcount）；其余收尾步骤仍然不早于活动后的第一个工作日。
5. 没有 `timing` 的步骤和手动任务：行为完全不变（现有引擎测试里不依赖标准模板的那些必须原样通过）。
6. `buildEventNodes` 把模板的 `timing` 带到节点上。**已保存的社团自定义流程**（`org.eventWorkflow`）里没有 `timing` 的标准步骤：建新活动时按 `key` 从标准模板补上 `timing` 和 `estDays`（社团自己加的步骤不补）。**已经建好的活动不自动改**（它们的节点没有 `timing`，保持原来的日期）。

### 7.3 模板更新（`EVENT_STEPS`）

按文件的三列输入更新 32 步：

| key | startDays | dueDays | estDays | Depends on |
| --- | ---: | ---: | ---: | --- |
| plan | 65 | 60 | 5 | — |
| backup | 65 | 60 | 5 | plan |
| venuechoice | 65 | 60 | 5 | backup |
| registry | 65 | 60 | 5 | venuechoice（保留 R01 官方 T−14）|
| venue | 65 | 60 | 5 | registry |
| moderator | 60 | 25 | 10 | venue |
| materials | 60 | 15 | 5 | moderator |
| finalcheck | 14 | 1 | 5 | materials、orderPlaced（去掉 reminder；条件步骤的依赖保留）|
| checkin | 5 | 0 | 1 | finalcheck |
| budget | 60 | 55 | 3 | plan（文件备注：Needs Event Plan as prerequisite）|
| foodCompliance | 60 | 55 | 3 | budget（保留 R06 官方）|
| quotes | 60 | 50 | 10 | foodCompliance |
| budgetRequest | 60 | 49 | 1 | quotes（foodCompliance 的依赖按现状保留）|
| budgetApproval | 30 | 18 | 1 | budgetRequest |
| purchaseRequest | 30 | 18 | 1 | budgetApproval（保留 R09 官方）|
| purchaseApproval | 30 | 10 | 1 | purchaseRequest |
| orderPlaced | 30 | 10 | 2 | purchaseApproval |
| marketingNeeds | 60 | 58 | 2 | — |
| contentCreation | 58 | 48 | 10 | marketingNeeds |
| promotionItems | 48 | 38 | 10 | contentCreation |
| content | 17 | 10 | 7 | promotionItems（rsvp 这个条件步骤的依赖保留）|
| reminder | 4 | 3 | 1 | content |
| headcount | 0 | 0 | 1 | checkin |
| thankyou | 0 | −1 | 1 | headcount |
| feedback | 0 | −1 | 1 | —（文件写 Event Day：活动之后即可）|
| postmarketing | 0 | −1 | 1 | —（Event Day）|
| photoBackup | 0 | −7 | 1 | —（Event Day）|
| invoice | 0 | −7 | 1 | headcount |
| attendance | 0 | −7 | 1 | —（Event Day）|
| spending | 0 | 活动后 5 个工作日 | 1 | attendance |
| financeRecord | 0 | 活动后 7 个工作日 | 1 | spending |
| documentation | 0 | 活动后 14 天 | 1 | feedback |

说明：

- **最后三行没有照抄文件里的"活动后 129 / 132 / 129 天"。** 那三个数是旧引擎的输出（4/16 的活动，收尾被推过期末周和暑假，落到 8 月），文件里这三行没有改过。照抄会让任何日期的活动都在四个多月后才报销，所以保留它们原来的意图（活动后 5 / 7 个工作日、14 天）。**需要 Juanxi 确认**，写进报告。
- 文件里没有的条件步骤（speaker、advisor、access、security、alcohol、drone、rsvp 等）：**不加 `timing`**，日期仍按现有规则由相邻步骤推出；报告里列出它们在示例活动里的实际日期，供 Juanxi 以后校准。
- 步骤的 `key` 一律不变（已有活动、流程编辑、政策引用都靠它）。

### 7.4 对照报告和守护测试

1. 新单元测试：读入库的 TSV，用同一场活动（2027-04-16、60 人、外部餐饮、USG 经费、默认设置）跑引擎，逐步比对开始日和截止日。**允许且必须列明的差异只有：** 周末/假日挪到工作日、最后三行（见上）。其余任何一步对不上，测试就红。
2. `docs/feedback-fix/CALIBRATION_REPORT.md`：一张表（步骤 / 文件开始 / 引擎开始 / 文件截止 / 引擎截止 / 差异原因），加上条件步骤的日期、对已有数据的影响、没解决的问题。表由测试或脚本从引擎输出生成，不手写日期。

### 7.5 示例数据和回归

模板一变，示例社团（`seed.ts`、`sampleScenario.ts` 用 `buildEventNodes` 现建）的日期全变。要求：

1. 示例社团仍然讲得通同一个故事：演示日 2026-10-22 时，Today 有 3 个 "Needs a nudge"、有已完成的步骤、有红有黄，不是一片过期。需要时调整种子里各步骤的状态、完成日期和负责人，**不改演示日，也不为了好看改活动日期**（除非别无办法，那就在报告里写明）。
2. `e2e/demo-contract.ts` 以及依赖具体日期或风险排序的测试跟进；每一处改了什么预期、为什么，在报告里列出。
3. 这一阶段可以跑**全量**页面测试一次（`--workers=2`），因为引擎影响面最大；失败的要和没改过的基线对比后再下结论（`PROGRESS.md` 记过的老的偶发失败：`workflow-setup:123`、`dx-18:34`、`ob-08`、`ob-12:208`、`production-security:14`、`organization-setup:1381`）。
4. `npm run words`：示例数据变化可能改变页面字数，超了要处理。

---

## 8. FB-5 新建入口（第二波）

**独占文件：** `src/pages/Events.tsx`（页头）、`src/pages/Today.tsx`（Events 卡的页头）、`src/pages/Tasks.tsx`（NewTask 和看板的添加）、`src/components/rail/RailContext.tsx`、`AskPanel.tsx`（接收"打开表单"）、`TaskFields.tsx`、`src/lib/assistant.ts`（导出空表单卡）、`src/data/board.ts`、`src/data/store.tsx`（建任务动作）、`src/styles/fb-05-create.css`、相关测试。

### 8.1 + New event（方案 A）

1. Events 页头加主按钮 **+ New event**；没有活动时的空状态里也放同一个按钮。点击：打开右栏的 Ask 标签，直接出现现有的活动表单卡（和打 "Plan …" 得到的是同一张表单，栏位为空，不调用 AI），焦点落在第一个栏位。
2. Today 的 Events 卡页头，在 "Open" 旁边加小按钮 **+ New event**（同一行为）。
3. 权限用现有的 `canCreateEvent`：没权限时按钮禁用，并有可见的原因 "Only the president or VP can create events."（Settings 里开放给别人时按实际说）。
4. 不在页面里放 AI 输入框（界面规则第 1 条）；表单之后的 Plan check 等行为不变。
5. 测试：社长点按钮 → 表单出现 → 填完创建 → 新活动出现在 Events；没权限的角色看到禁用和原因；手机上右栏全屏打开并能关；字数上限（Events 180 / 420、Today 160 / 450）。

### 8.2 建任务时指定人

1. Tasks 页头的 **+ New task** 打开一个小表单：**Task name**、**Assign to**、**Due**。
   - Assign to：默认 "Me"；可选任何现任干部；社长/副社长还可选 "Anyone (open)"（没有负责人，谁都能认领）。用现有的 `officers()` 名单，不出现前任和候任。
   - Due：默认 "今天 + Settings 里的天数"（`defaultTaskDue`，引擎给），可以改；只有这一个日期。
2. 规则沿用 M2b（2026-10-27）：给自己的立即是 To do；**给别人的是 Not claimed，对方点 "I've got it" 才算接手**，并收到一条通知；"Anyone" 是没有负责人的 Not claimed。尽量复用已有的 `createTasks` 动作。
3. 建完后的提示写清楚去了哪：例如 "Sent to Sam. It stays in Not claimed until Sam accepts."
4. 看板每列底部的快速 "+ Add task" 保持只填名字（快路径），建出来的任务在详情的 Edit 里可以改负责人（FB-4）。
5. 候任新人和前任在 View as 时仍然不能建任务（现有的只读规则）。

### 8.3 建任务只有一个日期（2.1 A 的收尾）

1. Ask 里的任务表单和上面的新表单：去掉 "Club deadline N working days earlier" 勾选框，只有 **Due**。建出来的任务社团截止日 = 所选日期，没有另一个"官方"日期。`createTasks` 的 `buffered` 一律传 false（参数保留，旧记录能读）。
2. Settings → "Tasks and events" 里的默认天数保留。社团缓冲（buffer）只对有 ASU 截止日的活动步骤起作用，Settings 里的说明文字照实更新。
3. 测试：两种表单都只有一个日期；建给别人 → 对方视角是 Not claimed 且能认领；建给自己 → To do；Anyone → 无负责人；只读角色不能建。

---

## 9. FB-7 集成（主会话）

1. 按 FB-1、FB-2、FB-3、FB-4、FB-6 的顺序用 merge commit 合进集成分支（不 squash，方便按阶段回滚），每合一个跑 lint + 类型检查 + 单元测试；再派 FB-5，合并。
2. 全量 `npm run check`（页面测试单独跑，和基线对比偶发失败）。
3. 文档：`docs/PROGRESS.md`（做了什么、怎么验收、没验证的、需要 Juanxi 确认的）、`AGENTS.md`（6d 的流程版本和按钮、第 6 节的详情面板和 `NodePanel` 删除、第 12 节的重试例外、引擎的 `timing`）、`docs/PRODUCT_PLAN.md` 机制 1 的表述（界面一个 Due，引擎三个日期）。
4. 推送集成分支。**不合并 `main`，不开 PR，除非 Juanxi 说。**

## 10. 主会话替 Juanxi 定的默认值（不同意就改）

1. **时间表的解读**（7.1）：开始日和截止日都照文件；串联步骤之间只要求完成顺序；周末和假日挪到工作日；最后三步不照抄 129 天。
2. **每屏 Why**：Juanxi 对第 4 项的回答是"不移除、按交互逻辑更新"，没有单独选 Why 的方案；按原始反馈（"多解释 why，结合黄金圈"）做了每屏一句 Why + Welcome 页的 Why/How/What。
3. **字数上限**：onboarding 各屏从 60 提到 90（First event 110、Reminders 140）。
4. **AI 时间**：没有量过 Netlify 的真实上限之前默认 26 秒；量过之后改一个环境变量就能延长，不用再改代码。
5. **流程版本 `ob-5`**：onboarding 改了，研究记录里的版本号跟着变。如果 Phase 3 正式数据已经在收，合并 `main` 的时间要 Juanxi 定。
6. **Advisor**：不默认加一行，而是给 "Add advisor" 按钮（默认加会改变每个新社团的起始数据和所有相关测试）。

## 11. 聚焦复核（2026-11-15）

Juanxi：网站和研究只聚焦两件事 —— **①提醒社团成员工作；②Organization succession**。其他都是附加功能，不是重点。下面按这两点复核每一项。

| 项目 | 服务哪个目标 | 结论 |
| --- | --- | --- |
| FB-1 提醒里的 AI 句子每次失败（输出额度） | ① 直接 | 做，最先 |
| FB-1 时间上限、Stop / Skip AI line | ① 提醒编辑器直接受益；Ask 是辅助 | 做 |
| FB-6 日期引擎按时间表校准 | ① 直接：决定每条提醒哪天发、截止日是哪天；② 间接：岗位档案里"接手后 30 天的截止日" | 做，最先 |
| FB-4 界面只有一个 Due | ① 直接：提醒里和任务上只有一个日期 | 做，最先 |
| FB-4 详情三段 | ① 直接：被提醒的人点开链接看到的就是这一屏，一个主按钮回状态 | 做 |
| FB-5 建任务时指定人 | ① 直接：没有负责人就没人可提醒 | 做 |
| FB-5 + New event | ① 支撑：活动是提醒的来源 | 做 |
| FB-3 Reminders 屏的例子、三步图、类比 | ① 直接 | 做 |
| FB-3 最后一步只留一个主按钮 | 支撑：少绕路，更快进入两个核心 | 做 |
| FB-3 buffer 重做 | ① 间接：它是提醒时间的一个参数；校准后的模板里它很少真的移动日期 | 做，但按 5.2 的最小版本，不再加东西 |
| FB-2 / FB-3 每屏 Why | 支撑：文字已改成每句都落到"提醒谁"或"交接什么" | 做 |
| FB-2 Advisor 虚线连 President | ② 弱相关：顾问是换届时唯一不换的人 | 做（改动小）|
| FB-2 Goals 的 SMART 句子 | **都不服务**：目标是手填的数字，不产生提醒，也不进交接 | **暂缓**，等 Juanxi 确认；建议改为把 Goals 屏移出 onboarding |

**更重要的发现：** 这 11 条反馈修的都是外围。两个核心本身的缺口，这一轮一条都没碰：

- **核心 ①** 发一条提醒要点 5 次、离开网站再回来确认；onboarding 选的提醒方式不起作用；没有地方能看到"这周会发哪些提醒、谁没回"。
- **核心 ②** Handoff 有 8 个阶段，每步都要等人，走完要几周，离"24 小时到 3 天"很远。

所以在 FB-1…FB-7 之后加两个阶段（**等 Juanxi 说"做"才开始**，因为会改首页和导航，影响 Phase 3 的任务卡）：

| 阶段 | 内容 |
| --- | --- |
| FB-8 提醒中心 + 收导航 | 首页变成提醒中心（This week / Needs your OK / Sent / Replies / No reply yet）；onboarding 选的方式真的走不同流程（演示里"自动发"显示为 "Would be sent · demo"，不真发）；导航只留 Reminders、Plan、Handoff、Rules，其余收进 More |
| FB-9 三天交接包 | "Hand over this role" 立刻从岗位档案生成 Day 1 / Day 2 / Day 3 清单，不用 AI、不用等人；访谈和手册变成之后再加深；提醒系统负责催前任和新人 |

### 新的执行顺序（一次最多 3 个子 agent，避免再撞用量上限）

1. 第一波：FB-1、FB-6、FB-4。
2. 第二波：FB-3、FB-2（不含 4.2 Goals）、FB-5。
3. FB-7 集成。
4. FB-8、FB-9：等 Juanxi 决定。

## 12. 最终范围（2026-11-15，Juanxi 同意聚焦方案）—— 与前文冲突时以本节为准

Juanxi 同意的五条：①首页就是提醒中心；②导航收到 Reminders、Plan、Handoff、Rules，Team 和 Partners 收进 More（不删代码）；③Handoff 变成三天交接包；④Onboarding 只留 Name → Team → First event → Reminders → Create；Goals 移出 onboarding，留在 Settings；⑤不再打磨：目标环、本周之星、预测百分比、看板改名改色、会议时间、预算明细、Partners 看板。

### 12.1 各阶段范围的变化

| 阶段 | 变化 |
| --- | --- |
| FB-1 | 不变 |
| FB-6 | 不变 |
| FB-4 | 不变 |
| FB-2 | **改：** 4.2 Goals SMART **取消**（Goals 不在 onboarding；Settings 里的 Goals 编辑器不动）。新增流程调整（12.4）。不再改 `Today.tsx`。|
| FB-3 | **改：** 不再改 `FLOW_VERSION`（FB-2 改）。5.3 的三步图下面补一句"在提醒中心里会怎样"（12.5）。|
| FB-5 | **改：** 8.1 第 2 条（Today 的 Events 卡加按钮）取消，因为首页不再有 Events 卡。|
| FB-8 | **新：** 提醒中心 + 导航（12.2）|
| FB-9 | **新：** 三天交接包（12.3）|

### 12.2 FB-8 提醒中心 + 导航

**独占文件：** `src/routes.ts`、`src/components/chrome/SideNav.tsx`、`src/components/Layout.tsx`（只动导航）、`src/pages/Today.tsx`（重写成提醒中心）、新文件 `src/lib/reminderQueue.ts`、`src/components/NudgeComposer.tsx`（FB-1 合并之后）、`src/lib/nudges.ts`（只加函数，不改 FB-4 定下的措辞）、`src/data/types.ts`（只给 `Nudge` 加可选字段）、`src/data/store.tsx`（只动 `confirmNudgeSent`）、`src/pages/Settings.tsx`（只加提醒方式）、`src/pages/Events.tsx` 和 `src/pages/Tasks.tsx`（只在页头加 Events | Tasks 切换）、`scripts/word-count.mjs`（只改首页那一行）、`docs/PHASE3_SESSION_RUNBOOK.md`、`docs/PHASE3_DATA_DICTIONARY.md`、新样式 `src/styles/fb-08-reminders.css`、相关测试。

**导航**

1. 左边主导航：**Reminders**（`/`）、**Plan**（`/events`；在 `/tasks` 时也高亮）、**Handoff**、**Rules**。下面一个可折叠的 **More**：Team、Partners（默认收起；当前页在里面时自动展开）。底部 Settings、Help 不变。手机导航（DX-20）同步。
2. 原来 Tasks 上的未完成数字移到 Plan 上。
3. `/events` 和 `/tasks` 页头左边放同一个切换 **Events | Tasks**（链接，不是新页面）。
4. 每页"要回答的一个问题"：Reminders = "Who needs a reminder, and who hasn't answered?"；Plan = "What has to happen, and who owns it?"。
5. Funding 已经是重定向到 Events，不用动。

**提醒中心（首页）**

数据全部由一个纯函数 `reminderQueue(state)`（`src/lib/reminderQueue.ts`）算出，日期只用引擎写在节点上的 `latestStart`（发提醒的日子）和 `clubDeadline`（Due），不自己算日期。一项 = 一个有负责人、没完成的任务。

| 栏 | 内容 |
| --- | --- |
| **Needs your OK** | 发提醒的日子 ≤ 今天、这个日子之后还没发过提醒的任务（只在两种"先审"方式下出现）|
| **This week** | 发提醒的日子在明天到 7 天内的任务："Goes out Mon, Oct 26" |
| **Sent** | 已发：`state.nudges`；自动方式下"到日子自动发"的（见下）；沉默协议的模拟提醒（`protocolLog` 里的 reminder），标 "Follow-up · demo" |
| **Replies** | 发了以后任务有更新的（提醒的 `response` 不为空，或任务的 `lastUpdate` 晚于发送日）：显示回了什么（Done / Waiting on… / Need help / Need more time / Claimed）|
| **No reply yet** | 发了 2 天以上还没有任何更新的：按钮 **Follow up**（打开编辑器；遵守现有的次数上限 `nudgeBlocked`）|

- 预测为红色的任务在各栏里排最前，并有风险标记（不另设"Needs a nudge"卡）。
- 首页去掉：Events 进度卡、Semester goals、Superstar of the week（目标在 Settings，本周之星在 Team）。
- 不是社长、副社长的人看到的是只读的 "Your reminders"：自己的任务哪天会被提醒、收到过哪些提醒。

**三种提醒方式真的走不同流程**（`org.settings.reminderMode`；网站仍然**不发任何真实消息**）

| 方式 | 到了发提醒的日子 |
| --- | --- |
| Send automatically | 不进 Needs your OK，直接出现在 Sent，标 **Would be sent · demo**。这一项是推算出来的，不写数据 |
| I review, then I send | 进 Needs your OK，按钮 **Review & open draft** → 现有编辑器 → 打开 Gmail/WhatsApp 草稿 → "I sent this reminder" → Sent |
| I review, Platypus sends | 进 Needs your OK，按钮 **Review** → 编辑器里主按钮变成 **Approve · Platypus sends (demo)** → Sent，标 **Sent by Platypus · demo**；栏顶有 **Approve all (N)** |
| 没选（跳过了）| 按 "I review, then I send"，栏顶一行 "Choose how reminders go out" 链到 Settings |

- 数据：`Nudge` 加可选字段 `via?: "president" | "platypus"`；`confirmNudgeSent` 动作加可选参数 `via`。**不新增动作类型**（研究记录的种类不变）；在数据字典里给 `confirmNudgeSent` 补一句 `via` 的说明。
- Settings → Tasks and events 加同样三选一的提醒方式（文字和 onboarding 一致）。
- 字数上限：首页改为 **200 / 500**（原 Today 160 / 450；写进报告请 Juanxi 确认）。
- 研究：Phase 3 的 Study task 卡和 runbook 里提到 Today、"Needs a nudge" 的地方改成新名字；不改记录格式。

**测试：** `reminderQueue` 单元测试（四栏的归类、三种方式、没选方式、次数上限、只读视角、日期都来自节点）；页面测试：三种方式各走一遍、Approve all、Follow up、导航四项 + More、`/tasks` 时 Plan 高亮、手机导航、a11y、字数。受影响的已有 spec（`today`、`smoke`、`dx-09-rail`、`dx-20-mobile`、`word-budgets`、`a11y`、`p3h-reminder-mode` 等）要跑并跟进。

### 12.3 FB-9 三天交接包

**原则：** 点 "Hand over this role" 后立刻能用，不用 AI、不用等任何人。现有的访谈、手册、确认、批准、回述、第 7/30 天回看全部保留，但收进 **Go deeper (optional)**，**不再卡住交接**。

**独占文件：** 新文件 `src/lib/handoffPack.ts`（纯函数）、新文件 `src/engine/handoffDays.ts`（三天的日期）、`src/pages/Handoff.tsx`、`src/pages/HandoffNewOfficer.tsx`、`src/data/handoff.ts`（只动"能不能 Finish"的条件）、`src/pages/Today.tsx` 和 `src/lib/reminderQueue.ts`（FB-8 合并之后，只加交接提醒那一类）、新样式 `src/styles/fb-09-handoff-pack.css`、相关测试。

1. **清单**（`handoffPack(state, roleId)`，数据来自现有的 `roleDossier`、`handoffQuestions`）：
   - **Day 1 · What's on fire**（新任读，约 30 分钟）：未完成任务和它们的 Due；接手后 30 天内的截止日；这个岗位的链接（任务里的草稿链接、社团的 Drive / 日历链接）。
   - **Day 2 · Learn the role**：最多 5 条经验（Lessons）；最多 3 个联系人（"Meet"）；最多 3 个给前任的缺口问题（用现有的回答机制，前任答完自动打勾）。
   - **Day 3 · Take over**：**Accept all (N)**：新任一次接下所有转给他的任务（对每个任务走现有的认领，不新增动作类型）；然后 **Finish role handoff**。
2. 三天的日期：从开始交接那天起的三个工作日，由 `src/engine/handoffDays.ts` 用日历的工作日函数算，界面不自己算。
3. 勾选：复用现有的 `check` 动作（`itemId` 用 `pack:` 前缀），不新增动作类型；顶上显示 "Handoff 60% · Day 2 of 3"。谁能勾：新任勾 Day 1、Day 3 和 Day 2 的阅读；前任答问题；社长都能勾。
4. **Finish role handoff 的条件改为：** 已指定接任人（或选 "Nobody yet"）。不再要求手册已起草、确认、批准。清单没勾完也能 Finish，但按钮旁写 "3 items not done yet"。
5. **提醒推动交接**（加进 FB-8 的提醒中心，作为一种单独的行）：前任有没答的缺口问题 → "Remind Maya to answer 2 handoff questions"；新任有没接的任务 → "Remind Sam to accept 4 tasks"；第 3 天过了还没 Finish → 提醒社长。按钮打开一段写好的消息（用现有的 `composeUrl` 打开 Gmail/WhatsApp 草稿，不真发）。
6. 接力卡上的进度改成三天清单的进度；交接风险（`handoffRisk`）保留。
7. 字数：Handoff 页上限 120 / 120 不变（清单在右栏详情里）。

**测试：** `handoffPack` 和 `handoffDays` 单元测试；页面测试：开始交接 → 立刻看到三天清单 → 指定接任人 → 新任勾 Day 1 → 前任答一个问题自动打勾 → Accept all → Finish，全程不起草手册；Go deeper 里原来的流程仍然能走完；提醒中心出现交接提醒。已有的 `handoff-stage1–7`、`handoffReview` 测试里"必须先批准手册才能 Finish"的预期按新规则改，逐条写进报告。

### 12.4 FB-2 的流程调整（替代 4.2）

1. `FOUNDER_STEPS` 改为：Name → Team → First event → Reminders → Confirm → Invite（去掉 Constitution 和 Goals 两步）。`FLOW_VERSION` 升到 **`ob-5`**（注释写明：去掉 Constitution、Goals 两屏；Invite 后不再接社员预览；Confirm 只有一个主按钮 —— 后两条由 FB-3 完成，同一次发布）。
2. **章程不丢：** Team 屏顶上一个折叠区 **Fill roles from your constitution (optional)**，里面就是现有的 Use sample / Upload a file / Paste text 和 "Use these suggestions"（复用 `Constitution.tsx` 的阅读逻辑和 `useReading`，不新增 AI 接口）。
3. **Mission 移到 Name 屏**（`validateClub` 仍要求填）：一行输入框，Why："Used in every reminder: why the work matters."
4. Goals：onboarding 不再问，草稿里目标为空；Settings 的 Goals 编辑器不变。
5. Why 行只剩 Name 和 Team 两屏；Welcome 页的 Why / How / What 照 4.1。
6. 依赖旧流程顺序的页面测试（`ob-04`、`ob-05`、`ob-12`、`ob-11`、`research-*`、`p3a` 等）跟进。

### 12.5 FB-3 的补充

Reminders 屏每个选项的类比下面再加一行"在 Platypus 里会怎样"：
- Send automatically："On the send day it appears under Sent. You don't have to do anything."
- I review, then I send："On the send day it waits under Needs your OK. You open the draft and send it yourself."
- I review, Platypus sends："On the send day it waits under Needs your OK. One click approves it."

### 12.6 执行顺序（一次最多 2 个子 agent；前两次三个、五个并行都撞上了用量上限）

| 波次 | 阶段 |
| --- | --- |
| A | FB-1（接着上次）、FB-6（接着上次）|
| B | FB-4、FB-2 |
| C | FB-8、FB-3 |
| D | FB-9、FB-5 |
| 最后 | FB-7 集成 |

每波合并进集成分支后再派下一波；下一波从合并后的提交开始。
