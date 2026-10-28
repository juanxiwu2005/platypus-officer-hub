# 当前 Prompt 与模型契约

2026-10-26。当前服务端正本为 [prompts.mts](../../netlify/lib/organization/prompts.mts)，版本 `organization-setup-v3.1`。产品页面不提供 View prompt 或 Review AI instructions。当前四组精确 Prompt 已在开发聊天附件交给 Juanxi；修改继续在聊天审阅，不在产品页面展示。

| 任务 | 当前输入范围 | 输出及约束 |
| --- | --- | --- |
| constitution | 章程文本、现有组织/部门/岗位 | 有证据的部门/岗位/职责；推断有标记；人工字段保留 |
| risk_check | 组织使命和已审岗位职责 | 最多4个重大风险，每题2–3方案；不把普通表单细节重复列为遗漏 |
| member_workflow | 组织、岗位职责、相关章程片段 | 精简节点/依赖/负责人；不生成坐标和最终日期 |
| edit | 当前组织配置、屏幕与有效选中实体、近期对话；明确选择的历史版本 | 澄清问题或白名单局部提案；批准前零应用 |

导航无变化、Review 编译、图布局和普通手动修改不调用模型。职责与流程修改不能静默覆盖其他字段。历史是证据，选择某个版本也不会自动恢复。所有输入作为数据，不授予额外权限。

路由正本 [modelPolicy.ts](../../src/organization/modelPolicy.ts)：`air-task-routing-v3`；Gemma `gemma4-31b-it` 长结构、Muse `muse-glimmer-30b` 短编辑、GLM `glm-5-3` 仅用户明确深度检查。请求 none 不能保证网关实际 none；保留实际推理级别与模型原返回名。JSON schema 仍须本地验证。

历史 Muse 单次765输入/1846输出tokens、首内容16.715秒、总50.396秒且形状验证失败。不能把这个数字称为Gemma提速证据，也不能从首内容等待认定供应商排队。本轮离线检查不消耗AIR，不自动重生成或做多模型评估。诊断和验收见 [实施记录](F1_F7_IMPLEMENTATION.md)。

## 历史说明（下文原文保留，不是当前 UI 或路由）

> **v3.1 最新：** Gemma 4 31B 处理较长的章程/风险/活动结构，Muse 处理短对话编辑，GLM 5.3 仅用户主动深度检查。一次真实 Muse 结果证明：请求原生 schema 和 reasoning none 不代表网关实际遵守；现在 prompt 明确给出精确 JSON 字段，已观察字段别名做严格无歧义转换，缺失内容仍拒绝。详见 [v3 实测记录](V3_CHANGELOG.md)。新版速度尚待实测，不能把模型名称当速度保证。

> **v3 正本：** `netlify/lib/organization/prompts.mts`。Prompt 隐藏在服务端，不展示于产品；由开发聊天直接交给 Juanxi 修改。旧文档与 `src/organization/prompts.ts` 的 v2 五阶段保留作历史兼容。
> 新四任务：Constitution（部门/岗位/职责），Risk check（仅重大风险），Member workflow（精简图结构），Edit（白名单局部变更、明确批准）。坐标、最终机器配置和未改动导航由程序完成，不调用模型。
> 默认 Muse Glimmer 30B + reasoning none；Deeper review 才调用 GLM 5.3 low。原生 JSON schema + Zod/图/ID/层级检查；记录输出上限与原始回复。允许少量虚构数据真实冒烟，其他回归用模拟。见 [v3 修改记录](V3_CHANGELOG.md)。

# Organization Setup：实际 Prompt 与审核

**待 Juanxi 审核。** 质量审核是产品验收步骤；开发完成不等于 prompt 已获产品批准。最终 Review 有“Review AI instructions”入口和审核提醒，各步骤也可展开查看精确 system prompt。正式运行的唯一正本是 [`src/organization/prompts.ts`](../../src/organization/prompts.ts)，不是本说明中的概述；版本记录在每次成功生成的服务器 AI 记录中。

## 每一步给模型什么、希望它做什么

| 阶段 | 读取的组织内容 | 具体输出与原因 |
| --- | --- | --- |
| Basic → Constitution | 组织名、章程文本/校验值、动作目录；没有组织类别题 | 提取真实岗位标题、职责与逐字引文，推断缺失项必须标 Suggested；避免重复填写和把推测当事实 |
| Team → Responsibilities | 已编辑岗位、章程、动作目录、已有勾选 | 全部动作的多岗位数组；手动勾选（包括故意留空）优先，社长只微调 |
| Responsibilities → Member programs | 岗位、已审核分配、审核状态、系统活动参考链 | DAG 流程节点、依赖、负责岗位、原因、内部 RACI；保留两种机会入口与并行执行 |
| Member programs → Board work | 岗位、分配、已有成员流程、社长一句话目标、已有干部草稿 | 为 social/tabling 等具体目标生成链路；调整需接受提案，可先保存 |
| Board work → Review | 当前配置、两个已审阅流程、确认状态 | alwaysRead 核心文档 + 带检索条件的 onDemand 详细文档 + 不确定项 |

真实请求将版本化 system prompt 与 JSON 数据分开发送。组织名、角色名、文档、调整请求和旧 AI 输出属于数据，不能覆盖系统规则。文档提取在浏览器进行，仅文本发送到本网站服务端，再由服务端发送给已配置供应商；原始 PDF/Word 二进制不上传。

## 核心指令为什么这样写

- **证据**：章程来源必须是实际文本中的逐字片段；不存在的引文会降为 Suggested。模型置信度不是经过校准的可靠性概率。
- **组织差异**：部门只是导航，不能把自定义标题硬塞进固定八种岗位；同部门 VP 和 Intern 可共同负责。
- **人工优先**：手动矩阵分配由程序再次保留，不能仅相信 prompt。流程 AI 修改先显示提案，接受后才替换。
- **RACI**：勾选岗位是 R，最多一个有依据的 A，其余 C/I 必须引用已知岗位；不确定则留空。后台结果仍需后续产品校准，不能自动授予权限。
- **安全与边界**：禁止虚构校规、税务/法律结论、权限与最终日期；所有最终日期继续由现有规则引擎处理。结构字段由 schema 过滤，生成文字中的常见日期格式会遮盖。
- **可追溯**：保存 prompt 版本、供应商、模型、阶段、时间与输入哈希；不记录密钥或原始对话。

## 两层配置

`contextPacket()` 每次设置调用读取组织名/使命、岗位与职责分配、确认状态、上下文版本，以及已经编译的核心指导。设置阶段按当前任务读取章程依据；生成流程时再读取对应的已有流程和目标，最终编译时读取两类流程和全部支持配置。详细指导以 topic/when/content 储存。

这是 Organization Setup 范围的接入。旧 Ask/Today/计划器仍使用原业务状态与其原提示词，未自动迁移为这些新配置；完整业务连接应在此设置验收后继续。没有把未接入的旧功能称作已读取新指导。

## Juanxi 的审核清单

1. 章程有清楚岗位时，是否仍误加默认岗位？
2. 相似组织但不同职责，是否产生不同分配？
3. Marketing VP + Intern 是否共同承担恰当事项？
4. 手动取消分配后，AI 是否尊重空白？
5. Member 流程是否保留 Outreach/President 两种入口与 Marketing→Finance 的审核顺序？
6. Social 与 tabling 是否有实际不同的人员安排？
7. 来源与不确定项是否诚实；缺失审批权时是否乱猜？
8. 上传含恶意指令的虚构文档时是否仍遵循系统约束？
9. alwaysRead 是否足够短且涵盖核心工作习惯？onDemand 的调用条件是否明确？

审核后再修改 prompt、增加对应评估样例并提升版本。自动测试只证明数据约束和交互，不证明所有组织上的 prompt 质量。


## 按任务选择模型：当前 v2

Juanxi 在实际等待过久后要求速度优先、减少额度消耗。配置正本 [`modelPolicy.ts`](../../src/organization/modelPolicy.ts)，当前版本 `air-task-routing-v2`：

| 模式 | 模型 | 使用方式 |
| --- | --- | --- |
| 默认快速处理 | `muse-glimmer-30b` | 全部普通设置步骤、日常对话与短结构化任务；`reasoning_effort=none` |
| 主动深度检查 | `glm-5-3` | 用户勾选 Use deeper reasoning，或点击 Review with stronger model；后台 `low` 推理，保留较大输出预算 |

不再默认等待 GLM，也不自动重复或升级模型。两者共用 AIR 网关/key；用户输入不能指定任意模型 ID。实际供应商/请求模型/返回模型、请求和网关报告的推理级别、耗时、路由与 prompt 版本记录在档案里。GLM 的返回名可能是 `glm-5-3-mxfp4`，保留原返回名。

之前 v1 的真实记录：Gemma 章程 56s、矩阵 15s；GLM 成员流程 81s、组织指导约 56–91s。它们包含网关等待与生成，不能凭这些数字断定延迟都来自模型或都来自排队。现已切换 Muse 默认配置，遵照用户要求**未再发起真实 Muse 测试**；速度和质量由 Juanxi 实操评估，不声称已经测出提速比例。

复杂工作流请求使用原生 JSON schema 约束字段，随后仍检查已知岗位/动作、人工优先、来源与 DAG；较强模型也不能绕过这些约束。prompt 当前版本为 v2.3，最终 Review 保留全部 prompt 的审核入口与提醒。

依据：[ASU Chat Completions](https://docs.rc.asu.edu/ai/api/chat/) 说明同一网关可选模型与 reasoning_effort；候选模型列表来自 Juanxi 的 AIR 页面。此路由是工程取舍，不是通用榜单对 onboarding 质量的证明。AI 请求、输出和人工决定的保存规则见 [数据基础](DATA_FOUNDATION.md)。
