# 提醒中心方案 F + 按人合并邮件：交付与验收（2026-11-19，Claude 主 Agent + Engine / UI / Review / Tests Agent）

契约：`REMINDER_DIGEST_CONTRACT.md`；审阅：`REMINDER_CENTRE_REVIEW_2026-11-19.md`。

## 做了什么

- **按人合并（Engine）：** 同一个人当天的提醒 = 一封邮件（`src/reminders/digest.ts`、`mail.ts` 的 `buildReminderDigestMail` / `checkReminderDigestMail`）。每封最多 8 个任务（`DIGEST_TASK_CAP`），多出的排到明天的邮件。每个任务仍有自己的链接、单封快照和发送记录（`digestId` 相同），整组要么全记要么不记（store action `recordReminderDigests`）。`runtime.digests` 保存实际邮件全文。
- **上限按封计（修 B1）：** 每人每天 2 封、每周 6 封（重要邮件保留名额）按"封"算；种子数据一键全发 = 3 封 / 5 个任务全部记录（以前只记 4 条）。
- **界面（UI，方案 F）：** 顶部 `Review N emails · M tasks · K sent today` + 进度；按人竖向列表（每个任务一行 + 原因色块 + "Also has N other open tasks"）；右栏 `DigestPanel` 显示真正要发的邮件，按模式：Platypus 发 = Skip / Send & next / Send all；自己发 = Open Gmail draft → I sent this email；自动 = 只读。下面列这个人的全部未完成任务。Fix first 只放能修的问题；历史收成一行，History 打开右栏。旧 "This week" 重复列表删除（B3）。
- **独立审查后修复（128c184）：** 满 8 项后剩余任务顺延到次日不当天发第二封；被邮件上限挡住的任务不进 Fix first，改为顶部 "N tasks wait for the next email"；邮件预览在标题/日期/收件人变化时重新准备、记录失败后自动刷新；换人清除旧提示；双击不会顺带批准下一封。
- **测试迁移（Tests）：** bts、dx-03、dx-06、fb-01、reminder-stage2、research-events、task-details-universal、tasks:125、today:59/:80/:123、wp5 改到新页面，保留原意（不发 AI、不发邮件、规则文字、篡改链接被拒）。新增 `e2e/reminder-digest-centre.spec.ts`、`src/reminders/digest.test.ts`。

## 验证（2026-11-19，本地生产构建）

- 单元/组件：全量 2100 项中 2098 通过；2 项失败（`uiLog` Export 下载、`calibration` 5 秒超时）在改动前的 `4d6290e` 上同样失败。
- 浏览器：桌面全量 585 通过 / 23 跳过；手机端提醒相关 15 个 spec 82 通过 / 5 设备限定跳过。桌面剩余失败与改动前基线对比：无新增由本工作引起的失败；`ob-08`、`ob-12`、`workflow-milestones:87` 单独复跑通过（并行负载下偶发）；`rehearsal:59`、`tasks:13/:60/:163/:209`（旧 Task Details 按钮）、`dx-18`、`research-log:84`、`p3a:31` 等在基线上就失败，未改。
- tsc、lint 通过；字数全部在上限内（启用新提醒后 Today 约 179 / 271，上限 200 / 500）；页面高度 1142px（原 2856px）。
- 截图：`docs/prototypes/reminder-digest-implemented/final/`（桌面页面、Jordan 邮件、自己发模式、Send & next 之后、手机）。

## 边界与已知问题

- 0 次产品 AI、0 封真实邮件；`SCHEMA_VERSION` 未升（只加可选字段）；链接签名、授权范围、模式和 `canLead` 检查没有放宽。
- 仍是浏览器内演示：自动模式只在页面打开时记录；真正发信、服务器定时任务和数据库见审阅报告第 2 节。
- 单任务提醒（Ask 里的 Remind）仍按一封单独邮件计数，但顶部 "sent today" 只统计合并邮件。
- 活动任务的邮件链接打开 Plan 任务面板，那里不显示任务的完成标准（旧单任务页显示）；从链接标 Done 需要填写内容或附件。
- `dx-06`：顶部计数和逾期色块未使用等宽数字（小的设计差距，未改 CSS）。
- 上面列出的基线就失败的页面测试需要各自负责的会话处理。
