# 职责匹配阶段 3 契约

2026-11-16（America/Phoenix）。用户已批准阶段3；基线 `dbfc47d`。独立兼容读取回滚基点 `e370361`：能读取23并保留未知matching字段，不随功能回退删除。主 Agent 负责22→23迁移及产品接线，两个开发 Agent 使用同一契约。

## 唯一正本

`DemoState.matching` 是 MatchingState；`org.matchingWorkspaceId` 与其 organizationId 相同；`org.settings.matchingMode` 未设置或 legacy 按旧流程，responsibilities 启用新匹配。`matchingContext` 存设置界面的元信息（source/reads/decisions/audit，不重复matching或完整roster）、成员资格/可用情况及一次性人工例外。实际姓名、在任情况、岗位名称仍由业务 people/roles 提供，人工资格不能让卸任/待上任者变成在任。

`Node.matching` 明确工作流/步骤/职责和原因。责任匹配的已确认回执在 matching.assignments；无职责或不合格者的明确一次性人工指定单独追加 matchingContext.overrides，显示缺口，不伪造职责或全局资格。历史人员引用可保留；实际新增分派须指向当前成员。设置预览导入须显式确认，检查当前scope/成员/岗位，导入后改用业务正本，不长期双写预览键。12人示例不能静默导入另一个团队。

## Workflow Adapter Agent 唯一范围

`src/matching/adapters/` 全部新文件及专属测试；允许 `src/engine/playbooks.ts` 增加仅用于分派的 `ownerMode?: "legacy" | "unassigned"` 参数，unassigned 时不得调用旧 ownerRoleId/roleFor 选择执行人（已有RACI字段仍可沿用旧规则）。不改日期、条件、锚点、依赖和预算控制。不修改data/store/类型/表单/根matching契约。导出集中 `src/matching/adapters/index.ts`。

公共方法（具体参数严格按下列实现）：

```ts
matchingModeEnabled(s: DemoState): boolean // 只看显式模式；即使配置损坏也不能回退legacy
validOrganizationMatching(s: DemoState): MatchingState | null
organizationMatchingReferences(s: DemoState): MatchingReferences
eventMatchingWorkflowId(s: DemoState): string // org.eventWorkflow存在为club-event，否则seo-event
prepareMatchingNodes(s: DemoState, nodes: Node[], options?: {
  workflowId?: string
  confirmation?: MatchingConfirmation
  responsibilityIds?: Record<string, string | null>
  actorId?: string
  at?: string
}): { nodes: Node[]; matching?: MatchingState; matchingContext?: OrganizationMatchingContext }
recordChangedMatchingOwners(before: DemoState, after: DemoState, actorId: string, at: string): DemoState
canClaimMatchingTask(s: DemoState, node: Node, actorId: string): boolean
```

prepareMatchingNodes 只处理传入的新节点，旧模式直接返回原节点。启用后无确认选择时，清空旧预派owner，status=unclaimed/acceptedOn=null，返回候选原因；不因有primary/sole就自动确认为owner。确认choices用模板stepKey或独立node.id定位，提供choices时必须校验confirmation.revision=当前matching.revision，否则拒绝整组（MatchingError conflict）。有效choice只针对合格可用候选记录默认/backup/sole/manual回执；备份必须有显式choice。一次性manualOverride只对当前成员，单独留记录。不指定职责的独立任务也保留明确缺口；无显式例外不能让AI的owner字段绕过匹配。

独立任务workflowId=standalone、stepId=node.id；有显式responsibilityIds或choice.responsibilityId时建立该单次步骤requirement（确认职责后才confirmed）；不修改其它任务或模板。任务owner设置后：给本人可accepted，给别人unclaimed等待认领；分派回执确认不等于成员认领。

recordChangedMatchingOwners 只为同一workspace中已有节点的真实owner变更追加依据，不给旧任务伪造过去记录；正常eligible人选追加matching回执，其余明确的人工作业追加manual override（含取消owner），不改写历史。调用方负责原有权限；预算和角色权限不变。canClaimMatchingTask：已有指定owner由其认领；无owner的匹配任务仅允许该职责合格可用候选，缺配置时不能通过认领绕过缺口；纯旧任务按旧逻辑。

46步：逐项建立显式目录（key/title/建议的职责边界/是否复合/来源），不按九类职能分配，不固定创建社团职责。导出 `STANDARD_MATCHING_STEPS`（每项 stepId,title,description,status:"draft"|"needs_split"），以及 `standardRequirementCommands(state, workflowId?, steps?)`：给缺失步骤生成 responsibilityId:null 的 draft/needs_split requirement，不覆盖已存在人工关联。提供 `WorkflowResponsibilityMap` 组件（同目录，props {state:DemoState; onCommand:(command:MatchingCommand)=>void}），让用户逐项选择自定义职责、确认或标为复合。标准与自定义模板均用稳定workflow+step标识；组件英文且token样式复用现有class。文档可新增 `docs/feedback-fix/MATCHING_STEP_COVERAGE.md` 记录46项，不声称已覆盖全部外部政策。

## Integration Test Agent 唯一范围

新 `src/matching/stage3*.test.ts(x)`、`src/matching/stage3Fixtures.ts`、`e2e/matching-stage3.spec.ts`。不编辑其他生产文件或旧测试；若旧断言需要更新先报告主 Agent。先完成纯单元/集成夹具，再按主接线验证浏览器，禁止真实AI。

根业务 API 将由主 Agent 实现 `src/matching/organizationMatching.ts`：

```ts
initializeOrganizationMatching(s: DemoState): DemoState
importOrganizationMatching(s: DemoState, preview: MatchingSetupDocument): DemoState
organizationSetupDocument(s: DemoState): MatchingSetupDocument | null
saveOrganizationSetup(s: DemoState, doc: MatchingSetupDocument, expectedRevision: number): DemoState
```

reducer新增 action：`matchingInitialize`、`matchingImport` {preview}、`matchingMode` {enabled:boolean}、`matchingSave` {document,expectedRevision}、`matchingCommand` {command}、`matchingLinkTask` {nodeId,responsibilityId:string|null}。均由社长/VP配置；单次分派保留原入口权限。HumanInputs 增 matching?:MatchingConfirmation；NewTask 增 responsibilityId?:string|null/manualOverride?:boolean；createTasks action 增matchingRevision?:number。已启用新模式的Tasks/Ask表单一个任务只选一个实际人，候选多人不生成重复任务；legacy仍保留显式多人各一份的原行为。

启用/导入/迁移不能改已有任务owner或状态。22→23先备份，不重建图；损坏/未来matching配置保留原值、暂停匹配而不reset组织；导出保留匹配与回执，replace恢复校验组织与结构。首次组织设置必须获得新的matchingWorkspaceId，不能沿用旧配置或回执；新模式选项由主Agent接入完成设置。所有创建路径调用同一adapter，不改日期计算。

## 主 Agent

数据类型、seed/store/settings/changeReview与UI入口（MatchingPage、useMatchingSetup、Tasks、AskPanel/ChangeCard、任务详情、首次setup）归主 Agent。新存档迁移、存储错误保护、同步保存适配、导入预览、受控资格设置与实际任务的分派编辑均由主 Agent 集成。开发包完成后独立最终Review。最终跑lint/build/backend类型、单元、相关浏览器及一次完整 `npm run check`，区分已有失败与本次新增，不运行真实模型。
