# Onboarding 改版执行策略（待 Juanxi 审批）

**状态：只是方案，没有改任何代码或界面。** 起草：Claude，2026-11-01，分支 `claude/determined-johnson-yrdxwf`（预览 10 的代码）。
**要做的两条流程：** A. 社长第一次设立组织；B. 社员收到邀请链接后注册。
**依据：** `AGENTS.md`、`docs/PROGRESS.md`、`docs/PRODUCT_PLAN.md` 第 7 节、`docs/M4_ONBOARDING_PLAN.md`、`docs/DESIGN_TOKENS.md`、`docs/design-upgrade/`；两个设计 Skill：`dickwu/apple-design-skill`（Apple HIG 123 页，已装到 `~/.claude/skills/apple-design`）和 `emilkowalski/skills` 里的 `apple-design`（Apple WWDC 的手感与动效，已读）；预览 10 代码，在本机跑起来，桌面 1280px 和手机 390px 各截了一遍两条现有流程。

---

## 0. 先说结论（一分钟版）

1. **现在的两条流程都"能用但不像 Apple"。** 社长那条把 70 个输入框摆在一页里，社员那条把 5 组问题摆在一页里；两条都在问"系统要什么"，没有先让人看到"我得到什么"。
2. **改法的核心只有一句：先给价值，再要信息；能跳过的都能跳过；每一步只做一件事。** 社长 5 分钟内看到自己社团的第一张流程图（产品计划第 7 节本来就是这个目标）；社员 2 分钟内看到"我负责什么、我的第一件事是什么"。
3. **这套设计的"签名"是进度链**（Platypus 自己的连着线的圆点）。它同时做三件事：进度指示、社长第一场活动的流程图、社员加入后的"你的位置"。Apple 的说法是"别把装饰当成喜悦"——这个签名来自产品本身，不是装饰。
4. **有一个必须你先知道的事实：邀请链接现在只在同一个浏览器里有效**（`Join.tsx` 第 11 行，拿链接里的码去比对本机存的码）。所以 B 流程在 v1.5 做真实账号之前，只能是"设计到位、身份验证是个空位"。我不会把它说成已经能真实注册。
5. **时间冲突：Phase 3 的参与者正好走这两个入口，IRB 里还写了要观察参与者对 onboarding 的反馈**（`IRB_HANDOFF` 第 5 节）。所以我建议：**新流程做成并排的新网址，旧的 `/#/setup` 和 `/#/join` 一个字都不动，等 Phase 3 结束你再决定换不换。**
6. 需要你拍板的问题在第 9 节，一共 6 个，每个都有我的建议。

---

## 1. 我看到了什么（现状诊断）

方法：先按 Apple Skill 的顺序，确认这是**网页应用**，所以用 Apple 的"原则 + 基础"（无障碍、颜色、字体、版面、文字），不套 iOS 的标签栏之类的平台规矩；然后读了 `onboarding.md`、`managing-accounts.md`、`entering-data.md`、`privacy.md`、`launching.md`、`collaboration-and-sharing.md`、`generative-ai.md`、`motion.md`、`writing.md` 再下结论。每条都标了严重程度（Skill 的写法：Critical 无障碍失败，High 真摩擦，Medium 次优，Low 打磨）。**没有发现 Critical**（现有页面测试里本来就有无障碍检查）。

### A. 社长设立组织（`/#/setup`，6 步）

| # | 严重度 | 看到的事实 | Apple 怎么说 | 
| --- | --- | --- | --- |
| A1 | **High** | 第一次使用的人看到的是**整个应用的外壳**：左边导航（带着 Tasks 角标）、右边 Ask 面板（建议问题是 "What are my top 5 tasks?"，是给已经在用的社团准备的）、View as、AI 开关、铃铛。 | `onboarding.md › Best practices`："Keep onboarding content focused on the experience you provide." 新用户的第一屏不该有他还用不到的东西。 |
| A2 | **High** | 第 3 步"Officer roles"，示例章程读出 10 个岗位，**每个岗位 7 个输入框（岗位名、汇报给谁、姓名、邮箱、电话、ASU ID、职责）≈ 70 个**，桌面上页面高约 3,768px。 | `entering-data.md`："Pre-gathering as much information as possible to minimize the amount of data that people need to supply"；`onboarding.md`："Postpone nonessential setup flows"。 |
| A3 | **High** | **同一份信息问了两遍，还是问两个人。** 社长在第 3 步填每位干部的电话和 ASU ID；干部加入时（`ProfileForm`）又被问一遍电话和 ASU ID。产品计划第 7 节写的是"干部的信息由他们自己填"。 | `entering-data.md › Get information from the system whenever possible`；`privacy.md`："Request access only to data that you actually need."（ASU ID 没有任何用途说明） |
| A4 | **High** | 最有价值的瞬间被藏起来了：第 6 步要先打一句话、点 "Prepare first workflow"、填 9 个字段的表单、勾一个确认框，而**流程图只以"前 6 步的文字列表"出现在一个折叠块里**（`Setup.tsx` 第 188 行 `slice(0, 6)`）。产品最好看的东西（进度链、流程图）在"见证时刻"没有出场。 | `design-principles.md › Purpose / Delight`：喜悦是把其余七条做对的结果；`onboarding.md`："Teach through interactivity." |
| A5 | Medium | 邀请链接出现在第 4 步的折叠块 "Your invitation after setup" 里，写着"完成第 6 步后才生效"；完成后，邀请只在 Settings → "Invite officers" 的折叠块里。**最关键的"把团队拉进来"一步，来得太早（还不能用），又藏得太深。** | `collaboration-and-sharing.md`："Prominently display the Collaboration button as soon as collaboration starts."；"Write succinct phrases that summarize the sharing permissions"。 |
| A6 | Medium | 进度指示是 6 个一样大的药丸，桌面上折成两行；哪些能跳过、哪些必填看不出来。产品计划说"5 步、5 分钟"，实际是 6 步。 | `onboarding.md`：流程应该"fast, fun, and optional"。 |
| A7 | Medium | 第一个动作是浏览器自带的 "Choose File" 按钮；"Use the sample constitution"（对 Phase 3 参与者才是主路径）是第二排的小按钮。 | `entering-data.md`："When possible, offer choices instead of requiring text entry."；`generative-ai.md`："offer diverse, predefined example inputs"。 |
| A8 | Medium | AI 出错时界面直接写 "AI could not read it (HTTP 404)"。（⚠ 这是我本机只跑前端、没有服务器函数时看到的；线上不一定出现，但这段文字是代码里写的，错误一多就会露出来。） | `writing.md`："Write clear error messages… avoid blame, and be clear about what someone can do to fix it." |

### B. 社员收到邀请（`/#/join`）

| # | 严重度 | 看到的事实 | Apple 怎么说 |
| --- | --- | --- | --- |
| B1 | **High** | **先要信息，后给价值。** 打开链接，第一屏是一句研究说明（"same-browser demo… does not verify a real identity"）加一个 "Try setup as" 下拉框；"你是谁、你负责什么"的角色卡在下拉框下面，字很小。没有一句话说"这对你有什么用"。 | `managing-accounts.md`："Explain the benefits of creating an account"；`launching.md`/`onboarding.md`：让人先体验价值。 |
| B2 | **High** | 5 组问题**挤在一页**（桌面约 1,700px）：姓名邮箱、渠道电话 ASU ID、提醒时间、忙碌周 + 个人缓冲 + 勾选框、职业目标/兴趣/期望三个文本框，还有一个折叠的空闲时段。产品计划的目标是"手机上 2 分钟、五个问题"。 | `onboarding.md`："design a brief, enjoyable experience that doesn't require people to memorize a lot of information"。 |
| B3 | Medium | "忙碌周"是：日期输入框 → 一个看起来灰掉的 "Add busy week" 按钮 → 列表里写着 "Remove week 2026-11-09"。像在操作日志，不是在选"我哪几周忙"。 | `entering-data.md`：用选择代替输入、即时反馈；`writing.md`：用人话。 |
| B4 | Medium | 结尾只有一句 "You're ready" 和两个链接（其中一个是 "Back to Settings"，一个新社员为什么要回设置？）。**没有告诉他第一件事是什么。** | `feedback.md`：完成要有清楚的完成反馈；`onboarding.md`：让人马上开始用。 |
| B5 | Medium | 无效邀请的提示是 "Check your setup invitation… belongs to a different browser"。对真实社员，这句话没有下一步。 | `writing.md`：错误要说"能做什么"。 |
| B6 | **限制，不是缺陷** | 身份没有验证；换一部手机或另一个浏览器，链接一定失效。 | `managing-accounts.md`："Delay sign-in for as long as possible"、"prefer using a passkey" —— v1.5 才有条件做。 |

### 做得对、必须保留的东西

- **未完成的设置会存在浏览器里，7 天内可恢复**（`Setup.tsx` 的 `setup-draft`）——正是 `launching.md` 说的"Restore the previous state"。
- 章程**只在浏览器里读**，邮箱电话先遮掉再发 AI；AI 关掉时有本地兜底；"Nothing is saved until you approve" 的承诺。
- 日期只来自规则引擎；"Fictional only" 的研究保护。
- 已有的无障碍、手机、深色、减少动效测试。**新流程必须不比它们差。**

### 品牌提醒（Craft 的一条，不要求改）

奶油底（`--bg #fbfaf7`）加衬线标题，是 Skill 点名的"最常见的三种默认外观"之一的近亲（我们的强调色是青绿，不是赤陶，所以只是沾边）。**这套方案不改品牌 token**，把"让人记住的东西"放在进度链上，而不是靠换配色。如果衬线和奶油底是你有意选的品牌，请告诉我，我会写进设计原则里。

---

## 2. 设计思想：把 Apple 的八条原则翻成 Platypus 的六条 onboarding 原则

Apple 在 2026 年 6 月重写的八条原则：Purpose、Agency、Responsibility、Familiarity、Flexibility、Simplicity、Craft、Delight。落到这两条流程上：

| # | Platypus 的原则 | 来自 Apple 的哪条 | 具体意思 |
| --- | --- | --- | --- |
| 1 | **先给价值，再要信息** | Purpose、Responsibility | 每一屏先说"你会得到什么"，再说"我需要什么"。每个问题旁边写用途，用主动句（`privacy.md` 的"purpose string"写法）。 |
| 2 | **能不问就不问，能跳就跳** | Agency、Simplicity | 最快路径只有必须的几步；其余有"Skip for now"，并告诉人以后在哪找回。跳过的东西**不再追问**（`onboarding.md`："don't present it again"）。 |
| 3 | **一屏一件事，一次一只手** | Simplicity（不是极简主义） | 每屏一个问题；手机上主按钮在拇指够得到的底部；"Back"永远在。不是把东西藏起来，而是把次要的放到下一层。 |
| 4 | **边做边看到结果** | Craft、Delight、"teach through interactivity" | 右边（手机上是底部）有一个活的预览：你输入社团名，它长出标题；你选提醒时间，它给你看这条提醒长什么样；你改缓冲天数，日期当场变。 |
| 5 | **熟悉的控件，不发明新的** | Familiarity | 选择题用分段控件和选项行，不用下拉框和文本框；日期用周条，不用"ISO 日期 + 添加按钮"；邀请用"分享"的样子（复制链接 / WhatsApp / Email）。 |
| 6 | **随时能退，能回来** | Agency | 任何一步可 Back；随时 "Save & exit"；回来从原处继续（现有的 7 天恢复保留）；设置里能重新体验。 |

**自我批评（Skill 要求的"换个产品还成立吗"）：** 如果把"一屏一件事 + 进度条 + 欢迎页"换到另一个应用，也会成立——这部分是 Apple 的通用做法，是故意的（Familiarity）。**真正属于 Platypus 的只有一处：进度链既是进度条，又是第一场活动的流程图，又是社员的"你在这里"。** 我把"让人记住的东西"全押在这一处，其余保持安静。

---

## 3. 流程 A：社长第一次设立组织

**唯一的任务：** 5 分钟内，社长看到**自己社团的第一张流程图**，并把邀请发出去。
**让人记住的东西：** 你说一句话，进度链在你眼前自己画出来，日期是规则引擎算的。

### 3.1 屏幕与最快路径

```
Welcome → Name → Constitution* → Goals* → Team* → First event → Invite
                    (*可以跳过)
最快路径：Welcome → Name → First event → Invite（4 屏，Skip 掉 3 屏，用标准岗位和标准目标）
```

| 屏 | 做什么 | 和现在比 | 备注 |
| --- | --- | --- | --- |
| **0 Welcome** | 一屏。"Let's set up your club." 三行承诺：约 5 分钟；你会得到第一场活动的流程图；演示数据不会发到任何地方。按钮 "Get started"。另有 "Try a sample club"（Phase 3 参与者的快路径）。 | 新增 | 只出现一次，不是每次启动（`launching.md`/`onboarding.md`）。 |
| **1 Name** | 社团名（学校固定 ASU Tempe，只读小标 + Info 说明为什么）。右侧预览：标题出现。 | 原第 1 步的一半 | 一个输入框。 |
| **2 Constitution** *可跳* | 三个选项行：**Use sample**（推荐，放第一个）· **Upload a file** · **Paste text**。说明一句 AI 做什么、文字去哪（读完不存）。选完后"后台读取"，社长可以继续往下走（现有做法保留）。底部 "Skip — use standard roles"。 | 原第 1 步的下半 | AI 标签、具体的进度话术："Reading officer titles…"（`generative-ai.md`："specific, reassuring feedback"）；结果之后在 Team 里以"AI suggested"行出现，一行一行可改。 |
| **3 Goals** *可跳* | 3 个建议目标做成可开关的行，每行一个数字步进器；任务只是确认。使命句默认折叠 "Add a mission (optional)"。 | 原第 2 步 | 选择代替输入。 |
| **4 Team** *可跳* | **一屏一个"组织图 + 列表"**：列表每行只有两格——**Role** 和 **Person（可留空 = Open position）**。汇报关系默认带出，可在图上点改；职责折叠，点开看（AI 建议的在里面）。**电话、ASU ID、邮箱不在这里问**：邮箱按现有 `fillEmails` 自动给，其余由干部自己加入时填。 | 原第 3 步，70 格 → 20 格内 | 页面高度从约 3,768px 降到约一屏半。已核对：`validateProfile`（`src/data/settings.ts`）里电话和 ASU ID 本来就允许留空，只要求姓名和 example.org 邮箱，所以不需要改校验。 |
| **5 First event（见证时刻）** | 一个大输入框 + 3 个示例句子按钮。点 "Plan it" → **进度链自己画出来**，每个点带日期，规则引擎算（"ASU 官方截止日 − 社团缓冲"）。下面一个分段控件 **Club buffer: 1 · 2 · 3 · 5 · 7 days**，社长拨一下，日期当场变（这就是现在"提前几天"那个问题，搬到它有意义的地方）。必须核对的字段（日期、人数、地点等）在折叠的 "Event details" 里，默认值来自那句话。 | 原第 6 步 + 原第 3 步末尾的缓冲问题 | 标准流程（"Event workflow" 原第 5 步）默认带入；"Customize workflow" 是一个次级按钮，打开**同一个** `WorkflowPanel`（第 9 节 Q3）。 |
| **6 Confirm + Invite** | 确认：一句话总结 "This creates Desert Founders Society with 6 officers and Founder Dinner on Nov 19. It replaces the current demo." + 两个按钮 **Start workspace** / **Keep current demo**（代替现在的勾选框；这一步会替换演示工作区，是真有破坏性，所以要说清楚，也要能取消）。确认之后**立刻是邀请时刻**：见 3.3。 | 原第 6 步的末尾 + 新增 | |

### 3.2 进度指示 = 进度链（签名）

```
 ●────●────◐ ─ ─ ○ ─ ─ ○           Name · Constitution · Goals · Team · Event
 当前的点实心，走过的线"长"过去（transform: scaleX），跳过的点是空心虚线，可点回去
```

- 用现有 `Chain` 的样子，**不是第三套进度条**。线的"生长"沿用 DX-25 的做法（`transform` + `--spring-pop`），只在**前进**时动，减少动效下直接出现。
- 跳过的步骤显示为虚线空心点，不是"没做完"的红点——跳过是一种合法选择（Agency）。
- 最后一屏，这根链**变成**第一场活动的流程图：同一种点、同一种线。这是全套流程唯一的"演出"。

### 3.3 邀请时刻（把原来的"埋在折叠里"变成最后一屏）

```
┌────────────────────────────────────────────────────────┐
│  Your club is ready.                                   │
│  Invite your officers.                                 │
│                                                        │
│  [ Copy link ]  [ WhatsApp ]  [ Email ]                │
│  Only people with this link can join as an officer.    │   ← 一句话说清权限（Apple 的 "permission summary"）
│                                                        │
│  Maya Chen · Treasurer         ○ Invited               │
│  Priya Nair · Secretary        ○ Invited               │   ← 有人加入后变成 ● Joined（同一浏览器演示）
│  Open position · Director of Outreach                  │
│                                                        │
│  [ Go to Today ]                                       │
└────────────────────────────────────────────────────────┘
```

- WhatsApp / Email 是"打开一条已经写好的消息，人按发送"，和产品里现有的提醒发送方式一致（产品计划第 8 节"两种发送模式"），**什么都不会自动发出**，界面上写明。
- 进入 Today 后，右栏 Ask 才第一次出现。Today 最多挂 3 条**一次性的小提示**（`onboarding.md` 提倡的"context-specific tips"，不是一个大教程）：每条贴着它说的东西、点一下消失、不再出现。

### 3.4 桌面与手机

```
桌面 1280                                        手机 390
┌────────────────────────┬────────────────┐      ┌────────────────────┐
│ ●──●──○──○──○   Exit   │                │      │ ●──●──○ ─ ○  ⋯     │
│                        │  活的预览       │      │                    │
│  Name your club        │  （组织图 /     │      │  Name your club    │
│  [ Desert Founders … ] │   进度链）      │      │  [ Desert Founders ]│
│                        │                │      │                    │
│  [Back]   [Continue]   │                │      │  预览：顶部一行小条  │
└────────────────────────┴────────────────┘      │ ┌────────────────┐ │
  没有侧栏、没有 Ask、没有 View as                 │ │   Continue     │ │ ← 贴底，拇指够得到
                                                  │ └────────────────┘ │
                                                  └────────────────────┘
```

---

## 4. 流程 B：社员收到邀请链接

**唯一的任务：** 2 分钟内，社员（多数在手机上，从 WhatsApp 点进来）确认自己是谁、知道自己负责什么、看到自己的第一件事。
**让人记住的东西：** 打开链接第一屏就是"社长请你当谁、你负责什么"——而不是一张表。

### 4.1 屏幕

```
Invitation → You → Reminders → Busy weeks* → About you* → Done
                                 (*可以跳过)
```

| 屏 | 做什么 | 和现在比 | 备注 |
| --- | --- | --- | --- |
| **0 Invitation** | 大标题社团名；一句 "Alex invited you to be **Treasurer**"；角色卡（汇报给谁、三行职责）；三条"你会得到什么"：一次只看到一件事、提醒发到你选的地方、不会被公开点名（产品原则 C4）；信任一句话：这里收集什么、不收集什么。按钮 "Continue"。 | 新增（现在的角色卡搬到最前，放大） | 研究用的"same-browser demo"说明收进**一个小的 Demo 条**（见 4.2），不再占第一屏。 |
| **1 You** | 姓名、邮箱，**已由社长预填**，只需确认（"Not you?" 链接换人）。 | 原第 1 组 | `entering-data.md`："Prefill fields with reasonable default values"。 |
| **2 Reminders** | 渠道：三个选项行 **WhatsApp / SMS / Email**（选前两个才出现电话号码，并写明用途："So Alex can open a prewritten WhatsApp message to you. Nothing is sent automatically."）；时间：分段控件 **Morning / Evening**。下面一条**真实的示例提醒气泡**，随选择即时变化。静默时段 10 pm–8 am 作为默认写出来，不是问题。 | 原第 2、3 组 | 示例气泡就是"边做边看到结果"。ASU ID 不再问（见 4.3）。 |
| **3 Busy weeks** *可跳* | 学期的周条：一排周的小方块，ASU 的期末周和假期已标好（"从系统取"），点哪几周自己忙。"Skip — nothing busy yet"。一句效果："Platypus will plan around these weeks." | 原第 4 组（日期输入 + 添加 + 删除按钮） | 日期仍由规则引擎和校历算。 |
| **4 About you** *可跳* | 三个问题合成一屏：职业目标、兴趣、对这个角色的期望，各有 3 个建议小标签，也可以打字。用途一句话："Helps match you with tasks you'll care about." | 原第 5 组 | 产品计划 G4 要的数据，保留，但**可跳过**（第 9 节 Q5）。 |
| **5 Done** | 他的名字**加入组织图**（一次轻轻的动作）；下面是他的第一件事：有分配的任务就显示那张任务卡，没有就说 "You'll see tasks here when Alex assigns one"，并预览 Tasks 页。按钮 **Open my tasks**。 | 原 "You're ready" | 社长那边的邀请列表同时变成 ● Joined。 |

**从 B 流程移走的东西：** 个人缓冲（默认 1 天，高级选项留在 Settings → My preferences）、每周空闲时段（等社员第一次用 Team 的会议时间功能时再问，贴着功能问）、ASU ID（见 4.3）。

### 4.2 Demo 条（诚实的边界）

Phase 3 里，参与者要"扮演"一位虚构干部，所以"选择你是谁"的下拉框必须还在，但它不该是第一屏的主角：

```
┌──────────────────────────────────────────────┐
│ DEMO  Previewing as Maya Chen · Treasurer  Change │   ← 窗口顶部一条窄条，琥珀色，和全站 Demo 小标同一个样子
└──────────────────────────────────────────────┘
```

条上写明"Fictional demo. Choosing a name does not verify an identity."（保留现有的研究保护用语）。**v1.5 有真实账号时，这条整个拿掉，下拉框也跟着消失**，不用改后面的屏幕。

### 4.3 关于 ASU ID 与电话

电话只在选了 WhatsApp / SMS 时才问，ASU ID 在新流程里**不问**（它在现有数据里是可选字段；之后哪里真的需要，就在那个功能里、写明用途再问）。这是方案里隐私层面的一个改动，列在第 9 节 Q2。

### 4.4 v1.5 接口（今天不做，只留位置）

B 流程的 "You" 屏就是以后的"身份"屏：v1.5 接 Supabase 的邮件一次性链接后，这屏变成"Check your email"。`managing-accounts.md` 建议"尽量晚登录、优先用 passkey"；我们的计划本来就是"先体验价值再登录"，所以身份屏放在 Invitation（价值）之后，正好符合。**今天不实现，也不假装已实现。**

---

## 5. 两条流程共用的"手感"（来自 Emil 的 apple-design Skill）

全部遵守 `AGENTS.md` 7.1 的动效规则；新样式放进自己的小文件 `src/styles/ob-NN-*.css`，只引用 token。

| 手感 | 做法 | 规则出处 |
| --- | --- | --- |
| **按下立刻有反应** | 沿用 DX-03：按下就缩一点，不等松手。选项行按下即高亮。 | Emil §1 Response |
| **换屏** | 前进新内容从右 24px 淡入，返回从左；**只用 transform + opacity**；`--dur-base` + `--ease-out`；动画中随时能点 Back/Continue，不排队、不锁界面。减少动效下改成纯淡入。 | Emil §3 interruptibility、§7 spatial consistency（来去同一路径）；Apple `motion.md`："Let people cancel motion." |
| **进度链生长** | 线用 `scaleX` 长，圆点用 `--spring-pop` 弹一下；只在前进时。 | DX-25 已有 |
| **见证时刻** | 第一场活动的链**画一次**：点依次出现，间隔很短、最多 8 个，约 0.5 秒内完成，**可打断**，**减少动效下直接整张出现**。这是整个流程唯一的演出。 | Emil §8 hint in direction；Apple "brevity and precision" |
| **不加动画的地方** | 加一行岗位、删一行、改一个数字、切一个选项：这些每分钟点很多次，不加动效（规则 7.1 第 5 条）。 | `motion.md`："avoid adding motion to UI interactions that occur frequently" |
| **材质** | onboarding 外壳顶栏用 DX-23 的半透明样式；手机底部主按钮栏是浮在内容上的功能层，模糊只给它，不给内容；减少透明度下回退实心。 | Emil §12；`liquid-glass.md`：只用在浮动功能层 |
| **字体** | 屏幕标题用现有 `--fs-xl`（手机）/`--fs-2xl`（桌面）+ DX-06 的字距；正文 ≥14px（规则 7.4）；数字用等宽数字。**不加新字体。** | Emil §15；`typography.md` |
| **颜色** | **不加新 token。** 状态和强调色沿用现有。新增任何颜色前先算对比度（文字 ≥4.5:1）。深色同步检查。 | `docs/DESIGN_TOKENS.md` 第 7 节 |
| **触屏** | 选项行和按钮 ≥44px（沿用 DX-04）；主按钮贴底，Back 在它的左边或上面。 | Apple `accessibility.md`；DX-04 |

---

## 6. 文案（界面全英文，这里给方向和样例）

原则：每个按钮是动词；每个问题旁边一句用途（主动句）；错误说"能做什么"；不堆 "fictional"（只放在 Demo 条和需要输入姓名/电话的那一屏各一次）；大小写沿用应用现有的句首大写，不改成 Title Case（Familiarity：和全站一致比和 iOS 一致更重要）。

| 位置 | 现在 | 方案 |
| --- | --- | --- |
| Join 无效链接 | "Check your setup invitation. This local demo invitation has expired or belongs to a different browser." | "This invitation link isn't working. Ask Alex to send a new one." + 演示用户另有一行 "Demo tip: open the link in the browser where setup was done." |
| AI 读章程失败 | "AI could not read it (HTTP 404), so this was read in your browser. Check each line." | "We couldn't use AI just now, so we read it here in your browser instead. Check each line." （去掉状态码；原因仍进 Behind the scenes。） |
| 电话 | "Demo phone (optional)" | "Phone — so Alex can open a prewritten WhatsApp message to you. Nothing is sent automatically." |
| 破坏性确认 | 勾选 "I reviewed this event and want to start this demo workspace." | 按钮 "Start workspace" / "Keep current demo"，上面一句说清替换什么。 |
| 跳过 | （没有） | "Skip for now" + 下面一行灰字 "You can add this later in Settings." |

---

## 7. 不做什么（边界）

- **不做真实账号、密码、跨设备验证。** 全部留 v1.5。
- **不碰服务器存储：** 新流程不调用任何 `/api/org/*`、`/api/workspace*`（`ORG_SETUP_ENABLED` 继续不设）；沿用现有的守门测试写法。AI 只走现有的 `/api/setup/constitution` 和 `/api/command`，**不新增 AI 接口**。
- **不放真实数据、不放密钥**；新界面所有示例都是虚构的。
- **日期只由规则引擎算**：见证时刻的每个日期来自 `schedule.ts`，AI 不给日期。
- **不动数据结构**（`SCHEMA_VERSION` 不变）：新流程写入的仍是现有的 `completeSetup` / `saveProfile`。`M4_ONBOARDING_PLAN` 里的数据地基（`Role.departmentId`、`syncHolders` 等）是另一件事，这里不做（第 9 节 Q6）。
- **不做** 组织架构图的拖线编辑器、DP3 的服务器存储、第三套设计系统（M4 方案已决定不搬）。
- **不改品牌 token。**
- **不收集任何使用数据**（不加埋点）。"快不快"用脚本跑最快路径、数点击次数来量，不记录真人。

---

## 8. 执行计划

### 8.1 前提与顺序

1. **新流程依赖预览 10 的动效 token 和拖拽/弹簧代码**（`dx-00-tokens.css`、`motion.ts`）。这些现在只在 `claude/determined-johnson-yrdxwf`（PR #10），**不在 `main`**。所以：**要等你对预览 10 做出决定（合并或不合并）之后**，新流程才有稳定的地基。预览 10 若要合并，请按之前说的选 **Create a merge commit**。
2. 新流程从 `main`（含合并后的 v1.6）开一个新分支，名字按 `AGENTS.md` 第 8 节："`design/onboarding-flows`"（小写、不带 AI 名字），做完开自己的 Draft PR 拿预览，**不碰 `main`，你说"批准合并"才合并。**
3. **新网址并排上线，旧网址不动：** 新流程挂在 `/#/welcome`（社长）和 `/#/invite`（社员）。`/#/setup`、`/#/join` 和它们的全部测试**原样保留**。两个入口之间用一个开关切换（一行代码）。Phase 3 期间保持旧的；Phase 3 结束后你决定换不换。
4. 日期要和你确认：`M4_ONBOARDING_PLAN` 写 Phase 3 是 **11/9**，测试前冻结期从 11/6 起。这是 10 月 29 日写的，**我没有核对过现在的真实日期**（第 9 节 Q1）。如果 11/6 前做不完，也没关系——按上面第 3 条，它不会碰到 Phase 3。

### 8.2 工作包（沿用 v1.6 的做法：每包独立、`--no-ff` 合并、可单独回滚）

| 包 | 内容 | 大小 |
| --- | --- | --- |
| **OB-00 地基** | 新的 onboarding 外壳（没有侧栏和 Ask 的专注布局、顶栏、Skip/Back/Save & exit）；步骤状态机（纯函数：前进、返回、跳过、恢复，有单元测试）；进度链指示器；Demo 条；文案表；`/#/welcome`、`/#/invite` 空路由 + 开关。**旧路由行为零变化。** | 1 个会话 |
| **OB-01 A·Welcome + Name + Constitution** | 第 0–2 屏；复用 `ConstitutionStep` 的读取逻辑和 `startReading`（只换界面）。 | 1 个会话 |
| **OB-02 A·Goals + Team** | 第 3–4 屏；两格岗位行 + 组织图（复用现有 `OrgChart`）+ 职责折叠；确认 `validateProfile` 与 `fillEmails` 的关系。 | 1 个会话 |
| **OB-03 A·First event** | 第 5 屏：一句话 → 进度链画出来 → 缓冲分段控件；复用 `parseCommand`/`prepare` 逻辑和 `completeSetup`。**最难的一包**（见证时刻的画面和动效）。 | 1.5 个会话 |
| **OB-04 A·Confirm + Invite** | 第 6 屏、邀请时刻、Joined 状态、Today 的 3 条一次性提示。 | 1 个会话 |
| **OB-05 B·Invitation + You + Reminders** | 社员第 0–2 屏；示例提醒气泡；Demo 条。 | 1 个会话 |
| **OB-06 B·Busy weeks + About you + Done** | 周条、建议标签、"加入组织图"的一次动作、第一件事卡片。 | 1 个会话 |
| **OB-07 收口** | 桌面+手机+浅/深色+减少动效+减少透明度全套检查；文档（`AGENTS.md`、`PROGRESS.md`、`DESIGN_TOKENS.md`）；回滚演练；截图对比；你的验收修改。 | 1 个会话 |

合计约 **8–9 个会话**，加上你每一包的验收往返。OB-00 之后，OB-01～OB-04（社长）和 OB-05～OB-06（社员）互不改同一个文件，**可以像 v1.6 一样各开一个 worktree 并行做**。

### 8.3 每一包的验收门（先写进包的说明书）

1. `npm run check` 全绿（lint + 构建 + 单元 + 页面测试 + 字数）。
2. **新增页面测试：** 桌面和手机各一遍"最快路径"和"完整路径"；Back/Skip/恢复；`/api/org`、`/api/workspace` 请求数为 0；`axe` 无障碍；深色；减少动效下无位移动画。
3. **"故意违规会变红"的反向验证**：每个新守卫都附一个会变红的样本（沿用 v1.6 的规矩）。
4. **新屏幕字数上限**：每屏"一眼看到的字"≤ 40 个英文词（见证屏和邀请屏 ≤ 60）；超了先删。（现有 `npm run words` 只管主页面，这里为新流程单加一份预算。）
5. **预算（设计目标，不是已测结果）：** 社长最快路径 ≤ 12 次点击/输入、社员最快路径 ≤ 8 次；用脚本数，不用真人。
6. 每包有**回滚说明**和独立的 merge commit；旧路由测试**一条都不能删**。
7. 我会在 PROGRESS 里写清：做了什么、没验证什么（真机手指、Safari 之类）、怎么验收。**没验证的我不会说成验证过。**

### 8.4 你验收的方式

和 v1.6 一样：每包或每阶段结束，我给你预览网址和"点哪里"的几句话，你只回答"可以"或"改哪里"。

---

## 9. 需要你决定的 6 个问题（每个都有我的建议）

| # | 问题 | 我的建议 |
| --- | --- | --- |
| **Q1 时间** | 新流程做成并排新网址、旧的不动、Phase 3 之后再决定换不换？还是赶在 Phase 3 前直接替换？另外，Phase 3 现在确切是几号？ | **并排，旧的不动。** 直接替换会改变研究参与者看到的东西，而 IRB 把 onboarding 当成观察对象。请告诉我 Phase 3 的真实日期。 |
| **Q2 社长不再填电话和 ASU ID** | 社长只填"岗位 + 姓名"（邮箱自动给）；电话和 ASU ID 由干部自己加入时填（电话只在选 WhatsApp/SMS 时问），**ASU ID 新流程不问**。 | **批准。** 它解决 A3（同一份信息问两遍）和隐私问题；产品计划第 7 节本来就是这个意思。我已核对现有校验：这两项本来就可以留空，不用改。 |
| **Q3 日历/Drive 链接和流程定制不再是必经步骤** | Calendar 链接、Drive 文件夹、"定制标准流程"都从必经路径移走：邀请渠道在邀请时刻选；其余放到 Today 的"Finish setup"小清单和 Settings。**这和产品计划第 7 节第 6 点（首次设置时配好连接器）、以及 10-29 的决定（流程步骤里让社长在图内调整）不一样。** | **批准**，理由：这些连接目前只是演示配置，没有真的接入；流程图编辑留一个 "Customize workflow" 入口，仍然是同一个编辑器，没有丢功能。 |
| **Q4 邀请放到最后，并显示 Invited / Joined 列表** | 邀请时刻在"创建成功"之后。 | **批准。** 它让邀请在能用的那一刻出现，而不是在不能用的时候埋着。 |
| **Q5 社员的问题可以跳过** | 职业目标/兴趣/期望变成可跳过的一屏；个人缓冲、每周空闲时段从 onboarding 移到 Settings 和 Team 页（用到时再问）。 | **批准。** Apple 的原则是推迟非必要的设置；这些数据以后仍然能收集到，而且收集时有上下文。 |
| **Q6 和 M4 方案的关系；先后顺序** | 本方案只管**界面和流程**，不改数据结构；`M4_ONBOARDING_PLAN` 的数据地基（M4a）和"读章程"（M4c）是另一条线。要不要合并成一条路线？以及要不要先决定预览 10？ | **分开。** 先决定预览 10 → 再做本方案（OB-00 起）；M4a 需要时再单独做，两者不互相等。 |

**你可以这样回答我（任选）：** "全部按建议做"；或者 "Q3 不批准，其余批准"；或者 "先做 OB-00 看看外壳"。

---

## 10. 这份方案没有验证的东西

- **没有用真手机、真手指测过**，也没有在 Safari 里看过；截图只是 Chromium 桌面 1280px 和手机 390px。
- 现状里的 AI 读章程，是我本机只跑前端时看到的结果（服务器函数没起），线上行为我没有测，也没有消耗任何 AI 额度。
- 对比度、字号、点击区的新数字**还没算**——它们要等到每个包有真实界面后，用现有的 `axe` 和 token 对比度表来量；方案里没有引入新颜色，所以预期不需要新值。
- "社长 ≤5 分钟、社员 ≤2 分钟" 是产品计划写的**目标**，现有流程到底多久我没有量过（没有真人测试）；第 8.3 的点击次数预算是设计目标。
- 日期（Phase 3 的 11/9、11/6 冻结）来自 10 月 29 日的 M4 方案，没有重新核对。
- 第二个 Skill 我读的是 `emilkowalski/skills` 仓库里的 `skills/apple-design/SKILL.md`（一份 WWDC 动效笔记的网页版），它的动效数字（阻尼 1.0、response 0.3–0.4 等）我只当参考，实际数值仍以 `docs/DESIGN_TOKENS.md` 的 `--dur-*`、`--spring-*` 为准。

---

**批准之后我的第一步：** 不改任何现有界面，只做 OB-00（外壳、状态机、空路由和开关），给你一个预览网址，让你先看新的"专注外壳"长什么样，再往下做。
