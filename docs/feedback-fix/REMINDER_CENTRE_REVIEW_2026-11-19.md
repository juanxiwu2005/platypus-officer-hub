# Reminder 模块审阅与界面方案（2026-11-19，Claude）

基于 PR #14 顶端 `4d6290e`（= `claude/fervent-thompson-e2j5u2` = preview14）。只做审阅和静态效果图，**没有改任何 `src/` 代码**，0 次产品 AI、0 封邮件。

图片：[`docs/prototypes/reminder-centre-concepts/`](../prototypes/reminder-centre-concepts/manifest.json)（现状 1 张 + 方案 A–F + 三种模式附图 G）。图是用网站真实的 CSS（同一套 token、导航、右栏）写的静态页面再截图，不是图像生成；Sent/Replied 的数字是示意。

---

## 1. 现在的界面为什么看不懂

在本地生产构建里打开 Reminders（种子社团、Sat Oct 31、模式 `review_then_auto`）实测：

| 问题 | 证据 |
| --- | --- |
| 太长 | 整页 2856px，1440×900 屏幕上约 3 屏；5 个区块（Needs your OK / This week / Sent / Replies / No reply yet）全部展开，空区块也占位 |
| 标题数字和按钮对不上 | "Needs your OK **13**"，但按钮是 "Approve all (**5**)"：13 里有 8 条根本不是提醒，是要先修的问题（4 条 Waiting 没选人、2 条没负责人、2 条 Stuck） |
| 每行字太多 | 每条 3–4 行：活动名 / 任务名 / To · Task due / 原因句子；原因句子多半重复（"The planned start has passed. Can we help?"）|
| 重复 | 同一个任务同时出现在 Needs your OK 和 This week（如 Draft the meeting agenda、Book the spring weekly meeting room）|
| 一键全发只在模式 3 有 | 模式 1 只显示 "Awaiting automatic preparation"；模式 2 每条都要点 "Review & open draft"，再点 "I sent this reminder"，13 条要点 26 次以上 |
| **一键全发其实发不全（bug）** | 点 "Approve all (5)" 实际只记录 **4** 条，提示 "Some reminders changed or reached a limit"。原因：Jordan 当天有 3 条，`limitReason()` 每人每天最多 2 条、且第 2 个非紧急名额保留给 due/overdue；`planReminders()` 只拿**已发**记录算上限，不拿同一批里其他候选算，所以先显示"可以发"，发的时候才被挡 |

## 2. 底层代码与"以后接数据库"的准备程度

### 做得好的（可以直接搬）

1. **规则引擎是纯函数。** `planReminders(input)` 只吃 `ReminderInput`（today、mode、people、tasks、runtime），不读时钟、不调 AI、不碰 DOM，服务器上也能原样跑。
2. **账本是追加式的。** `ReminderRuntime` 里的 `updates` / `deliveries` / `waitingRequests` 都有 `id` + 单调 `sequence`，历史快照（收件人名字、任务名、邮件全文）不随后来的改动变 —— 正好对应三张表。
3. **三种模式的权限在引擎里重查。** `confirmReminderDelivery()` 按 mode 只放行 `automatic/platypus/manual` 中对应的那种；`recordReminderBatch()` 每条都重新验证。
4. **候选 id 是确定性的**（`["reminder", planKey, reason]`），天然可以当发送的幂等键（同一条不会发两次）。
5. 旧数据（`nudges`、`protocolLog`）没有被猜测改写，`legacyUnresolvedNodeIds` 明确标出要人工确认的。

### 接数据库前必须改的（按优先级）

| # | 问题 | 位置 | 以后怎么改 |
| --- | --- | --- | --- |
| 1 | **发送和"自动"都在浏览器里。** 自动模式只在页面开着时跑（`useAutomaticReminders`），关掉网页就没人发 | `useAutomaticReminders.ts`、`delivery.ts` | 服务器定时任务（Netlify Scheduled Function）每天跑一次 `planReminders`，写进 outbox 表，再由发送器发；浏览器只读结果 |
| 2 | **任务链接用浏览器里的 `demoLinkKey` 签名** | `taskAccess.ts` 的 `signature()` | 密钥只放服务器环境变量，签名/验证都在服务器 |
| 3 | **整个社团是一个 JSON 大对象**，`sequence` 是这个对象里的一个计数器；两个人同时操作会互相覆盖（代码里自己也写了 localStorage 没有原子 compare-and-swap）| `store.tsx`、`ReminderRuntime.sequence` | 用数据库自增 id / 事务；deliveries 表上对 `candidateId` 建唯一约束 |
| 4 | **没有"存储接口"这一层。** `adapter.ts`、`batch.ts`、`message.ts` 直接读写整个 `DemoState` | 同上 | 抽一个 `ReminderRepository`（读 tasks/people/runtime，写 delivery/update），浏览器版用 localStorage 实现，服务器版用数据库实现；引擎不动 |
| 5 | **"一个人一封邮件"在引擎里不存在。** 现在一条提醒 = 一个任务 = 一封信，每人每天 2 封上限导致上面的 bug | `engine.ts` `limitReason()`、`mail.ts` | 加一步"按收件人合并"：同一人同一天的候选合成一封 digest，上限按"封"算而不是按"任务"算；delivery 记录保留每个任务一行，但共享同一个 `messageId` |
| 6 | **重复计算。** 批量记录时每一条都会重新跑 2–3 次完整的 `planReminders`（排序、验证邮件、确认各一次）；`taskReminderSummary()` 为一个任务算整个提醒中心 | `batch.ts`、`adapter.ts`、`message.ts`、`centre.ts` | 一次请求只算一次 plan，往下传；服务器上更重要 |
| 7 | **两套提醒系统并存。** 旧的 `nudges` / `protocolLog` / `silenceCases`（`engine/followup.ts`、`lib/reminderQueue.ts`）和新的 `reminderRuntime` 同时存在，`Today` 页还要兼容 "Enable updated reminders" | 多处 | 迁移到数据库时只迁新账本；旧记录做一次性只读导入 |
| 8 | **日期没有时区。** `today` 是演示时钟的 `YYYY-MM-DD` | `state.today` | 服务器用社团时区（ASU = America/Phoenix）算"今天" |
| 9 | 每次读存档都把整本账（`isReminderRuntime`）逐条校验，账本无限增长 | `runtime.ts` | 数据库里用表结构约束代替；浏览器缓存只放近期 |

结论：**引擎（算"该提醒谁、什么时候"）已经适合搬到服务器；存储、发送、签名、并发这四层还是演示写法，接数据库时要重做，但不需要重写规则。** 建议先做第 5 条（按人合并），因为它同时解决界面问题和现有 bug，也是任何新界面方案的前提。

## 3. 六个界面方案（加一张模式附图）

所有方案共用三条改动：
- **把"能发的提醒"和"要先修的问题"分开。** 8 条问题不再叫 reminder，放进 "Fix first"，按问题类型给数字和一个修的按钮。
- **一个人一封邮件。** 5 个任务 → 3 封（Jordan 3 个合 1 封）。按钮写"Send all 3 emails"，不写 5。
- **空区块不显示，历史收成一行数字**（sent / replied / no reply），点 History 再看。

| 图 | 方案 | 适合谁 | 优点 | 缺点 |
| --- | --- | --- | --- | --- |
| A | 一键总览 | 只想知道"今天点哪里"的社长 | 一屏装下；最少字；按钮最明显 | 看不到具体任务，要点进去 |
| B | 按人合并 | 习惯"提醒某个人"的社长 | 和邮件一一对应，勾掉某人就不发 | 人多（10+）时卡片会换行变长 |
| C | 流水线 | 喜欢流程图的人 | 一眼看到每条提醒走到哪一步（修→发→等回复→已回复） | 横向占满，需要收起右栏 |
| D | 一周时间轴 | 想看"接下来几天"的人 | 和 Plan 的地铁图一致；点点看这个人的邮件 | 只适合 7 天；问题项不在图上 |
| E | 表格 + 批量栏 | 任务多、想筛选排序的人 | 信息密度最高，像 Gmail | 最像现在的列表，视觉吸引力最低 |
| F | 逐封审阅 | 模式 2/3、想先看邮件再发的人 | 发出去的那封信直接显示在右栏，Send & next | 一封封过比一键慢（也给了"全部直接发"）|
| G | 附图：三种模式 | — | 同一组任务：模式 1 不用按、只看例外并可暂停；模式 2 逐封引导打开 Gmail 草稿（浏览器不能一次开 3 个草稿窗口）；模式 3 一键全发 + 10 秒撤销 | — |

我的建议：**A 当默认首屏 + F 当"Preview emails"点进去的审阅页**；喜欢图形的话把 A 里的 "Next 7 days" 换成 D 的小时间轴。B 的"按人合并"是数据层的改动，任何方案都要做。

## 4. 没做什么 / 下一步

- 没改代码、没改字数预算（Today 160/450 —— 方案 A 的首屏约 90 词，在预算内）。
- 手机版没出图；选定方案后再出手机图和交互稿。
- 实施顺序建议：①引擎按人合并 + 修上限 bug（带单元测试）→ ②新界面 → ③服务器 outbox/定时任务（接数据库时）。①②不需要数据库，可以先在 preview14 做。
