# 邮件进入活动 Plan，并在右侧展开任务

2026-11-18（America/Phoenix）· Codex · 两张静态参考图，待 Juanxi 批准后实施

## 本轮要求与范围

Juanxi喜欢上一轮展示的提醒邮件，但指出单独任务页不便查看其他成员在不同节点提交的信息。新方向：邮件进入对应活动的 Plan，右侧 Details 自动展开目标任务，成员可直接点其他节点查看资料。

本轮仅阅读现有实现并生成两张静态图片；没有修改产品代码、邮件 URL、授权、存储、提醒规则或 Settings 模板，没有开始后续实施。沿用原功能分支/PR #14，不创建 PR，不合并 main。保留另一对话已记录的 Settings 编辑器与 Plan 点状执行界面边界。

## 两张图是同一条路径的两个状态

1. **邮件 → Plan 中的订房任务。** 左侧 Plan 导航选中；中间是 Speaker Night 的点状流程图，自动定位并高亮 Reserve a room；右侧 Details 同时打开。保留一个 Due、负责人、状态、具体要求、多个相关外部入口、统一 Details 大文本框、附件及自动草稿；无需再找活动和任务。
2. **点击其他节点 → 查看成员提交。** 同一张图上点 Event requirements，右侧切换为 Maya 已提交的活动人数、时段、无障碍和设备要求，以及附件。Jordan可以读这些团队共享成果；自己的订房节点仍可见，右侧有轻量的 Back to Reserve a room 入口。

这两张是连续使用状态，不是两个互斥的界面方案。图中的人物、活动、日期、工作流和提交内容均为虚构说明，不是研究参与者资料或规则计算结果。桌面保留可操作流程图与 Details 并列；没有用弹窗遮住其他节点。

## 现有代码可复用什么

- `src/routes.ts`：Plan 对应 `/events`，含 Events/Tasks 的现有导航。
- `src/pages/Events.tsx`：已按 `event` 参数选择活动；`MetroChart.onSelect` 调 `rail.show({kind:"node",id})`；`selectedId` 用于图中当前节点。现有逻辑尚不读取邮件所需的任务选择参数。
- `src/components/rail/RailContext.tsx`：`show()` 可直接打开右列并选中 Details；目前选择主要在内存中，未来需处理刷新/回退后的目标恢复。
- `src/components/rail/Rail.tsx` 与 `src/components/TaskDetail.tsx`：可沿用共享任务详情；不新增另一套表单。
- `src/taskDetails/TaskSubmission.tsx`：已有他人已提交内容和附件的只读展示，自己的正文/文件使用现有自动草稿；私人未提交草稿不应因为切换节点而被他人看到。

代码核对基线为运行时 `bebe999`，本轮开始前同步至文档提交 `8cc68be`；这两张不表示后续路由功能已经实现。

## 批准后再处理的行为

- 邮件入口携带对应活动与稳定任务 ID，进入后强制显示适当 Plan 视图、打开右列并定位节点；不能被上次记住的 List/Budget 视图隐藏目标。
- 切换节点、刷新、浏览器前进后退保持一致的选中状态；节点失效/改派时给出可恢复说明，不错误打开其他活动的首个任务。
- 原始邮件任务可轻量返回；同一时刻只展示一个 Details 面板。
- 保持自己草稿与已发布成果独立，跨节点切换继续沿用自动保存；查看其他成员已提交信息不会获得修改其任务的权限。
- 邮件现有 token 仅授权特定任务，**不能把它当作全社团登录身份**。查看其他节点的团队资料需要已有成员会话，必要时先登录并保留原目标。具体身份接入需实施阶段确认，不在图里承诺现有跨设备链路已完成。
- 桌面两列并列；手机继续适配现有 Details 全屏方式，需提供返回 Plan/节点切换入口；本轮两图未单独设计手机。
- 本轮不改变上一轮邮件里的多个入口；若最终采用 Plan a start / Ask for help，它们也应进入同一 Plan 的目标任务上下文，具体子视图另行确认。

## 图片与验收

- [图1：邮件进入 Plan 并展开订房任务](../prototypes/reminder-plan-entry/01-email-opens-plan.png)
- [图2：切换到其他成员的已提交节点](../prototypes/reminder-plan-entry/02-view-teammate-submission.png)
- [图片清单](../prototypes/reminder-plan-entry/manifest.json)

只校验静态图片、文档链接和差异范围；没有产品行为改动，不运行产品测试、不发送真实邮件。待用户审图批准后，再实施邮件入口及相关 Plan 交互。
