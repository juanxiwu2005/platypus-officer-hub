# 第一阶段职责匹配开发契约

2026-11-16（America/Phoenix） · A2/B2/C2 阶段 1 已获 Juanxi 批准。

共享类型的唯一正本是 `src/matching/contracts.ts`，错误类型在 `errors.ts`，公共出口由主 Agent 在 `index.ts` 维护。开发 Agent 不修改这三个文件、现有产品数据或 UI。发现缺口先向主 Agent反馈，按同一修订继续。

## Data Agent 交付

文件所有权：`src/matching/library.ts`、`repository.ts`、必要的私有验证模块和对应 `.test.ts` 文件。

公开函数必须为：

```ts
createEmptyMatchingState(organizationId: string): MatchingState
applyMatchingCommand(state: MatchingState, command: MatchingCommand, context: MatchingMutationContext): MatchingState
parseMatchingState(input: unknown, expectedOrganizationId?: string): MatchingState
encodeMatchingState(state: MatchingState): string
decodeMatchingState(raw: string, expectedOrganizationId?: string): MatchingState
matchingStorageKey(organizationId: string): string
loadMatchingState(storage: MatchingStorage, organizationId: string): MatchingLoadResult
saveMatchingState(storage: MatchingStorage, state: MatchingState, expectedStoredRevision: number | null): void
```

`createEmptyMatchingState` 和 `applyMatchingCommand` 从 library 导出，其余从 repository 导出。错误统一为 `MatchingError`，`loadMatchingState` 返回保留原文的结果；不得读取其他浏览器键、隐式写回或在模块导入时访问 `window`。

规则：

- 状态和命令做运行时验证，引用按当前组织查验；严格保护 ID、revision、状态与不可写字段。职责更新后转 draft 并增加职责 revision；重复确认或没有实际内容变化的更新保持不变。
- 每次实际变更 state revision 加一，增加包含完整命令的事件，并使用传入的 actor 和审计时间，不计算任务日期。
- 相同 operationId 与完全相同命令的网络重放返回原状态；同 ID 不同命令报冲突。新操作必须满足 expectedRevision。
- 责任、岗位、成员、要求和策略的引用不可串组织。每个 `(workflowId, stepId)` 唯一，键不能靠易碰撞的字符串拼接；同职责策略唯一、同成员职责决定唯一，默认人和备份不可相同。备份需有主要承接人。
- 归档保留职责、引用和历史，解析器据此停止新分配。合并归档源、设置 mergedIntoId，重接配置引用并将目标职责和受影响要求转为待确认；既有 assignment receipts 不改写。相互冲突的人选策略或 include/exclude 决定必须拒绝整次合并，不能任意选一份。
- 分派记录为只追加的回执，记录时校验组织、任务步骤/职责引用及当前修订；候选资格的重新解析由 resolver/未来业务接线负责，library 本身不授予权限或写实际任务。
- 存储键固定 `platypus.matching.v1:` 加 encodeURIComponent 后的组织 ID。不存在时 load 返回 empty 和新的空 state；损坏、不支持版本、组织不符、存储异常保留 raw 或相应错误，不 Reset demo。
- 保存前校验现有存储 revision，expectedStoredRevision=null 仅适用于不存在的键。损坏或新版本数据不能覆盖；相同内容可幂等保存，不允许较旧快照覆盖较新快照。浏览器 read/check/write 不是跨标签页原子 CAS，需在交付中明确此限制。

## Resolver Agent 交付

文件所有权：`src/matching/resolve.ts`、对应 `.test.ts`。可在测试文件内使用私有虚构数据，不改其他人的模块。

公开函数必须为：

```ts
getMatchingCandidates(state: MatchingState, references: MatchingReferences, responsibilityId: string): MatchingCandidate[]
resolveMatchingAssignment(state: MatchingState, references: MatchingReferences, request: MatchingRequest): MatchingResolution
```

这是纯函数模块，不读写存储，不调用 AI，不计算日期，不引用旧 `RoleFunction`。

规则：

- 仅已确认的 roleBinding + membership 或已确认的 direct include 构成资格路径。confirmed exclude 覆盖所有继承路径；按成员 ID 去重并稳定排序。丢失的成员引用不变成合格候选；失效岗位不能建立继承资格。
- active=false、资格 missing 为不合格；availability=unavailable 单列；缺少必要资格为 unknown；availability=unknown 也不自动预选。未知不会被当作肯定信息。
- 无有效要求、要求 draft/needs_split、职责缺失/draft/archived、组织不符或不一致的重复 ID 均明确返回未解决结果，不能随意挑成员。
- 已确认回执按 stateRevision 找该 task 的最新 confirmed 决定；task/workflow/step 必须一起匹配，防止跨流程同名步骤串用。仍合格、可用且要求/职责修订未变时保留，不因默认策略修改而改派；失效时 ownerId=null、existingOwnerId 保留，状态 needs_review，不自动推荐替代者覆盖决定。
- 未确认的 proposed 回执不当作已接手。没有 confirmed 回执时：有效 primary 只预选；primary 无法使用而 backup 合格可用时，返回 backup_requires_confirmation；无默认且仅一个合格可用候选时预选；多候选待选。策略自身引用失效时显示问题，不任意选择另一人。
- suggestedOwnerId 与 ownerId 分开，只有已确认且有效的回执能得到 ownerId。备份建议 status=needs_review；primary 和 sole_candidate status=suggested。
- 返回候选、依据 ID 和修订，输入顺序变化不能改变选择。reason 用共享枚举，候选的负面原因明确保留。

## 主 Agent 交付

维护契约与公共出口，准备 10–20 名虚构成员、两种不同工作流的可读演练和测试，编写阶段 3 接入/旧存档兼容设计。第一阶段不修改现有 `DemoState`、schemaVersion、业务入口、AI 接口、日期引擎或网页。

阶段 2、3 尚未批准。两个开发 Agent 各自提交，不推送集成分支；主 Agent 按包集成并安排独立只读 Review。
