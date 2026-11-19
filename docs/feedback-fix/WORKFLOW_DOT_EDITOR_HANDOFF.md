# Settings 点状团队泳道交付

2026-11-18（America/Phoenix） · Codex 主Agent、Model、Canvas、Browser及独立Review。

运行时代码 `cc1fbe9481dc3c7416b4fb1b8098f8147e88ff80`，起点 `d5b4025`，沿用原 `claude/fervent-thompson-e2j5u2` / PR14。Netlify已确认本运行时的deploy-preview为success，验收入口：[preview14 Settings](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/settings) → Workflow。本轮没有合并main。

## 交付行为

- 卡片编辑改为圆点、灰色平行轨道与半透明团队底卡。团队ID唯一，一队一个容器，包含空队；任务多于8个在同一个底卡内续行，画布最大宽924px，工期不再拉长画布。支持Fit及86%–160%缩放；最小缩放的14px节点文字视觉仍约12px，手机内部滚动而不撑宽页面。
- Start / Done始终为固定虚拟端点，空模板也有灰线；它们不加入任务数组，不生成工时、成果或提醒，也没有预设按钮。
- `+ Task`直接新增并打开右侧Details；每条团队分支也有`+ Add node`。Add branch直接创建组织团队和空平行轨道，默认Team N，可在团队标题直接改名；新分支后点`+ Task`会进入新团队。
- Full check / Event day均可反复添加，每次独立UUID。Event day默认T0、零工作日，是可单独编辑的普通目标节点，不冒用唯一活动日期站点，也不创建第二个活动日期。
- 鼠标和触屏均可把圆点拖到其他团队或空队；Team下拉提供相同操作。跨团队改派复用团队基础`assignStepsToTeam`，只改映射，保留原角色、条件分组、依赖、日期及工作量；整次操作可Undo。
- 主动同队重排只调整该节点所在的原有简单顺序链；独立任务和分叉图保留并行，单纯原位拖放不写任何更改。显示顺序用placement.order保存，显式依赖仍优先，环和标准校规仍拒绝。
- 新编辑草稿/版本采用`teamExecution:dependencies`，不因打开页面或改团队而串起同队所有工作。旧sequential已发布版本、既有活动、任务ID/成果/日期和提醒入口不回写。Quick entry、模板复制、默认模板、草稿保存和版本实例化保留。
- 保留原业务条件分组，在Details的Include with中编辑；用户所说团队branch通过teamMap表达，避免拖团队同时改变任务适用场景。学校必要步骤、前置和官方日期继续受原验证保护。

团队基础代码已经在当前功能分支；旧`TEAM_WORKFLOW_ADAPTER_READY`中“未正式接入”是当时的历史说明，不能再视为本轮状态。此次复用了其团队身份/映射与编译，而非用投影覆盖Role/Person全记录；People设置没有重做。

## 独立复核与修复

1. 旧队内重排函数会把轻微原位拖动也变成全队串行。现已比较顺序并只重连原简单链；独立、兄弟和无关节点不新增依赖。独立Review通过实际保存、发布、JSON重载与生成活动复核。
2. 已打开的Teams表单可能覆盖画布刚创建/改名的团队。保存前现比较团队及角色映射的来源快照，变化时拒绝覆盖并保留本地输入；浏览器复核团队数4→5→5、本地未保存名称保留，3项组件回归通过。

## 验证

- 最终21文件209项单元/组件通过，覆盖团队基础、模型/布局/指针、编辑器、模板存储与版本、条件/政策、旧sequential排程/预测、Rail和Teams冲突保护。
- 3个浏览器spec，按唯一设备用例计34项通过、无跳过。最终构建上dot-editor+compact两组桌面/手机18项全过；原workflow-builder两端16项此前已过，功能路径未另行修改。最早两项容器误计来自旧构建的轨道testid前缀，最新构建已复验，不重复累计。
- 实际鼠标及CDP触屏跨队/空队、同队重排与Undo、拒环、46任务四容器及原依赖、重复Event day到独立Plan任务、版本/活动成果隔离、草稿刷新/离页、目标/工期和浅深两主题已检查。严重/关键axe为0，无页面横向溢出或脚本错误。
- 最终lint、前后端类型、生产构建、三个独立CSS文件及9页字数通过；Settings147/150。生产入口495,864/550,000字节，未提高门槛；未重复无关全站门禁。
- [真实生产构建截图清单](../prototypes/workflow-dot-editor/manifest.json)：desktop-canvas为完整46节点画布；另有桌面/手机、浅/深、未选中总览和Details。均为实际页面截图，非生成示意图。交互验收基于本地相同生产构建，线上部署依据Netlify返回的success状态。

## 下一位接手

主要文件：`src/components/workflowBuilder/{WorkflowBuilder,DotWorkflowCanvas,dotLayout,dotModel}`、`src/components/workflowLibrary/`、`src/data/workflowTemplates.ts`及`WorkflowTemplateContent.teamExecution`。设计正本见[本轮契约](WORKFLOW_DOT_EDITOR_CONTRACT.md)，测试见`e2e/workflow-dot-editor.spec.ts`、`workflow-compact-sequence.spec.ts`与`workflow-builder.spec.ts`。

灰色团队轨道只表示团队路径；真实前置关系选择节点可见，Show all prerequisites显示全部。操作团队归属不得直接调用旧按岗位换业务分支的函数。已有明确依赖不能仅为视觉紧凑而删改。新增团队是组织实体，会出现在各模板，不是单模板临时标签；旧版本的活动团队快照继续独立。

当前仍为同浏览器保存的原型，不新增真实AI、邮件、服务器账户、跨设备数据或研究日志类别。0真实产品AI/外部邮件。PRODUCT_PLAN / RULES / PROGRESS已同步；需要同步本地备份。
