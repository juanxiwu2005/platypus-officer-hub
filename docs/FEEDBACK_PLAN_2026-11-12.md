# 测试反馈解决方案（2026-11-12，待 Juanxi 选择）

> 状态：**只是方案，没有改任何代码。** Juanxi 选好每一项的方案后再执行。
> 依据：Juanxi 让其他社团团长测试后提出的问题；`main` = `ee7e825` 的代码；2026-11-12 对正式网站做的 2 次最小 AI 诊断；Juanxi 上传的时间表文件 `event-workflow-calibrated-2027-04-16-3.tsv`（没有放进仓库）。
> 每个问题给 2–3 个方案，**★ = 我的建议**。工作量是粗估，不是承诺。

## 0. 先说三个查出来的事实

### 0.1 AI 失败的主要原因不是 Netlify 超时

2026-11-12 我用完全虚构的数据调了两次正式网站上最轻的 AI 接口（提醒里那一句 "Why it matters"）：

| 次数 | 结果 | 用时 |
| --- | --- | --- |
| 1 | 失败：`AIR stopped before finishing the response (output limit)` | 4.1 秒 |
| 2 | 同样失败 | 4.0 秒 |

4 秒就失败，离任何时间上限都很远。原因是**我们给 AI 的"最多能写多少字"太小**：这个接口只给 120 个 token，模型还没写完就被截断，我们的代码把截断当成失败。最可能的解释是模型先"想"了一段，把额度用掉了（`AGENTS.md` 第 12 节 v3.1 已经记过：Muse 要求不思考，实际仍会思考）。这一点我没有直接证据，要在修复时把"思考用了多少 token"记进日志确认。

**后果：提醒里的 AI 那一句现在每次都失败**，提醒永远显示 "Checked template · AI unavailable"。这正好是我们的卖点功能。

所以 AI 失败有两类，要分开修：

1. **输出额度太小**（必然失败，几秒内）：`nudge-draft` 120、`ask` 300、`handbook-draft` 400、`chat` 400–600、`policy-answer` 500。
2. **AIR 本身慢**（偶发）：聊天类请求要 15–23 秒，而我们自己设的上限是 22 秒（`SYNC_AI_BUDGET_MS`），超过就放弃。

关于 Netlify 的时间上限：仓库里写的是"约 30 秒会切断"（2026-11-07 的线上日志：31.2 秒后 504）。Netlify 现在的文档写的是同步函数 **60 秒**（[Functions configuration](https://docs.netlify.com/build/functions/configuration/)）。两者不一致，执行时要重新量一次；如果真是 60 秒，我们的 22 秒上限可以放宽。

### 0.2 Reminders 的选择现在不起任何作用

Onboarding 里选的三种提醒方式只是存下来（`org.settings.reminderMode`），**不改变任何行为**；网站任何地方都不发消息（IRB：测试中不发提醒）。真正的提醒流程是：Today → 点 Remind → 选渠道 → 打开 Gmail/WhatsApp 草稿 → 自己发 → 回来点 "I sent this reminder"。也就是说，"自动提醒"这个卖点目前是产品里做得最薄的部分。

### 0.3 上传的时间表文件有 5 处要先确认

见第 1.3 节。

---

## 1. Onboarding

### 1.1 Goals 时间范围不清，想按 SMART 来

**现状：** `src/onboarding/founder/goals/suggestions.ts` 给三个建议：Weekly events（per week）、Active members（members）、External income（USD）。数据里一个目标只有名字、目标数、当前数、单位，**没有时间范围，也没有截止日**。屏幕标题只有 "Set goals for your club"。

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| A 只改文字 | 每个目标把时间写进名字和单位：`External income this semester (USD)`、`Events per week`、`Active members by semester end`；标题下加一句 "Goals are for this semester (ends May 8)."（日期由日历引擎给） | 半天；不动数据 | 仍然不是 SMART，只是不歧义 |
| ★ B SMART 句子 | 每个目标显示成一句话：**"By [May 8] reach [$500] in [external income] ([this semester ▾])"**。时间范围是下拉：per week / per month / this semester；截止日由引擎按学期结束日自动填。每行下面三个小勾：Specific · Measurable · Time-bound，缺哪个哪个是灰的。屏幕顶上一句 "A good goal says what, how much, and by when." | 测试者一眼知道在定什么；之后 Today 的目标环可以写 "$120 of $500 · 6 weeks left" | 约 1.5 天；`Goal` 加可选字段 `period`（旧存档不受影响，不用升结构版本）；流程版本要升到 `ob-5` |
| C AI 帮写 | 社长随便写一句（"多拉点赞助"），AI 改写成 SMART 并追问缺的部分 | 最省脑力 | 依赖 AI（现在不稳）；日期仍须引擎给；先不做 |

### 1.2 组织架构：没有 Advisor，上下级不直观

**现状：** 代码其实支持 Advisor（`RoleFunction` 里有 `advisor`，组织图会把它画在社长旁边、用虚线），但新社团起步的 5 个岗位里没有它，而 "Add role" 只会加一个 "New role"；要自己把名字改成 Advisor 才会变成顾问，没人会发现。Team 屏是一张表（Role / Person / Reports to 下拉），组织图在表**下面**、只读。

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| A 补 Advisor | 默认多一行 **Advisor**（可空着；右边不是 Reports to 下拉，而是写 "Advises the club"）；加按钮 "Add advisor"；把组织图移到表**上面** | 半天；解决"没有 advisor" | 上下级仍靠下拉理解 |
| B 表格做成大纲 | 在 A 的基础上，表格按上下级分组并画连接线，每行有 "← →" 把岗位升一级或降一级（像 Word 大纲）；点某一行，图上对应方框高亮 | 约 1 天；手机和键盘都好用 | 仍是两个东西对着看 |
| ★ C 直接在图上改 | 在 A 的基础上，组织图变成可编辑：点方框改名字和人；方框下的 "+" 加一个下属；把方框拖到另一个方框上 = 改汇报对象（手机和键盘用 "Move under…" 菜单）。表格收成 "Edit as list" 备用 | 一眼看懂，所见即所得 | 约 2–3 天；可复用看板的拖拽代码（`src/lib/dragSort.ts`） |

建议先做 A（当天能好），C 排在后面。

### 1.3 日期引擎更新（你上传的时间表）

文件我已读完：32 个步骤和现在的模板一一对应，改的是**预计天数**（很多从 1 变成 5 或 10）、**相对活动日的时点**、和几条**依赖关系**。执行前需要你确认 5 件事：

1. **串联的步骤却是同一天开始、同一天截止。** Event Plan → Back-up Plan → Candidate Venue → Event Registry → Book Room 是一个等一个，但五步都是"2/10 开始、2/15 截止、各 5 天"。按现在引擎的规则（上一步做完下一步才能开始）这排不出来。你的意思是 ①这五步其实可以同时做（那就去掉它们之间的等待），还是 ②要错开？
2. **"Event Day" 不是一个步骤。** Feedback、Post Marketing、Photo Backup、Attendance Submit 写的是等 "Event Day"。我理解成"活动当天之后就能开始"，对吗？
3. **Paid Reimbursed、Finance Record、Documentation 落在活动后 129–132 天（8 月）。** 这是因为活动在 4/16，引擎把暑假算作"学生不工作"，所以推到了秋季开学。这是你想要的吗？还是应该在学期结束前做完？
4. **"Effort days" 现在更像"窗口有多长"，不是"要干几天活"。** 例如 Quote Gather 10 天其实是等报价。这和第 3 节的问题是同一件事，建议一起定。
5. **Budget 的备注 "Needs Event Plan as prerequisite"**：是否要加上"Budget 等 Event Plan"这条依赖？

怎么落地：

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| ★ A 更新标准模板 | 按文件改 `src/engine/playbooks.ts` 里每一步的时点、天数、依赖；补测试；`docs/RULES.md` 同步 | 所有新建的活动都用新时间 | 约 1 天；已经建好的活动不会自动变（要不要提供 "Recalculate with the new template" 另议） |
| B 模板变成数据文件 | 在 A 的基础上，把时间表放进仓库里的一个表格文件，加导入/导出脚本 | 以后你改表格就能更新，不用改代码 | 多约 1 天 |
| C 只给 SEO 用 | 只存成 SEO 自己的工作流（`org.eventWorkflow`），标准模板不动 | 不影响其他社团 | 其他测试者看到的仍是旧时间 |

### 1.4 Buffer day 没人懂；整个流程没讲 Why

**现状：** 每屏只有一个标题，最多一句副标题（每屏 60 词上限）。Buffer 控件在 First event 屏，说明是 "Your club finishes this many working days before each official deadline."。还有一个已知问题（`AGENTS.md` 6d）：**拨动 buffer，上面进度链的日期不会变**，所以它看起来真的没用。

**Buffer 本身：**

| 方案 | 做什么 |
| --- | --- |
| ★ A 移出 onboarding | 默认 3 天，onboarding 不问；Settings 里保留并配一个小时间轴解释 |
| B 留着但讲故事 | 把 1/2/3/5/7 换成 Tight (1) / Standard (3) / Safe (5)，旁边一条小时间轴：`ASU deadline Apr 2 → your club finishes Mar 30 → Sam is reminded Mar 26`，加一句 "If a quote comes back two days late, you still make it." |

**整个流程的 Why（黄金圈：Why → How → What）：**

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| ★ A 每屏一句 Why | 每屏标题下固定一行 "Why:"，用同一个句式。例：Constitution — "Your constitution already says who does what. Reading it saves you typing."；Goals — "So Platypus knows which events matter most."；Team — "Every task needs one owner. Reminders go to a person, not to 'the club'."；First event — "See every ASU deadline before it bites."；Reminders — "So you never have to chase people yourself." | 约半天；每屏都回答"为什么要填这个" | 每屏字数上限要从 60 提到约 80（要你批准） |
| ★ B 开头加一屏"为什么有 Platypus" | 欢迎页后 15 秒的一屏，三行：**Why** "Clubs miss deadlines because nobody sees the whole chain, and everything resets at handoff." → **How** "Platypus watches every deadline and writes the reminder for you." → **What** "Four things to set up: your team, your first event, how reminders go out. About 5 minutes." 进度条上的词也改成结果："Who owns what" 而不是 "Team" | 先讲清楚整件事，再让人填 | 约半天；多一屏 |
| C 边填边看效果 | 每屏右边放一个实时预览：填了什么，Platypus 会因此做什么（例如填了 Treasurer 的名字，右边立刻出现 "Maya gets the budget steps"） | 最直观，"show, don't tell" | 约 3–4 天 |

A 和 B 可以一起做（合计约 1 天）。

### 1.5 Reminder 屏没有例子

**现状：** `src/onboarding/founder/ReminderMode.tsx`：三个单选项，每项一句话，没有例子、没有图。

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| ★ A 例子 + 三步图 + 类比 | 屏幕顶上先放**一条真实样子的提醒**（用测试者刚填的活动和干部名字，日期由引擎给）：*"Hi Sam — Book the room for Welcome Mixer. Start by Mar 26, due Mar 30. Reply: Done · Waiting · Need help."* 每个选项下面一行三步小图，并配一个生活类比：**Send automatically** — Platypus writes → Platypus sends（"Like a calendar alert."）；**I review, then I send** — Platypus writes → you check → you send（"Like a draft waiting in your outbox."）；**I review, Platypus sends** — Platypus writes → you approve → Platypus sends（"Like approving a scheduled post."） | 非工科学生也能懂；三个选项和顺序不变，研究数据仍可比 | 约 1 天；字数上限要提高 |
| B 拆成两个简单问题 | 问 1："Do you want to check each reminder first?" Yes / No；问 2（选 Yes 才出现）："Who presses send?" Me / Platypus | 每题都是大白话 | 改变了研究问题的问法，前后数据不能直接比，要对照 IRB |
| C 可以试一下 | 在 A 的基础上加 "Try it"：点一个选项，播放一小段模拟（手机收到消息的样子、社长看到什么） | 最清楚 | 多约 1.5 天 |

注意：底部 "Demo: no email is ever sent." 在 Phase 3 期间必须保留。

### 1.6 最后一步的按钮让人糊涂

**现状：** Confirm 屏有 **Start workspace**、**Keep current demo**、Back；Invite 屏的主按钮是 **See what your officers will see**（后面是 6 屏社员预览），次按钮才是 Go to Today。

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| ★ A 一个主按钮，去掉预览 | Confirm 只留一个主按钮 **Create my club**；"Keep current demo" 去掉（顶上已有 Exit；只有以前建过社团时才显示一行小字 "Cancel and keep the current club"）。Invite 屏主按钮改成 **Open my workspace**，去掉 "See what your officers will see"。社员预览不删，留在 Demo 菜单（"Test Onboarding Page Invite" 已经有） | 社长设完就进入；少 6 屏 | 约半天；流程版本升 `ob-5`；研究记录里不再有社员预览那一段 |
| B 合并成一屏 | Confirm 和 Invite 合成一屏：一句总结 + **Create my club**；点完同一屏变成 "Your club is ready"，给邀请链接和 **Open my workspace** | 8 屏变 7 屏 | 约 1 天 |
| C 预览降级 | 保留预览，但改成主按钮下面的一行小字链接 "Preview the officer invitation (optional)" | 改动最小 | 仍可能分散注意 |

---

## 2. 其他模块

### 2.1 Club deadline 和 Due date 并存

**现状：** 每个步骤有三个日期：Start by、Club deadline、ASU deadline。手动建的任务第三个叫 "Due date"，而且勾了缓冲后 Club deadline 比 Due date 早几天，于是**同一个任务上出现两个"截止日"**（`src/engine/taskDates.ts` 的 `officialLabel`）。

你的想法（去掉 ASU 的，只用社团的）我同意，但有一点要保留：**引擎内部仍然要算 ASU 截止日**，因为"会不会错过学校的硬期限"就是靠它判断的。改的只是界面。

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| ★ A 界面只有一个 Due | 所有地方只显示一个日期 **Due**（= 社团截止日）。ASU 的日期不再是并列的一栏，只出现在两处：①点开 "Why this date" 时一句话："ASU needs this by Apr 2. Your club finishes 3 working days earlier."；②有风险时的红色警告。手动任务去掉 "club deadline N working days earlier" 勾选框，只有一个日期。"Start by" 改叫 "Reminder goes out Mar 26"（它本来就是提醒的触发日） | 一个任务一个截止日 | 约 1–1.5 天；产品计划"机制 1：三个截止日"的表述要改（记进决定记录） |
| B 留两个但讲清关系 | 改名为 **Due (club)** 和 **ASU cut-off (hard limit)**，配一条小时间轴；只有真的有 ASU 规则的步骤（32 步里 7 步）才显示第二个 | 信息不丢 | 仍是两个日期 |
| C 按角色显示 | 干部只看到 Due；社长和副社长在 Details 里能看到 ASU cut-off | 干部最简单 | 两种人看到的不一样，演示时要解释 |

### 2.2 Events 页没有 Create Event 按钮

**现状：** `src/pages/Events.tsx` 没有任何新建入口，空状态写 "Ask Platypus to plan one."；只能在右栏 Ask 里打 "Plan …"。Tasks 页有 "+ New task"。

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| ★ A 加按钮，直接出表单 | Events 页头（和 Today 的 Events 卡）加主按钮 **+ New event**，点了直接在右栏打开现有的活动表单，不用先打字。没权限的人看到灰按钮和原因 "Only the president or VP can create events." | 约半天到 1 天；复用现有表单；符合"AI 入口只有 Ask"的界面规则 | 无 |
| B 按钮打开"一句话"小窗 | 按钮打开一个小框："Describe your event in one sentence" + 三个示例（和 onboarding 一样）→ Plan it → 表单 | 保留"一句话建活动"的亮点 | 仍依赖 AI 解析 |
| C 两个都给 | 按钮下拉：Fill in a form / Describe it to Platypus；Ask 里再加一个建议按钮 "Plan an event" | 两类人都照顾 | 多一步选择 |

### 2.3 AI 每次都失败

原因见 0.1。

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| ★ A 修输出额度 | 所有短任务的输出额度提到不会被"思考"吃光的水平（例如至少 800–1000）；因为额度不够而被截断时，**用更大的额度自动再试一次**；日志里多记一项"思考用了多少 token"；加一条"故意给小额度会变红"的测试 | 约半天；直接修掉"必然失败"的那一类；提醒的 AI 句子恢复 | 自动重试会多花一次 AIR 调用（`AGENTS.md` 第 12 节写过"不自动重复收费请求"，所以这一点要你同意） |
| ★ B 放宽时间 + 让等待看得见 | 重新量 Netlify 的真实上限（文档说 60 秒）；如果属实，把 22 秒上限提到约 45 秒，浏览器等待同步放宽；等待时显示 "Thinking… 12 s"；把"先出表单，AI 之后补填"的做法推广到所有 AI 入口 | 约 1 天；修掉"偶尔超时"的那一类 | 最长要等 45 秒，所以必须有进度显示 |
| C 后台任务 + 轮询 | 长任务（读章程、起草手册）改成后台函数（Netlify 上限 15 分钟），页面每隔几秒问一次结果。仓库里已有这个做法的代码（`org-ai-run-background.mts`） | 彻底不受时间限制 | 约 2–3 天；需要打开服务器存储（现在是关的，`ORG_SETUP_ENABLED`），要你决定 |
| D 换模型或供应商 | 短任务换更快的模型 | — | Phase 3 必须用 ASU AIR；现在不建议 |

建议 A + B 一起做；做完仍不行再做 C。

### 2.4 "Not claimed" 到底是什么意思

**现状（读代码得出）：** "Not claimed" 这一个状态装了两种完全不同的情况：

1. **指给了某个人，但他还没点 "I've got it"。** 只有这个人能认领。出现在：换届把任务转给新人、社长把任务指给别人、移动岗位的工作。
2. **根本没有负责人，谁都可以拿。** 出现在：岗位空着、社长发了一个"谁来做"的任务。

"My tasks" 里这一列 = 指给我的 + 没人负责的；切到 "Team tasks" = 全社团所有没认领的，其中别人名下的你点了也认领不了（只会提示 "Only Sam can claim this task."）。卡片上看不出是哪一种。这就是测试者困惑的来源。

另外：新建活动时，岗位有人的步骤直接是 To do（不用认领），只有岗位空着的才是 Not claimed。

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| ★ A 用文字分开两种情况 | 数据不变。"My tasks" 里这一列改叫 **Waiting for you**（指给我、等我接），按钮仍是 "I've got it"，多一个 "Accept all (5)"；没人负责的单独一小组 **Open · anyone can take**。"Team tasks" 里每张卡标明 "Waiting for Sam" 或 "Open to anyone" | 约 1 天；逻辑清楚；不升结构版本 | 列名在两个视图里不同，要改 Settings → Board 里的说明 |
| B 减少需要认领的情况 | 在 A 的基础上：换届转过来的任务不再逐个认领，新人在"接手"时一次确认全部 | 少点很多次 | 改了 Handoff 第 2 阶段你同意过的规则（D-2a） |
| C 拆成两个状态 | 新增状态：Open（没人）和 Offered（指给某人） | 最干净 | 6 个状态变 7 个，要升结构版本、改看板颜色和 `AGENTS.md` 7.6；不建议 |

### 2.5 Details 板块很乱

**现状（`src/components/TaskDetail.tsx`）：** 从上到下是：状态、标题、why、负责人、三个日期、等待、草稿链接、Where to submit、Open Event Budget、Copy All Event Details、Remind、来源、延期提示，**最后才是主操作**（I've got it / Done / Waiting on… / Need help / Need more time），再下面是 Edit。主操作之前最多有 6 个同样大小的按钮；"做这件事"和"管这件事"混在一起；负责人和日期在这里改不了（要去表格里改）。另外 `src/components/NodePanel.tsx` 是一份没人用的旧详情面板。

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| ★ A 重排成三段 | ①**头部：** 标题、状态、负责人、Due。②**Your next step：** 一个主按钮（I've got it 或 Mark done），其余状态按钮排成一行小按钮；"Where to submit" 的链接紧跟在下面（那才是真正要做的事）。③**折叠区：** Why & dates / People / Edit（社长：名字、负责人、日期、标签都在这里改）/ Sources。Remind 只给不是负责人的人看；Copy All Event Details 移到活动自己的详情里 | 约 1.5 天；不加新功能，只是整理 | 相关页面测试要跟着改 |
| B 按人显示 | 负责人看到 "Do" 视图（怎么做、去哪交、回状态）；社长看到 "Manage" 视图（改负责人和日期、提醒、风险） | 每个人只看到自己要的 | 约 2–3 天；演示时两种人看到的不同 |
| C 整页任务 | 电脑上点任务打开整页，右栏只做预览 | 空间大 | 改动大，不建议现在做 |

顺手删掉没人用的 `NodePanel.tsx`（或把它的编辑栏位搬进 A 的 Edit 区）。

---

## 3. 任务到底算"一天"还是"15 分钟"

**现状：** 每个步骤有一个 `estDays`（"要干几个工作日"），最小是 1。手动建的任务一律 1 天。引擎用它算"最晚开始日"= 截止日 − 预计天数 − 个人缓冲。所以一封 15 分钟就能发的邮件，也会被排成"提前 2 个工作日开始"，提醒里还写着 "~1 workday"。

根本问题：**两个不同的东西被放进了同一个数字。**

- **工作量**：真正要花多少时间（15 分钟 / 半天 / 好几天）。
- **提前量**：要提前多少天开始，因为中间要等别人（等报价要 10 天，但自己只花 1 小时）。你上传的时间表里的 10 天就是提前量。

提醒只需要**提前量**（哪天发）；工作量只影响提醒里的那句话和 Team 页的工作量。两个都不需要精确到分钟。

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| ★ A 分成两个，都不用精确数字 | **Size**：Quick（半小时内）/ Half day / Multi-day —— 直接用现有的 light / medium / heavy，不加字段。**Lead time**："Start N days before due" —— 就是现有的 `estDays`，界面改名。引擎不变（仍按天，因为提醒本来就按天发）。提醒里的 "~1 workday" 改成按 Size 说 "about 15 minutes" | 约 1 天；不升结构版本；和你的时间表一致 | 模板里每一步要补一个 Size（可以和 1.3 一起做） |
| B 加分钟 | 新增可选字段"预计分钟数"（15/30/60/120/240/480）；Quick 任务的提前量为 0（当天提醒） | 更精确 | 多一个要填的东西；学生估时间本来就不准 |
| C 只改文字 | "Effort (working days)" 改成 "Start this many days before due"，提醒里去掉 "~1 workday" | 半天 | 没解决 15 分钟任务被提前 2 天提醒的问题 |

**"有人发一个很长的任务"：** 建议定一条规则：**一个任务 = 一个负责人 + 一个交付物 + 一周内能做完。** 超过就不是任务：

| 方案 | 做什么 |
| --- | --- |
| ★ A 标题短 + 备注 | 标题限 80 字符；长内容进新的 "Notes" 栏（现在任务没有备注栏，只有 why） |
| B 提示拆分 | 在 A 的基础上，标题里有 "and / then" 或超过一行时，Ask 提示 "This looks like 3 tasks. Split it?"，拆成几个各有负责人的任务（规则判断，不靠 AI） |
| C 子清单 | 任务里可以有勾选清单 |

---

## 4. 聚焦：两个核心，其余让路

### 4.1 现在的功能按两个核心分类

| 类别 | 功能 |
| --- | --- |
| **核心 1：看到风险 → 自动提醒** | 规则引擎的日期、活动流程（产生任务的来源）、Today 的 "Needs a nudge"、提醒编辑器、沉默协议（第 3/5/7/8/10 天）、认领、一键回状态、通知 |
| **核心 2：24 小时到 3 天交接** | Handoff、岗位档案（自动汇总）、手册、岗位名下的联系人、Rules（新人要查的规则） |
| **支撑** | Events、Tasks、Ask、Settings |
| **外围（和两个核心关系弱）** | Team（工作量、本周之星、会议时间）、Partners 的看板和机构、Funding 和预算明细、目标环、预测百分比、看板改名改色和标签、Tasks 的时间轴视图、Deeper review、旧的 `/phase1` 页面 |

**最大的发现：核心 1 是现在做得最薄的。** 提醒要点 5 次、离开网站、再回来确认；AI 那一句每次失败；onboarding 的选择不起作用；没有任何地方能看到"这周会发出哪些提醒"。反而外围功能做得很细。

### 4.2 导航和首页怎么收

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| ★ F1 提醒优先，其余收进 More | 左边导航从 9 项变 4 项：**Today**（风险 + 提醒队列）、**Plan**（Events 和 Tasks）、**Handoff**、**Rules**；Team、Partners、Funding 收进 "More"（不删代码）。Today 变成**提醒中心**：Going out this week（引擎按最晚开始日排好的）/ Needs your OK / Sent / Replies，一个按钮 "Review and send all (3)"。Onboarding 选的提醒方式在这里真的生效（演示里"自动发"显示为 "Would be sent · demo"） | 产品一眼看出是干什么的；卖点在首页 | 约 4–6 天；页面位置变了，会影响 Phase 3 的任务卡和已有的页面测试 |
| F2 页面不动，加一个聚焦首页 | 所有页面留在原处；Today 顶上两张大卡 **Reminders** 和 **Handoff**，其余折成 "Tools" | 对 Phase 3 风险最小 | 功能仍然一样多，只是排了序 |
| F3 直接砍 | 把 Partners、Team、Funding 从产品里拿掉 | 最聚焦 | 论文的取舍表里它们是"必须"；Handoff 的岗位档案要用联系人；不建议 |

### 4.3 真正的"自动发送"

现在不发任何消息，有两个原因：IRB（测试中不发提醒），以及没有账号和服务器（数据只在浏览器里）。分两步：

1. **现在能做的（演示版）：** 提醒中心 + 三种方式真的走不同流程 + 修好 AI 写的那一句。看起来和用起来就是自动的，只是最后不真的发出去。
2. **v1.5（真实版）：** 登录、服务器存数据、定时任务每天早上检查该发的提醒、用邮件服务发出。这是产品计划里已经排在 12 月的事，要 IRB 之外单独做，也要你决定用哪个邮件服务。

### 4.4 核心 2：怎么做到 24 小时到 3 天交接

**现状：** Handoff 有 8 个阶段（访谈、AI 起草手册、卸任人确认、社长批准、指定接任人、新人读和回述、旁观任务、第 7/30 天回看）。很完整，但每一步都要等人，实际走完要几周。其中最有价值、而且**不用等任何人**的是岗位档案（`src/lib/roleDossier.ts`）：它从平时的记录自动汇总出未完成任务、未来 30 天的截止日、联系人、经验。

| 方案 | 做什么 | 好处 | 代价 |
| --- | --- | --- | --- |
| ★ S1 三天交接包 | 点 "Hand over this role" 后**立刻**从岗位档案生成一份三天清单（不用 AI、不用等）：**Day 1（30 分钟）** 现在着火的事：未完成任务和它们的截止日、未来 30 天的截止日、要拿到的账号和链接；**Day 2** 读 5 条经验，认识 3 个联系人，向前任问 3 个系统挑出的缺口问题；**Day 3** "Accept all" 接下任务，之后提醒改发给新人。顶上显示 "Handoff 60% · 1 day left"。现有的访谈、手册、回述变成"之后再加深"，不再卡住交接。**提醒系统负责推动交接本身**：到点提醒前任回答问题、提醒新人完成当天清单 —— 两个核心互相带动 | 第一天就能接手；复用现有档案代码 | 约 4–5 天；改了 Handoff 现有流程的"必经步骤" |
| S2 平时就在交接 | 没有"交接"这件事：每完成一个任务问一句 10 秒的话 "Anything the next person should know?"，岗位档案一直是最新的；换人 = 改名字 + 三天阅读清单 | 换届时几乎零工作 | 平时每个任务多一个问题；要较长时间才攒出内容 |
| S3 加一个快速通道 | 保留 8 个阶段，加 "Fast track (3 days)"：跳过确认、批准、回述 | 改动最小 | 两套流程并存，更复杂 |

---

## 5. 建议的执行顺序

| 阶段 | 内容 | 粗估 |
| --- | --- | --- |
| 0 马上能好 | 2.3 A（AI 输出额度）、2.2 A（+ New event）、1.6 A（最后一步按钮）、1.1 A 或 B（Goals）、1.2 A（Advisor） | 2–3 天 |
| 1 讲清楚 | 1.4（Why 和 buffer）、1.5 A（Reminders 例子）、2.1 A（一个 Due）、2.4 A（Not claimed）、2.5 A（Details） | 5–6 天 |
| 2 时间 | 1.3（时间表，先回答 5 个问题）、第 3 节（Size 和 Lead time）、2.3 B（时间上限） | 3–4 天 |
| 3 聚焦 | 4.2（导航和提醒中心） | 4–6 天 |
| 4 交接 | 4.4 S1（三天交接包） | 4–5 天 |
| 5 真实发送 | 4.3 第 2 步（登录、存储、定时发送） | 另行计划 |

每个阶段单独一个分支、单独给你预览，你说"可以"再做下一个。

## 6. 需要 Juanxi 先回答的问题

1. **Phase 3 现在处于什么状态？** 路线图写的是 11/16–12/4 评估期间代码冻结。这些"其他社团团长"的测试是 Phase 3 的正式数据，还是之前的试跑？如果正式收数据已经开始或马上开始，改 onboarding（流程版本会从 `ob-4` 变成 `ob-5`）和导航会让前后两批数据不可比，哪些现在改、哪些等收完再改要你定。
2. **1.3 的 5 个确认点。**
3. **会动到已批准规则的几项，要你点头：** 每屏字数上限（1.4、1.5）；"三个截止日"改成界面上一个（2.1）；AI 被截断时自动重试一次（2.3 A）；提醒方式的问法（1.5 如果选 B）；导航改动（4.2）。
4. **要不要打开服务器存储**（2.3 C 和 4.3 第 2 步都需要）。
5. **真实发送用什么渠道、什么时候做**（4.3）。
