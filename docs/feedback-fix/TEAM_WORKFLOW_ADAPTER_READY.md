# 给模板库/人工编辑器对话：团队泳道预备代码已完成

2026-11-18（America/Phoenix）。Juanxi 已明确选 P1，并要求先写独立代码，等当前模板库/编辑器完成后再统一适配。本条取代 PROGRESS 中本任务的“进行中”开始记录。

## 代码在哪里

- 独立分支：[`feat/team-swimlane-foundation`](https://github.com/juanxiwu2005/platypus-officer-hub/tree/feat/team-swimlane-foundation/src/teamWorkflow)
- [完整接口、范围与接入交接](https://github.com/juanxiwu2005/platypus-officer-hub/blob/feat/team-swimlane-foundation/docs/feedback-fix/TEAM_WORKFLOW_FOUNDATION_HANDOFF.md)
- [检查记录](https://github.com/juanxiwu2005/platypus-officer-hub/blob/feat/team-swimlane-foundation/docs/feedback-fix/team-workflow-verification.json) · [P1桌面/手机/深色截图](https://github.com/juanxiwu2005/platypus-officer-hub/tree/feat/team-swimlane-foundation/docs/prototypes/team-workflow-foundation)
- 完整源代码提交是 `2d24427` + `8d55107`，交接补充 `863b48a`。不要只取前一个提交；推荐后续整分支合并，或明确按路径引入最终 `src/teamWorkflow/` 快照。处理 PROGRESS 合并时保留当前对话最新记录。

当前功能分支仅同步本说明及进度；没有合并源代码，不会改变另一对话正在开发的编辑器，也没有新增正式入口/存储迁移。预备分支不新建PR，不合并main。

## 必须遵守的最新选择

1. P1 人员卡：职位、姓名、邮箱保留；Team 与 Reports to 独立可改，Add direct report 创建下级。拖入团队不改上级；改上级不改团队；防自我/后代循环；负责人移出后显示空缺，不自动选别人。
2. **N个团队恰好N条泳道**，含空队；同队活动前后、不同工作包或分支不能拆成多条团队泳道。A参考图里多条Operations必须合一条。未分组任务是待处理问题，不是额外泳道。
3. 泳道归属和业务分支独立。部门渐变只表达团队；蓝/黄站点继续表示步骤类型。跨团队依赖保留，复杂并行可在同一个团队容器内布局。
4. `compileTeamLanes` 生成唯一团队行及完整依赖；`assignStepsToTeam` 只改sidecar映射，不改原任务、条件、工作量、日期、placement或具体执行人。
5. 不把团队操作接到现有 `reassignWorkflowStep`；那条路径按岗位换分支。新布局继续复用你当前编辑器的横坐标、连线、条件/政策验证、Undo和草稿事务。
6. `directoryFromLegacy` 只是只读投影，**不能覆盖旧 Role/Person 记录**而丢掉职责、章程来源、历史等字段。章程AI识别保留，团队映射需明确确认，不用职能/岗位名猜。
7. 模板库未来版本快照应一起保存映射；`graph.ready`仅表示归属和基础引用可用，不替代权限、政策、条件作用域、日期检查。组织和模板数据迁移、正式入口挂载、活动个人负责人分派都留到统一适配阶段。

28项单元/组件通过；隔离浏览器真实拖拽、联系方式与多层汇报、5/7行和46任务、320/390触控、浅深色、严重/关键axe及0脚本错误已检查；全站lint、独立CSS、前端类型和生产构建通过。当前46任务及原依赖未改，0真实AI/邮件。需要同步本地备份。
