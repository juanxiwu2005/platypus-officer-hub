# Phase 3 导出文件数据字典

给研究者（Juanxi）看的说明：参与者在 Settings 页按 **Export my data** 下载的那个 JSON 文件里有什么、每个字段是什么意思、怎么从里面算出任务用时、错误次数和"有没有点开引用来源"，以及它**做不到**什么。

- 适用版本：`formatVersion: 2`（2026-11-07 起）。旧的 `formatVersion: 1` 文件也能用下面的 CSV 脚本读，只是没有界面操作记录。
- 文件里只有虚构社团的数据和参与者在原型里的操作记录。**没有任何东西会自动上传**：文件只在参与者自己按按钮时下载到他自己的电脑，再由他（Zoom 上）发邮件给研究者。
- 本文件和代码对应：日志结构 `src/data/types.ts` 的 `LogEntry`；界面事件 `src/lib/uiLog.ts`；写入与去噪 `src/data/store.tsx` 的 `appendUiLog`；时间线 `src/lib/timeline.ts`；导出 `buildExport`；CSV 脚本 `scripts/export-to-csv.mjs`。
- 2026-11-07 新增四项**只记行为**的记录（任务标记、离开页面、开始编辑字段、悬停卡），见第 11 节。

---

## 1. 一句话说清楚

参与者在原型里做的事，按发生顺序记成一条一条（最多保留最新的 2000 条）。每一条都有：编号、真实时间、当时"以谁的身份查看"、做了什么、做的对象（长文字截断）、改数据时改之前的值、以及原型接受了没有。导出时再附上一份把所有记录按时间排好的"时间线"，方便直接看或转成 Excel。

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
| `formatVersion` | 文件结构版本。现在是 `2`（比 1 多了下面标 ★ 的字段，原有字段一个都没删） |
| `exportedAt` | 按下导出的真实时间（ISO 格式，UTC） |
| `schemaVersion` | 社团数据结构的版本号（开发用） |
| `storageKey` | 数据在浏览器里存的名字（开发用） |
| ★ `build` | 这是哪一版网站：`version`（应用版本号）、`commit`（代码提交号）、`branch`、`context`（Netlify 的 production / deploy-preview）。本地构建没有这些信息时写 `"unknown"`。用来确认每位参与者用的是同一版 |
| ★ `demoToday` | 原型里的"演示日期"（导出那一刻）。原型的日期是假的、可以用 Demo 菜单往前拨；它和真实时间无关 |
| ★ `onboardingFlowVersion` | 当前网站的新手引导流程版本（现在 `ob-3`）。每次引导尝试里也各自记了版本 |
| `state` | 导出那一刻整个虚构社团的数据（活动、任务、成员、设置……）。签名密钥被替换成 `"[omitted]"` |
| `onboarding` | 新手引导（`/#/welcome/…`）的单独记录，见第 6 节 |
| `interactionLog` | 交互日志本体，见第 4、5 节。外层还有：`limit`（2000）、`count`（现有条数）、`firstSeq` / `lastSeq`（第一条和最后一条的编号）、`droppedEarlier`（因为超过 2000 被丢掉的最早条数；0 表示一条没丢） |
| ★ `timeline` | 把交互日志和新手引导记录合在一起、按时间排好的清单，每行一句英文短描述，见第 7 节 |

## 4. 交互日志里每一条（`interactionLog.entries[]`）

| 字段 | 意思 |
| --- | --- |
| `seq` | 编号 1, 2, 3 …，不重复、不复用。开头不是 1，说明最早的几条因 2000 上限被丢了 |
| `at` | 真实时间，1970 年以来的毫秒数（参与者电脑的时钟） |
| `actor` | 当时原型"View as"设成了谁（虚构人物的 id，例如 `alex`） |
| `type` | 发生了什么。以 `ui.` 开头的是**界面操作**（第 5 节）；其余是**数据动作**（改了社团数据的操作，例如 `completeSetup`、`updateNode`） |
| `payload` | 这件事的细节（长文字截到 200 个字符；看起来像密钥的字段不收） |
| `before` | 只有"改已有数据"的数据动作才有：改之前那些字段的值。界面操作**没有** `before` |
| `applied` | `true` = 原型接受了；`false` = 没接受（没权限、无效、没东西可改；界面操作里见下） |

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
| `issueOfficerGrant`、`confirmNudgeSent` | 准备提醒时生成一次性任务链接、参与者点"I sent this reminder" |
| `advanceClock`、`setViewer`、`setAi`、`reset` | Demo 菜单：拨日期、切换查看身份、开关 AI、重置演示 |

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
| `answer` | 主要的回答形式：`rule-answer`（规则回答，带引用）、`plan-form`（建活动表单）、`task-form`（建任务表单）、`change-card`（待批准的改动卡）、`change-applied`（已生效的小改动）、`event-date-form`、`task-list`、`reminder-card`、`plan-check`（新活动的计划检查）、`text`（纯文字）、`error`（出错，`applied: false`）、`timeout`（AI 第二轮没按时回来） |
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
- `steps[]`：每屏的 `enter`（进入）、`leave`（离开）、`back`（返回）、`skip`（跳过）、`complete`（完成）、`exit`（Save & exit 退出），各带时间 `at`。
- 引导页面上的点击和换页，现在**也**会同时出现在交互日志里（`route` 以 `/welcome/` 开头），两边可以在时间线上对照。

## 7. 时间线（`timeline[]`，CSV 就是它）

| 字段 | CSV 列 | 意思 |
| --- | --- | --- |
| （行号） | `row` | 1, 2, 3 … |
| `time` | `time_iso` | 真实时间，ISO 格式，**UTC**（亚利桑那时间 = UTC − 7 小时，全年不变） |
| `at` | `time_ms` | 同一时间的毫秒数 |
| — | `elapsed_s` | 距第一行过了多少秒 |
| — | `gap_s` | 距上一行过了多少秒（看停顿、犹豫） |
| `source` | `source` | `log`（交互日志）或 `onboarding`（引导记录） |
| `seq` | `seq` | 交互日志编号（引导记录行为空） |
| `attempt` | `attempt` | 引导尝试 id（只有引导记录行有） |
| `actor` | `actor` | "View as" 身份 |
| `type` | `type` | 事件类型；引导记录行是 `onboarding.start` / `onboarding.enter` … / `onboarding.finish` |
| `route` | `route` | 页面路径 |
| — | `name` | 控件名字；`ui.ask` 行是问题本身 |
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

- **方法 A（推荐）**：研究者在 Zoom 上按"任务开始/结束"时记下时钟时间（记到秒，注明时区）。换成 UTC 后，在 CSV 的 `time_iso` 里找这一段；用时 = 结束 − 开始。这段里的行就是这个任务的全部操作。
- **方法 B（没有手记时间时）**：取这个任务"第一条相关事件"到"最后一条相关事件"的时间差。例如：
  - 建社团：`route` 为 `/welcome/founder/name` 的 `ui.navigate`（或 `onboarding.start`）→ `completeSetup`（或 `onboarding.finish`）。
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
2. **最多 2000 条**，超了丢最早的（看 `droppedEarlier`）。
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
- **编号对应要 Juanxi 定**（写进评分表，测试中不改）。建议：1 = (f) setup（不按）、2–6 = 卡片 (a)–(e)；如果最后"用 Ask 新建活动"要单独计时，可以让 (e) 结束后按 Done，再用 Ask 那一段的 `ui.ask` → `reviewChange` 算。

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
