# 人工工作流编辑器实施方案

> **2026-11-18 用户最新选择：** Settings现改为每团队一条顺序链与132×52固定小卡，仅短标题＋T标签；拖动重排、Details改日期，移除同队并行入口。新模板版本显式启用顺序排程，旧版本/已有活动保留；详见[当前交付记录](WORKFLOW_STABILITY_HANDOFF.md)。下方旧时间比例拖动及并行说明作为历史保留。

2026-11-18（America/Phoenix）。用户确认②主界面＋①快速录入均在Settings → Workflow；Plan使用点状轨道图。本轮明确授权worktree多Agent连续完成编写和代码修改，不涉及main合并。

## 团队默认修正（2026-11-18）

用户指出此前编辑器没有一并准备默认团队，导致原模板需要重新归组，明确要求恢复原工作流分工。当前默认直接提供四类必需团队：Club leadership（Full Check，1任务）、Operations（活动、Speaker/Partner、特殊事项与归档，25任务）、Marketing（含活动后宣传，8任务）、Finance（含结算，12任务）。这些数字只描述原46项预设，用户自定义任务/显式改派保持其设置。

`src/data/workflowTeamDefaults.ts`保存生产默认表及幂等初始化；`Org.workflowPresetTeamIds`把语义槽关联到稳定teamId，名称是可编辑标签。优先保留已有显式岗位/团队ID和手工步骤映射；旧四队规范标签可在无关联记录时一次沿用原ID，建立关联后改成任何名称均不重新匹配。未知任务不按名称猜归属，未分配岗位保持空缺，不创造人员。

新浏览器、旧v23加载、Reset/新建工作区都可直接使用预设；初始化只增加组织sidecar，不重建任何任务、历史版本或活动快照。团队必需引用受保护，可自由改名/加队；标准模板编辑和新活动实例化共用同一个缺失映射补全，已发布版本不就地重写。移除“一岗一队”初始化入口，通常无需再点Apply role teams。验收直接Settings → Workflow，Teams仅用于改名称或新增。

219项单元/组件、26项唯一双端浏览器通过（含默认即用/四队任意改名和刷新/Plan套用、旧学校保护/Undo/类型继承）；与同期邮件Plan实现合并后再过16项单元/组件及4项双端。生产构建、类型、lint、9页字数和diff通过；具体见[本轮JSON](workflow-preset-teams-verification.json)。不改规则日期/Task Details/网站链接，不改schema23，不合并main，需要同步本地备份。

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

已完成本轮实现与独立审阅；原功能分支/PR14待用户验收，不合并main。数据、编辑器、执行、泳道、独立Review和旧测试迁移共6个Agent独立worktree，主Agent维护Settings/store/契约和最终集成。

### 实际文件与行为

- `src/data/workflowTemplates.ts` / `types.ts`：100份模板上限；稳定ID/不可变版本/草稿、复制与内部引用重映射、权限及发布校验、当前岗位解析、团队/run/source快照与幂等生成。`playbooks.ts`显式区分standard/custom；旧标准的学校政策保留，custom不补31core。
- `src/components/workflowLibrary/`＋`Settings.tsx`：新建空白、命名、复制、默认模板、自动草稿/保存版本与明确团队配置；第一进入时收起通用Ask以保留编辑空间，选任务打开共享Details。团队是Org sidecar，原Role/Person记录不覆盖。
- `src/components/workflowBuilder/`：两种同数据视图；工作日时长与T±字段，按规则引擎预览，连接/防循环、节点前后/并行、业务条件分支/AND及汇合点选支、Undo。水平拖动只平移真实日历目标/校准窗口，不改工时/依赖/岗位/团队/条件；学校或business-unit目标拦截并说明。空白泳道可触屏滚动。
- `AskPanel.tsx` / `ChangeCard.tsx` / `changeReview.ts`＋store：真正New Event与审批保留选择的明确版本，fresh校验失败不写Approved；过滤操作时重映射选择的index，重试不重复；custom新建/改日期不自动收费检查。
- `src/teamWorkflow/` / `TeamMetroChart` / `teamMetro`：引入已独立验证的最终基础快照；有明确团队的执行一team一泳道含空队、真实taskId圆点/依赖；旧标准未分组使用原图。未分组临时任务仍可在问题区打开，不凭空新增泳道。新点图不显示无效Edit flow。
- `store.tsx` / `settings.ts` / `schedule.ts`：v23旧加载与任务链接保留，新执行不回填core；新建工作区清理上一工作区模板sidecar。custom明确T0/T+目标允许当日/之后，标准学校截止检查保持。Rail刷新表单不重新打开已隐藏侧栏。

### 修复验证中发现的问题

草稿Undo曾把临时插入当成永久学校要求，现以已发布版本为保护基准；branch ID改为b-UUID满足字母开头/长度要求；修复自动保存触发详情刷新后重开手机栏；移除Plan新点图无效编辑入口。既有四份workflow e2e迁移到新版控件，保留学校政策/分支范围/工时/继承/Undo/刷新及旧真实Plan手势覆盖。

### 验证与证据

最终运行时提交`ab3fa29`（含`2ad6a42`拖动），独立Review验收快照`081483e`。27文件368项相关单元/组件通过，1项旧全checklist慢枚举未跑。16项新增双端及41项旧工作流浏览器通过，1项手机鼠标限定跳过，按唯一用例计57通过；受影响功能在最后小修后限定复验，重复不再计数。production Today入口预算另有双端2项通过。严重/关键axe为0、pageerror为0，真实CDP触屏与鼠标已实测。

完整lint、前后端类型、生产build、4份特性CSS与9页字数通过；Settings147/150，entry本地492833/550000字节，未改门槛。分包共享纯规则保持4个初始JS请求，实验总初始JS增加391字节(0.053%)，改善缓存边界及入口大小，不声称减少总下载或解析。具体[JSON记录](workflow-builder-verification.json)；实际[编辑器截图](../prototypes/workflow-builder-implemented/settings-editor-desktop.png)、[Plan圆点截图](../prototypes/workflow-builder-implemented/plan-dots-desktop.png)已查看。

验收入口为原preview14：`/#/settings` → Workflow（默认四类团队和标准任务归组已就绪，Teams可选改名），New workflow → Quick entry批录 → Timeline检查/详情/前置 → Save version；`/#/events` → New event选模板，确认后打开任务圆点。未分组的旧标准可继续按原路径创建；只有已保存版本能被新活动使用。

### 当前边界

仍是同一浏览器本地持久化，尚无跨设备账号/服务器模板数据库；每活动UI当前选一份模板，多模板合并单活动需另做设计。保留现有Speaker预设，不自动制作Volunteer/Partnership/Field trip等。AI仅为后续拓展，本轮0真实AI/外部邮件。2–3分钟搭建为待真人计时目标；复杂同队连线可能交叉，可通过选中和前置列表查看真实依赖，后续可改善路由。P1人员卡基础代码随模块引入，未将其挂载为完整onboarding改版。

本环境对GitHub API和Netlify预览的HTTP请求为403，不能核实线上CI或部署完成；Git功能分支仍可正常推送，沿用PR14。需要同步本地备份。
