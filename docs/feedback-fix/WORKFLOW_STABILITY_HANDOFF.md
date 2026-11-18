# 工作流模板修复交付

## 研究：多个工作流与六种静态方向（2026-11-17，America/Phoenix）

基于功能分支`1e0ef5a`审阅；本轮只做代码研究、离线纯函数验证及六张概念图，没有改src、表单、存储、规则或构建，也没有制作HTML原型。图片展示的是未来方案，不表示相关功能已经上线。

六张1536×1024 PNG已在对话展示并原样归档到`docs/prototypes/multiple-workflow-concepts/`，`manifest.json`保存图号、说明、原始来源文件及SHA-256；`audit-evidence.json`保存下述离线验证结果。图内模板数与工作进度是布局示例，非当前运行数据；旧v1/v2/v3原稿均未改。

**结论：现有任务／依赖／岗位／条件／日期计算可以复用；当前Plan并不是通用的多模板工作流系统。** 5、10、20是模板目录规模，不能与同时运行多少活动混为一谈。要保存多份模板、在创建时选择、让内部事务拥有独立规则，仍需要模板层与通用工作项实例层；性能上限本轮未基准测试。

| 问题 | 当前代码事实 | 扩展所需 |
| --- | --- | --- |
| 能运行多个计划吗 | `DemoState.events[]`能存多个活动，各自Node.eventId、分支快照及任务内容独立；MetroChart按eventId绘图 | 保留实例隔离，Plan列表增加工作类型与模板来源 |
| 能任选多份模板吗 | `Org.eventWorkflow`是单个对象；Settings仅编辑这一份，newObjects创建活动统一读取orgSteps；create_event命令没有templateId，Event.playbookId目前只是写入的字符串，不是模板注册表路由 | Template列表、稳定模板ID／版本、创建入口选用与受验证命令传递、每实例定义快照 |
| 内部Board事务是否已有基础 | 当前独立任务以eventId=null创建，能做单项任务；没有自己的workflow/project父对象，不能把一组内部任务当成有完整生命周期的独立计划管理。另一套workspace存在WorkItem与executive_work | 使用通用工作项聚合与独立项目ID，区分单任务／多步骤计划，不用虚构公众活动和人数来塞内部工作 |
| 轻量模板能否只留几步 | stepsFor在当前创建路径有checks时补齐31个核心活动步骤，checkWorkflow也要求这些标准步骤与ASU步骤；分支、阶段、主干布局仍以活动为中心 | 分开通用图校验与各类适用的规则配置；Full Check、Headcount等仅属于需要它们的流程。适用的采购、出行、学校审批仍按事实保留 |
| 是否只要启用另一套工作区 | src/workspace已有member_event/executive_work、任务依赖、模板快照和版本；但PhaseOne/接口默认受ORG_SETUP_ENABLED隐藏，和当前Plan是独立模型、存储及页面 | 先决定统一的数据契约与迁移／适配策略，接回现有提醒、材料提交与归档；不直接开启开关当作完成迁移，不再新建第三套引擎 |

离线反例：标准EVENT_STEPS为46项、CORE_EVENT_STEP_KEYS为31项；请求只有contact-partner一步且checks={}的模板，stepsFor返回32项；该一项模板还会被checkWorkflow阻止保存。只改变Event.type由speaker到meeting而不改变事实，选出的步骤完全相同，因此type标签不能当成多模板选择器。新OrgFlow的nodes schema上限40，直接装当前46节点形状会被拒绝，说明两套结构不能无适配互换。对应源文件：`src/data/types.ts:123/145`、`src/data/changeReview.ts:60`、`src/lib/commands.ts:8`、`src/engine/playbooks.ts:244`、`src/engine/workflow.ts:192`、`src/organization/schema.ts:81`。

另一套工作区也尚无20份预设模板库：`netlify/lib/workspace/runtime.mts:161`对member_event统一取确认过的memberFlow，对executive_work接受input.flow，否则生成三步后备流程；`templateVersion`是组织contextVersion，缺少独立模板ID及各模板版本。`CreateWorkForm`没有模板库选择器。可复用其WorkItem/Task/flow快照思想，不能把已有代码说成当前网站已支持任意预设或任意工作流。

建议共有基础：内置模板与本社团副本分开；模板记录ID、名称、工作类型、版本、任务图、岗位绑定、日期锚点和适用规则；创建时复制结构与版本到实例，不复制旧负责人、日期、完成状态或成果附件。新版本默认只影响未来计划。内部事务的目标完成日与公众活动发生日分开，日期仍由规则引擎计算。不同社团独立保存自己的模板，不自动共享组织内容。

六张静态方案体现不同的使用逻辑，均是提案，未实施：

| 方案 | 主要入口／组织方式 | 优势与取舍 |
| --- | --- | --- |
| [A 模板库优先](../prototypes/multiple-workflow-concepts/A-template-library.png) | 搜索、分类、收藏，查看预览后使用 | 最直接，5–20份易理解；用户仍需判断选哪份 |
| [B 目标优先问答](../prototypes/multiple-workflow-concepts/B-goal-first.png) | 先说明想做什么，回答少量事实，再确认推荐流程 | 减少选错；需要清晰可解释的匹配，不能AI暗中创建 |
| [C 双工作台](../prototypes/multiple-workflow-concepts/C-two-workspaces.png) | Member activities和Executive Board各有计划列表及创建入口 | 清楚区分公众活动和内部事务；模板仍需A/B等入口配合 |
| [D 模块拼装](../prototypes/multiple-workflow-concepts/D-modular-workflow.png) | 基础流程加宣传、志愿者、出行、资金等可复用模块 | 可覆盖大量变体；模块接口、重复节点和依赖合并更复杂，适合后续 |
| [E 社团流程手册](../prototypes/multiple-workflow-concepts/E-club-playbooks.png) | 模板目录、内置起点、本社团版本、草稿／发布与岗位操作说明 | 最利于20份以上模板治理和换届；维护成本较高 |
| [F 从成功计划复用](../prototypes/multiple-workflow-concepts/F-reuse-past-work.png) | 从历史计划提取结构与审阅过的经验，重新选日期和现任团队 | 少写模板、保留经验；必须清除旧完成状态、个人归属和历史结果 |

建议先以A为创建入口、C为Plan组织结构，采用E最小的版本和快照规则；之后按实际使用补B或F，D留作更复杂变体的扩展。六个方向并非要求全部同时开发。本轮不需要用户先批准任何实施步骤，也没有自动进入实现。

外部对照仅使用官方文档：Asana项目模板支持相对项目开始／截止日的日期，说明不同流程应有自己的锚点（https://help.asana.com/s/article/project-templates?language=en_US）；monday的模板中心组织预设与自定义模板，适合参考目录入口（https://support.monday.com/hc/en-us/articles/360001362625-monday-com-templates）；Notion数据库模板以复制结构来复用，定期重复是另一项能力（https://www.notion.com/help/database-templates）。这里只借鉴模式，不比较收费方案或声称功能等同。

## 追加：连线简化、岗位分支与节点类别（2026-11-17，America/Phoenix）

用户要求直接实施，继续由Data、UI、Graph独立worktree实现、主Agent整合及Review独立复核。运行时代码`3f731a5`，保留同期附件自动草稿保存交付与其他聊天进行中记录，沿用PR14/preview14。

| 用户操作 | 当前行为 |
| --- | --- |
| 双击／双击触摸任何连线 | 无菜单、无新增、无删线、无依赖或状态写入；移除线编辑菜单及节点菜单Stop waiting快捷入口 |
| 鼠标悬浮连线 | 不高亮，默认指针。原高亮CSS保留，由MetroChart.tsx的ENABLE_LINK_HOVER=false和link-hover-enabled类关闭；恢复开关只恢复视觉 |
| 模板Done by改岗位 | 同时修改ownerRoleId、fn和placement，优先同侧／同适用条件的该岗位分支。无合适分支时新建绑定role ID的分支，同职能的不同岗位不会混为一个岗位 |
| 修改共享汇合点岗位 | Full Check、Headcount等主干结构节点留在main，仍可改岗位；避免破坏活动前后汇合结构 |
| 右侧Step details第一项 | Step type可选Core event step或Situation-based step，保存后图上颜色和可访问名称同步，刷新和Undo保留 |
| 节点前插／后插 | 新节点继承所点击节点的有效类型和原分支；显式类型优先，旧节点可从原分类或条件推导 |

岗位自动归组仅改负责人、职能及图上位置，保留全部依赖、阶段、工时、日期配置、节点类型和完整条件来源；不重写现有任务链。原有混合岗位分支不在后台全量重组，未来由明确team/role映射替换后备规则。图拖动依旧可用，前后插入从节点菜单操作；右侧既有Waits for手动依赖编辑保留。

`stepKind?: "core" | "situation"`为节点和模板共享可选字段，Schema23不重置，不自动改旧活动。类别目前与激活条件、ASU必办保护独立，原branch条件AND节点cond继续决定新活动生成；仅选择类别不会擅自勾选活动表单或改已有任务。旧节点类型按原分类和条件兼容推导。独立Review发现并修复旧条件节点跨分支移动时类型丢失的P2：移动前冻结原有效类型，最终图补丁写回；Undo能恢复原来没有显式字段的状态。

用户要求的后续接口备注已写入`WorkflowBranch.defaultRoleId`、`workflowRoleBranches.ts`、`workflowStepKind.ts`、`WorkflowPanel.tsx`及`eventChecklist.ts`：分支尽量单一团队／岗位，后续建立显式映射；situation类别与活动创建表单的条件对接需要明确匹配，不能把类别当作已确认的活动事实。

本轮分批230项相关单元/组件通过（主运行16文件229项，Review修复后5文件56项含新增1项，按唯一用例计数）。生产构建浏览器按唯一用例107通过、5项设备限定跳过；初轮112项中101通过、5跳过、6失败：新用例getByLabel精确匹配包含option文字的select，以及旧用例仍期待Full Check保护前的删除原因，均属断言前提问题。修为真实combobox可访问名称及既有必需步骤原因，并在Review修复后的最终构建重跑受影响组，45通过、3设备限定跳过。原实际节点Edit旧选择器也已随当前独立Edit drawer及Save changes流程更新，产品编辑行为未改。

前后端类型、build、lint、独立CSS、9页文字预算通过；最终构建入口`index-BdsxrOMf.js`为544,520/550,000字节，Settings147/150，未提高预算。独立岗位原函数6项检查与旧类别移动/Undo反例复验通过，无开放P1/P2。暗色双端截图已查看。没有重复全站门禁，0真实AI/邮件；合并保留同期附件自动保存与v3隔离原稿，未修改它们的实现。

日志：`/tmp/workflow-role-kind-unit.log`、`/tmp/workflow-role-kind-review-fix.log`、`/tmp/workflow-role-kind-browser.log`、`/tmp/workflow-role-kind-final-browser.log`、`/tmp/workflow-role-kind-final-build.log`、`/tmp/workflow-role-kind-words.log`。验收在[preview14 Settings](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/settings) → Workflow：双击／悬浮连线；把Content Creation从Marketing lead改为Events lead再改回；分别在蓝色／黄色节点前后插入；更改首项Step type、刷新、Undo。

## 追加：分支启用条件多选（2026-11-17，America/Phoenix）

用户反馈Add branch的Applies to不易理解，并明确要求多个checklist全部成立才启用。运行时代码`3432f52`：

- 改为 **Include this branch when**，原文说明：**This branch is included only when every selected item is checked for the event. Leave all unchecked for every event.** 下方显示Every event、单项或All N selected items must be checked.，可Clear selection。
- 使用创建活动页同一份18项清单与标签，Speaker和Partner分别选择。例如Speaker＋Travel，仅在两项都成立的活动生成该分支任务；只满足一项不生成。无选中项则所有活动都包含。列表内部可滚动，键盘可操作。
- 可选`WorkflowBranch.conditions: StepCond[]`为新配置；存在时优先，`[]`可清除旧单条件。缺少该字段才读取旧`condition`；现有节点`cond`继续与分支条件AND。Schema23及已有任务保持，模板只影响未来活动。新数组保存、活动独立快照、刷新、同分支前插与Undo均保留。
- 新数组按实际表单事实判断：food/speaker取表单对应字段，其余checklist在checks存在时要求明确true；无checks的旧活动保留派生回退。旧单条件与节点cond原规则不变。坏数组或未知条件拒绝写入，读取时不会误启用分支。
- 独立Review发现同名的显式checkbox与旧派生规则不能扁平去重。现scopeKey保留谓词来源，学校步骤移入会缩窄范围的分支时，模板、Graph及实际reducer均拒绝；真正同义条件仍可移动。独立7项原函数检查复验，无开放P1/P2。

本轮定向171项单元/组件通过；生产构建桌面/手机按唯一用例计72通过、8设备限定跳过。覆盖多选、刷新、同分支插入、Undo、原单条件、全真/部分真、空选、坏数据、暗色、Tab/Shift+Tab/Space/Escape及axe。首轮鼠标拖动测试没有先关闭Ask并将源节点滚动到可见区域，该项失败；补足测试操作后复验通过，产品拖动代码未改。没有重复全站门禁。

前后端类型、生产构建、lint及组件CSS通过；9页文字预算通过（Settings147/150），完整部署元数据构建入口543,387/550,000字节，未放宽上限。日志：`/tmp/workflow-conditions-unit.log`、`/tmp/workflow-conditions-browser.log`、`/tmp/workflow-conditions-pointer.log`、`/tmp/workflow-conditions-release-build.log`、`/tmp/workflow-conditions-words.log`。0真实AI/邮件，未修改实际任务Details或链接；同期附件自动保存工作仅保留其进度记录。

验收：[preview14 Settings](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/settings) → Workflow → Add branch，勾选Speaker和Travel，查看全部成立说明，填写名称/首项任务并保存；刷新后在新节点前插，仍属同一条件分支。以下为此前三阶段修复的交付记录，旧单选描述以上方追加为准。

---

2026-11-17（America/Phoenix）。Codex主Agent及Data、Graph、Timing、UI、独立Review五位worktree Agent。用户明确要求工作天数与排程都检查，并在方案后连续实施全部阶段；[详细方案](WORKFLOW_STABILITY_PLAN.md)先保存后执行，三个阶段均已完成。运行时代码`18d7316cd86c1e32b606afafdeb0a94064fe364e`，沿用原功能分支、PR #14及preview14，不合并main。

## 修复与使用

| 问题 | 当前行为 |
| --- | --- |
| 移动不更新 | 同分支鼠标与键盘移动同时修改保存位置和相关依赖；按实际依赖与稳定位置重绘，刷新后保持 |
| 插入跑新分支 | before/after/连线插入携带明确branchId与参考节点，首尾操作仍留在原分支 |
| 工作量数据异常 | 仅保存0–30合法整数；空白不变0，100不变30。人工确认工时后按effort策略计算开始提醒 |
| Full Check删除 | 菜单、Details删除按钮、业务写入与模板校验共用保护；旧数据缺失时其余任务仍可见 |
| 条件泄漏 | 实际适用为分支条件AND节点条件；speaker/partner、餐饮、RSVP、安全分别验证，跳过节点后的依赖正确接续 |
| 在原分支前插 | 点击分支节点的Add a step before this one，以被点击节点的分支和条件为准，不取左邻或Start身份 |
| 新增分支 | 图上Add branch填写名称、活动前/后、适用范围、默认岗位及首项任务，一次创建、保存和撤销 |

在Full Check等共享汇合点前插入，须先选 **Insert on branch**，也可双击目标分支的入线。两端条件不同的连线要求选 **New step applies to**。跨分支移动的适用范围改变要明确确认；负责人和工时保留。活动前与收尾间的跨段拖动本轮拒绝并解释。

新增分支支持平行结构：活动前Start→分支→Full Check；活动后Headcount→分支→Done。前者接入真实Full Check等待，后者首项依赖真实Headcount；虚拟站点不作为任务ID保存。没有扩展任意嵌套分支。

## 数据与兼容

模板和任务新增可选placement、startPolicy；组织保存分支定义，新活动保存自身定义快照。外层Schema23不重置，模板保存只影响未来活动；历史任务不重建、改派或重置状态。

默认标准步骤保留原校准窗口；人工工时带effort策略，按真实工作日、完整个人缓冲、假日和忙碌周倒推。保留timing的目标和依赖语义；时段不足时保留原目标和官方期限，计算可行日期并报告effort_window冲突。不改变难度标签、贡献公式或预测模型。

ASU步骤移动保留审批前置；跨分支移动保留其他分支及Full Check对该任务的真实等待。循环、过期目标、非法范围及最终保存失败整次拒绝，不留孤立任务或半个分支。图操作不能新增必需依赖错误；Details原有手动依赖编辑仍保留待修草稿和错误提示。

删除自定义分支末步时清理该分支。图Undo和Settings保存旁Undo都恢复完整定义；已有任务后来写入的外链、草稿、正文和附件保持。旧自定义节点无法证明归属时保留在 **Legacy custom steps**，不猜适用条件；用户明确移到正确分支后采用相应范围。旧缺Full Check/Headcount用显示后备连接，不自动补历史任务。

## 并行交付保留

远端实施期间合入`5758c2d`，包含其他任务已批准的实际节点Details、Edit、通用提交及onboarding设计原稿；`e704953`完整保留。冲突只合并Node可选字段和NodePatch/NODE_FIELDS，两套字段并存。

相对于该远端提交，本轮未修改`TaskDetail.tsx`、`src/taskDetails/`、`src/reminders/actionLinks.ts`；不改模板办理链接或重设计Step details。必要数值草稿、删除保护和图操作校验属于本轮范围。旧浏览器断言随同期交付从已撤下的Why this date/Sources改为单Due、真实外部入口及官方日期数据保持，没有为旧测试恢复旧界面。

## 验证

- **分批1665项单元/组件通过，1项既有全日历压力枚举未运行。** 主运行120文件1625通过、1项测试前提失效：更严格的ASU保护使该模拟移动先被纯函数拒绝。将UI事务反例改为真实“切断审批连线”，继续断言合法DAG补丁被模板必需依赖保护拒绝；修后该组件6项全过。另跑校准表39通过、1已知慢枚举跳过。数字按唯一用例统计，不重复相加；没有再次完整运行npm run check。
- **最终整合生产构建浏览器76通过、2设备限定跳过。** 覆盖新工作流、共享汇合点、混合条件、鼠标和键盘、旧缺Full Check、实际活动完整分支Undo、原设置/Plan，以及同期通用提交、Edit、多附件和包预算。跳过手机下桌面指针手势及重复平板场景。
- 前端TypeScript/生产构建、后端TypeScript、lint通过；九页文字预算通过，Settings147/150。以完整运行时提交、原分支及deploy-preview元数据构建，入口`index-Dd9mUpnN.js`为 **544,207/550,000字节**；流程纯规则独立缓存，没有提高上限。
- 独立Review发现并推动修复2个P1、2个P2：核心任务移入条件分支、移动丢失Full Check等待、Settings Undo残留定义、活动Undo残留定义。原样反例复验后无开放P1/P2。增量Review用真实reducer验证新增分支后保存原任务新外链/草稿，再Undo分支，最新内容保留。

日志位于`/tmp/workflow-integrated-unit.log`、`/tmp/workflow-final-fix-unit.log`、`/tmp/workflow-integrated-browser.log`、`/tmp/workflow-integrated-build.log`、`/tmp/workflow-release-build.log`、`/tmp/workflow-integrated-lint.log`、`/tmp/workflow-word-budget.log`。本地构建和虚构数据；0真实AI/邮件。未验证Safari/iOS真机或完整全站浏览器门禁。

## 用户验收

GitHub提交状态已确认运行时代码`18d7316`的Netlify deploy-preview为 **success**，对应下方既有preview14地址。后续文档提交不改变运行时行为。

[preview14 Settings](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/settings) → **Workflow**：

1. 把Promotion Items移到Content Creation前，刷新确认顺序保持。
2. 在Speaker首节点前插；再从Full Check前插，明确选目标分支。
3. Add branch建立Guest support，选Speaker/partner范围及首项任务；继续前后插入、刷新、Undo。
4. Days of work清空/填100不能保存成0/30；填10正确保存，未来活动开始提醒按人工工时计算。
5. Full Check不能删除；既有实际任务的提交和附件不受模板编辑影响。

模板链接、Details易用性及原目标时间字段的界面语义仍留待后续讨论。真实后台邮件、跨设备、任意嵌套流程及旧自定义任务自动猜分支未扩展。需要同步本地备份。
