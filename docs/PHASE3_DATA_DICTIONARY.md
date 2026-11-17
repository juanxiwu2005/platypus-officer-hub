# Phase 3 导出文件数据字典

给研究者（Juanxi）看的说明：参与者在 Settings 页按 **Export my data** 下载的那个 JSON 文件里有什么、每个字段是什么意思、怎么从里面算出任务用时、错误次数和"有没有点开引用来源"，以及它**做不到**什么。

- 适用版本：`formatVersion: 3`（2026-11-07 起，加了"研究会话"，见第 1.1 节）。旧的 `formatVersion: 1`、`2` 文件也能用下面的 CSV 脚本读：1 没有界面操作记录；1 和 2 没有会话，文件里是这个浏览器里的全部记录。
- 文件里只有虚构社团的数据和参与者在原型里的操作记录。**没有任何东西会自动上传**：文件只在参与者自己按按钮时下载到他自己的电脑，再由他（Zoom 上）发邮件给研究者。
- 本文件和代码对应：日志结构 `src/data/types.ts` 的 `LogEntry`；界面事件 `src/lib/uiLog.ts`；写入与去噪 `src/data/store.tsx` 的 `appendUiLog`；研究会话 `src/lib/studySession.ts`；时间线 `src/lib/timeline.ts`；导出 `buildExport`；CSV 脚本 `scripts/export-to-csv.mjs`。
- 2026-11-07 新增四项**只记行为**的记录（任务标记、离开页面、开始编辑字段、悬停卡），见第 11 节。
- 2026-11-08（P3-H）社长流程多了一屏 **Reminders**（问提醒怎么发给干部），流程版本变成 `ob-4`；导出的会话摘要多了 `reminderModeChoice`。**没有新增记录项**：选择本身原来就会记成 `ui.change`，见第 12 节。
- （FB-2，分支 `fix/fb-2-onboarding`，**还没上线**；Phase 3 正式网站仍是 `ob-4`）社长流程变成 Name → Team → First event → Reminders → Confirm → Invite，流程版本 `ob-5`。**去掉了 Constitution、Goals 两屏**：章程变成 Team 屏顶上的折叠区 "Fill roles from your constitution (optional)"，Mission 移到 Name 屏，目标只在 Settings 里设。所以 `ob-5` 的尝试里**不再出现** `founder.constitution`、`founder.goals` 这两个步骤 id（也就没有它们的 enter/leave/skip），Name 之后直接是 `founder.team`；Name 屏的 Continue 在交互日志里是 `to: "/welcome/founder/team"`。打开章程折叠区、选样例/上传/粘贴，记成普通的 `ui.click`（`route` 是 `/welcome/founder/team`）。Invite 后不再接社员预览、Confirm 只有一个主按钮由 FB-3 在同一次发布里完成。**没有新增记录项。**比较新旧数据时按 `flowVersion` 分组。
- （FB-3，分支 `fix/fb-3-onboarding-b`，**还没上线**；Phase 3 正式网站仍是 `ob-4`）`ob-5` 的后两屏：Confirm 的主按钮改名 **Create my club**（原 Start workspace；记录值不变，仍是 `setupChoice: "start-workspace"`，仍写 `completeSetup`）。去掉 Keep current demo 按钮；只有已经建过社团时，替换警告下面有文字链接 **Cancel and keep the current club**，行为同原 Keep current demo（`setupChoice: "keep-demo"`，`founder.confirm` 记 `exit`，尝试以 `exited` 结束）。Invite 只有一个主按钮 **Open my workspace**（原 Go to Today：`founder.invite` 记 `complete`，尝试以 `completed` 结束，去 `/`）；去掉了 "See what your officers will see"，所以 `ob-5` 的尝试里**不再出现** `member.*` 步骤，`outcome` 只说社长流程怎么结束（在 Invite 按 Exit 仍是 `exited`）。社员预览仍可从 Demo 菜单 Test Onboarding Page Invite 打开，不写记录。Reminders 屏新增示例提醒卡、每个选项下的三步图、类比和"在 Platypus 里会怎样"一句，原来每个选项的一句说明只作读屏描述；三个选项的标题、顺序、不预选、`data-testid`、存的值和 `ui.change` 记录都不变。First event 的缓冲改成 Tight 1 / Standard 3 / Safe 5 三个选项（草稿里是 2 或 7 时显示 Custom），存的 `clubBufferBusinessDays` 数值不变；点选项记成普通的 `ui.click`（按钮名如 "Safe · 5 days"）。导出时间线里 `onboarding.setup` 的描述文字仍写 `Start workspace` / `Keep current demo`（它们是记录值的标签，没改）。**没有新增记录项。**

---

## 1. 一句话说清楚

参与者在原型里做的事，按发生顺序记成一条一条（每次研究会话最多保留最新的 2000 条）。每一条都有：编号、真实时间、当时"以谁的身份查看"、做了什么、做的对象（长文字截断）、改数据时改之前的值、以及原型接受了没有。导出时再附上一份把所有记录按时间排好的"时间线"，方便直接看或转成 Excel。

### 1.1 研究会话（formatVersion 3 起）

**为什么要有：** 研究者自己在线上网站试做时发现，导出的 177 条里前 49 条是另一天（同一个浏览器之前）留下的。为了让每次测试的文件只装这一次坐下来做的东西（下面叫"这一次 sitting"），又不会因为误操作丢数据，现在有了"研究会话"。

- **什么时候开始一个新会话：** 只要开始一次"会记录的引导"：打开研究链接 `/#/start`、欢迎页的 Start walkthrough（`/welcome/start`），或 Demo 菜单的 Replay walkthrough。Demo 菜单里的两个 Test 按钮**不会**开始会话，也不写任何记录。
- **开始时做什么：** 生成一个会话编号（例如 `s-3f9a0c71d2e4b856`，随机的，不包含任何人名、时间或设备信息），记下开始时间。然后**只删掉更早一次 sitting 的东西**：超过 6 小时的交互日志条目和引导尝试（除非它属于 6 小时内开始的会话）。删了多少只记条数（`previousEntriesCleared`、`previousAttemptsCleared`），不留内容。**最近 6 小时内的都保留**，包括点研究链接之前那几分钟的浏览（这些条目不带会话编号）。
- **之后：** 每一条日志都带这个会话编号（`session` 字段）。编号 `seq` 接着往下数，不重来。一个会话只管一次 sitting：开始 6 小时以后再写的条目就不带会话编号了，直到下一次打开研究链接。
- **中途又打开了研究链接（或按了 Replay walkthrough）：** 会开始第二个会话，但前一个会话的记录**一条都不会丢**（都在 6 小时内）。导出文件里就会有两个会话，`sessions` 里各一行，每条日志用 `session` 字段分得清是哪个会话的。
- **为什么 6 小时：** 一次测试最多 75 分钟；6 小时以前的东西基本可以肯定是另一天、另一次（可能是另一个人用了这台电脑）。删掉它们既不占 2000 条上限，也不会被误导出；条数仍在文件里，研究者能看出"之前有过东西"。
- **2000 条上限：** 算的是浏览器里保留下来的整份日志（可能包括同一次 sitting 的几个会话），满了从最早的丢起，丢了几条见 `interactionLog.droppedEarlier`（只算上限丢的，不算 6 小时清理删的）。
- **导出时：** 放保留下来的全部日志条目和引导尝试（再按同样的 6 小时规则过一遍，防止另一个旧标签页把旧条目写回来）；顶层有 `sessions`（每个会话一行）和 `session`（最新的那个，外加没放进文件的条数），见第 3.1 节。如果这个浏览器从来没开始过会话（例如只用 Test 按钮或直接看样例），`session` 为 `null`、`sessions` 为空，文件和以前一样放全部记录。

## 2. 怎么拿到、怎么打开

1. 参与者：Settings → My preferences → **Export my data**。浏览器下载一个文件，名字像 `platypus-export-2026-11-07-15-04-31.json`（文件名里的时间是 UTC）。
2. 研究者收到后，在装了 Node.js 22 的电脑上，进入仓库目录运行：

   ```
   node scripts/export-to-csv.mjs 路径/platypus-export-2026-11-07-15-04-31.json
   ```

   会在同一个文件夹生成同名的 `.csv`，一行一个事件，可以直接用 Excel 打开。
   - 用 R：`readr::read_csv("….csv")` 直接读；如果用基础 R 的 `read.csv`，请加 `--no-bom` 生成（那个开头的"字节顺序标记"是给 Excel 认中文和符号用的）。
   - 脚本只读这个文件、只写那个 CSV，不联网。
3. 也可以直接用任何文本编辑器或浏览器打开 JSON 看 `timeline` 字段。

## 3. 文件最外层的字段

| 字段 | 意思 |
| --- | --- |
| `format` | 固定是 `"platypus-export"`，用来认出这是本原型的导出文件 |
| `formatVersion` | 文件结构版本。现在是 `3`。2 比 1 多了下面标 ★ 的字段；3 又多了标 ◆ 的字段，而且 `interactionLog`、`onboarding`、`timeline` 只含这一次 sitting（最近 6 小时，见 1.1；原有字段一个都没删） |
| `exportedAt` | 按下导出的真实时间（ISO 格式，UTC） |
| `schemaVersion` | 社团数据结构的版本号（开发用） |
| `storageKey` | 数据在浏览器里存的名字（开发用） |
| ★ `build` | 这是哪一版网站：`version`（应用版本号）、`commit`（代码提交号）、`branch`、`context`（Netlify 的 production / deploy-preview）。本地构建没有这些信息时写 `"unknown"`。用来确认每位参与者用的是同一版 |
| ★ `demoToday` | 原型里的"演示日期"（导出那一刻）。原型的日期是假的、可以用 Demo 菜单往前拨；它和真实时间无关 |
| ★ `onboardingFlowVersion` | 当前网站的新手引导流程版本（正式网站现在 `ob-4`：First event 之后、Confirm 之前多了 Reminders 屏；`ob-3` 没有这一屏。分支上的 `ob-5` 没有 Constitution、Goals 两屏，步骤 id `founder.constitution`、`founder.goals` 不再出现，见文件开头）。每次引导尝试里也各自记了版本 |
| ◆ `sessions` | 文件里的每个研究会话一行，按开始时间排，见 3.1；没有会话时为空 `[]` |
| ◆ `session` | 最新的那个会话（和 `sessions` 最后一行一样），外加没放进文件的条数，见 3.1；没有会话时为 `null` |
| `state` | 导出那一刻整个虚构社团的数据（活动、任务、成员、设置……）。签名密钥被替换成 `"[omitted]"`。Handoff 改版起（结构版本 21）里面还有 `roleTerms`（谁在哪个岗位任职过：`status` 为 `incoming` / `active` / `former`，起止日期）、成员的 `leftOn`（交接后离任的日期）和 `incomingFor`（已被指定接任、还没正式接手）；结构版本 22 起还有 `archivedRoles`（被关闭的岗位，留作历史）、岗位的 `formerNames`（旧名）和 `startNotes`（新岗位的起步回答），都是虚构演示数据 |
| `onboarding` | 新手引导（`/#/welcome/…`）的单独记录，见第 6 节（有会话时只含这一次 sitting 的尝试） |
| `interactionLog` | 交互日志本体，见第 4、5 节（有会话时只含这一次 sitting）。外层还有：`limit`（2000）、`count`（现有条数）、`firstSeq` / `lastSeq`（第一条和最后一条的编号）、`droppedEarlier`（因为超过 2000 被丢掉的最早条数；0 表示一条没丢。6 小时清理删掉的不算在这里，见 `previousEntriesCleared`） |
| ★ `timeline` | 把交互日志和新手引导记录合在一起、按时间排好的清单，每行一句英文短描述，见第 7 节 |

> **Handoff 页读取日志（2026-11-09，Juanxi 决定问答记录和研究日志不分开）：** Handoff 页的新人卡会在画出来的那一刻，从本文件说的 `interactionLog` 里读出新人（被指定接任之后）问 Ask 的问题（`ui.ask` 的 `question`），给社长和新人本人看。**不新增任何记录项**，不把这些问题另存，不放进手册或档案，不发给 AI。

### 3.1 会话（`sessions` 和 `session`，formatVersion 3）

`sessions[]` 每个会话一行（文件里有它的条目或尝试，或者它是最新的）；`session` 就是最后一行，另加 `olderEntriesLeftOut`、`olderAttemptsLeftOut` 两个总数。时间都给三种写法：`…At` 是 UTC 的 ISO 时间，`…AtMs` 是毫秒数，`…AtAz` 是**亚利桑那时间**（America/Phoenix，UTC−7，全年不变，没有夏令时），例如 `2026-11-07 10:46:40.337`，可以直接对评分表。

| 字段 | 意思 |
| --- | --- |
| `id` | 会话编号（随机） |
| `startedAt` / `startedAtMs` / `startedAtAz` | 会话开始的时间（打开研究链接那一刻） |
| `attempt` | 这个会话的引导尝试编号（对应 `onboarding.attempts[].id`） |
| `outcome` | 这次引导尝试**整体**怎么结束的：`completed` / `exited` / 还没结束为 `null`。注意：`exited` 不等于"没建好社团"，见下一行 |
| `setupCompletedAt` / `setupCompletedAtMs` / `setupCompletedAtAz` | 在 Confirm 屏按 **Start workspace** 或 **Keep current demo** 的时间（第一次按的）。有值 = 建社团这一步已经做完；没按过为 `null` |
| `setupChoice` | 按的是哪个：`start-workspace`（Start workspace，建了自己的社团）或 `keep-demo`（Keep current demo，保留示例社团）。分支上的 `ob-5`（FB-3，未上线）取值不变：按钮叫 Create my club / Cancel and keep the current club |
| `firstEventChoice` | First event 屏最后一次往前走时：`planned`（计划了一个活动）或 `skipped`（按了 Skip for now）；没走过这一屏为 `null`。只从屏幕步骤记录推出来，不看填了什么 |
| `reminderModeChoice` | Reminders 屏（2026-11-08）最后一次往前走时的答案：`auto_email`（Send automatically）、`review_then_self`（I review, then I send）、`review_then_auto`（I review, Platypus sends），或 `skipped`（按了 Skip for now）；没往前走过这一屏为 `null`（`ob-3` 的旧文件也是 `null`）。怎么推出来的见第 12 节 |
| `entries` | 文件里属于这个会话的日志条数 |
| `previousEntriesCleared` | 这个会话开始时，因为超过 6 小时而从这个浏览器里删掉的旧日志条数（只有数字） |
| `previousAttemptsCleared` | 同一时刻、同样原因删掉的旧引导尝试次数 |
| `olderEntriesLeftOut`（只在 `session`） | 不在这个文件里的更早条目总数 = 文件里各会话的 `previousEntriesCleared` 加起来 + 导出时又过滤掉的旧条目（例如另一个还开着的旧标签页写回来的；通常是 0） |
| `olderAttemptsLeftOut`（只在 `session`） | 同样算法的引导尝试次数 |

**例子（研究者 2026-11-07 的试做）：** 按了 Start workspace，接着去看社员预览，在那里按了 Exit。现在文件里是 `setupCompletedAt` 有值、`setupChoice: "start-workspace"`、`outcome: "exited"`。分析"有没有完成建社团"时请看 `setupCompletedAt`，不要看 `outcome`。

## 4. 交互日志里每一条（`interactionLog.entries[]`）

| 字段 | 意思 |
| --- | --- |
| `seq` | 编号 1, 2, 3 …，不重复、不复用；新会话不重新编号（只有 6 小时清理把日志全删光时才从 1 开始）。开头不是 1：最早的几条被删了，是 2000 上限（`droppedEarlier`）还是 6 小时清理（`previousEntriesCleared`），文件里分开写 |
| `at` | 真实时间，1970 年以来的毫秒数（参与者电脑的时钟） |
| `actor` | 当时原型"View as"设成了谁（虚构人物的 id，例如 `alex`） |
| `type` | 发生了什么。以 `ui.` 开头的是**界面操作**（第 5 节）；其余是**数据动作**（改了社团数据的操作，例如 `completeSetup`、`updateNode`） |
| `payload` | 这件事的细节（长文字截到 200 个字符；看起来像密钥的字段不收） |
| `before` | 只有"改已有数据"的数据动作才有：改之前那些字段的值。界面操作**没有** `before` |
| `applied` | `true` = 原型接受了；`false` = 没接受（没权限、无效、没东西可改；界面操作里见下） |
| `session` | 这一条属于哪次研究会话（formatVersion 3）。不在任何会话里写下的条目（研究链接之前，或会话开始 6 小时以后）没有这个字段 |

**两种条目在同一个编号序列里**，所以"点了哪个按钮 → 数据怎么变了"可以按顺序直接读出来。

### 4.1 常见的数据动作（不是全部）

| `type` | 什么时候出现 |
| --- | --- |
| `completeSetup` | 引导里按 Start workspace，社团建好（`payload` 里有参与者填的社团资料，按原规则截断） |
| `saveProfile` | 保存个人资料（引导里社员预览的 Done 屏也会写） |
| `draftChanges` / `aiAutoApply` | Ask 生成了一组待批准的改动 / AI 直接做的小改动 |
| `reviewChange` | 对一组改动按了批准或拒绝（`payload.decision`） |
| `undoAuto` | 撤销一个 AI 小改动 |
| `createTasks`、`addTask`、`claimTask`、`moveTask`、`replyTask`、`updateNode`、`updateEvent` | 任务和活动的增改 |
| `issueOfficerGrant`、`confirmNudgeSent` | 准备提醒时生成一次性任务链接、参与者点"I sent this reminder"。**FB-8（只在分支上，正式网站上线前不适用）：** `confirmNudgeSent` 的 `payload` 可以多一个可选的 `via`：`"president"` = 社长/副社长自己打开草稿发的（"I sent this reminder"）；`"platypus"` = 选了 "I review, Platypus sends" 的社团里按了 "Approve · Platypus sends (demo)" 或提醒中心的 "Approve all (N)"（每条一个 `confirmNudgeSent`，一次批准 N 条就有 N 条）。同一个值也存进 `state.nudges[].via`。旧文件里没有这个字段，按 `president` 理解。网站仍然**不发任何东西**；"Send automatically" 在提醒中心里显示的 "Would be sent · demo" 是推算出来的，**不写任何记录**。没有新增记录类型 |
| `advanceClock`、`setViewer`、`setAi`、`reset` | Demo 菜单：拨日期、切换查看身份、开关 AI、重置演示 |

### 4.2 规则提醒运行时增量（2026-11-16，功能分支阶段一）

仅显式 `enableReminderPlan` 后存在可选的 `state.reminderRuntime`，不改变 formatVersion 或旧存档外层版本。新运行时有 `updates`（同日顺序和真正操作人）、`waitingRequests`（明确等待对象及关闭原因）、`deliveries`（不可变收件人与任务快照），均用 `sequence` 保留先后；`activatedOn`/`sentOn` 使用演示日期。`enableReminderPlan` 是启用动作；`confirmPlannedReminder` 是审核记录动作。它们沿用现有数据动作日志格式，未给旧页面添加按钮。

自动模式的新 `deliveries` 会持久记录 `outcome: simulated`；人工发送确认是 `recorded_by_sender`，不表示本站核实了外部投递。旧 `state.nudges`、旧 `protocolLog` 不转换成未知收件人的新发送。损坏或未来版本 runtime 保留但停用。旧页面默认尚未启用新运行时，上节 FB-8 推算记录的描述仍适用于旧路径；不能把两种版本混算为真实邮件数量。邮件/任务页的阶段二、Details 的阶段三以及真实发送服务尚未实施。

## 5. 界面操作（`type` 以 `ui.` 开头）

### 5.1 类型一览

| `type` | 什么时候记一条 | `payload` 里有什么 |
| --- | --- | --- |
| `ui.navigate` | 换了页面（包括刷新后第一次打开、浏览器后退、直接改地址） | `from`（上一页路径，第一次打开时是 `null`）、`to`（新页面路径） |
| `ui.click` | 按了按钮、链接、标签页、菜单项、`<summary>` 展开行等可以"按"的东西 | 见 5.2 |
| `ui.change` | 勾/取消勾选复选框、选单选按钮、在下拉框里选了一项 | 见 5.2，另加 `checked`（勾上为 true）、`group`（所在分组的标题）或 `value`（选中项的文字） |
| `ui.ask` | 在 Ask 里发出一个问题（打字回车、按 Send、点建议问题、或从别处"Ask about this rule"送来） | `question`（问题原文，超过 200 字符截断）、`via`（`typed` 自己打的 / `suggestion` 建议按钮 / `handoff` 从别处送来）、`route`、`focus`（当时 Ask 在看什么：`node` / `event` / `page`） |
| `ui.answer` | Ask 给出了回答（**只记回答的种类，不记回答的文字**） | 见 5.3 |
| `ui.details` | 右栏 Details 打开了某样东西，或关上 | `action`（`open` / `close`）、`kind`（`task`、`nudge`、`event`、`partner` …）、`id`（虚构数据的 id） |
| `ui.reminder` | 提醒编辑器（"Private reminder"）打开 | `action: "open"`、`nodeId`（哪个任务）、`channel`（默认渠道） |
| `ui.export` | 按了 Export my data（这一条会出现在导出的文件里，是最后一条） | `entries`（导出时日志条数） |
| `ui.task` | 参与者在 Demo 菜单按了任务开始/完成（2026-11-07，第 11.2 节） | `task`（1–6）、`event`（`start` / `done`）、`implicit`、`ms`、`route` |
| `ui.visibility` | 离开页面满 1 秒、以及回来（2026-11-07，第 11.4 节） | `state`（`hidden` / `visible`）、`via`（`tab` / `window` / `close`）、`awayMs`、`picker`、`route` |
| `ui.edit` | 聚焦一个输入框后第一次改动它、以及离开它（2026-11-07，第 11.5 节；**不记内容**） | `field`、`kind`、`area`、`route`、`event`（`start` / `end`）、`ms` |
| `ui.hover` | 悬停卡（`Hover` / `Info`）开着 ≥ 0.5 秒后关上（2026-11-07，第 11.6 节） | `name`、`near`、`ms`、`via`（`mouse` / `focus` / `tap`）、`area`、`route` |

### 5.2 点击和选择的通用字段

| 字段 | 意思 |
| --- | --- |
| `route` | 发生在哪个页面（只有路径，例如 `/tasks`；地址里 `?` 后面的值一律不记） |
| `role` | 控件种类：`button`、`link`、`tab`、`menuitem`、`summary`、`checkbox`、`radio`、`combobox`（下拉框）等 |
| `name` | 控件的名字（屏幕阅读器读出来的那个：按钮文字、链接文字、`aria-label` 或标签文字），最多 80 字符。可能包含屏幕上显示的虚构数据（例如任务名、虚构人名），偶尔包含参与者之前自己输入、后来显示在按钮上的文字（例如他起的任务名），都是截断的 |
| `testid` | 控件的内部标识（如果有），例如 `export-data`，比 `name` 稳定，适合筛选 |
| `area` | 屏幕上的哪一块：`answer`（Ask 的某条回答里）、`reminder`（提醒编辑器里）、`ask`、`rail`（右栏）、`nav`（左侧导航）、`header`、`main`、`dialog`、`menu` |
| `to` | 这次点击带去的页面路径（链接，或按了以后换了页的按钮，例如引导里的 Continue） |
| `external` | `true` = 点的是**站外链接**（例如引用的 ASU 来源、Gmail/WhatsApp 草稿） |
| `href` | 站外链接的**网站 + 路径**（例如 `eoss.asu.edu/sites/default/files/…Handbook.pdf`）；`mailto:`、`sms:` 这类只记开头。查询参数（里面会有消息正文、链接令牌）一律不记 |
| `expanded` | 按完以后是展开（true）还是收起（false），用于菜单、`<details>`、侧栏开关 |
| `selected` | 标签页被选中 |
| `repeat` | 同一个控件 0.6 秒内被连续按了几次（例如双击、着急连点）。只有 ≥2 时才有 |

### 5.3 回答的种类（`ui.answer`）

| 字段 | 意思 |
| --- | --- |
| `answer` | 主要的回答形式：`rule-answer`（规则回答，带引用）、`plan-form`（建活动表单）、`task-form`（建任务表单）、`change-card`（待批准的改动卡）、`change-applied`（已生效的小改动）、`event-date-form`、`task-list`、`reminder-card`、`plan-check`（新活动的计划检查）、`text`（纯文字）、`error`（出错，`applied: false`）、`timeout`（AI 第二轮没按时回来）、`stopped`（FB-1，2026-11-15：参与者在等待时按了 Ask 的 **Stop**，回答来自浏览器本地——聊天是本地兜底回答、表单保留原样、Plan check 是规则引擎自己的检查；`fallback` 为 `true`，`source` 写明 "stopped"；补填时同时有 `refine: true`、Plan check 时有 `trigger: "plan-check"`。提醒编辑器里的 **Skip AI line** 不产生 `ui.answer`，只有通用点击记录） |
| `cards` | 这条回答里所有卡片的种类，按顺序 |
| `citations` | 回答引用的规则/政策编号，例如 `["R06"]`（规则回答和计划检查都有） |
| `inScope` | 规则问题是否在规则库范围内 |
| `source` | 回答下方那行小字标签，说明是谁答的，例如 `Matched by keywords · AI unavailable`、`AI checked policy sources · …` |
| `fallback` | `true` = 没有用到 AI（AI 关闭、服务不可用、超时，由本地规则或模板回答） |
| `ms` | 从发问到回答出现用了多少毫秒 |
| `changeSetId` / `autoSetId` | 这条回答生成的改动组编号，可以和后面的 `reviewChange`、`undoAuto` 对上 |
| `refine` | `true` = 这是 AI 的"第二眼"（先出本地表单，AI 回来后补填） |
| `trigger` | `plan-check` = 不是参与者提问，而是新活动批准后自动做的计划检查 |

### 5.4 界面操作的 `applied` 和 `before`

- 界面操作**没有 `before`**：它们本身不改数据；真正改数据的那一步会紧跟着出现一条数据动作，那里有 `before`。
- `applied` 一般是 `true`（这件事确实发生了）。只有两种情况是 `false`：点到了被标成"不可用"（`aria-disabled`）的控件；`ui.answer` 的 `answer` 为 `error`。

### 5.5 去噪规则（为什么条数不会爆）

1. 同一件事在 0.6 秒内重复出现（一次点击触发两个事件、开发模式的重复执行），只留一条。
2. 同一个控件 0.6 秒内连续按：留一条，用 `repeat` 计次数。
3. 点了链接或按钮后 2 秒内换了页：不再单独记 `ui.navigate`，而是把新页面写进那次点击的 `to`。（换页去的地方和点击说的不一样时——例如被重定向——仍会另记一条 `ui.navigate`。）
4. 点在空白处、点进文本框、点标签文字：不记（选择本身会记成 `ui.change`）。

**条数估计**（`src/test/uiLog.test.tsx` 的模拟，上限 2000；2026-11-07 起包含第 11 节的四项）：一般节奏（在原型里 60 分钟、平均每 8 秒操作一次）约 **650 条**；非常忙（75 分钟不停、每 4 秒一次，6 个任务标记、每 3 分钟离开一次页面、每 12 个操作里有一次打字和一次读悬停卡）约 **1560 条**（加这四项之前分别是 600 / 1500）。端到端测试里那段脚本化流程（准备一个提醒 + 引导建社团 + 点几个页面 + 规则问题 + 打开来源 + 导出，真人做大约几分钟）现在是 **40–42 条**（电脑 42、手机 40；以前 34 条，多出来的是"开始/停止打字"）。如果某个文件 `droppedEarlier` 大于 0，说明真的超了上限，最早的部分没有了。

## 6. 新手引导记录（`onboarding`）

这是 v1.5 起就有的单独记录（`src/lib/onboardingRecord.ts`），只记行为、不记填写内容：

- `attempts[]`：每次走引导（或在欢迎页选"Explore the sample club"）一条：`id`、`entry`（`start` 走引导 / `explore` 直接看样例）、`flowVersion`、`replay`（第几次重走）、`startedAt`、`finishedAt`、`outcome`（`completed` 走完 / `exited` 中途退出 / `explored`）。
  - formatVersion 3 起还有：`sessionId`（属于哪次会话）、`setupCompletedAt`（按 Start workspace 或 Keep current demo 的时间，毫秒）、`setupChoice`（`start-workspace` / `keep-demo`）。
  - `outcome` 的意思没变，指**整个尝试**（包括建好以后的社员预览）怎么结束。`exited` 可能是建社团前就退出了，也可能是建好以后在社员预览里按了 Exit；两者用 `setupCompletedAt` 区分。（分支上的 `ob-5`，FB-3，未上线：没有社员预览，建好以后的 `exited` 只能是在 Invite 屏按了 Exit。）
- `steps[]`：每屏的 `enter`（进入）、`leave`（离开）、`back`（返回）、`skip`（跳过）、`complete`（完成）、`exit`（Save & exit 退出），各带时间 `at`。步骤 id 跟着流程版本：`ob-4` 是 `founder.name`、`founder.constitution`、`founder.goals`、`founder.team`、`founder.first-event`、`founder.reminders`、`founder.confirm`、`founder.invite`；`ob-5` 没有 `founder.constitution` 和 `founder.goals`（章程在 Team 屏里，Mission 在 Name 屏里，目标不在引导里）。
- 引导页面上的点击和换页，现在**也**会同时出现在交互日志里（`route` 以 `/welcome/` 开头），两边可以在时间线上对照。

## 7. 时间线（`timeline[]`，CSV 就是它）

| 字段 | CSV 列 | 意思 |
| --- | --- | --- |
| （行号） | `row` | 1, 2, 3 … |
| `time` | `time_iso` | 真实时间，ISO 格式，**UTC** |
| `timeAz` | `time_az` | 同一时间的**亚利桑那时间**（UTC − 7 小时，全年不变），例如 `2026-11-07 10:46:40.337`。旧文件没有 `timeAz`，CSV 脚本照样算出这一列 |
| `at` | `time_ms` | 同一时间的毫秒数 |
| `session` | `session` | 这一行属于哪个会话；不在任何会话里为空 |
| — | `elapsed_s` | 距**这一行所属会话的开始**过了多少秒；不在任何会话里的行为空。旧文件（没有会话）：距第一行 |
| — | `gap_s` | 距上一行过了多少秒（看停顿、犹豫） |
| `source` | `source` | `log`（交互日志）、`onboarding`（引导记录）或 `session`（会话开始，每个会话一行） |
| `seq` | `seq` | 交互日志编号（引导记录行为空） |
| `attempt` | `attempt` | 引导尝试 id（只有引导记录行有） |
| `actor` | `actor` | "View as" 身份 |
| `type` | `type` | 事件类型；引导记录行是 `onboarding.start` / `onboarding.enter` … / `onboarding.setup`（按了 Start workspace 或 Keep current demo；描述后面带 Reminders 的答案，例如 `Setup finished: Start workspace; reminders: review_then_auto`，没走过那一屏就不带）/ `onboarding.finish`；会话行是 `session.start` |
| `route` | `route` | 页面路径 |
| — | `name` | 控件名字；`ui.ask` 行是问题本身；没有这两样时用 `payload.field`（`ui.edit` 行的输入框标签，不是打的字） |
| — | `target` | 链接去处（站外是网站+路径，站内是页面）或下拉框选中项 |
| — | `external` | 站外链接为 `TRUE` |
| `applied` | `applied` | `TRUE` / `FALSE`；引导记录行为空 |
| `desc` | `description` | 一句英文短描述，例如 `Opened outside link "R06 source ↗" → eoss.asu.edu/…` |
| — | `payload_json` / `before_json` | 这一条的完整 `payload` 和 `before`（JSON 文本），需要细节时再看 |

排序规则：按时间；同一毫秒里交互日志在前（点击先被记下，它引起的引导步骤后记），交互日志之间保持编号顺序。

CSV 里以 `=`、`+`、`-`、`@` 开头的文字会在前面加一个 `'`，防止 Excel 把参与者打的字当公式执行。

## 8. 怎么从文件里算研究要的数

评分表每个任务要：是否完成、用时、错误、是否打开了引用来源。

### 8.1 任务用时

- **方法 A（推荐）**：研究者在 Zoom 上按"任务开始/结束"时记下时钟时间（记到秒，亚利桑那时间）。直接在 CSV 的 `time_az` 列里找这一段（不用再换算 UTC）；用时 = 结束 − 开始。这段里的行就是这个任务的全部操作。
- **方法 B（没有手记时间时）**：取这个任务"第一条相关事件"到"最后一条相关事件"的时间差。例如：
  - 建社团：`session.start`（或 `route` 为 `/welcome/founder/name` 的 `ui.navigate`、`onboarding.start`）→ `onboarding.setup`（即 `session.setupCompletedAt`；选了 Start workspace 时紧挨着还有 `completeSetup`）。**不要用 `onboarding.finish`**：它是整个尝试（包括社员预览）结束的时间。
  - 规则问题：该问题的 `ui.ask` → 参与者给出答案前的最后一个操作（通常是打开来源或下一条 `ui.ask`）。
  - 计划一个活动：第一条提到活动的 `ui.ask` → `reviewChange`（`decision` 为批准）。
  - 准备提醒：`ui.reminder`（open）→ 点 `Open … draft`（`external` 为 TRUE、`area` 为 `reminder`）或 `confirmNudgeSent`。
- **方法 C（2026-11-07 起）**：参与者自己在 Demo 菜单按的任务开始/完成标记（`ui.task`），`done` 行直接带用时；离开页面的时间可以减掉。见第 11.3 节。
- `gap_s` 很大的行可以看出卡住、思考的地方；中间有 `ui.visibility` 的，是离开了页面。

### 8.2 错误

可以数的"出错信号"（按需要选用，写进方法里）：

1. 数据动作 `applied` 为 `FALSE`：原型拒绝了（没权限、无效）。
2. `reviewChange` 里 `decision` 为拒绝、`undoAuto`（撤销 AI 改动）、对同一对象很快又改回去的 `updateNode` / `updateEvent`（对比 `before_json` 和前一次的值）。
3. 引导里 `onboarding.back`（返回上一屏）、`onboarding.exit`（中途退出）、同一屏多次 `enter`。
4. `ui.answer` 为 `error` 或 `timeout`（系统的错，不是参与者的错，分开数）。
5. 走错页：`ui.navigate` / 带 `to` 的点击去了与任务无关的页面又回来。
6. `repeat` ≥ 2 的点击（连点，可能是没反应或着急）；`ui.click` 的 `applied` 为 `FALSE`（点了不可用的控件）。

### 8.3 是否打开了引用来源（source checking）

1. 找到这个任务里的 `ui.answer`，看 `citations`（例如 `R06`）。
2. 之后找 `ui.click` 且 `external` 为 `TRUE`、`area` 为 `answer` 的行（规则回答里的"R06 source ↗"按钮；`name` 里有规则编号，`target` 是来源网页地址）。
3. 有 → 打开过；没有 → 没打开。Rules 页上的来源链接也会记（`route` 为 `/rules`，`area` 为 `main`），可以另算"在 Rules 页查来源"。
4. 只能知道"点开了"，不知道在外面那个网页上看了多久、看了什么。

### 8.4 AI 使用

- `ui.ask` 的条数（`via` 区分自己打字 / 点建议）。
- `ui.answer` 的 `fallback`：TRUE 表示这次没用到 AI；`source` 标签说明具体是谁答的。
- `aiAutoApply`（AI 直接做的小改动）、`draftChanges`（AI 起草、待批准），以及之后的 `reviewChange` / `undoAuto`，可以看参与者对 AI 建议是接受还是拒绝。

## 9. 做不到的事（写方法和局限时要说明）

1. **只记这一个浏览器。** 换浏览器、换电脑、用隐私窗口后关掉，记录都不在了；清除网站数据也会清掉。
2. **浏览器里最多保留 2000 条**（这一次 sitting 的所有会话合起来），超了丢最早的（看 `droppedEarlier`）。
   - **开始新会话时，超过 6 小时的旧日志和旧引导尝试会被删掉**（只留条数）。最近 6 小时的不删，所以测试中途误开研究链接不会丢数据，只是文件里多一个会话。但如果同一台电脑上两次测试相隔不到 6 小时又没清浏览器数据，前一位参与者的记录会留在后一位的文件里（每条有 `session`，分得开）：请照 runbook 每位参与者用新的无痕窗口。
3. **不记按键、不记输入框里打的字**（文本、数字、日期、密码、文件框都不读，也不记长度）。2026-11-07 起只记"在哪个框开始打字、打了多久"（`ui.edit`，第 11.5 节），密码框连这个也不记。表单真正保存时，保存结果会作为数据动作记下（例如 `completeSetup` 里有社团名），这是原来就有的。
4. **不记 AI 回答的文字**，只记回答种类、引用编号和标签；参与者问的问题文字会记（截断到 200 字符）。
5. **不记滚动、鼠标移动、停留在页面某处看了多久**；看了多久只能从相邻两行的时间差推测。例外（2026-11-07）：悬停卡开着 ≥ 0.5 秒会记一条（`ui.hover`，只有时长和触发它的控件名）。
6. **不记站外发生的事**：只知道点开了某个来源或 Gmail/WhatsApp 草稿，不知道在那边做了什么、有没有真的发出。
7. 键盘在任务卡片上按 Enter 打开详情时，没有"点击"那一条，但有 `ui.details`（open）。Esc 关菜单等按键不记。
8. 时间来自参与者电脑的时钟；电脑时间不准，`at` 就不准（相对顺序仍以 `seq` 为准）。
9. 由程序（不是人）触发的点击不记，例如导出时浏览器内部的下载链接。
10. **iOS Safari 未验证。** 下载已在桌面 Chromium 和手机尺寸（Pixel 7 模拟）上用自动测试验证过。iOS Safari 对"下载文件"的处理不同（可能直接在新页面显示 JSON，需要再用"分享 → 存储到文件"），正式测试前请用一台 iPhone 实测一次；建议参与者用电脑。

## 10. 和 IRB 批准文字的对照（请 Juanxi 确认）

IRB 文字说日志记"参与者在网站上的每个操作"，每条有编号、真实时间、扮演的虚构人物、操作类型、截断的参数、改动前的值、是否被接受；只存在参与者自己的浏览器里，上限 2000 条，不自动传输，参与者用 Export my data 导出一个 JSON 文件发给研究者。

- **一致的地方：** 界面操作和数据动作用的是同一种条目、同一个编号；存储位置、上限、导出方式、不自动上传都没变。"每个操作"现在比以前更接近字面意思（以前只记改数据的动作）。
- **需要留意、可能要告诉 IRB 的地方（标出来供决定，代码已经按最保守的方式做）：**
  1. 现在会记"看了什么页面、按了什么、选了哪个选项、点开了哪个外部来源网址（只记网站和路径）"。这是行为记录，没有新的个人信息；但比原来"只记改数据的动作"细。
  2. 控件名字（`name`）可能含有屏幕上显示的文字：虚构数据，或参与者之前自己输入的内容（例如他起的任务名），截断到 80 字符。IRB 文字已允许"参与者打的字可能以截断形式出现"。
  3. Ask 的问题原文会进日志（截断到 200 字符）。IRB 文字已举了这个例子。
  4. 导出文件多了 `build`（网站版本号）、`demoToday`、`onboardingFlowVersion`、`timeline`。这些是关于网站版本或由已有记录整理出来的，不是关于参与者的新信息。
     - formatVersion 3 多了 `sessions` / `session`：随机会话编号、开始时间、建社团结束的时间和选择、First event 计划还是跳过、更早记录的**条数**。会话编号不关联任何人；"Start workspace / Keep current demo 的时间"和"First event 跳过还是计划"都是已有的行为记录（按钮点击、屏幕步骤）整理出来的，不是新的个人信息。超过 6 小时的旧记录在会话开始时被删除，比以前保存得更少。
  5. 没有记录：设备型号、浏览器型号、屏幕大小、IP、地理位置、按键、AI 回答文字。
- AGENTS.md 第 6d 节要求"新增记录项前先问 Juanxi（研究设计，要对照 IRB）"。这一版新增了界面操作记录，**合并前需要 Juanxi 确认**，并决定是否需要告知 IRB（例如通过 Marcie）。
- **2026-11-07 追加的四项（第 11 节）：Juanxi 于 2026-11-07 批准，作为"只记行为"的记录项**：任务开始/结束标记（`ui.task`）、离开页面的时间（`ui.visibility`）、开始编辑某个输入框及编辑时长（`ui.edit`）、悬停卡打开时长（`ui.hover`）。和 IRB 文字对照：
  1. 仍是同一个日志、同一种条目、同一个编号；仍只存在参与者自己的浏览器里、上限 2000 条、不自动上传、由参与者自己导出。
  2. 都不含新的个人信息：没有打的字（连长度都没有）、没有按键、没有 AI 回答、没有设备/浏览器/IP；密码框完全不记。
  3. 新增的是**时间信息**：参与者离开了页面多久（`awayMs`）、在一个框里打了多久、一张悬停卡开了多久。"离开页面"只知道离开了、离开多久，以及是换了标签页/应用（`tab`）还是窗口失焦（`window`），**不知道去了哪里、做了什么**。
  4. `ui.edit` 的 `field` 和 `ui.hover` 的 `name` / `near` 来自界面上的标签文字（和 `ui.click` 的 `name` 一样，可能含屏幕上显示的虚构数据，或参与者之前自己输入、后来显示在标签上的文字，截断到 80 / 60 字符）。
  5. 是否需要告知 IRB（例如作为"日志更细"的小修改），由 Juanxi 决定；代码已按最保守的方式做（例如悬停不到 0.5 秒、离开不到 1 秒都不记）。

## 11. 2026-11-07 新增：任务标记、离开页面、开始编辑、悬停卡（只记行为）

Juanxi 2026-11-07 批准的四项。都写进同一个交互日志，条目结构不变（`seq`、`at`、`actor`、`type`、`payload`、`applied`，没有 `before`），`type` 以 `ui.` 开头，`applied` 都是 `true`。代码：`src/lib/uiLog.ts`（四个记录器）、`src/components/UiLogger.tsx`（装上离开页面和编辑的监听）、`src/components/chrome/DemoMenu.tsx`（任务按钮）、`src/components/ui/index.tsx` 的 `Hover`（悬停卡）、`src/lib/timeline.ts`（时间线里的英文短描述）。

### 11.1 一览

| `type` | 什么时候记 | `payload` |
| --- | --- | --- |
| `ui.task` | 在 Demo 菜单按 Start task N / Done | `task`（1–6）、`event`（`start` / `done`）、`route`（按的时候在哪一页）；`done` 还有 `ms`（这个任务从开始到结束的毫秒数），自动结束的还有 `implicit: true` |
| `ui.visibility` | 离开页面满 1 秒时一条 `hidden`；回来时一条 `visible` | `state`、`via`（见 11.4）、`route`；`visible` 还有 `awayMs`（离开了多少毫秒）；离开时正在用选择器的有 `picker: true` |
| `ui.edit` | 聚焦一个输入框后**第一次改动**它：`event: "start"`；离开这个框：`event: "end"` | `route`、`field`（框的标签）、`kind`（`text` / `textarea` / `number` / `date` / `search`）、`area`；`end` 还有 `ms` |
| `ui.hover` | 悬停卡（`Hover` / `Info`）关上时，如果它开了 ≥ 500 毫秒 | `route`、`name`（触发它的控件名，≤ 80 字符）、`ms`、`via`（`mouse` / `focus` / `tap`）；名字太笼统（"More information"）时加 `near`（它所在的小标题）；`area` |

时间线里的样子（`description` 列）：

```
Started study task 1 on /
Started typing in search field "Search sources" on /rules
Stopped typing in "Search sources" after 6.2 s on /rules
Hover card "More information" (under "Needs a nudge") open 1.0 s on /
Left the page: another tab or app on /rules
Came back after 41.0 s away (another tab or app) on /rules
Ended study task 1 after 4 min 12 s (next task started)
Started study task 2 on /
Finished study task 2 after 3 min 5 s
```

### 11.2 任务标记（`ui.task`）在哪、怎么用

- **位置：** 顶栏的 Demo 小药丸（`Demo · 日期`）→ 菜单第一行 **Study task**：按钮 `1` … `6`（读屏名 "Start task 1" …）和 `Done`（读屏名 "Task done"）。别处界面里没有。
- **手机：** 同一个 Demo 药丸，点开后菜单占满宽度，按钮一样。**键盘：** Tab 到 Demo 药丸 → Enter 打开 → Tab 到按钮 → Enter。
- 按完菜单自动关上（方便读任务卡），焦点回到 Demo 药丸。药丸上显示 `· Task 3`，正在进行的那个按钮显示为按下状态；没有任务进行时 Done 是灰的。
- 参与者开始读一张任务卡时按 Start task N，做完按 Done。**忘了按 Done 就按下一个 Start**：会先自动记一条上一个任务的 `done`，带 `implicit: true`，再记新任务的 `start`。
- 再按正在进行的那个任务的按钮：什么都不记。
- "正在进行哪个任务"是从日志里读出来的，所以刷新页面后还在；Reset demo 不影响它。
- 这几个按钮**不再另记 `ui.click`**（它们自己的 `ui.task` 就是记录）；打开 Demo 菜单那一下照常记 `ui.click`。
- **引导里没有 Demo 菜单**（`/welcome/…` 的专注外壳不显示顶栏），所以 setup 任务 (f) 不能按按钮，也不需要：它的开始/结束用引导记录（第 8.1 节方法 B：`/welcome/founder/name` 的 `ui.navigate` 或 `onboarding.start` → `completeSetup` 或 `onboarding.finish`）。
- **编号对应（Juanxi 2026-11-08 定，写进评分表，测试中不改）：**1 = (f) setup（不按）、2–6 = 卡片 (a)–(e)；如果最后"用 Ask 新建活动"要单独计时，可以让 (e) 结束后按 Done，再用 Ask 那一段的 `ui.ask` → `reviewChange` 算。

### 11.3 用任务标记算任务用时

1. 在 CSV 里筛 `type` = `ui.task`。每个任务一对：`start` 行 → `done` 行。
2. **用时 = `done` 行的 `ms`**（等于两行 `time_ms` 之差）。
3. `implicit` 为 TRUE 的 `done`：参与者忘了按 Done，这个结束时间其实是他开始下一个任务的时间，偏长。可以改用这段里最后一条和任务有关的操作作为结束（方法 B），或用研究者的手记时间（方法 A）。在方法里写明用的是哪种。
4. **任务里在原型外的时间**：把这段（`start` 到 `done` 之间）所有 `ui.visibility` `visible` 行的 `awayMs` 加起来。"在原型里的用时" = 用时 − 离开时间。
5. 这段里的其他行（点击、提问、编辑、悬停）就是这个任务的全部操作，和第 8 节的错误、来源检查一起算。
6. 按按钮的人是参与者，会忘、会按错。和 Zoom 录像或手记时间核对一次。

### 11.4 离开页面（`ui.visibility`）

- **`via: "tab"`**：页面被隐藏——换了标签页、最小化窗口、手机切到别的应用、锁屏。原型里点开的外部来源（ASU 页面、Gmail 草稿）在新标签页打开，所以是这一种。
- **`via: "window"`**：页面还在屏幕上，但整个浏览器窗口失去了焦点——点到了 Zoom、另一个窗口里的 ASU 网页或 PDF、文件选择框。**决定记这一种**（Juanxi 要求"有价值且不吵才记"）：Zoom 只共享一个浏览器窗口时，参与者去看别的窗口不会让页面"隐藏"，只有窗口失焦能看出来。控制噪音的办法：同样的 1 秒门槛；只看整个窗口失焦，页面里在输入框之间换焦点不算；失焦时正在用下拉框、日期或文件选择器的，标 `picker: true`（那是在选东西，不是离开）。
- **`via: "close"`**：页面被关掉、刷新或离开（`pagehide`），立刻写，并立刻存进浏览器（不等 1 秒，页面马上就没了）。刷新后会接着一条新的 `ui.navigate`（`from` 为空）。
- **去噪：** 离开不到 1 秒（快速 Alt-Tab、窗口闪一下）两行都不记。`hidden` 行是在离开满 1 秒时写的，所以它的时间比真正离开**晚约 1 秒**；准确的离开时长看 `visible` 行的 `awayMs`。
- 先窗口失焦、后来又换了标签页：算一次离开，`hidden` / `visible` 的 `via` 取"更离开"的那种（`tab`）。
- 手机浏览器会冻结后台页面，这时 `hidden` 行可能没有写上；`visible` 行仍然有完整的 `awayMs`。只关掉没回来的（`close`）没有 `visible` 行。
- **和官方 ASU 页面对照：** 找 `external` 为 TRUE 的 `ui.click`（打开来源），紧接着的 `hidden` → `visible` 那一对的 `awayMs`，就是他在外面（多半在看那个来源）的时间。这是上限：只知道离开了多久，不知道在外面看了什么、有没有干别的。参与者自己在另一个窗口打开 ASU 网站的，表现为 `window` 或 `tab` 离开，前面没有外部链接点击。

### 11.5 开始编辑字段（`ui.edit`）

- 聚焦一个文本、多行文本、数字、日期或搜索框之后，**第一次真的改动内容**时记 `start`；只点进去不打字不记。同一次聚焦只记一次 `start`，打多少字都一样。
- 离开这个框（Tab、点别处、换页、关页，**也包括切到别的窗口**——浏览器会让框失去焦点）记 `end`，`ms` = 从第一次改动到离开。再回来接着打字是新的一对。
- **不记：** 框里的内容、长度、按键、粘贴了什么。**密码框完全不记**（`type="password"`，或 `autocomplete` 里有 password）。复选框、单选、下拉框不算编辑（它们的选择照旧记成 `ui.change`）。
- `kind`：`text`（也包括 email、网址、电话框）、`textarea`、`number`、`date`（也包括时间框；用日期选择器选一个日期也算改动）、`search`。
- `field` 只从框的标签来（`aria-label`、`<label>`、提示文字 placeholder），**从不读框里的文字**。标签是界面文字；少数标签里可能有参与者之前起的名字（同 `ui.click` 的 `name`）。
- **编辑用时：** 一个任务里所有 `end` 行的 `ms` 相加。注意 `ms` 包括框还聚焦着时的停顿和思考，不是"手在打字"的时间。
- Ask 输入框也算：发出问题后框还聚焦着，接着问下一题不会再记 `start`，离开时的 `end` 包括这几题。
- CSV：`name` 列现在只取 `name` 或 `question`，所以 `ui.edit` 行的 `name` 列是空的，字段名在 `description` 和 `payload_json` 的 `field` 里（如果要放进 `name` 列，改 `scripts/export-to-csv.mjs` 一行）。

### 11.6 悬停卡（`ui.hover`）

- 规则界面的"停"那一级（AGENTS.md 第 7 节）：彩色点、ⓘ 图标、进度链上的点等，鼠标停上去（或键盘焦点进去）就出现的小卡片；手机上是点一下从底部出来、点别处关上。
- **关上时写一条**，`ms` 是开着的时间（选了"关时写"而不是"0.5 秒时先写、关时再改"：日志条目写下以后不改，和其他条目一致）。开着不到 500 毫秒（鼠标路过）不记。卡片开着时页面换了：照样写一条，`route` 是它打开时的页面。
- `via`：`mouse`（电脑上鼠标停着）、`focus`（键盘 Tab 到它，或点了它里面的按钮后焦点留在那里——这时卡片会一直显示到焦点离开，`ms` 会偏长）、`tap`（手机）。
- `name` 是触发它的控件名（按钮文字或读屏名），**不是卡片里的文字**。很多 ⓘ 的名字都叫 "More information"，所以加 `near` = 它所在的小标题（例如 "Needs a nudge"）。
- **用法：** 每个任务里 `ui.hover` 的条数和 `ms` 总和 = 参与者看了多少"为什么"的解释；看具体是哪张（例如 Today 风险点的原因、Events 的经费阶段、规则来源）。只知道卡片开了多久，不知道他有没有在读。

### 11.7 条数

见第 5.5 节：一般节奏约 650 条、非常忙约 1560 条（上限 2000）。e2e `e2e/research-events.spec.ts` 那段（开始任务 1、在 Rules 搜索框打字、读一张悬停卡、离开 2 秒、开始任务 2、键盘按 Done、导出）是 19–20 条，其中这四项共 9 条。

## 12. 2026-11-08 新增：Reminders 屏（P3-H，观察社长怎么选）

社长流程在 First event 之后、Confirm 之前多了一屏 "How should reminders go out?"（`founder.reminders`，路径 `/welcome/founder/reminders`，可跳过）。三个选项，**顺序固定**（每个参与者看到的都一样，所以文件里不另记顺序）：

| 顺序 | 屏幕上的标题 | 下面一行说明 | 存的值 |
| --- | --- | --- | --- |
| 1 | Send automatically | Platypus emails the officer on that date. | `auto_email` |
| 2 | I review, then I send | Platypus drafts it. You check and send it. | `review_then_self` |
| 3 | I review, Platypus sends | You check the draft. Platypus sends it. | `review_then_auto` |

- 屏幕上方一句 "Platypus knows each task's latest start date."，下方一句 "Demo: no email is ever sent."（IRB：测试中不会发出任何提醒）。**一开始一个都没选**，选了才能按 Continue；不想选就按 Skip for now。
- **不会改变网站的任何行为。** 不管选哪个，网站都不发邮件，提醒仍然是"打开一个草稿、由人自己发"。选了以后，提醒编辑器（Private reminder）里多一行只读的小字，例如 "Your club chose: I review, Platypus sends (demo: nothing is sent)."，跳过就没有这一行。
- **存在哪：** 按 Start workspace 时存进 `state.org.settings.reminderMode`；跳过（或用旧的 classic 设立页）时这个字段**不存在**。按 Keep current demo 不改社团数据，所以答案只在记录里。
- **没有新增记录项**，下面这些原来就会记：
  1. **选了哪个（按标签）、每一次改主意：** 每点一个选项记一条 `ui.change`：`role: "radio"`、`name` = 选项标题（例如 `I review, Platypus sends`）、`checked: true`、`group: "How should reminders go out?"`、`testid` = `reminder-mode-<值>`、`route: "/welcome/founder/reminders"`。改主意就是同一屏上连续几条 `ui.change`；时间线描述例如 `Ticked radio "Send automatically" in "How should reminders go out?" on /welcome/founder/reminders`。
  2. **在这一屏停了多久：** `onboarding.attempts[].steps` 里 `founder.reminders` 的 `enter` 到 `leave`（或 `back`）的时间差；中途回来再进是新的一对。
  3. **跳过：** 同一屏的 `skip` 紧接着 `leave`。
  4. 按 Continue 那一下是 `ui.click`（`name: "Continue"`，`to: "/welcome/founder/confirm"`）。
- **`reminderModeChoice` 怎么算（会话摘要，第 3.1 节）：** 只看 Start workspace / Keep current demo 之前的步骤。找这一屏最后一次 `leave`：前一步是 `skip` → `skipped`；否则取**离开之前、这个会话里、这一屏上最后一条勾上的 `ui.change`**，按 `testid` 换成值。日志里找不到（例如被 2000 条上限丢了）时，最新的会话再看 `state.org.settings.reminderMode`（只在按了 Start workspace 时）；都没有就是 `null`。刷新这一屏会保留草稿里的选择，刷新前那条 `ui.change` 仍在日志里，所以不影响。
- 代码：屏幕 `src/onboarding/founder/ReminderMode.tsx`，文案 `src/onboarding/copy.ts`（`founder.reminders`），值和顺序 `src/data/reminderMode.ts`，推算 `src/lib/onboardingRecord.ts` 的 `reminderModeChoice`，时间线 `src/lib/timeline.ts`，测试 `src/test/onboardingReminderMode.test.ts`、`e2e/p3h-reminder-mode.spec.ts`。
