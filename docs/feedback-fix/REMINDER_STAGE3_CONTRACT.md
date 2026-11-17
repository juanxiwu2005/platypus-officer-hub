# 提醒阶段三：Details、提醒中心与统一演示发送契约

2026-11-16（America/Phoenix）。Juanxi 明确要求“继续阶段3”。基线 `feat/reminder-plan-v2@17b3e3c`，已包含匹配源分支 `5e301d9`；沿用 PR #15，不合并 main、不正式发布、不调用真实AI或投递外部邮件。

## 唯一文件负责人

- 主 Agent：共享类型/store、runtime/engine/adapter、taskAccess/message、`delivery.ts`、自动准备钩子、Settings、兼容入口、集成/e2e与文档。
- Details Agent：`src/components/TaskDetail.tsx`、`TaskActions.tsx`、独立 `src/reminders/task-detail.css`、Details/Actions目标测试。不改共享store或原全局CSS。
- Centre Agent：`src/pages/Today.tsx`、`src/reminders/centre.ts`（共享展示结果及其测试）、独立 `centre.css`、Today目标测试。不改旧lib/reminderQueue、store、Settings或service。
- 独立 Review：最终只读检查，反例交原负责人修复。最多两个开发Agent并行；开发各自在独立worktree，从本冻结提交开始。

## 版本与启用

新提醒运行时 version 2 要求新发送有完整已校验的规则邮件和唯一任务入口。支持读取v1历史；v1/无runtime的旧存档须显式升级/启用，未知或损坏值原样保留并停用。新建组织默认启用v2；重新加载不重置或补造历史。升级保留发送方式、maxNudges及旧silence设置；界面说明新成员提醒按开始/到期/逾期3天和7天6封运行，旧成员3/5天参数保留而不再重复执行，领导升级仍用原配置。

旧历史不能证明收件人的节点保持待核对；负责人明确确认后允许未来提醒，历史不改写、旧记录不猜收件人。该确认须有保存回执。v1/v2均不再由业务reducer直接生成缺少正文的自动发送；v2由异步准备服务生成签名入口和邮件，经同一reducer再核验并持久保存。未保存不能称已发送。后台定时和跨设备仍属第六项。

## Centre Agent 提供的共享展示结果

`src/reminders/centre.ts` 导出 `reminderCentre(state)`、`taskReminderSummary(state,nodeId)`。

`reminderCentre`：`runtimeState: 'active'|'legacy'|'invalid'`（active仅v2）、`mode`、`needsOk`、`thisWeek`、`sent`、`replies`、`noReply`、`blocked`、`approvableCandidateIds`。

共用行至少包含 `id,nodeId,eventName,taskTitle,recipientId,recipientName,ownerId,ownerVersion,due,reason,explanation,risk,taskAvailable`，按需有 `candidateId,scheduledOn,blockedReason,deliveryId,sentOn,via,outcome,message,reply,days`。历史使用已存收件人/任务/活动/日期快照，不用当前负责人替换；删除任务历史仍保留。旧nudge/protocol无已证实收件人时明确Earlier reminder/recipient not recorded，不放入无回复或伪造新delivery。

`taskReminderSummary`：`runtimeState`、`recipientId/recipientName`、`explanation`、`blockedReason:string|null`、`canPrepare:boolean`、`candidateId?:string`、`history`（同上历史行）。Details直接用此结果准备按钮和状态说明，不再混用nudgeBlocked。未启用/旧版提示启用，不自称已启用；Working保留到期检查、Waiting说明协助对象和回复、Stuck暂停、Done结束。

五区保留 `rq-needs-ok/rq-this-week/rq-sent/rq-replies/rq-no-reply`。Replies只接受同任期实际ownerReply或同waitingRequest的实际响应；同日比较sequence。No reply起于真实已存delivery，改派、完成、已响应不继续追旧对象。This week只取未来7天最近候选；主日期为Task due。

## 主 Agent 提供的统一准备与记录

`src/reminders/delivery.ts` 导出：

```
sendReminderBatch(
  store: {getState:()=>DemoState;tryDispatch:(a:Action)=>boolean},
  candidateIds:string[], origin:string, via:'platypus'|'automatic',
  isCurrent?:()=>boolean
): Promise<{recordedIds:string[];failedIds:string[];error:string|null}>
```

Centre批量仅review_then_auto且lead调用via=platypus；automatic由组织设置授权、可在普通成员操作后生成，不借用查看者身份。service读取规则事实、按同一mail/taskAccess实现准备；reducer记录时再次检查当前组织/日期/模式、候选、收件人、归属版本、额度、快照和授权。状态变化或准备失败只记录仍有效部分，结果按本次新增delivery IDs计算，不能拿旧记录作成功。自动组件异步按需加载；保存失败停止并提供显式重试，不循环刷写。

新增动作：`upgradeReminderPlan`（lead，v1→v2/无→v2）、`reviewLegacyReminder {nodeId}`（lead，确认未来对象，不改旧历史）、`recordReminderBatch {via,entries}`（共享类型主Agent定义）。新单条composer仍复用同一mail/授权/快照验证，v2拒绝无正文的旧确认路径。

Provider提供 `automaticReminders:{busy:boolean;error:string|null;retry:()=>void}`，供中心显示自动准备/失败重试。启用和旧历史确认用tryDispatch+getState核对实际结果。非法runtime不显示覆盖启用按钮。

## Details 与状态更新

三段：活动/任务/负责人状态和一个Task due；具体要求/完成标准/重要性与一个适用外部入口、状态办理；提醒对象/原因/审核或自动演示与折叠历史。学校/依赖严重风险可见；私人开始参数继续受原权限保护。People/日期推导/Sources/Edit/职责匹配保留，未分配时继续展示分配处理。

TaskActions支持Done、Working on it、Stuck、Waiting on；原延期申请保留次级流程、旧token参数兼容。状态仍限owner/president、VP不获代报权限，认领和财务约束不变。Waiting现任成员+具体说明，原样保存不重建请求，外部依赖不猜邮箱。tryDispatch/getState判成功；失败保留输入。

## 验收

v1/旧存档显式升级、设置和历史保留、损坏数据保护、新组织默认v2；三模式单条/批量/自动完整邮件持久化；日内/每人/任务上限，失败与跨标签页冲突、改派/改期/收件人变化、Waiting对象权限和去重；同日真实回复、旧历史不误投；Details桌面/手机可读、键盘/无障碍/溢出；入口550,000字节和既定文字预算保持。历史FB波次与交接行为不改。
