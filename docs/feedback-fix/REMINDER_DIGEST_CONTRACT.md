# 提醒中心方案 F + 按人合并邮件：冻结契约与分工（2026-11-19，Claude 主 Agent）

**Juanxi 的决定（2026-11-19）：** 采用方案 F（`docs/prototypes/reminder-centre-concepts/F-review-and-send.png`）：按人竖向排列，社长能看到这个人现在有哪些任务；右栏显示真正要发的那封邮件，Send & next 一封封过，也能一键全发。同一个人当天的提醒合成**一封**邮件（方案里的 "5 tasks → 3 emails"）。同时修复审阅里发现的 bug。用多个 Agent 分工。

背景与问题清单见 `docs/feedback-fix/REMINDER_CENTRE_REVIEW_2026-11-19.md`。

## 1. 要修的 bug（验收必须覆盖）

- **B1 一键全发少发：** 种子数据（Sat Oct 31，模式 `review_then_auto`）点 "Approve all (5)" 只记录 4 条，Jordan 第 3 条被 `limitReason()` 的每人每天上限挡住；`planReminders()` 只拿已发记录算上限，不拿同一批候选算。**改后：** 上限按"封邮件"算，同一人同一天的候选是一封；界面显示几封，就能记录几封，记录数与显示一致，不出现 "Some reminders changed or reached a limit"。
- **B2 数字对不上：** "Needs your OK 13" 混了 8 条发不了的问题。**改后：** 可发的（按人分组）和 Fix first（no_owner / unresolved_waiting / paused / unavailable_recipient / legacy_history 等）分开显示和计数。
- **B3 重复：** 同一任务同时出现在待发与 This week。**改后：** 今天已在待发里的任务不再出现在"接下来"的列表里。
- **B4 模式 2 要点几十次：** `review_then_self` 现在一条一条开草稿。**改后：** 一个人一封草稿，按顺序 "Open Gmail draft" → "I sent this email" → 下一封。

## 2. 冻结接口（不准改签名；要改先回主 Agent）

- 类型：`src/reminders/digestContracts.ts`（`ReminderDigestGroup`、`ReminderDigestPlan`、`ReminderDigestSnapshot`、`PreparedDigest`、`DigestRecordResult`）。
- 可选字段（已加，不升 `SCHEMA_VERSION`）：`ReminderDelivery.digestId?`、`ReminderRuntime.digests?`。
- 函数：`src/reminders/digest.ts`
  - `planReminderDigests(state)` —— 骨架已能按人分组（界面可直接用）；引擎 Agent 改成按封算上限。
  - `prepareReminderDigest(store, groupId, origin, via)` —— 发放并**保存**该组每个任务的链接（像 `ReminderComposer` 打开时那样），生成每个任务的单封快照和合并邮件；模式 2 打开草稿前就要调用，保证邮件里的链接可用。
  - `recordReminderDigests(store, prepared[], via)` —— 一个 store action 记录；每组要么全记、要么全不记。
  - `sendReminderDigests(store, groupIds, origin, via, isCurrent)` —— "Send all" 和自动模式用。
- 模式与 `via`（沿用 `confirmReminderDelivery`）：`review_then_self` → `manual`；`review_then_auto` → `platypus`（社长/副社长）；`auto_email` → `automatic`（也允许 `platypus`）。

## 3. 文件归属（一个文件只属于一个 Agent）

| Agent | 负责 | 不碰 |
| --- | --- | --- |
| **Engine** | `src/reminders/digest.ts`、`engine.ts`、`policy.ts`、`runtime.ts`、`batch.ts`、`delivery.ts`、`deliveryContracts.ts`、`useAutomaticReminders.ts`、`mail.ts`（只能新增合并邮件函数，单封邮件行为不变）、`src/data/store.tsx`（只加新 action 与日志摘要）、对应单元测试 | 页面、右栏、CSS、e2e |
| **UI** | `src/pages/Today.tsx`、`src/reminders/centre.ts`（展示层）、新 `src/reminders/DigestPanel.tsx`、新 `src/reminders/digest-centre.css`、`src/components/rail/RailContext.tsx`、`Rail.tsx`（新 kind）、`src/pages/Today.reminders.test.tsx`、提醒相关 `e2e/*.spec.ts` | 上一行 Engine 的文件（只调用接口） |

## 4. 界面要求（方案 F，UI Agent）

- 顶部一张小卡：`Review N emails · M tasks · K sent today` + 进度条；按钮按模式：`review_then_auto` = "Send all N emails"；`review_then_self` = "Open draft 1 of N"；`auto_email` = 只说明 "Platypus sends these automatically (demo: nothing is sent)"，不要审批按钮。
- 中间：**按人竖向列表**（10 人也是一列）：头像首字母 + 名字 + 状态（Up next / Reviewing / Sent ✓）；下面每个今天要提醒的任务**一行**：任务名 + 一个原因色块（N days overdue / Due today / Start passed / Follow-up / Waiting on you）；再一行安静的 "Also has N other open tasks"（点名字或这一行 → 右栏）。
- 右栏（新 rail kind，例如 `{ kind: "reminderDigest"; recipientId }`）：真正要发的合并邮件预览（收件人、主题、正文、每个任务一个 Open task 链接）；按钮按模式：`Skip` / `Send & next`，下方 "Send all N without reviewing"；模式 2 是 "Open Gmail draft" → "I sent this email"；下面列这个人**全部未完成任务**（名字 + 状态色块 + Due），点开任务详情。
- 下方 "Fix first N"：每条一行，任务名 + 问题色块（Pick who it waits on / No owner / Stuck / Check earlier reminders / No valid email）+ 一个按钮（打开任务详情；legacy 用原来的 "I checked · allow future reminders"）。
- 历史收成一行：`N sent this week · N replied · N no reply`；"History" 打开右栏列表（可沿用 Sent/Replies/No reply 的数据）。空区块不显示。
- 社员视角 `YourReminders` 保持现有含义。
- 守 AGENTS.md 第 7 节：只用 token、不写行内样式（CSS 变量和数据驱动尺寸除外）、字号 ≥14px（辅助字 12–13）、动效只用 token、一行一条；Today 字数上限 **200 / 500**（`npm run words`）。界面文字英文。

## 5. 硬边界（两个 Agent 都要守）

- 0 真实 AI 调用、0 真实邮件；邮件文字只由规则生成。日期只来自规则引擎。
- 不升 `SCHEMA_VERSION`，只加可选字段；旧 v1/v2 账本、旧 `nudges`/`protocolLog` 记录照常读。
- 不放宽现有安全检查（链接签名、单任务授权范围、模式权限、`canLead`）。
- 不改 Settings 模板、Plan、Task Details 其他行为。
- 在自己的 worktree 分支小步提交，提交信息 `[Reminder digest][Engine|UI] …`，**不要 push**，由主 Agent 合并。
- 测试：`npm test`（Vitest）；页面测试 Playwright 已预装，跑之前设自己的端口：`PW_PORT=<4300+> PW_STORAGE_PORT=<4400+> npx playwright test e2e/<spec> --trace off`，不要 `playwright install`。
