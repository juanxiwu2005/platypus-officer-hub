# Platypus AI-native Phase 1：底层设计

2026-10-25 · Codex · Juanxi 已确认制作原型；正式接入等待画面验收。

## 本次边界

这是论文 Phase 3 原型的一次产品重构，本文的 Phase 1 指本次开发阶段。

本次交付 `/#/phase1` 三个可点击画面与两类流程预览。`src/phase1/model.ts` 是独立的前端演示模型，**不是已经接入旧应用的正式数据模型**。不新增真实 API、账户、数据库，不删除旧页，不修改 main。所有资料虚构；没有读取或提交研究数据。

原提示中“模型、API、迁移等完整实现与测试”与“画面完成即停”的顺序，以 Design-First Checkpoint 为准：先说明目标模型、用局部演示逻辑验证交互，画面验收后才实施正式存储/API 与旧数据迁移。不得把演示验证报告为生产验收。

## 六层目标结构

| 层 | 责任 | 本阶段状态 |
|---|---|---|
| Data Governance & Safety | 组织隔离、账户权限、最小化、来源、审计、保留及私有数据边界 | 设计；局部存储策略演示 |
| AI Core | AIR、路由、组织资料检索、工具调用、ChangeSet、权限、审核、不确定性 | 设计；没有新供应商调用 |
| Organization Intelligence | 标准流程、ASU 规则、Constitution、自定义岗位、能力映射、流程差异 | 前端演示 |
| Activity-centered model | 工作的唯一业务根对象；收纳任务、经费、材料、批准、证据、决定及交接摘要 | 两类虚构预览 |
| Activity kinds | member_activity / executive_obligation | 共用工作区，流程长度不同 |
| Single AI Entry | 目标输入、一次一问、建议审核、执行跟踪 | 首页与工作区共用同一种 composer；每个画面同时只显示一个 |

## 目标数据模型（正式接入前的设计规格）

所有组织业务记录必须携带 `organizationId` 或能经必需的父对象无歧义地验证组织。账户访问从认证账户的组织成员关系判断，不能相信请求自己填写的 organizationId。资料版本与审核时的版本必须一致，过期建议需要重新审核。

| 对象 | 字段与约束 |
|---|---|
| Capability | id、canonicalName、description、status(active/deprecated)、mergedIntoId、aliases（按 organizationId）；稳定编号不因改名而变；可新增、合并、改名和停用，停用不删除历史引用 |
| Role | id、organizationId、title、holderAccountIds、status；岗位名称自由，RoleFunction 仅在 legacy adapter 中存在 |
| RoleCapabilityAssignment | id、organizationId、roleId、capabilityId、responsibility(owner/approver/support/informed)、scope、source(manual/constitution/ai_suggestion)、confirmedByUser、confirmedBy、confirmedAt、evidenceSourceId、confidence、notes；详细岗位职责不等同于账户管理权限 |
| OrganizationContext | organizationId、profile、mission、customRoles、confirmedRoleCapabilityMap、standardProcessPreferences、workflowVariations、constitutionSourceIds、approvedMemoryIds、contextVersion、lastReviewedAt、reviewedBy、status(draft/confirmed/superseded) |
| KnowledgeSource | id、organizationId、type、fileName、text、accessScope、createdAt、retentionPolicy、checksum、status；私有源不自动公开给组织 |
| ConstitutionSuggestion | id、organizationId、sourceId、sourceChecksum、roleId/title、capabilityId、responsibility、scope、evidence（原文与 start/end）、confidence、reviewStatus、reviewer、reviewedAt、editedFields；AI 输出不包含可写的最终日期 |
| Activity | id、organizationId、kind(member_activity/executive_obligation)、origin(user_request/recurring/school_notice/ai_suggestion)、title、goal、context、contextVersion、status、tasks、fundingNeeds、materials、approvals、evidence、contacts、decisions、handoffSummary |
| Task | id、organizationId、activityId（必填且父 Activity 必须存在并属于同一组织）、title、requiredCapability、scope、ownerRoleId、ownerAccountId、approverRoleId、supportRoleIds、informedRoleIds、status、risk、dependencies、scheduleAnchor、computedSchedule；排期字段只由规则引擎写入 |
| FundingNeed | id、activityId、source、estimatedAmount、currency、approvalRequirement、applicationStatus、evidenceIds；只在 Activity 内记录，不接银行、不做余额/总账/跨账户追踪 |
| ApprovedOrganizationMemory | id、organizationId、kind、text/structuredValue、sourceIds、activityId、decisionId、confirmedBy、confirmedAt、contextVersion、accessScope；没有确认或来源失效的记忆不能进入交接 |
| ConversationLog | id、organizationId、accountId、accessScope、createdAt、expiresAt、messages、retentionPolicy；与 Source/Memory 分开；本阶段不新增长期对话保存 |
| AuditEntry | id、organizationId、actorAccountId、action、recordId、beforeVersion、afterVersion、sourceId、changeSetId、timestamp；日志不复制敏感原文 |

Activity 中的 tasks 等是所属关系：正式存储可用子表和 ID 引用，避免在 Activity 和任务表各保存一份可独立修改的任务。

### 谁负责外部联系

能力 `relationships` 采用结构化 scope：`campus` 与 `companies`，可有 `all` 默认值。

- Organization A：Marketing 是两个范围的 owner。
- Organization B：Outreach 是 campus owner，External Relations 是 companies owner。
- 每个有效范围必须能解析出唯一主要 owner；多个 owner、没有 owner、来源冲突都产生一个问题，不退回第一个岗位。
- approver、support、informed 分开记录。业务负责人不会因为岗位叫 President 就自动获得后台管理权限；真实权限从账户授权产生。
- 变更分工需要确认；原型保留已批准 context 快照，编辑中的 draft 不会覆盖它。

### Constitution 的状态变化

上传/粘贴虚构源 → 解析候选 → 字段校验与原文定位 → Accept/Edit/Reject → 冲突逐个解决 → 最终摘要 → Confirm organization。

Accept 只接受候选，不把整份提取结果直接变成事实。原文引用必须精确对应同一源的字符范围；confidence 只表示提取判断的把握，不是事实正确率。人工确认结果优先；用户可以明确改用章程建议。源内容变化后，旧建议与基于该源的审核失效。

当前原型采用**本地保守匹配器**，只演示已支持的虚构条款句式；不支持任意 Constitution 的语义理解。UI 显示 Local demo extraction。支持 .txt/.md/粘贴，不声称支持 PDF、Word 或 OCR。联系方式与密钥形状字段会拒绝；这只是演示过滤，不能用来证明真实敏感数据已全部识别。

## Onboarding 交互

- 五步：Basics → Constitution → Roles → Responsibilities → Review。
- 基本路径仅一个必填开放文本：组织名（演示预填）。使命/目标已有建议，修改在 Advanced；新增角色和其他选项是可选输入。
- 默认提问仅组织类型和流程偏好；冲突一次显示一个，且只有已接受候选冲突才出现。资料无冲突的必要路径不超过六题；复杂真实章程不得为凑题数静默忽略冲突。
- 选项有 A/B/C、大点击区、Not sure、Add another option；设置可 Skip。
- 保存步骤和草稿，当前设备可以恢复；保存失败明确提示。
- 五分钟与至少 80% 点击完成是测试目标。没有首次使用者计时结果，不宣称已达标或降低认知负担。
- 七个高层能力组显示在分工步骤；详细 approver/support/informed 收在 Advanced。

## 两类 Activity 预览

Member：从现有 `buildEventNodes()` 提取标准步骤，按 capability map 建议负责人；只把旧 fn 当作模板迁移元数据。人名、岗位分配不使用 `roleFor()` 的默认回退。当前示例是 Founder Connections，不是完整自然语言 planner。

Executive：虚构通知的一条短链：核对要求 → 确认两名代表 → 发出简报 → 记录证据。该预览展示四步模板；尚未实现开放目标的自动生成。

日期均调用未修改的 `computeSchedule()`。成员活动的日期锚点来自虚构活动示例；干部事务的固定要求来自虚构通知/人工给定锚点。AI 建议对象通过 allowlist 丢弃日期和未知字段。时间戳如 createdAt 是记录元数据，不是任务排期。

工作区的 Review / Reject / Approve 与状态变更仅操作前端预览，页面有明确提示；不写入旧 Store，不将其当作正式 ChangeSet 后端的完整实现。

## Repository 与保留边界

`PreviewRepository` 先用 localStorage adapter 演示读草稿、保存、批准快照和清除。键分组织与演示账户，draft 与 approved 分开。保留期是**自最后一次保存起 7 天**，读取过期记录时删除。没有新增持久聊天日志。

这是虚构数据的策略测试；浏览器 View as、mayManage 与 localStorage 都不是生产身份验证或安全隔离。真实上线需要服务端认证、组织成员权限、逐对象访问控制、加密与删除策略、AIR 数据处理的书面确认，以及 IRB 允许范围。该阶段不实施这些外部接入。

未来 `/api/org/extract-constitution`、`suggest-capabilities`、`preview-workflow`：认证 → 组织权限 → 最小化/过滤 → 读取源版本 → 输出 schema 校验 → 返回 suggestions+evidence+uncertainty，不写业务状态。修改由独立 ChangeSet review/apply 完成；apply 再检查最新权限和 contextVersion。

## 旧代码处理

| 处理 | 内容 |
|---|---|
| 保留 | React18/TS/Vite；现有全部测试；校历、schedule、forecast、任务认领/状态逻辑 |
| 修改后复用 | playbooks（把 fn 分派改为 capability/scope）；aiContext（按权限检索已确认 context）；ChangeSet/Review/Undo（增加组织与版本校验）；UI 的可访问控件 |
| 重新设计 | Setup 与岗位编辑；AI 入口及新导航；nullable eventId 任务创建；RoleFunction 业务限制；正式 repository 与迁移 |
| 保留 legacy | Today/Events/Tasks/Funding/Handoff/Team/Rules/Settings/Partners；旧路由与旧数据键原样保留。新壳只有 Home、Organization setup 和最近 Activity |
| 暂不做 | 完整 planners、真实登录、生产数据库、正式 Handoff、新对话存储、旧页面删除、main 合并 |

旧仓库“三栏 + AI 固定右栏 + 主要依赖 Hover”等限制不适用于本次新路由；这是 Juanxi 本次明确确认的方向。新路由与旧外框隔离，避免改变已验收页面。

## 迁移策略（设计与纯预览检查；没有执行真实迁移）

1. 只读旧版原始包，计算 checksum，并做带 schemaVersion 的可恢复快照。不能因结构升级直接恢复 seed。
2. 旧 Event 保留原 ID 或记录稳定映射，转 member_activity；关联任务带必需 activityId，保留来源、状态、日期锚点和依赖。
3. 确定归属的独立任务放入对应 executive_obligation；不能仅因日期相同就合并。无法确定目标/归属的保留原包，legacy+needs_review，不丢弃。
4. 旧 fn 只产生未确认能力建议；不推断真实账户管理员权限。Funding 转活动子记录；旧 Handoff 保留来源，未经确认的文本不能进入 Approved Memory。
5. 使用稳定迁移 ID 与迁移版本，重复运行不重复生成对象；跨活动依赖单独复核。确认映射后才原子切换新存储指针；失败可恢复旧快照。
6. 正式 migration adapter 及真实旧包读写在画面验收后实施。本次 `inspectMigration()` 仅验证分类、原记录保留和待审标记。

## 视觉参考

只使用用户指定的三个主要参考：

- Apple HIG：层级、留白、标准控件、键盘及触控可达性：https://developer.apple.com/design/human-interface-guidelines/
- monday：任务状态、负责人、风险与可扫描工作视图：https://monday.com/new-product
- Notion Projects：Activity 内同时放任务、材料、决定及多视图：https://www.notion.com/product/projects

不复制品牌或图标。图标为本项目内的简单 SVG。正文至少 14px；辅助标签可更小；交互目标至少约 44px；没有关键 Hover-only 操作。手机改为顶部精简导航，composer 在文档流中，不盖住内容。
