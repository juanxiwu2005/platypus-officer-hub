# 一日／两日日期主线工作流交付

2026-11-18（America/Phoenix） · Codex / Model / Canvas / Commands / Browser / 独立Review。

运行时代码`7b3f5fc`已确认Netlify preview14为success；用户已批准将交互设计直接接入原[preview14](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/settings) → Workflow，仅一日／两日。沿用原分支与PR14，不合并main。下文覆盖旧`WORKFLOW_DOT_EDITOR_HANDOFF`的当前设计，不追溯改写历史。

## 已接入的操作

- Workflow length仅1-day / 2-day。新模板默认Start—Event day—Done；两日可各自命名，Day2调整相对Day1偏移，预览日期与实际活动日期分开。
- 全部node是可点击按钮：Start/Done编辑名称和说明；每个Event day编辑名称/说明/相对日期；共享Full check与普通任务编辑完整名称、团队分支、岗位、工期、相对哪一天的完成目标、业务条件、说明和前置。
- Add branch在右侧选已有Team、Starts at、Joins at后创建。可在活动前、Day1与Day2之间、最后一日之后安排工作；同team可有多个局部分支。画布下拉只改本branch的团队，团队目录仍从组织设置管理，画布不创建/改名组织团队。
- `+ Task`一键新增；每条branch也有`+`。空模板在已有组织团队下创建第一条branch；未分配旧草稿可以逐项修复，清空团队保存为缺省map而非非法空值。Full check新增真实共享任务；Event day最多两个，始终是日期站点。任务鼠标/触屏跨branch拖动，保留真实任务ID、条件、岗位、工期和外部前置；改变区间时更新所选Event day，原相对偏移可在Details调整。Undo还原整次事务。
- 主线与灰色分支按连接关系排布，半透明卡只覆盖该branch区间；密集任务局部续行。Fit/缩放、内部滚动、完整名称的可访问标签、Quick entry、保存草稿/版本、复制/默认模板保留。

## 日期与快照

新可选`WorkflowTemplateContent.milestoneGraph.version:1`保存端点、1/2日、主线、团队分支与每任务日期锚点。每个真实step恰好出现一次，组织teamId与stepTeams一致，保存/发布/执行均验证；派生分支依赖与原前置联合后不能成环。复制自定义模板重映射真实taskID，活动运行快照保存团队、版本与日期图，不依赖之后修改的模板。

新graph运行使用受控独立排程：规则引擎算固定Day1/Day2、相对calendar/business目标、负责人工作日和完整缓冲。上游计划晚于任务开始、目标/工时落在branch起止区间外均明确报风险，不移动里程碑来隐藏冲突；ASU官方日期与社团缓冲仍相对真实Day1，不能借Day2延后。不是“配置好图就保证能完成”，用户仍需给任务留出合理时间。

已有无graph/sequential版本和已有活动保持原算法、实际任务、成果、提醒记录及学校规则，schema23不重置。Plan对新graph快照复用相同布局，按`workflowSource.templateStepId`映射真实任务id，条件筛选未生成的任务从图投影移除而不丢真实额外任务。任务点击仍打开原Task Details并遵守原权限。Plan的Event day/Start/Done显示快照来源与固定日期，仅模板编辑器修改定义；它们不生成业务任务、工时、成果或提醒。

## 复核修正

独立Review已复核团队清空/新增的映射一致性、Apply role teams原子同步branch、Full check不强行接入晚于检查点的工作、删除Day2或Undo后的选中状态。已修正并补回归；旧团队名不能在画布任意输入，不能自动建立Team N。未修改提醒、邮件、交接功能；0真实产品AI/外部邮件。

## 验证与接手

最终23文件210项相关单元/组件通过；覆盖图完整性/循环、固定各日排程、学校Day1硬限、条件过滤、复制与版本隔离、全节点编辑、未分配团队、真实任务投影及初始/选中定位。lint、前后端类型、生产build、独立CSS与9页文字预算通过，Settings145/150，入口498,362/550,000字节。桌面/手机按唯一设备用例计46项浏览器通过（新12＋原编辑34），最终颜色修正后受影响Plan/链接/两主题4项再验全过，不重复累计。包括真实鼠标/触屏跨分支、重排/Undo、全节点Details编辑刷新、发布到真实Plan、各日任务具体日期、旧活动/成果/提醒历史保留、严重/关键axe为0和页面无横溢出。初轮正文标签定位与旧steps依赖断言已按可访问名称/graph正本修正并复验，保留对实际生成依赖、旧活动和原任务事实的独立断言。未重复无关全站门禁，0真实AI/外部邮件。详见[检查记录](workflow-milestone-verification.json)与[46项去重明细](workflow-milestone-browser-cases.json)。

[真实生产构建截图](../prototypes/workflow-milestones/manifest.json)已目视复核，包含标准46任务、一/两日编辑器双端浅深与实际Plan。线上部署按Netlify提交状态核验；云端全新浏览器访问原preview会进入Netlify edge-access，未绕过访问控制。交互检查在相同生产构建本地执行。

主要代码：`workflowBuilder/{WorkflowBuilder,MilestoneDetails,MilestoneWorkflowCanvas,milestoneLayout,milestoneCommands}`、`workflowLibrary/WorkflowLibrary`、`engine/workflowMilestones`、`schedule.planMilestoneEvent`、`data/workflowTemplates`、`flow/MilestoneExecutionChart`。

验收：Settings → Workflow → New workflow；切2-day，逐个点Start/Done/两个Event day和任务改Details；Add branch选择现有Team及各段起止；新增/拖动/Undo，Save draft刷新；Save version后新建活动选择该版本，在Plan验证真实任务可办理、日期站点显示固定日期。旧活动不随模板改动。

当前仍是同浏览器原型，不含真实发送服务/服务器账号/跨设备同步。PRODUCT_PLAN/RULES/PROGRESS同步，需要同步本地备份。
