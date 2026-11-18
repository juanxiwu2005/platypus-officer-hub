# Speaker 活动工作流模板问题记录

本轮目标是先把工作流模板固定好，再推进自动提醒和组织交接。检查确认：用户列出的链接、Details、移动和新增分支问题都有对应原因；其中移动和新增问题已在浏览器复现。另有日期设置不反映到排程、条件步骤变成所有活动必做、删除后恢复以及流程消失等缺陷。现有模板尚不能作为稳定的执行流程来源。

审查日期为 2026-11-17（America/Phoenix），代码基点为 `claude/fervent-thompson-e2j5u2@0f53577`。收口核对至 `ab7123c`，其间仅有进度文档提交，产品代码一致。本轮提交只记录审计，没有实施下述修复。截图仅作为用户提供的界面参考，未作为额外执行指令。

## 审查范围和判断方式

- Settings → Workflow 的模板、Step details、移动和右键菜单，以及实际 Plan 的任务办理入口。
- 模板生成 speaker 活动任务，再进入规则排程和提醒事实的路径。
- 浏览器操作使用仓库虚构演示数据；独立函数复现使用虚构 speaker 活动，日期 2027-04-16、60 人、校内、无餐饮、会费经费，`partner/rsvp` 开启。
- “浏览器复现”指本地 Chromium 实际操作；“函数复现”指调用该分支原有函数，没有重写实现来证明结论；体验判断单独标明。

当前 Settings 保存的是**一份组织通用活动模板**，speaker 活动按条件从中生成步骤，并没有独立的 speaker 模板管理器。以下先以 speaker 场景核对，修复时仍须检查其他活动是否受到影响。位置：`src/engine/playbooks.ts:30`、`src/data/settings.ts:126`。

## 问题总表

P1 表示应在模板定版前处理的执行或数据一致性问题；P2 表示会使配置难以理解或确认的体验问题。以下条目均为待修复，建议和验收标准尚未实施。

| 编号 | 优先级 | 问题 | 查证方式 |
| --- | --- | --- | --- |
| WF-01 | P1 | 办理链接仅按固定步骤匹配，会与活动实际需要不符 | 浏览器及函数复现 |
| WF-02 | P1 | 模板不能新增或编辑办理链接，自定义节点也没有配置路径 | 面板及数据模型核对 |
| WF-03 | P2 | Details 的负责人、用时、时点和依赖含义缺少直观解释 | 界面事实与体验判断 |
| WF-04 | P1 | 节点移动已改依赖并保存，流程图仍显示旧顺序 | 鼠标拖动、键盘和函数复现 |
| WF-05 | P1 | 在原分支新增节点，节点被画到“其他”分支 | 桌面、手机及函数复现 |
| WF-06 | P1 | 修改预计工作量后，部分标准步骤的开始日和提醒时间不变 | 函数复现 |
| WF-07 | P1 | Details 显示的目标时点与实际排程可能不一致 | 浏览器及函数复现 |
| WF-08 | P1 | 在 speaker 分支新增的步骤，会进入无 speaker 的活动 | 函数复现 |
| WF-09 | P1 | 模板允许删掉的部分步骤，新建活动时又被补回 | 函数复现 |
| WF-10 | P1 | 删除 Full Check 后，大量仍存在的活动前节点从图上消失 | 浏览器及函数复现 |
| WF-11 | P1 | Task description 实际保存为 Why，模板缺少可复用的操作说明和完成标准 | 数据生成路径核对 |
| WF-12 | P2 | 标准节点改名并保存后，图上仍显示固定旧简称 | 浏览器复现 |
| WF-13 | P2 | 只改负责人、描述或目标时点时，模板摘要仍可能称为标准模板 | 函数复现及代码核对 |

## 用户提出的问题

### WF-01 办理链接与任务场景不匹配

实际 Plan 打开演示活动 Founder Dinner 的 Quote Gather：该活动 `food: none`，任务要求收集供应商报价，按钮却固定为 **Open ASU catering information**，跳转餐饮信息页。独立 speaker 活动无餐饮时也得到同样结果。

根因：`taskActionLink()` 只通过 `stepKey` 查固定表；`quotes/quote/dining` 共用餐饮地址，没有根据报价类别、经费或组织配置选择入口。当前只对校外 venue 做了特例处理。

代码：`src/reminders/actionLinks.ts:6`、`:15`、`:22`；`src/reminders/facts.ts:59`；展示位于 `src/components/TaskDetail.tsx:61`。

**影响：** 成员收到提醒后仍可能被引向与本次任务不符的入口，无法直接行动。

**验收标准：** 至少逐项确认 speaker 模板中需要外部办理的节点；报价入口能区分餐饮与其他供应商；登录入口、说明页和最终表单明确标注。没有稳定直达地址时给出真实入口和下一步导航说明。不能把一个通用首页当成所有任务均可直接提交的表单。

本项确认的是**语义匹配问题**，没有把未经登录核验的网址宣称为失效链接。独立 speaker 样例 37 个任务中有 9 个固定办理链接；该数量仅说明现有映射覆盖，不能据此认为其余 28 项都必须有外链。

### WF-02 模板缺少链接编辑和保存能力

Step details 只有名称、默认岗位、用时、目标时点、描述和依赖。`StepTemplate` 与任务 `Node` 都没有办理链接配置字段；现有办理地址来自上述固定映射。Settings 的 Links & files 是组织共享资料，不能替代某一步的办理入口。

代码：`src/components/setup/WorkflowPanel.tsx:87`；`src/data/types.ts:66`、`:271`；`src/reminders/actionLinks.ts:22`。

**影响：** 社长即使知道正确地址，也无法在模板内修正；新建节点不会通过现有固定表自动获得办理入口。

**验收标准：** 标准和自定义步骤都能编辑链接名称、地址和必要说明；保存、刷新、新建活动后保留；Plan 和邮件链接打开的任务页读取一致的配置。模板变更对既有活动的适用范围需明确，避免悄悄覆盖已执行任务。

### WF-03 Details 含义不直观

这是体验问题，其中可观察到的事实如下：

- **Done by** 选择的是岗位，例如 Events lead；没有明确这是未来活动的默认分配岗位。
- **Days of work** 对应工作日用时；**Target timing** 没有解释是完成目标还是开始提醒，两者也没有形成可读的时间说明。
- 空目标显示 **From dependencies**，却不能预览从哪些前置任务推得什么时间；填入 `0` 与留空的含义不同。
- **Waits for** 展开后包含跨分支、跨活动前后阶段的大量步骤，缺少分组与依赖效果预览。
- 没有展示该节点适用何种活动情景，也不能编辑这个条件，新增 speaker 步骤的范围尤其难判断。

代码：`src/components/setup/WorkflowPanel.tsx:78`。截图中的 Partner Speaker Review 来自同一面板；上述日期和描述还有 WF-06、WF-07、WF-11 的具体逻辑问题。

**建议的验收标准：** 用户能直接读懂“谁默认负责、要做什么、怎样算完成、何时开始提醒、何时完成、等谁、去哪里做”。字段使用英文，但在相邻位置给出清楚的单位和结果说明。具体布局留待共同确认，不在本轮改版。

### WF-04 移动已保存但图上不更新

复现：把 Marketing 分支的 Promotion Items 拖到 Marketing Needs 与 Content Creation 之间。系统提示 **Moved “Promotion Items” between “Marketing Needs” and “Content Creation”.**，存档中 Content Creation 也已改为等待 Promotion Items，但图上仍然是 Content Creation 在前。

鼠标拖动与 Alt+← 都复现了此问题：节点的横、纵坐标没有变化。独立函数调用也确认移动函数输出了正确的依赖修改。

根因：移动改变的是 `dependsOn`，而绘图按 `PRE_ROUTES/POST_ROUTES` 里写死的 key 顺序排列，布局不读取实际依赖来决定顺序。因此这不只是“没有保存”：保存后的业务依赖已经与画面不一致。

代码：`src/lib/flowEdit.ts:23`；`src/components/flow/metro.ts:22`、`:36`、`:104`。

**验收标准：** 同分支移动后，画面、依赖、刷新后的结果和新活动生成结果一致；跨分支移动时明确分支归属与负责人是否变化；排程按实际依赖重算，学校硬截止日仍受保护。不能只移动图形而不改变业务数据，也不能只改变数据却保留旧图形。

### WF-05 新增节点跑到另一分支

复现：右键 Speaker SAP Headshot，选择 **Add a step after this one**。新节点依赖 Speaker SAP Headshot，Partner Travel Plan 也改成等待新节点，但新节点没有显示在这两个节点之间。桌面被放到图下方新分支，手机被放到右侧新列。

根因：新增步骤只有 `fn/ownerRoleId/phase/dependsOn` 等信息，没有可保存的分支归属。布局发现它不在固定 key 清单后，会统一放入 `other-pre` 或 `other-close`。仅继承同一个岗位也不能解决：Event Lead 与 Speaker 的步骤都可能由 Events lead 负责。

代码：`src/components/setup/WorkflowPanel.tsx:46`；`src/components/flow/metro.ts:67`。

**验收标准：** 从某个节点或连线上插入，默认保留所在分支和前后顺序；多个新节点可按插入位置排列；刷新和新建活动仍一致。分支、负责人、阶段和依赖须能分别表达。

## 其他会影响模板定版的问题

### WF-06 修改工作量没有相应改变开始提醒

函数复现：Marketing Needs 从 `estDays: 2` 改为 `10`，生成的新活动任务仍保留原 `timing: { startDays: 60, dueDays: 58 }`。前后规则结果相同：开始日 **2027-02-15**，截止日 **2027-02-17**，没有新增排程风险提示。

根因：模板的工作量编辑只改 `estDays`；已有校准时窗仍决定这类步骤的默认开始日。`calibratedStep()` 在目标 anchor 未变时保留原 timing，`timingStart()` 使用 `startDays`。提醒事实随后读取实际 `latestStart`。

代码：`src/components/setup/WorkflowPanel.tsx:95`；`src/engine/playbooks.ts:306`；`src/engine/schedule.ts:166`；`src/reminders/facts.ts:72`。

**验收标准：** 先明确“固定开始时窗”和“按工作量倒推”如何协同；更改工作量后，开始日应相应调整，或明确提示固定时窗及其冲突。不能让社长以为已提前提醒，而实际提醒日期完全未变。

### WF-07 设置页的目标与实际截止日不一致

Check-in Forms 的 Details 显示 **Target timing = 1**。模板 anchor 为活动前 1 个工作日，但同时有 `timing.dueDays = 0`；实际生成活动后，截止日是活动当天 **2027-04-16**。开始日则由另一字段 `startDays: 5` 决定，Details 没有显示这一时窗。

此外，编辑目标数值会统一写入 `unit: calendar`，原本的 business 单位会被替换，界面没有单位选择。收尾步骤又完全隐藏目标时点输入，不能在这里调整活动后几天完成。

代码：`src/engine/playbooks.ts:41`；`src/components/setup/WorkflowPanel.tsx:96`；`src/engine/schedule.ts:151`。

**验收标准：** 设置页显示排程实际采用的完成目标和开始规则；清楚区分工作日、自然日、活动当天及活动后；改值、清空和重新生成任务不会暗中切换单位或产生另一套日期含义。

### WF-08 speaker 新增步骤会出现在非 speaker 活动

新增步骤未继承相邻步骤的 `cond: externalGuest`，也没有条件编辑入口。函数复现：在 Speaker SAP Headshot 后插入 New speaker check，再生成 `speaker: false`、没有 partner 的普通活动，原 speaker 步骤消失，新步骤却仍被创建。

代码：`src/components/setup/WorkflowPanel.tsx:48`；`src/engine/playbooks.ts:245`。

**验收标准：** 在条件分支中插入时，明确新步骤的适用范围；speaker/partner 关闭后，属于该条件分支的新步骤正确跳过，后续依赖正确接续。若用户希望所有活动都做，也能显式设置。

### WF-09 删除步骤在新建活动时被补回

函数复现：从模板删除 Photo Backup 后，`validateWorkflow()` 通过，模板中也确实没有这个步骤；调用 `buildEventNodes()` 生成新活动时，Photo Backup 又存在。

根因：编辑器仅按学校规则判断部分节点不可删除；生成器另有 `CORE_EVENT_STEP_KEYS`，会为 v2 活动补回缺失的核心节点。两端的“可删”定义不同。

代码：`src/components/setup/WorkflowPanel.tsx:109`；`src/engine/workflow.ts:189`；`src/engine/playbooks.ts:225`、`:240`。

**验收标准：** 统一哪些步骤必保留、哪些可删除。若核心步骤必须保留，编辑器应阻止删除并解释；若允许删除，生成活动时应尊重决定。不能显示删除和保存成功，随后悄悄恢复。

### WF-10 删除 Full Check 会使活动前流程消失

浏览器复现：打开 Full Check 的 Details，点击 **Delete this step**；操作允许保存，图上的任务节点从 **46 个降为 11 个**，Event Plan 等活动前节点都不再显示。函数复现确认模板仍有 35 个非收尾节点，但布局只返回收尾分支。

根因：Full Check 没有使删除按钮禁用的 `ruleIds`，模板校验也不要求保留它；布局又以它存在为绘制所有活动前分支的前提：`if (!routeNodes.length || !final) return`。

代码：`src/components/setup/WorkflowPanel.tsx:109`；`src/components/flow/metro.ts:62`、`:104`。

**验收标准：** 必保留的汇合点不能被误删；允许删除的情况下，布局有正确的替代连接方式，其余任务仍然可见、可选、可编辑。数据仍在却从图上消失不能视为正常删除。

### WF-11 模板的操作说明与 Why 混用

Step details 的 **Task description** 实际修改的是 `step.why`。生成任务时它进入 `node.why`，任务页和提醒事实将其解释为 **Why it matters**；具体 **Your next step** 则优先读 `node.instructions`，没有时使用固定步骤文案或任务标题。

实际任务已有可选 `instructions/completionCriteria`，但模板没有对应字段，生成器也没有从模板复制这两项。因此社长不能在模板里一次写好可复用的详细操作及完成标准；单改 Task description 不等于把内容设置成成员的下一步指引。

代码：`src/components/setup/WorkflowPanel.tsx:98`；`src/data/types.ts:66`、`:272`；`src/engine/playbooks.ts:327`；`src/reminders/facts.ts:16`、`:45`；`src/components/TaskDetail.tsx:57`。

**验收标准：** 清楚区分做什么、怎么做、完成标准和为什么做；模板输入能进入新活动、任务页和提醒内容的正确位置。操作文档可以在任务页展开，邮件仍突出一个明确动作和一个任务入口。

这一项同时影响两个核心目标：提醒是否能让成员马上行动，以及新任 marketing 成员能否直接按流程完成工作。

### WF-12 改名后图上仍显示旧简称

浏览器将 Budget 改为 **Sponsor cost plan**，确认新名称已保存；图上的节点仍显示 **Budget**。

根因：图中文字优先使用 `SHORT[stepKey]` 的固定简称，没有判断用户是否修改了标准名称。完整名称会在详情或悬停中更新，导致不同位置的信息不一致。

代码：`src/components/flow/MetroChart.tsx:30`、`:298`。

**验收标准：** 自定义名称立即反映到图上；需要缩写时从当前名称生成或另有显式简称字段；刷新和新建活动后仍保持一致。

### WF-13 模板摘要遗漏部分自定义设置

函数复现：只改 Partner Speaker Review 的描述，或只改 Budget 的默认岗位，`describeWorkflow()` 仍返回 **The standard workflow.**。该函数的变更计数仅比较名称、用时、阶段和依赖，未比较负责人、描述、目标 anchor 或 timing。

代码：`src/engine/workflow.ts:226`、`src/pages/Settings.tsx:138`。

**验收标准：** 已保存的关键自定义设置应在摘要中计入或明确展示，使社长能够确认当前采用的是调整后的配置。

## 建议的修复顺序和定版条件

此处仅记录后续顺序，不自动开始实施。

1. **先统一模板与执行数据。** 明确分支、条件、依赖、必保留节点和唯一日期语义，解决 WF-04 至 WF-10。否则后续界面和邮件仍会读到互相矛盾的信息。
2. **补齐可执行任务内容。** 解决 WF-01、WF-02、WF-11，让社长配置具体操作、完成标准、办理入口及原因，并贯通新活动和任务页。
3. **整理 Details、图中文字和摘要。** 解决 WF-03、WF-12、WF-13，用同一套真实配置展示可读的结果。
4. **做一条 speaker 活动完整验收。** 编辑模板 → 移动节点 → 在 speaker 分支插入步骤 → 改用时和目标 → 刷新 → 生成活动 → 核对负责人、条件、依赖、日期、链接、任务说明及提醒内容。再用关闭 speaker 的普通活动确认条件隔离。

模板定版至少应满足：编辑结果能保存、能读懂、图与依赖一致、新活动忠实采用配置、提醒日期与任务日期一致、成员能找到真实办理入口、模板能复用操作说明。对新人上手的最终成效仍需实际使用验证，不能仅凭这些技术检查宣称已达到“三天掌握全部流程”。

## 已有行为和后续边界

- **修改模板只影响未来活动**是当前明确设计，Settings 已说明；既有活动保留自己的步骤，本轮未把它误报为缺陷。位置：`src/pages/Settings.tsx:129`、`src/data/settings.ts:126`。
- **流程图不是按日期比例绘制**本身可以是设计选择。WF-04 的问题是页面要求用户用图编辑执行顺序，但图没有反映已保存的依赖变化。
- **自动 email 目前仍是浏览器内演示。** `useAutomaticReminders()` 依赖应用打开和状态变化，`sendReminderBatch()` 生成邮件与本地记录，runtime 的自动投递结果为 `simulated`。真实后台定时、外部邮件投递和跨设备访问仍是后续工作，不能把本轮模板定版当成已完成无人值守发信。位置：`src/reminders/useAutomaticReminders.ts:8`、`src/reminders/delivery.ts:13`、`src/reminders/runtime.ts:35`。
- 本轮聚焦模板，没有修改职责匹配、邮件策略、Handoff、新人培训功能或正式网站。
- `ab7123c` 的并行工作记录表明实际活动节点的 Details、Edit 和多外链正在另一个任务中改造，明确排除 Settings 模板。实施本报告前须重新核对届时已合入的任务字段与办理入口，复用其数据模型，避免重新引入两套链接或与进行中的工作重叠。

## 验证和交接

**已有检查：** 7 个相关测试文件，共 **104 项通过**；现有 Settings workflow 浏览器用例在桌面和手机各通过 1 项，共 **2 项通过**。已有测试虽通过，但没有覆盖移动后的视觉顺序、同分支插入、工作量与提醒日期的一致性等反例，不能据此认为上述问题不存在。

运行命令：

```text
npm exec -- vitest run src/test/workflow.test.ts src/test/workflowV2.test.ts src/test/orgWorkflow.test.ts src/test/flowEdit.test.ts src/reminders/actionLinks.test.ts
npm exec -- vitest run src/test/calibratedEngine.test.ts src/reminders/facts.test.ts
npm exec -- playwright test --config=/tmp/workflow-audit-playwright.config.mjs --grep 'Settings workflow'
```

浏览器用例复用现有 `e2e/workflow-setup.spec.ts`，临时配置使用本地 Vite 4188 端口和系统 Chromium，未修改仓库测试。另完成 **8 个浏览器场景记录**：键盘移动、鼠标拖动、桌面新增、手机新增、Check-in 目标、改名、删除 Full Check、实际 Plan 报价入口；函数反例覆盖新增条件、生成时补回、日期和布局。

工作区证据保存在 `/workspace/shared/workflow-template-audit/`：`browser-results.json`、`engine-results.json` 及截图；该目录不是仓库附件，跨机器交接以本报告的复现步骤和代码位置为准。

未运行完整发布门禁或真实学校表单提交；没有调用真实 AI、发送真实邮件、修改产品代码、合并 main 或创建新 PR。后续接手先处理上述模板一致性问题，再推进自动提醒和组织交接。需要同步本地备份。
