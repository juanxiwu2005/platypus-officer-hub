# 提醒阶段二：规则邮件与独立任务页交付

2026-11-16（America/Phoenix）。Juanxi 明确要求“继续阶段2”。分支 `feat/reminder-plan-v2`，沿用 [PR #15](https://github.com/juanxiwu2005/platypus-officer-hub/pull/15)，base 为 `claude/fervent-thompson-e2j5u2`；先合入其 `26af354`，收尾同步至 `5e301d9`，保留实际任务匹配、认领规则与 v23 存档保护。只解决 PROGRESS 的文档冲突，保留两项工作的交付记录。

## 本阶段的结果

| 用户要求 | 实际交付 |
| --- | --- |
| 规则优先，避免等待 AI | 单条提醒编辑器完整走纯规则，不请求 AI，即使全站 AI 开关打开也不等待；问候、日期解释、要求、重要性、协作与感谢均由规则和已保存事实组成 |
| 活动在前，项目在后 | 主题固定为 `活动 · 具体任务`，独立任务使用 Club work |
| 一个重点截止日 | 正文突出 Task due；开始日只用于自然解释“今天到了计划开始日”等触发原因，到期和逾期按当前记录表述，避免断言现实中没有完成 |
| 具体要求与意义 | 优先人工 Task instructions / Completion criteria / Why it matters，其次真实活动人数、步骤和依赖；缺人数不造 40 人；Details 的 Edit 中可维护这些字段 |
| 邮件简洁 | 正文约100英文词以内，问候、任务要求、重要性、协作与感谢；校验正文只有一个 Open task 链接，不再罗列四个状态链接或原始材料网址 |
| 点开后只看当前任务 | 新入口 `/#/officer?access=…`，单独显示对应活动/任务、一个截止日、具体要求、完成标准、重要性、一个适用的真实办理入口及状态操作 |
| 可以持续更新 | 同一链接可以 Working on it → 刷新 → Done，完成后仍可查看；未认领任务先 I've got it，不能绕开职责匹配认领要求；Working 不冒充延期申请 |
| Waiting on 协助 | 选现任成员并填写所需协助；新运行时中生成对该对象的独立跟进。对方的入口只有 Acknowledge / Update provided，原任务负责人和状态不因响应改变；其他外部依赖可保存说明，不猜邮箱 |
| 防止误操作或假成功 | 重新分配、归属版本变化、离任、过期和篡改入口失效；财务控制节点不能直接 Done；保存失败保留输入并提示重试，不靠旧记录显示本次已保存 |
| 可追溯的内容 | 记录经当前收件人、模式、要求和授权重新校验的规则邮件快照；旧历史不补造正文或收件人；动作摘要不复制 token、签名或完整邮件 |

新邮件和任务页按需加载，旧 `?token=` 一次性入口保留兼容。新访问授权仅为当前浏览器本地演示，不是服务器登录或跨设备能力。

## 怎样验收

预览发布后，从 Tasks 打开一项已有负责人、尚未完成的任务，在 Details 点 Remind。先核对主题的活动/任务顺序、Task due、具体要求和感谢，再点唯一 Open task 链接；在任务页选择 Working on it，刷新后再选择 Done。预览状态更正（2026-11-16，America/Phoenix）：此前推测的 PR #15 地址实际显示 Site not found，当前无有效在线预览链接；最新交付入口及部署障碍见[阶段三交付](REMINDER_STAGE3_HANDOFF.md#如何验收)。

如要对比具体要求，在原任务 Details 的 Edit 中修改 Task instructions / Completion criteria / Why it matters，保存后重新打开提醒，正文与任务页应读取最新事实。办理按钮可能是学校的申请入口；已知只有入口页时明确写适用范围，不冒充已登录后的具体申请表。

Waiting on 的完整新计划候选和独立邮件需已有显式启用的新运行时；普通旧存档仍走兼容计划。本阶段浏览器验收对独立跟进使用真实持久化 runtime 夹具，确认收件人为等待对象，且其页面不能修改原任务状态。最终统一的启用入口、单条/批量/自动演示链路和 Details 重排属于阶段三。

## 独立审阅与修正

Mail 与 Page 在各自 worktree 开发，主 Agent 独占共享类型、授权、store、消息快照、路由桥、任务说明编辑和集成检查；独立 Review 对集成候选检查，反例交原负责人修复。

1. 损坏 runtime 缺少 waitingRequests 时，普通负责人保存状态会报错。现在读取前验证结构，普通任务更新不依赖损坏的等待记录，原字段仍完整保留。
2. 同日同内容旧邮件可能被误当作本次保存成功。保存确认必须核对本次动作及新增记录，不能只搜索相同正文。
3. 重新打开已有 Waiting on 再保存可能用人名覆盖协助说明，造成关闭/重建请求。现在预填保存的说明；不改内容不会制造新跟进。

另外补齐了损坏存档值为 null / 0 / false / 空字符串时的保护：不能覆盖启用或退回旧发送路径；普通负责人仍可更新任务，不清除原坏字段。焦点测试改为等待实际 useEffect 聚焦后核对，保留同一断言和原超时。

## 检查结果

最终运行时代码候选 `e91346484c785f5667a59cb79effae37db3d70a9`，独立 Review 通过；之后只更新交付文档。

- 相关单元/组件20文件、330项通过。命令：`npm test -- src/reminders src/matching/stage3Creation.test.ts src/matching/stage3Persistence.test.ts src/matching/stage3RecoveryUI.test.tsx src/test/workflow.test.ts src/test/nudges.test.ts src/test/reminderQueue.test.ts src/test/store.test.tsx src/test/officerLinks.test.ts src/test/handoffReview.test.ts src/test/fb-04-taskDue.test.ts src/test/fb-04-taskDetail.test.tsx --maxWorkers=1`。
- 兼容浏览器6个spec，桌面/手机共67通过、1手机限定项在桌面跳过：tasks、today、fb-01-ai-wait、fb-08-reminder-centre、research-log、reminder-stage2。最新合并候选再跑新邮件/任务页8项及首页体积2项，共10项通过。
- 新浏览器链路覆盖：邮件单链接/无AI请求；同一入口Working、刷新、Done、完成只读；Waiting和Stuck持久化；篡改与改派撤权；等待邮件的实际收件人与只响应协助范围。包含两端WCAG检查和横向溢出检查，桌面/手机截图已查看。
- lint、前后端类型、生产构建、全站文字预算及新增CSS的目标stylelint通过。以40字符 `COMMIT_REF=e91346484c785f5667a59cb79effae37db3d70a9`、`BRANCH=feat/reminder-plan-v2`、`CONTEXT=deploy-preview` 构建，主入口 `/assets/index-DV95VBqu.js` 为 **545,608 / 550,000 字节**；没有提高门槛。
- 独立审阅的三个原样反例均转绿；最终页面26项加3个独立反例共29项复验通过，临时测试与依赖链接已清理。

收尾并行运行浏览器构建/文字检查时，一个原有reminderQueue测试触发原5秒超时；其它329项通过。等待浏览器结束后，以单worker完整复跑330项全部通过，未调超时或放宽断言。先前浏览器Waiting选择器改为按combobox角色查找，保留同一实际操作与状态断言；最后焦点用例等待useEffect，不删焦点检查。

未运行全站Playwright、真实AIR、外部邮件投递、Safari/iOS真机检查。线上预览访问被当前环境代理403拒绝；本地生产构建和截图验收不等同线上部署已验证。人工发送的目的地在外部草稿中由用户选择，保存快照不代表核实了外部地址或投递。

## 后续范围

阶段三仍待批准：Details 三段重排、提醒中心的单条/批量/自动演示统一接通、新运行时默认启用及设置迁移展示。当前普通旧存档的自动/批量路径不因此升级为完整规则邮件快照；不能把阶段二单条邮件交付称为整套后台已接通。

真实定时发送、服务器共享数据、跨设备身份和投递失败处理仍属六项工作中的第六项。本轮没有真实 AI 调用、没有外部邮件投递、没有合并 main 或正式发布，也未改交接行为。需要同步本地备份。
