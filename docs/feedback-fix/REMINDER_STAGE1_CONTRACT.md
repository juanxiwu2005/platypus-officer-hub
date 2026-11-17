# 提醒阶段一冻结契约

类型正本 `src/reminders/contracts.ts`。主 Agent 修改类型须同步两位开发者；Data/Rules 不修改该文件或旧业务文件。

## Data 导出（facts.ts / actionLinks.ts）

- `buildReminderFacts(state: DemoState, nodeId: string): ReminderTaskFacts | null`；仅取真实活动/任务/规则事实。缺失活动为 null，独立任务仍可用。具体要求可以用已知 stepKey 模板插入真实 headcount/date；importance 优先人工 why 或真实依赖，不制造后果。不要写三个并列日期。
- `reminderPeople(state: DemoState): ReminderPerson[]`；现任判断复用 officers/isOfficer，前任/候任不能作为自动等待对象。
- `buildReminderInput(state: DemoState, runtime: ReminderRuntime): ReminderInput`；只做适配，不调引擎。
- `taskActionLink(node: Node): TaskActionLink | null`；复用已有已知入口，优先一个，解释适用场景；未知不编造。此链接在独立任务页使用，不给邮件增加第二个链接。
- `planKey` = JSON.stringify([node.id, node.ownerId, node.ownerVersion ?? 0, node.clubDeadline, node.latestStart])。不把标题/标签编辑当新计划。

## Rules 导出（engine.ts）

- `createReminderRuntime(today: string): ReminderRuntime`。
- `transitionReminderRuntime(input: ReminderTransition): ReminderRuntime`；比较事实，追加真实操作顺序的更新；显式 updatedNodeIds 仅由主 Agent 对 claim/reply/board 操作传入。同日次序用 sequence，不用 lastUpdate 推断谁回复。等待相同对象/相同内容重复提交不建第二请求；目标不明确可 recipientId:null 并标 blocked。完成/换人/撤销/换对象关旧请求。
- `planReminders(input: ReminderInput): ReminderPlan`；只比较规则引擎已有日期，逾期第3天用 addDays(due,3)；返回 ready/upcoming/blocked。仅实际 ownerReply 与 status 影响开始提醒，标题修改不算。等待对象必须是 people 中 active 且非原负责人；缺失不猜。不要因临时周限额永久丢弃候选；同日只一封，不能重复补发更早候选。
- `confirmReminderDelivery(input: ReminderInput, candidateId: string, via: ReminderDelivery['via']): ReminderRuntime`；重新检查当前 ready 和额度，追加不可变快照；无效返回原 runtime。via automatic 仅 auto_email 可用；两种 review 由有权限的 reducer 审核。支持按发送方式记录 outcome。允许自动处理同批次到达时逐次重算上限。
- `runAutomaticReminders(input: ReminderInput): ReminderRuntime`；仅 auto_email，逐候选重新检查并追加演示历史，重复调用不重复。其他方式只生成候选。

以上函数不得调用 AI、网络、存储或墙钟。未知旧记录不回填 recipientId，不把计划推算作为已发生事实。启用时遇到没有任期/收件人快照的旧 nudge 或旧模拟发送，主 Agent 把 nodeId 放进可选 `legacyUnresolvedNodeIds`；引擎返回 `legacy_history`，不偷偷重发、归给新人或重置限额。阶段三提供明确处理入口。历史更新或新字段兼容由主 Agent 负责。

显式启用后的明确新负责人/新 ownerVersion 代表可确定的新任期，可以解除该 node 的 legacy 标记；旧发送不回填、不归给新人。改期、改标题、改状态或暂时取消负责人均不解除标记。

## 主 Agent 适配与授权

新增可选 `DemoState.reminderRuntime` 和显式 enable 动作。启用时从当前事实创建待处理等待请求，不造旧发送；每次相关 reducer 动作之后调用 transition，auto 模式按当天处理。Offier token 更新 actor 用 grant.ownerId；不能把页面当前 viewer 当真正回复人。等待对象邮件只是独立请求，不签发原任务 owner 的操作权限。

新版启用的演示时钟需逐日先跑原有领导流程（跳过旧成员 reminder，并暂停 waiting/blocked；日期变化关闭旧 case），再执行新自动候选；旧未启用数据保持原路径。独立任务页、可重复链接和新邮件排版阶段二才接入。
