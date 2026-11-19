# 邮件进入真实 Plan 与跨节点 Details：实施交付

2026-11-18（America/Phoenix）· Codex · 用户已批准实施，沿用 PR #14

## 当前交付：以活动流程图作为邮件入口

用户再次验收后明确：不能落在Team tasks或自己的Tasks集合，应是截图中的**Plan → Events流程图，右侧展开对应任务Details**。前轮“无活动任务进入Tasks/Team tasks”只解决了独立页遗漏，却选错了左侧工作区，本次取代该路由。

- **真实活动任务：** 新邮件、旧officer入口、上轮生成的Tasks邮件入口均进入`/events`，按任务真实eventId打开活动、选中实际节点并展开Details。即使最近看过另一活动，也不能替换真实归属；沿用现有MetroChart/TeamMetroChart，不改图布局。
- **无活动Club task：** 新链接为`/events?node=<id>&access=<grant>`。右列仍是原任务，左侧使用本工作区最近查看的活动（无偏好时首个活动）供查阅。进入后将浏览event补入当前URL供刷新/历史还原；切换活动保留原任务入口，点击图中其他节点后可以返回。明确提示任务尚未关联活动，绝不改task.eventId或声称它属于当前图；工作区无活动时显示空Events及原任务详情。
- **普通Tasks入口：** 默认恢复My tasks；Team tasks仍可手动选择。邮件不再进入任务看板。
- **共享信息与自动草稿：** 原任务保留同一grant的更新范围、操作者与草稿/附件；其他节点只读团队已提交的正文与对应附件，不能修改或读取私有草稿。Waiting on只可回复协助。Back to Plan隐藏Details供点图，返回原任务、刷新和前进/后退保留任务选择及已自动保存内容。
- **浏览偏好：** 最近活动仅为sessionStorage中的工作区隔离UI偏好，不写入业务状态、任务归属或授权。无效/删除活动忽略；显式错配、过期/改派或伪造链接仍显示错误。

本轮文件：Events、Tasks入口，planEntry/PlanTaskPanel/planEventPreference、邮件URL生成和历史快照校验，以及相关单元/浏览器夹具。未改Settings模板、图渲染器、日期算法、schema/store、业务收件人或服务器发送；保留同期四队默认和静态布局研究。

### 本轮验证与部署

276项相关单元/组件（19文件）、前后端类型、生产构建、lint和9页字数均通过；入口495,809/550,000字节，普通Tasks为84/130词。双端浏览器按唯一用例计32通过：22项Plan入口、8项已有邮件/通用提交/默认工作流兼容、2项入口预算。首轮20项19过/1手机脚本用了桌面活动按钮；改用已有手机下拉后复验通过。补充14项中12过/2新种子检查误将三个视觉汇合点计作任务；按真实flow-node按钮计数后完整38任务场景及入口预算4项复验通过，未为测试改图或放宽产品校验。

[真实桌面Networking流程图](../prototypes/reminder-events-entry/networking-event-desktop.png)、[手机Details](../prototypes/reminder-events-entry/networking-event-mobile.png)、[无活动任务与图并列](../prototypes/reminder-events-entry/club-task-with-event-desktop.png)、[证据清单](../prototypes/reminder-events-entry/manifest.json)已保存并查看。完整种子检查用实际e-night/moderator/venue和全部38任务，非单节点夹具；另覆盖最近活动、真实归属优先、旧Tasks入口、My tasks默认、自动草稿/附件、改派失效和只读资料。

当前仍沿用PR14和preview14，不新建PR、不合并main；运行时代码`c0fbf9f60fd90cb7cfc078575d2380bc555f09a7`的`netlify/platypus-officer-hub/deploy-preview`已确认success，继续使用[preview14](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/events)。本轮交互证据来自本地生产构建，线上核对部署状态，未另做线上逐步浏览器验收。测试使用本地重新签发grant，无真实产品AI或外部邮件，无用户完整授权链接归档。日志`/tmp/events-entry-{unit,related,browser,browser-final,browser-seed,build,lint,netlify-types,words}.log`，未重复全站门禁。

## 以下为前轮记录：保留历史，路由以上述当前交付为准

> **本日补漏修复：** 用户实际测试的 `Draft the meeting agenda` 是 `t-agenda`，`eventId:null`。初次实现仅处理活动任务，留下的社团任务独立页分支导致复现。现已补齐：这类旧/新邮件进入 **Plan → Tasks** 并展开右列；活动任务仍进入对应活动Plan。未把社团任务硬关联活动，旧签名/任务ID/草稿保留。补充验证：17文件262项单元/组件通过；双端18个唯一浏览器用例通过，包含用户同名种子任务、旧链接/新邮件、正文/附件/刷新、其他提交只读、看板/表格/时间线选择及改派失效。首轮2项因忽略任务类型图标前缀的测试定位失败，修正定位后复验通过；产品校验未放宽。

## 问题与结果

独立任务页方便回复，但成员订房时可能要先查看其他节点已提交的人数、设备或时段信息。Juanxi批准两张图表达的交互，明确指出图与真实workflow不同，因此本轮只改变入口与导航，继续使用真实 `MetroChart`/`TeamMetroChart`，没有照图重画流程。

活动任务邮件进入对应活动 Plan，未关联活动的社团任务进入 Plan → Tasks；两者均定位选中任务、打开右侧 Details。成员可点击实际节点，或用右列 **View task in this event** 切换同活动任务；浏览其他节点时可返回原邮件任务。手机保留既有全屏 Details，同时提供 **Back to Plan** 和节点选择，不强行挤入桌面三列。

## 链接与导航

- 新邮件：活动用 `/#/events?event=<eventId>&node=<taskId>&access=<scopedToken>`，社团任务用 `/#/tasks?node=<taskId>&access=<scopedToken>`。第一次进入优先 Flow，不受上次保存的 List 或隐藏侧栏偏好影响。用户主动切换 Flow/List/Budget 后仍尊重其选择。
- 切换节点时更新 URL；`from` 保留原邮件任务，`access` 仍只属于它。刷新、前进和后退恢复选中活动/节点。点击已选节点会重新展开被手动隐藏的 Details；普通自动保存不会反复打开它。
- 隐藏侧栏保留当前选择；Close details 清除任务/授权/返回参数。切换活动清除旧活动的任务上下文。
- 通过图现有 `.is-selected` 状态定位真实节点，横向调整现有图滚动容器；没有改变节点布局、任务关系、日期或模板。
- 旧可复用 `/#/officer?access=…` 链接核验成功且存在当前成员上下文时，按实际任务关联进入 Plan Events 或 Tasks；不能进入工作区的原限定入口仍遵守原成员范围。旧一次性 `token` 入口不改。
- 失效、签名错误、改派、错误活动/节点或伪造 `from` 明确显示错误，不打开另一个活动的首项任务，不在打开链接时修改状态。

## 身份、提交与草稿

原任务继续通过原 assignment-scoped grant 更新，保留既有有效操作者、重复更新、延期知会、撤回完成和财务限制；不会把当前浏览器的社长误记为邮件中的负责人。`viewerId` 不因链接改变。

Plan 中查看其他节点依靠当前演示工作区已有的活跃成员上下文，**不是用单任务 token 建立全社团身份**。邮件浏览期间，非原任务强制只读：显示最新已提交 Details 和对应附件，隐藏编辑、状态修改、提交按钮及私人未提交草稿。只有原任务获得该 token 的更新能力；Waiting on 收件人在原节点仍只有确认/提供协助操作，不能改原任务状态、目标或负责人。

统一表单继续使用现有正文与文件自动草稿。切换/返回/刷新保留文字和附件，不需要 Save draft；未修改附件限额、IndexedDB 隔离、历史成果、完成撤回、学校日期或消息收件人规则。

当前仍是本浏览器演示数据及成员切换模型，没有新增真实登录、后台发信或跨设备同步。将来生产身份/服务器接入不能把这个本地成员检查当作服务端认证。

## 文件边界

- `src/pages/Events.tsx` / `Tasks.tsx`：URL/侧栏同步、选择恢复、实际图定位与视图选择；邮件进入Tasks默认Team tasks，看板、表格、时间线的点击保持原邮件上下文。
- `src/reminders/planEntry.ts`、`useTaskAccess.ts`、`PlanTaskPanel.tsx`、`planTask.css`：目标解析、签名核验与同活动导航。
- `taskAccess.ts`、`mail.ts`、`message.ts`、`delivery.ts`、`ReminderComposer.tsx`：生成并严格核对新 Plan 入口，保留旧快照兼容；仍只有一个任务 URL。
- `SingleTaskPage.tsx`/`Officer.tsx`：旧链接兼容跳转、可嵌入的协助内容。
- `Layout.tsx`、`Rail.tsx` 与共享任务组件：选择具体 Plan 任务、离开任务链接时清理Details、关闭参数清理、明确只读显示。

以最新工作流交付 `a2f4dd8` 开始；未修改 Settings、模板库/版本、团队归组、实际图渲染器、任务ID、store/schema、规则数组或日期引擎。同期工作流交付保持。

## 验证

- 19 文件、270 项相关单元/组件通过，覆盖规则邮件、快照、授权、任务提交、目标日、通用 Details 与两种流程图基础；新增10项包含邮件目标绑定、旧链接兼容、跨活动拒绝、成员上下文、只读成果与草稿保留。
- 新入口桌面/手机12项先行通过；与原提交/附件/延期/撤回、批量邮件/协助、模板生成和标准流程图及包预算一起回归38项，37项通过、1项手机导航检查遇到自动关闭侧栏后的旧点击竞态。随后修正离开Plan时的Details清理，并把检查改为等待实际关闭；修正后14项全部通过，按不重复用例计38项通过，数字不重复相加。
- lint、前端类型/生产构建、后端类型、独立CSS与9页字数预算通过；Plan153/180可见词，Settings147/150。初次交付入口494,992/550,000字节；本次社团任务补漏为495,514/550,000字节，没有调整门槛。
- 浏览器检查包括附件真实下载、立即输入后切换/返回、刷新/历史、失效与改派、协助作用域、严重/关键无障碍及横向溢出。首轮虚构附件 MIME 不符合现有格式导致的失败已修正测试夹具，未放宽产品校验。
- 实际桌面/手机截图见[交付图片目录](../prototypes/reminder-plan-implemented/manifest.json)。它们来自运行的真实页面，不是上一轮图像模型效果图。
- 0 真实产品 AI 调用/外部邮件。本轮没有重复完整全站门禁；旧阶段二四按钮等历史断言未在本轮一并迁移，不作为完整全站通过声明。

## 验收

[preview14 提醒中心](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/)：为一个活动任务准备邮件，点击 **Open task**；应进入对应活动 Plan，高亮该实际节点，右侧显示统一 Details。点击其他节点查看已经提交的内容/附件，再返回原任务检查草稿。手机使用右侧任务下拉框或 Back to Plan。

提醒中心原有启用/审核/额度保持；当前没有待发活动邮件时可在 Plan 点击任务验证同样的 Details 导航。运行时代码 `3505d79`，同步同期记录后的推送为 `861431c`；GitHub对应Netlify deploy-preview已确认 **success**。本环境直接抓取站点被代理403阻止，因此不宣称已完成线上浏览器逐步验收；实际交互证据为上述生产构建的本地双端检查。继续使用原功能分支与 PR #14，不创建 PR、不合并 main。需要同步本地备份。


社团任务修复日志：`/tmp/club-plan-final-unit.log`、`/tmp/club-plan-browser.log`、`/tmp/club-plan-browser-final.log`、`/tmp/club-plan-final-build.log`、`/tmp/club-plan-final-lint.log`、`/tmp/club-plan-words.log`。本轮代码不修改Settings/团队/模板、ASU规则、schema/store或后台发送；同期四队预设恢复已合入保留。没有复制、存储用户发来的完整授权链接。

社团任务真实页面证据：[桌面](../prototypes/reminder-plan-club-fix/club-agenda-desktop.png)、[手机](../prototypes/reminder-plan-club-fix/club-agenda-mobile.png)、[清单](../prototypes/reminder-plan-club-fix/manifest.json)。使用原始种子t-agenda与本地重新签发的测试grant，没有复制用户token。运行时代码 `76cd2df`，合并同期布局研究后为 `84ee1fd`。

**社团任务补漏部署：** GitHub已确认 `84ee1fd74feb93b258f9c635d9c7c0f2d907f30e` 的 `netlify/platypus-officer-hub/deploy-preview` 为success，仍使用preview14。最终截图夹具改为只取原始议程节点，去除继承的订房说明；12单元与2双端取证复验通过，截图和运行时都不改用户实际说明。以上复验不重复加入262/18计数。
