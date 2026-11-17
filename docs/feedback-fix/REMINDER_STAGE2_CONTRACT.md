# 提醒阶段二：邮件与独立任务页冻结契约

2026-11-16（America/Phoenix）。Juanxi 已明确要求“继续阶段2”；阶段三 Details/提醒中心整体重排、默认启用策略和真实后台发送不在本次范围。延续 `feat/reminder-plan-v2` 和 PR #15；保留职责匹配源分支实际接入到 `26af354`，不回退任务认领与 v23 存档。

## 分工

- 主 Agent：共享类型/store/taskWorkflow、`taskAccess.ts`、消息记录适配、旧 `NudgeComposer` 的 lazy bridge、`Officer.tsx` 路由桥、手工任务说明字段、e2e/验收与交付。
- Mail Agent：`src/reminders/mail.ts`、`mail.test.ts`、`ReminderComposer.tsx`、`ReminderComposer.test.tsx`、`reminder-composer.css`。不改旧 composer、全局 styles、store 或契约。
- Page Agent：`src/reminders/SingleTaskPage.tsx`、`SingleTaskPage.test.tsx`、`single-task.css`。不改旧 Officer、TaskActions/TaskDetail、store 或共享类型。
- 独立 Review：最终候选只读审查，发现问题交原负责人修复。

## 共享正本与主 Agent API

`accessContracts.ts` 是新邮件和可重复访问授权正本；`contracts.ts` 保留阶段一事实/候选。新增可选 Node.instructions / Node.completionCriteria，facts.requirement 优先人工 instructions，facts.completionCriteria 可选；importance 继续来自已有 why 或真实依赖。主 Agent 提供编辑入口，不让模型补事实。

`src/reminders/taskAccess.ts` 导出：

- `makeTaskAccessGrant(state, nodeId, waitingRequestId?): Promise<TaskAccessGrant>`：没有 request 是原负责人，指定 request 则只给它的明确等待对象。使用本地签名；不是登录或跨设备服务。
- `taskAccessToken(grant): string`、`taskAccessUrl(origin, grant): string`，新地址 `/#/officer?access=...`，没有 Done/Working 查询参数。
- `usableTaskAccessGrant(state, token): TaskAccessGrant | undefined`、`verifyTaskAccessGrant(state, token): Promise<boolean>`：反复访问/更新不会消费链接；检查实际存储授权、签名、归属版本、当前成员及到期。完成后同一入口仍可查看，重新分配/归属变化后不能沿用旧权利。
- `taskAccessIssueValid(state, grant): boolean`：供 store issue 动作校验。
- 新增 Action `{type:'issueTaskAccessGrant', grant}`、`{type:'taskAccessAction', token, update:TaskAccessUpdate}`。
- owner scope 的四按钮映射 done/working/stuck/waiting；未认领先 claim。working 是明确的新回复动作，不用申请延期冒充。
- waiting scope 只有 acknowledge/provided，记录该请求的 respondedOn / responseBy / response（acknowledged/provided）；不改变原任务 owner 或 status，不授予源任务写权限。请求取消/换人不可再更新；完成的原任务只读。

## Mail Agent API 与组件

`buildReminderMail(input: ReminderMailInput): ReminderMail`、`checkReminderMail(mail: ReminderMail): boolean`。默认全部规则，不能 import/call AI 或网络。主题“活动 · 任务”（独立任务可 Club work），邮件重点一个 Task due；eventDate 只在具体要求中作背景，不单列 Start by，不印最晚开始日期。触发原因按真实 today 和已有 startOn/due/candidate（未来/开始当日/到期/实际逾期）区分。

自然问候、具体要求、重要性、协作与感谢，正文约100英文词以内，保留最重要可执行信息，完整材料在任务页。不要回到五个机械标签、步骤1打开平台/步骤2找任务；邮件 body 只有一个核心 taskUrl，移除来源文本里的其他网址。人数来自 facts，不能补造40人。沿用禁用催促/羞辱措辞。waiting 邮件说明“谁的任务正在等你协助”，不把原任务的执行责任交给收件人；waitingOn 如果只是人名，不能当成具体行动要求。

`ReminderComposer` 默认导出，props `{nodeId:string;onClose:()=>void}`，用现有 useStore。普通 owner 使用当前事实；启用新runtime时用 `planReminders(buildReminderInput(...))` 选择该node的当前ready（包括 waiting），受阻必须解释，不伪造发送。未启用的旧路径仍使用 nudgeBlocked，不改变既有调度；普通邮件采用新格式，waiting 对象投递只在新runtime中启用。

获得 grant 后 dispatch issue；没有有效已存储授权不启用发送。mail=buildReminderMail，window.location.origin 生成唯一链接。没有AI等待/Skip AI按钮。保留 close/Escape/focus、渠道偏好、演示无真实投递说明。平台发送模式用email；人工方式可以开 Email/WhatsApp/SMS 草稿并在明确确认后记录。

保存 snapshot `{...mail,channel,preparedOn:state.today,accessId:grant.id}`；旧动作 `confirmNudgeSent` 增可选 `message`；新版动作 `confirmPlannedReminder` 增可选 `message`。有runtime时必须用当前candidateId确认；无runtime时用旧动作。主 Agent重新核对当前事实/授权/收件人与模式并保存快照。`ReminderDelivery.message?` 和 `Nudge.message?` 供历史使用，旧记录不回填。提交后的成功信息应根据实际存储记录出现，不只靠本地 setConfirmed(true)。

## SingleTaskPage

默认导出，props `{token:string}`。从 usable/verify API读授权，不从URL传来的 ownerId 推断权限。owner view：活动/任务、突出截止日、具体要求和完成标准、重要性、一个真实办理入口（带适用说明）、四个状态；最晚开始日期不抢占头部。无需完整导航、其他任务或Ask。学校截止日风险仍须保留；财务控制节点不能绕开 Event Budget 直接 Done。

waiting view：原负责人请求帮助的任务上下文、具体等待说明、只显示 Acknowledge / Update provided；不是原任务四种状态。显示更新成功后的当前状态；刷新/再次打开仍可继续；完成后可查看。未知/失效/改派/离任 token 有明确提示，不能误导成已更新。

保留旧 `?token=` 一次性链接及旧状态查询参数的兼容入口；新 `?access=` 使用此页面。新页与新composer按需加载，遵守既有入口体积门槛。不新增真实身份、实际邮件服务或猜测外部等待对象的邮箱。
