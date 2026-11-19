# 人工工作流编辑器实施方案

2026-11-18（America/Phoenix）。用户确认②主界面＋①快速录入均在Settings → Workflow；Plan使用点状轨道图。本轮明确授权worktree多Agent连续完成编写和代码修改，不涉及main合并。

## 阶段与文件责任

1. **数据与身份契约**：Data Agent维护types、workflowTemplates纯函数与playbooks显式自定义生成。模板ID、不可变版本、稳定步骤key、执行run、独立任务ID；旧v23惰性兼容，无全库重置。
2. **并行实现**：Editor Agent负责新建受控WorkflowBuilder（时间轴/团队泳道/真实依赖线、清单批录、详情字段、前后/并行新增、Undo）；Execution Agent负责真正New Event表单与审批的模板版本选择及原子实例化；Lanes Agent按最终独立teamWorkflow快照接入N队N道、Plan圆点通用DAG；主Agent负责Settings目录/草稿/保存/复制/默认模板、明确团队配置和store持久化。
3. **集成与独立审阅**：Review Agent先审加载/预算/Undo风险，再跑端到端场景。主Agent按依赖顺序cherry-pick代码，解决交界问题，跑必要单元、类型、lint、build和桌面/手机功能验收，保留其他对话更新，推同一PR14预览。

各Agent独立worktree和文件所有权，不跨改共享文件；不自动发布main、不自动调用AI或发送邮件。其他预设模板（Volunteer、Partnership、Field trip等）在本编辑器验收后另行制作。

## 数据约束

- Org附加可选workflowTemplates/defaultWorkflowTemplateId/workflowTeams/workflowRoleTeams，不抹掉旧Role/Person/职责/历史或组织设置。
- 模板保存name、steps、branches、团队映射；草稿允许不完整但必须保留，发布需非空任务、有效岗位/团队、时长/相对日期、依赖无悬空与循环。标准学校流程使用原政策保护，自定义不强塞31项标准core。
- 步骤key是稳定身份，新步骤用UUID，改名称/位置/团队/主责不换ID；旧标准key保留政策语义。跨模板以templateId＋key区分，同模板跨版本保留步骤身份。
- 版本不可变。创建活动固定所选版本，记录workflowRun与任务图快照，为适用步骤批量生成taskId并转换dependsOn；同一次创建重试幂等，不追加重复任务或覆盖进度。
- Plan圆点绑定实际taskId；模板和活动实例分开，活动间材料/状态不共享；后续模板修改不改变已有活动。
- 组织团队显式创建/确认；岗位→团队是独立映射，不根据岗位名称猜。N队N道含空队，未分组是待处理问题而不是额外泳道。团队、岗位主责、业务分支、依赖是独立维度。
- T±是相对日历日，时长是工作日，具体日期由现有规则引擎计算。双击依赖线无操作，黄色hover继续关闭；类型继承并保留未来活动checklist联动TODO。

## 验收场景

- 空白模板用快录建立5–8任务，切时间轴仍是同一数据；修改名称/Details/岗位/时长/T±/前置/类型，明确前后/并行新增；依赖连线可读，拒绝循环，Undo可恢复。
- 明确团队后恰好N条泳道，含空队；同队活动前后不拆行；跨团队改派保留依赖/岗位/条件。
- 保存发布后刷新仍在；创建活动可选模板和固定版本，生成实际任务圆点，点击进入现有任务详情。
- 同模板创建两活动，taskId、截止日、材料与进度彼此隔离；重试无重复；模板v2不会重写v1活动；旧活动与旧任务链接保持。
- 桌面/手机、键盘、浅深色及严重/关键可访问性检查；不把2–3分钟目标写成已经实测达成。

## 交付记录

实施中。最终提交、检查证据、已知限制与预览入口完成后补充。
