# Settings 点状团队泳道编辑器

2026-11-18（America/Phoenix），Codex。用户已要求全面实施，沿用 `claude/fervent-thompson-e2j5u2` / PR14 / preview14；不合并 main。

## 本轮明确设计

- Settings → Workflow 使用紧凑圆点、灰色轨道和半透明团队背景，复用实际 Plan 点状流程与现有团队基础的身份/分组规则。
- 每个团队恰好一条泳道，空团队也显示。同队在活动前后不复制行。团队名称可改，ID保持。
- 每份新工作流都有固定 Start / Done 虚拟端点和灰色连线；它们不是实际任务，不生成邮件/工时/成果，也没有预设按钮。
- Add task 一键新增并选中，节点可跨团队拖动；下拉提供同等操作。Add branch 一键新增一个团队及空平行线，可立即改名/加节点；角色与团队关联继续明确选择。
- Presets 包含 Full check 与 Event day。可重复添加（包括两个 Event day），每个真实任务有独立稳定key；不按标题去重，不冒用标准工作流保留key。
- 当前团队基础 `src/teamWorkflow/` 已在功能分支。跨团队改派只改teamMap，不改原岗位/条件/日期/依赖；旧业务条件branch与团队轨道分开。
- 新编辑保存为显式 dependencies 执行模式，不再因打开或改团队而自动把所有同队任务串成一条长链。已有明确依赖保留，主动同队重排仍须通过循环/政策检查；旧已发布sequential版本和既有活动保持原快照。
- 画布提供适应宽度/缩放、紧凑节点及两行短标题；完整名称、工期、目标、条件和说明在右侧编辑。保留Quick entry、Undo、草稿/版本保存、模板复制及实际Plan实例化。

## 文件负责人

- 主Agent：WorkflowBuilder、WorkflowLibrary接入、文档、最终集成/浏览器/推送。
- Model Agent：types、workflowTemplates、dotModel纯命令与针对性测试。
- Canvas Agent：DotWorkflowCanvas、dotLayout、独立样式和针对性组件/布局测试。
- 独立Review：最终只读复核；问题交原负责人或主Agent修复。

主Agent统一集成独立worktree提交；不并行写相同文件，不增加真实AI或邮件调用，不修改正式站点。

## 验证重点

空模板Start—Done；一键任务/空branch；重复Event day；鼠标和触控跨队拖动、团队改名/刷新/Undo；移动不丢依赖/条件/岗位/工期；标准校规保护、旧版本和既有任务不回写；保存版本后实际Plan生成；双端浅深色、键盘、严重无障碍/无横向页面溢出，以及相关单元/类型/构建/样式/字数与入口预算。
