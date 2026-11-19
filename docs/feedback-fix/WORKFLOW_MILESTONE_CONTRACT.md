# 一日／两日里程碑工作流实施契约

2026-11-18（America/Phoenix），Codex。用户已批准交互方案接入原preview14，仅1-day / 2-day、不做3-day；所有可见node都可点击在右侧Details修改。

## 用户批准的结果

- 主线保留Start / Done、共享真实任务与日期里程碑；分支可在主线上分出、汇合。Event day前后可有团队工作，两天之间也可有工作。
- 每个Event day独立稳定ID、名称、相对Day1日期和说明；固定日期不会因前面任务未完成而推迟。实际日期由规则引擎用活动日期和偏移计算。
- 每个branch引用组织里已有teamId，从下拉框选；不在画布改组织团队名称，不自动新建Team N。同团队在不同区间可重复负责多个branch。
- Start/Done是固定边界，不是成果任务；也可点击Details编辑名称与说明。真实任务可编辑名称、负责团队/岗位、说明、工期、相对某Event day的目标与前置。共享检查任务同权。
- Add branch选择负责团队、从何处开始和在哪里汇合；团队边界与旧业务条件branch独立。新增/插入/跨branch拖动/Undo/保存草稿与版本、刷新恢复保持。

## 数据与兼容

WorkflowTemplateContent.milestoneGraph为可选version1元数据，包括start/done说明、最多两个eventDays、spine引用、teamBranches与taskAnchors。真实任务仍在steps，不复制任务。图中每个step必须恰好出现在spine或一个团队branch，所有团队/连接引用都校验。

taskAnchors保存eventDayId、offsetDays与可选calendar/business单位；学校官方规则继续相对Day1计算，不得通过选择Day2放宽硬限。新版graph执行有受控的独立日期路径；旧无graph和sequential活动保留旧算法。版本快照、复制及实例化保留图关系，已有活动/成果不回写，不重置schema23。里程碑不生成业务任务，不发提醒；未完成前置只报风险。

## 文件负责人

- 主Agent：Builder/Library与右侧Details、新增/移动命令、文档、集成和最终推送。
- Model：共享types、workflowTemplates、新engine/workflowMilestones、必要schedule与针对测试。
- Canvas：新MilestoneWorkflowCanvas、milestoneLayout与独立CSS/测试，不改Builder/Library。
- Browser：新milestone e2e与当前编辑器受影响回归；独立Review最终只读复核。

普通日期、负责人和队伍仍通过既有受验证操作保存；不能把像素位置当日期。保留同期提醒修复ef0d0d0，不修改提醒/邮件/交接实现。沿用原PR14/功能分支，0真实产品AI/外部邮件，不合并main。
