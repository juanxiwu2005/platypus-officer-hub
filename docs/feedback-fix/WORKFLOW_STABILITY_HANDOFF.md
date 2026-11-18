# 工作流模板修复交付

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
