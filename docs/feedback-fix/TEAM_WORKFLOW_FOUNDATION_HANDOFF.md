# P1 人员卡与一队一泳道：独立基础代码交接

2026-11-18（America/Phoenix） · Codex · 用户已选定方向并授权写基础代码；正式接入等待另一对话的模板库/编辑器完成。

代码分支：`feat/team-swimlane-foundation`。基于原功能分支 `55d8129`；开始记录 `24c69c8`。**本分支不合并到 main，也不提前接入 Settings。当前 PR14 的原功能分支只同步本交接及进度记录，源代码留在独立分支，后续统一合并。** 不创建新 PR。

## 最新决定优先于旧稿

1. People 采用 **P1**：简洁人员卡，保留职位、姓名、邀请邮箱；选中后分别设置 Team 和 Reports to，并可 Add direct report。允许多层、跨团队汇报；不由岗位标题推断团队，不自动改变另一种关系。
2. **配置 N 个 team，就恰好 N 条泳道。** 5队5道、7队7道。空团队也有一条空泳道；一个团队在活动前后仍是同一条泳道。未分组任务显示待处理项，不能暗增“未分组”泳道来凑展示。
3. 用户上传 A 图只作为渐变色带风格参考。图里重复的三条 Operations 必须合成一个 Operations 泳道；不能照搬图片的重复部门行。B 的“一条泳道混不同部门”不采用；v3 的任务包画板也不是本轮最终泳道规则。
4. **泳道归属与业务依赖分开。** 一个团队可以有多条有条件或并行的内部路径，但都在同一团队容器内；跨团队依赖保留并连到另一行，不删除、不改成团队顺序。共享 Event Day 可以是垂直时间标记，不是第 N+1 条团队泳道。Full Check 等真实任务仍必须分配到一个团队。
5. 蓝/黄站点继续表示 core/situation 类型；部门只用整道背景渐变、团队名称表达，不覆盖任务类型含义。正式绘图由另一编辑器适配；本轮没有重做时间轴或拖拽图引擎。

## 本轮文件与接口

新增代码均在 `src/teamWorkflow/`，没有被实际应用入口导入：

| 文件 | 作用 |
| --- | --- |
| `contracts.ts` | Team / TeamRole / TeamPerson、独立 WorkflowTeamMap、泳道编译结果 |
| `directory.ts` | 新增团队/岗位/直接下属、改团队/上级、改名/联系方式、选负责人、防循环、同队树形顺序 |
| `TeamPeopleSetup.tsx` | 可复用、受控的 P1 React 组件；逐岗位编辑、拖入团队及下拉替代；调用方拥有草稿保存/撤销/权限 |
| `lanes.ts` | `compileTeamLanes` 与 `assignStepsToTeam`；一队一行，原任务对象及依赖保留 |
| `TeamSwimlanes.tsx` | 可选的团队行/渐变外壳及有上限的问题提示，不是新的完整编辑器；每行内容由 `renderLane` 提供 |
| `legacyAdapter.ts` | 旧 Role/Person 的只读投影、从显式 ownerRoleId 及已确认角色团队生成候选映射；不调用旧关键词/职能匹配 |
| `examples.ts` | 虚构人员和46任务的显式示例分组，不自动用于真实组织，不是固定职业分类 |
| `teamWorkflow.css` | 独立样式，使用现有设计 token；组件显式导入，未改全站样式 |
| `foundation.test.ts` / `components.test.tsx` | 模型与组件检查 |

`index.ts` 仅导出纯函数和类型，不引入 React/CSS。组件单独按文件导入，方便另一个编辑器只使用数据层。

### 人员设置

```tsx
import { TeamPeopleSetup } from "./teamWorkflow/TeamPeopleSetup"

<TeamPeopleSetup directory={directoryDraft} onChange={setDirectoryDraft} />
```

- 同一个人可担任多个岗位；团队通过角色的 teamId 关联，多人同团队不会复制任务。
- 改上级不改团队；拖岗位入组不改上级。选择上级时排除自己和后代；底层也验证跨团队循环。
- Add direct report 默认继承父岗位的团队，并向该父岗位汇报；新角色、姓名/邮箱可再编辑。空职位可以暂不填写姓名和邮箱，不自动合成邮箱。
- 移走团队负责人会清空旧团队的负责人，让用户重选；不会偷偷选剩下的人。这里的负责人是组织默认岗位，尚非某次活动的执行人。
- 职位/团队改名不生成新实体，不改变已经建立的 team ID 引用。目录里的 Finance、Marketing 等只是示例，允许任意组织自建团队及职位。
- 组件不发邮件、不调 AI、不写 localStorage/IndexedDB、不触发真实邀请；上层保存接口和邀请发送仍是接入工作。默认用 crypto.randomUUID，也可以注入调用方的 ID 工厂。

### 工作流数据层

```ts
import { compileTeamLanes, assignStepsToTeam } from "./teamWorkflow"

const change = assignStepsToTeam(template.id, template.steps, directory,
  teamMap, selectedStepKeys, chosenTeamId)
if (change.ok) setTeamMapDraft(change.value)

const graph = compileTeamLanes(template.id, template.steps, directory, teamMapDraft)
// graph.lanes.length === directory.teams.length（有效目录时）
// graph.links 保留所有原依赖，包括跨团队依赖。
// graph.ready === false 时不得把此分组当成可用模板确认。
```

`WorkflowTeamMap.version` 是本模块契约版本，**不是模板修订号**。每个映射必须和模板目录未来的具体版本快照一起保存，不能仅按模板显示名称全局存一份。ID 不匹配、失效任务、未分组、未知团队、重复任务键或依赖缺失/循环均有诊断；未来模板修改导致节点语义变化时，由模板库标记实际需要重新确认的任务。

`assignStepsToTeam` 一次只替换选中任务的 team ID，返回新的映射，不会改 `StepTemplate` 的 `ownerRoleId`、`fn`、`placement`、`dependsOn`、`cond`、`stepKind`、`estDays`、`anchor` 或 `timing`。更改团队后具体岗位执行人是否需要重新选，须由未来活动指派/编辑器明确处理；不能把旧 ownerRoleId 保留就误称执行人已经适配。

编译只负责分组及基础引用检查。**graph.ready 不替代现有政策、日期、条件作用域、权限等验证。** 泳道内沿用输入的任务顺序/原对象，本模块不计算横坐标、不排序日期；未来编辑器的布局器负责根据原依赖及时间定位。不要直接把原任务数组顺序当成时间顺序。

## 给模板库/编辑器对话的接入步骤

1. 先完成自己当前的编辑器工作，不改本分支文件；合并时读取本交接，再统一契约。可以只 cherry-pick 本分支的基础代码提交，或在确认后 merge 本分支，不改变现有 PR 编号。
2. 组织目录有唯一 Team 实体，Role 上明确 teamId 与独立 reportsToRoleId。章程 AI 的岗位/职责识别继续使用；`directoryFromLegacy` 只读投影已有人名/邮箱/上级，roleTeams 必须由人工确认或显式认可的章程建议提供。
3. **不要用投影覆盖旧 Role/Person 全记录。** 其中没有复制 duties、fn、交接历史、提醒偏好等字段。正式写回时按 ID 合并真实修改，保留原始章程/职责/历史/联系方式及现有保护。存档结构升级与数据迁移在接入阶段设计，本轮未做。
4. 每个模板版本保存 team map sidecar。已有 ownerRoleId 可经 `teamMapFromExplicitOwners` 起草候选；缺失/已删除/未入组岗位的任务保留 unresolved，让用户选，不用岗位关键字猜团队，也不建立“默认秘书/市场”硬编码。
5. 统一布局时，以 team ID 作唯一泳道键；一个队在多个原分支、活动前后或多个工作包出现，都归到同一行。空队保留，多个团队即使同名仍凭 ID 区分；不要按 phase、RoleFunction、岗位或原 branchId 再拆第二条团队泳道。
6. 复用新编辑器的站点 X 坐标、缩放、连线、条件启用、拖拽/插入/撤销和原有规则保护。**不要把 team map 修改接到 `reassignWorkflowStep`**：目前该函数按岗位改分支/placement，与本次只改部门归属不同。`TeamSwimlanes` 只是可选外壳，Canvas/SVG 编辑器可直接消费纯编译结果。
7. 组织目录与模板映射都通过调用方现有草稿事务、版本/并发保护及 Undo 管理。本模块的 onChange 不等于持久化成功，不提供第二套自动保存机制。团队删除、团队合并、发布模板版本及批量迁移实例本轮未实现，不能简单过滤掉团队造成任务悬空。
8. 创建活动时再确认本次团队、负责人、协作者，并保存实例快照；团队负责人进一步分派具体任务。此层、后四个活动原稿、RACI、邮件及后台服务仍未进入本轮。

## 验证与边界

- 2个文件 **28项** 单元/组件检查：P1更改上级/团队、增加直接下属、独立团队/岗位、负责人移出、拖拽事件、任意自定义名称、防跨团队循环、5/7泳道、空队、46任务唯一覆盖、依赖保留、整包改派原子性、模板ID隔离、失效映射、显式旧数据投影等。
- 隔离浏览器实测：原生拖拽入空团队、编辑联系方式、上级/团队独立、5/7行及46任务、320/390触控布局、浅深色、严重/关键 axe；具体结果见同目录 `team-workflow-verification.json`。P1截图同目录保存。
- 全站 lint、独立 CSS lint、前端类型与生产构建通过。新增目录未被应用导入，没有增加运行时入口包；未跑全站浏览器或真实 AI。测试中发现并修复了浏览器 select 标签精确命名和卡片可见文字/辅助名称不一致问题；另修正隔离测试 harness 的 axe context 创建方式。
- 未修改 Settings、WorkflowPanel、MetroChart、现有模板编辑器、业务 schema/store、正式 onboarding、日期/政策规则、默认46任务，未新增研究记录/服务器接口/邮件投递。
- 旧 v1/v2/v3 原稿继续保存；P1可复用组件是新的实现，不覆盖旧审阅稿。对话里“等编辑器完成后统一合并”仍是本轮交付边界，不把基础代码称为已经上线的新页面。

需要同步本地备份。
