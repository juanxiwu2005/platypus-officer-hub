# 自动提醒任务匹配审阅与后续安排

2026-11-16（America/Phoenix） · Codex · 审阅基线 `claude/fervent-thompson-e2j5u2@bea7771`

自动提醒先按六项依次推进。本轮完成现有任务匹配代码的审阅，记录职责标签和多人候选的设计要求；标签目录与分配规则仍待逐项确定。本轮仅修改文档，任务匹配、提醒、邮件和交接的产品行为均保持原样。

## 六项工作与当前范围

| 顺序 | 工作 | 当前状态 |
| --- | --- | --- |
| 1 | 任务匹配 | 现状审阅已完成；讨论职责标签、覆盖范围与多人候选规则 |
| 2 | RACI | 已记录；之后明确责任角色和各类消息的收件人 |
| 3 | 提醒计划 | 已记录；之后确定触发条件、状态变化与 Details 展示 |
| 4 | 邮件编写 | 已记录；之后确定简短内容、事实表述与办理链接 |
| 5 | 点开邮件的流程 | 已记录；办理按钮尽量直达实际外部平台的具体页面，多入口需解释适用场景；状态反馈另行设计 |
| 6 | 独立运行的后台发送服务 | 已记录；之后接通服务器数据、定时执行、发送记录与失败处理 |

新人独立做事与组织交接属于第二个核心目标，放在上述自动提醒工作之后。旧文档中的 FB 波次、三天交接安排不构成本轮同时实施的范围；这里只调整当前推进顺序，不追溯改写历史记录。

## 用户提出的任务匹配要求

1. 评估不依赖 AI 处理 onboarding 和岗位匹配的方案：把已有工作流、岗位职责与适用政策工作整理成可勾选的职责小泡泡。
2. 两个小泡泡的职责定义不能重复或让人无法区分；同时检查已知工作是否有遗漏。
3. 覆盖当前完整工作流，也检查活动规划之外的组织通用职责。
4. 两个人承担同一种职责时，需要明确如何选择一个任务的执行人。
5. 先解释现有机制，再细化方案；本轮不直接实施标签、分配算法或后五项功能。

“不依赖 AI”的职责标签方案是用户提出、正在评估的方向，不代表已批准最终标签清单、自动分派方式或数据迁移。此前聊天中提出的工作量、可用时间等因素，也不能当作现有系统已实现的能力。

## 现有主流程如何分配任务

主应用的基本路径是：岗位名称 → 一个宽泛职能 → 工作流步骤指定的岗位或职能匹配 → 岗位持有人 → 任务执行人。

### 岗位归入一个职能

[`RoleFunction`](../../src/data/types.ts) 固定为九种：president、vice_president、finance、programs、marketing、outreach、secretary、membership、advisor。一个 `Role` 只有一个 `fn` 和一个 `holderId`；当前模型没有可勾选的职责目录、多个职责标签或同岗位候选成员池。

[`fnForRole`](../../src/data/structure.ts) 主要读取岗位名称中的英文关键词。例如 Finance、Treasurer、Budget 归 finance；Marketing、Design、Media 归 marketing；Event、Logistics、Operations 归 programs。无法识别的普通岗位默认归 programs。跨职能名称按代码里的匹配先后命中一个类别，不会得到多个类别。

当前 Team 页面允许修改岗位名、持有人、汇报关系和职责文字。改岗位名通常会重新推导其职能；职责文字保留为自由文本，不会被编译成细粒度职责标签。

### 每个步骤携带负责职能或具体岗位

[`EVENT_STEPS`](../../src/engine/playbooks.ts) 当前共 46 个步骤定义，其中 31 个是始终保留的核心步骤，其他 15 个按活动情境决定是否出现。并非每场活动都会产生全部 46 个任务。

每个步骤有一个 `fn`，也可保存一个明确的 `ownerRoleId`。例如内容制作、宣传发布等多个专业上不同的步骤目前都归 marketing；场地、嘉宾、交通、安保等多个步骤都归 programs。

[`withOwners`](../../src/engine/workflow.ts) 的优先顺序是：显式传入的步骤岗位选择 → 步骤已保存且仍存在的岗位 → `roleFor` 的匹配结果。手动选择会生效，历史自动匹配写下的岗位也会被保留，系统没有单独区分两者的来源。

### 没有具体岗位时按分数选择

[`roleFor`](../../src/engine/playbooks.ts) 为每个岗位计算：

- 岗位 `fn` 与步骤 `fn` 一致，加 100 分。
- 岗位名称和职责文字中匹配到该职能的关键词，再加 20 分。
- 选择总分最高的岗位；同分时选择传入列表里排在前面的岗位。

没有正分候选时使用固定后备链：finance、marketing 可落到 president；programs 可落到 vice_president，再落到 president；其余职能也有各自后备链。仍找不到时直接返回岗位列表第一项。

这里不比较具体技能、必要账户权限、是否有持有人、个人忙碌周、真实可用容量或已分配任务量。`orderRoles` 在部分设置路径按汇报层级排序，因此同分时列表在前不等于实际最适合。已保存 `ownerRoleId` 的步骤会优先沿用旧岗位，并非每次建活动都会按当前列表重新匹配。

### 把岗位持有人写成具体执行人

[`buildEventNodes`](../../src/engine/playbooks.ts) 先用步骤中的有效岗位，缺少时才调用 `roleFor`；再把所选岗位的 `holderId` 写成任务的 `ownerId`。岗位无人担任，任务就无人负责。它不会因为该岗位空缺而继续寻找下一个有人的候选岗位。

`buildEventNodes` 仅接收活动、岗位和模板选项，没有接收完整成员技能或工作量数据。当前创建活动的这一条路径，有持有人时直接把任务设为 accepted；这与给他人创建独立任务后等待认领的规则不同。

## AI 与其他创建入口的实际作用

| 入口 | 当前实际行为 |
| --- | --- |
| 新活动 | 创建活动后由模板和引擎生成任务，沿用步骤岗位或上述匹配规则；不是逐条调用 AI 评估成员 |
| 可选章程读取 | AI 可提取岗位名和职责；接受建议后这些信息参与本地岗位配置，不能等同于细粒度技能匹配 |
| 工作流 AI 分岗接口 | `netlify/functions/workflow.mts` 的 owners 分支可让模型为步骤选择一个已有岗位；静态检索未发现本分支非测试前端调用该接口，不能把服务端代码的存在说成当前 onboarding 已走该流程 |
| Ask 新建独立任务 | 提示词要求只采用用户点名的人或岗位，不确定时留空；表单供人修改，随后走 `createTasks` |
| 手动改负责人 | 直接使用选中的人；现有入口主要验证身份、ID 与修改权限，没有共同的职责资格匹配层 |
| 沉默后的临时接手建议 | `suggestedOwner` 先按职能接近程度，再按未完成任务数量排序；只是特定跟进场景的建议，未成为普通创建任务的统一分配机制 |

相关代码：[`structure.ts`](../../src/data/structure.ts)、[`workflow.mts`](../../netlify/functions/workflow.mts)、[`chatCards.ts`](../../src/lib/chatCards.ts)、[`changeReview.ts`](../../src/data/changeReview.ts)、[`followup.ts`](../../src/engine/followup.ts)。

独立任务表单选择两个人时，当前会创建两条相似任务，每人一条；它没有从两名同职责成员中选择一个人接同一项工作。未指定人时，社长可发无人负责的任务，普通干部创建的任务默认给自己；给他人的独立任务等待对方认领。

仓库还有一套默认隐藏的服务器 Activity workspace。其 `resolveOwners` 按成员的 `roleIds` 找候选：只有一名候选才自动设主要执行人，多名候选时主要执行人为空，其余列为协作候选。这套机制和当前浏览器主应用分离，不能混称已统一上线。

## 职责小泡泡的边界建议

小泡泡适合表示“负责哪类工作”，例如场地预订、校方活动登记、宣传文案编写、宣传视觉制作、宣传发布。岗位名称继续由社团自定义，一个岗位可勾多项职责。

需要区分职责、技能和操作权限：会 Canva 是技能；负责宣传视觉制作是职责；能提交特定系统的申请是权限。勾了职责不能自动证明有必要权限，兴趣也不能自动当成专业资格。

互斥检查应落实到每个可分派职责的动作、对象和交付物。例如：

| 候选职责 | 主要交付物 | 明确排除 |
| --- | --- | --- |
| 校方活动登记 | 活动登记记录与确认号 | 组织年度注册、房间预订 |
| 场地预订 | 场地、容量、布置要求与预订确认 | 校方活动登记 |
| 宣传文案编写 | 可审核的宣传文字 | 视觉成品、发布操作 |
| 宣传视觉制作 | 可审核的海报或图像 | 文案创作、发布操作 |
| 宣传发布 | 已在指定渠道发布的内容 | 文案和视觉成品的制作 |

这五项仅为边界示例，不是已定稿或覆盖全部工作的标签目录。上层分组可用于寻找小泡泡，不应与子项同时成为重复计数的可分派职责。

不同小泡泡之间职责定义应清楚；不同岗位或成员勾选同一个小泡泡则允许存在。两者分别解决“工作怎么分类”和“候选人有哪些”。

当前 `contentCreation` 同时包含文案和视觉素材，`materials`、`checkin`、`speakerPacket` 等也合并了多种交付物。若要按专业细分，就需要拆任务或明确多个必要职责和主执行人的协调责任。直接给复合任务贴多个标签，并不能保证任何一个匹配到其中一项的人都能独立完成整个任务。

## 如何检查覆盖完整

覆盖核对需要分别完成两张表：

1. 每一个当前标准步骤、组织自定义步骤和临时任务，对应哪个主要职责；复合步骤是否需要拆分；没有映射的工作显式保留为待分类。
2. 每一项适用的组织政策工作，对应什么触发条件、实际行动和主要职责。规则是约束、禁止事项还是需要执行的工作，应分别判断，不能把每个政策来源都自动变成一个任务。

当前核查得到的范围：46 个标准步骤、9 种宽泛职能、16 条简化规则，以及 64 条政策来源目录记录。下方已列全 46 个当前步骤；64 条目录记录尚未逐条提取并核对所有职责，因此没有宣称标签体系已覆盖所有 ASU 政策。

活动之外的待核对范围包括：组织注册与年度再注册、岗位和组织资料维护、必要培训与账户访问维护、顾问及校方联络、组织档案、品牌和商标使用、适用的音乐版权核查。成员招募、例会记录等也出现在已有岗位职责模板中。这里列的是需核对的工作范围，具体义务与执行权限必须连接到适用条款和组织配置，不能仅凭来源标题认定。

[`R16`](../../src/data/rules.ts) 已合并了多项组织通用事项；[`POLICY_CATALOG`](../../src/data/policyCatalog.ts) 另有治理、品牌、无障碍、学院等来源。历史资料与特定学院规定不能自动当作所有组织的当前要求。

覆盖率应以已定义清单为分母。未来新增工作流步骤或适用政策行动后，必须重新检查；无法匹配时保留缺口，不再通过“分给第一个岗位”隐藏缺口。

## 两个人拥有相同职责时

当前主应用在同分时选岗位列表第一项，且同一个岗位只有一个持有人；没有同职责成员池的分配策略。

建议先让标签形成候选人集合，再为每项职责明确分配方式。至少存在两种不同场景：

- 需要连续对外沟通或固定系统权限的职责：设置主要承接人和备份。
- 可在合格成员之间分摊的独立工作：在满足权限与时间条件的候选中分配；可用容量、已有工作与轮转顺序作为后续明确的规则。

任何方式都保留一个任务的主要执行人。协作成员不应自动收到一份重复任务。已有人工指定不能因为每天重算负荷而被悄悄改派；候选都不可用或分配策略未确定时，明确显示待分配并说明原因。

轮转、容量计算、同分规则、默认承接人及覆盖调整都尚未定稿。现有任务数量和规划天数不足以准确代表每个人的实际投入，不能直接称为真实工作量。

## 当前完整标准步骤清单

以下是审阅基线中的静态定义。核心列表示是否在 `CORE_EVENT_STEP_KEYS` 中；情境列描述额外步骤的创建条件。技能或职责标签尚未加入这些数据。

| 步骤 ID | 当前名称 | 当前职能 | 核心 | 情境 |
| --- | --- | --- | --- | --- |
| plan | Event Plan | programs | 是 | — |
| backup | Back-up Plan | programs | 是 | — |
| venuechoice | Candidate Venue | programs | 是 | — |
| registry | Event Registry (SDC & Special Event) | programs | 是 | — |
| venue | Book Room & Layout | programs | 是 | — |
| moderator | Moderator Lead Staffing | programs | 是 | — |
| materials | Event Materials PPT Decorations | programs | 是 | — |
| checkin | Check-in Forms Photo Release Liability | programs | 是 | — |
| headcount | Headcount | programs | 是 | — |
| thankyou | Thank You Note | secretary | 是 | — |
| feedback | Feedback | vice_president | 是 | — |
| postmarketing | Post Marketing | marketing | 是 | — |
| photoBackup | Photo Backup | marketing | 是 | — |
| invoice | Invoice | finance | 是 | — |
| attendance | Attendance Submit | finance | 是 | — |
| spending | Paid Reimbursed | finance | 是 | — |
| financeRecord | Finance Record | finance | 是 | — |
| documentation | Documentation | secretary | 是 | — |
| partner | Partner Meeting | programs | 否 | externalGuest |
| speakerPacket | Speaker SAP Headshot | programs | 否 | externalGuest |
| travel | Partner Travel Plan | programs | 否 | externalGuest |
| partnerReview | Partner Speaker Review | programs | 否 | externalGuest |
| parking | Parking Validation | programs | 否 | externalGuest |
| budget | Budget | finance | 是 | — |
| foodCompliance | Food Exception Permit | finance | 否 | externalFood |
| quotes | Quote Gather | finance | 是 | — |
| budgetRequest | Budget Request | finance | 是 | — |
| budgetApproval | Budget Approval | finance | 是 | — |
| purchaseRequest | Purchase Request | finance | 是 | — |
| purchaseApproval | Purchase Approval | finance | 是 | — |
| advisor | Advisor Involved | programs | 否 | advisor |
| access | Accessibility Check | programs | 否 | access |
| security | Security | programs | 否 | safety |
| eams | EAMS Plan | programs | 否 | safety |
| permit | Permit Insurance | programs | 否 | safety |
| alcohol | Alcohol Permit | programs | 否 | alcohol |
| drone | Drone Approval | programs | 否 | drone |
| schoolApproval | School Admin Approval | programs | 否 | schoolApproval |
| marketingNeeds | Marketing Needs | marketing | 是 | — |
| contentCreation | Content Creation | marketing | 是 | — |
| promotionItems | Promotion Items | marketing | 是 | — |
| rsvp | Open RSVPs | marketing | 否 | rsvp |
| content | Content Distribution | marketing | 是 | — |
| reminder | Event Reminder | marketing | 是 | — |
| orderPlaced | Order Placed | finance | 是 | — |
| finalcheck | Full Check Alert Changes | president | 是 | — |

## 验证与交接

现状结论经过真实函数的离线断言核对：同分按列表顺序选择、反转列表改变未绑定步骤的候选、空缺岗位也能排在第一、未知岗位名默认 programs、缺少匹配时落到列表第一项、已保存步骤岗位被保留，以及空缺岗位产生无人负责的任务。

现有相关测试 6 个文件、114 项通过：`npm test -- src/test/m4.test.ts src/test/orgWorkflow.test.ts src/test/workflowV2.test.ts src/test/m2b.test.ts src/test/onboardingTeam.test.ts src/test/fb-05-create.test.ts`。工作流接口测试使用模拟 AI，本轮没有调用真实模型。步骤清单直接从当前 `EVENT_STEPS` 与 `CORE_EVENT_STEP_KEYS` 生成，并核对共 46 行、31 项核心步骤。

本轮只记录现状、用户要求和待细化方案。下一步是逐项审阅职责目录及覆盖映射，再明确多人候选规则；不提前实施 RACI、邮件、排程、后台发送或组织交接。需要同步本地备份。
