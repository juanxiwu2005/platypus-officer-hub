# M4 方案：两套 onboarding 合成一套（待 Juanxi 审核）

**状态：只是方案，没有改任何代码。** 起草：Claude，2026-10-29，分支 `integration/v1.0`。
（执行方案里叫它"M3"，现在 M3 已经是排序题，所以这件事改叫 **M4**。）
依据：执行方案 8.6、9.1、9.2、9.4、9.6、10.4；`AGENTS.md` 第 10–12 节；`docs/IRB_HANDOFF_2026-10-28.md` 第 2 节；代码只看了结构：`src/pages/Setup.tsx`、`Join.tsx`、`src/organization/`（文件列表和 `schema.ts` 类型）、`src/phase1/serverStorage.ts`、`vite.config.ts`、`netlify/functions/`。

## 0. 先说结论

| | |
| --- | --- |
| **建议** | **Phase 3 之前（11/9）不要做合并，留到 Phase 3 之后。** 方案现在定稿、冻结；最多在 11/9 前做一件"看不见"的小事（见第 6 节方案 B），也可以什么都不做 |
| 为什么 | ①做完要 4–5 个会话，加上你每次验收，11 天不够，而且测试前至少要留 3 天"冻结"不动代码；②它会改 `Role`、`Person` 的关系，全站有 37 处用到 `holderId`，测试前动这个风险太大；③参与者用的是虚构信息，DP3 最有价值的"读章程自动建岗位"对研究任务不是必需的 |
| 现在参与者其实已经有一套能用的设置 | 主应用的 `/#/setup`（5 步）加 `/#/join`（5 个问题）；DP3 的 5 章 AI 设置在研究用的构建里**根本不可达** |

## 1. Phase 3 参与者现在看到哪套？合一之后变成什么样？

### 1.1 现在（已核实）

- **研究用构建**（`ORG_SETUP_ENABLED` 不设，也就是关）：参与者只能走主应用的 **`/#/setup`**：Your club → Semester goals → Officer roles → Invite & workspace → First event（5 步，数据只存在浏览器里）；officer 走 **`/#/join`**（5 个问题，同一浏览器的演示链接）。
- DP3 的 5 章 AI 设置（Constitution → Your team → Responsibilities → Activity workflow → Review）在 `/#/phase1/`。构建时 `SERVER_STORAGE = false`，这些画面**不被打包**，`/#/phase1/` 只剩一个本地示例。它的 AI 走 `/api/org/ai` 等 7 个端点，没开的时候全部返回 404。
- 所以现在是"一套能用，另一套被关掉"，不是"两套都能用"。

### 1.2 合一之后（文字草图）

只有一条路：`/#/setup`（社长/副社长）和 `/#/join`（officer）。DP3 的内容变成 Setup 里新增的几步，用主应用自己的组件做，数据仍然只存在浏览器里。

```
Set up your fictional club                         ● ● ● ○ ○ ○ ○    (进度链 Chain)
─────────────────────────────────────────────────────────────────────────────
1 Club        name · mission · school
              [ Use our sample constitution ]  [ Choose a file ]  [ Paste text ]   ← 可选，可跳过
              (点 "Read it with AI" → 下面出现"AI suggestion · check it"的岗位行，逐行 Add / Skip)
2 Goals       (现有：2–3 个目标)
3 Team        表格 (.tbl)：每行一个"人" —— Name · Email · Role · Department
              部门是彩色小标签；Role 是下拉；右上 "+ Add person"
              点一行 → 右栏 Details：这个人的岗位职责（Duties）
4 Duties      按岗位列职责清单（可编辑的小标签）+ 默认的 R/A/C/I（谁负责、谁批准、谁被咨询、谁被告知）
5 Event steps 在标准流程之上"加本社团自己的步骤"：名称 · 哪个岗位 · 几天 · 排在哪一步之后
              （用 M3 的 Edit steps 同一套规则，不是另一个流程图）
6 Invite      (现有：邀请链接 + 工作区渠道)
7 First event (现有：一句话 → 表单 → 确认) + 上面所有内容的一页总览，确认才保存
─────────────────────────────────────────────────────────────────────────────
Back  Next      "Nothing is saved until you approve the first workflow."
```

- 7 步看着多，其实 **1、4、5 都是可跳过的**（"Skip — use the standard plan"），所以最快路径还是原来的 5 步。
- 参与者用虚构信息，AI 是**可选加速器**：关掉 AI（顶栏 AI features 开关）整条流程照样走得通。

## 2. DP3 五章哪些搬进来，用主应用的 5 个组件怎么重做

主应用的 5 个组件（AGENTS.md §7.2）：状态色块 `StatusPill`、进度链 `Chain`、表格 `.tbl`、悬停卡 `Hover`/`Info`、右栏详情（`useRail().show`）。AI 只有右栏 Ask 一个入口（§7.1）。

| DP3 章 | 做什么 | 搬不搬 | 在主应用里怎么重做 |
| --- | --- | --- | --- |
| **1 Constitution** | 上传 PDF/Word 或粘贴 → AI 读出社团名、使命、岗位、岗位归属的部门、不确定的地方 | **搬（可选）** | Setup 第 1 步的一行按钮；文件**只在浏览器里读**（`readConstitution` 用 pdfjs/mammoth，不上传）；点 "Read it with AI" 才把**文字**发给一个**不存储**的新接口（第 5 节）；结果作为"建议行"逐行 Add/Skip（模仿变更卡）；AI 不确定的地方放进 `Info` 悬停卡 |
| **2 Your team** | 部门、岗位、组织架构图（`SetupCharts.tsx` 958 行）、成员 | **搬一半** | **搬：** 部门、岗位、人（第 3 步表格）。**不搬：** 组织架构图（你选了简洁风格；以后可以用地铁图样式做）。人成为表格的主角（第 4 节） |
| **3 Responsibilities** | 部门/岗位职责、Check（AI 查风险） | **搬职责，不搬 Check** | 第 4 步：每个岗位一串可编辑的职责小标签；右栏 Details 里看。`Check`（`risk_check`）先不搬，主应用已经有活动的 Plan check |
| **4 Activity workflow** | 成员流程图 + 理事会流程图（`FlowEditor.tsx`，手动拖节点） | **只搬"自定义步骤"** | 不搬流程图（9.4②：不要 FlowEditor）。第 5 步：在标准流程上**添加本社团自己的步骤**（成为 `StepTemplate` 风格的额外步骤，创建活动时和标准步骤一起生成）；顺序/天数用 M3 的编辑规则。**理事会流程（boardFlow）先不搬** |
| **5 Review** | 审批、`guide`（给 AI 的社团说明）、编译成机器可读 JSON、风险汇总 | **搬总览，不搬 guide/JSON** | 第 7 步的一页总览；`guide` 不需要（主应用的 AI 直接读真实数据，`aiContext.ts`）；JSON 可以以后做成 "Export my data" 的一部分 |

**一律不搬：** 服务器存储、原件归档（`archive.ts`、`client.ts`）、AI 任务记录和诊断、聊天记录、`src/workspace/`、`organization.css` / `setupV3.css` / `phase1.css`（4,567 行第三套设计系统）、`FlowEditor.tsx`、`SetupCharts.tsx`。**可以复用：** 纯逻辑文件 `setupLogic.ts`（稳定 ID、手动字段保护、局部引用修复；592 行，有测试），但只复用函数，不把 `src/organization/` 的界面打包进来。

## 3. 字段映射表，和 9.4 里五处冲突的处理

### 3.1 字段映射（DP3 → 主应用）

| DP3 | 主应用 | 做法 |
| --- | --- | --- |
| `OrgRole.id` | `Role.id` | 直接用（稳定 ID） |
| `OrgRole.title` | `Role.displayName` | 直接用 |
| `OrgRole.departmentId` | **新增可选字段 `Role.departmentId`** | 部门只是附加标签，用来分组和上色；**`Role.fn`（`RoleFunction`）仍是引擎的主键**（见冲突①） |
| `OrgRole.description` | **新增可选 `Role.description`** | 低风险 |
| `OrgRole.responsibilities[]` | **新增可选 `Role.duties?: string[]`** | 进 Handoff 手册、AI 上下文 |
| `OrgRole.source/quote/confidence/manualFields/position/parentRoleId` | — | 不搬（`position` 对应冲突②；组织架构图不做） |
| 部门 `Department{id,name,color}` | **新增可选 `org.departments`** | 颜色是用户数据，和状态色同一类（可改，不进 token） |
| `RaciRow.responsible` | `Node.ownerId` | 按"岗位 → 当前担任者"解析成人 |
| `RaciRow.accountable` | `Node.approverRoleId` | 直接对应 |
| `RaciRow.consulted / informed` | `Node.consultedRoleIds / informedRoleIds` | 直接对应（这一组近乎一比一） |
| `OrgAction`（职责条目，无日期） | **`StepTemplate` 风格的额外步骤**，不是 `Node` | 9.4 已决定：Action 更适合变成流程模板 |
| `FlowNode.title / description` | `title` / `why` | 直接用 |
| `FlowNode.dependsOn` | `Node.dependsOn` | 只用于"额外步骤"；`dependencyMode:"any"` 见冲突③ |
| `FlowNode.timing` | `Node.anchor`（rule/target/fixed） | 见冲突④ |
| `Assignment`（动作 → 岗位） | 额外步骤的负责岗位 | 解析成负责人 |
| `guide`、`aiRuns`、`messages`、`generated`、`compiled`、`approvals` | — | 不搬 |

### 3.2 五处冲突（9.4 已做的决定，照用）

1. **`departmentId` vs `RoleFunction`：两个都留。** `RoleFunction` 仍是流程模板、泳道、手册的主键；`departmentId` 只是分组标签。需要一张"部门 → 职能"映射：Programs & Planning → programs、Event Logistics → programs、Finance & Purchasing → finance、Marketing & Communication → marketing、Outreach & Partnerships → outreach、Leadership & Records → president / vice_president / secretary（按岗位名判断，判断不了就 secretary，并在界面提示可改）。**多对一，所以必须手动可改。**
2. **`FlowNode.position{x,y}`：导入时丢弃**，一律用 `metro.ts` 自动布局。DP3 的拖节点编辑器不迁移；以后用户改的是"顺序和依赖"（M3 已经做了）。
3. **`dependencyMode:"any"`：只接受 `"all"`。** 遇到 `any` 就拒绝，并明确告诉用户"This workflow uses an 'any' link, which Platypus does not support yet."；不悄悄当成 all。**不为此改 `src/engine/`。**
4. **`timing`：只能翻译成 `Node.anchor` + 流程里的提前量**，再交给 `schedule.ts` 算。**任何情况下不能把它直接写成三个日期字段。** AI 或章程里出现的日期一律丢弃（AGENTS.md 规则 3）。
5. **DP3 没有"人"：** 合一后的 onboarding **必须有"谁担任每个岗位"这一步**，即第 3 步 Team 表格（人是行，岗位是列）。省了就整个 Tasks / Team / Today 没数据。

## 4. 以"人"为主的层级（10.4 的方案 A）

**范围：只做数据建模，不做真实登录。Phase 3 仍然用虚构信息，真实账号留到 v1.5。**

- 层级：**`Person` → `Role` → `Department`**。
- **`Person.roleId` 是唯一真相。** `Role.holderId` 现在和它重复（全站 37 处用到），**不删，改成"派生值"**：加一个函数 `syncHolders(state)`，在 Setup 完成、保存设置、保存个人资料、完成交接这几个地方统一调用，让每个岗位的 `holderId` 总是等于"`roleId` 是它的那个人"。好处：37 处用法一行不用改；风险集中在一个函数和一条"永远一致"的测试里。
- **一个岗位一个人**（和现在一致）；一个人一个岗位。多人同岗位不在这次范围。
- 权限不变：`canLead` 仍是社长/副社长。
- **不做账号密码。** 邀请仍是"同一浏览器的演示链接"（现有 `InviteLink` + `Join.tsx`）；参与者拿到的是我们给的虚构人物。
- **新的一句话提示**放在 Team 步骤里："Fictional names only. Real accounts are planned for a later version."

## 5. ⚠️ IRB：服务器存储必须保持关闭，方案不需要它

**硬规则：** 合一后的流程**不调用任何 `/api/org/*`、`/api/workspace*`**，`ORG_SETUP_ENABLED` 继续不设（关）。IRB 材料里仍然**不写**"服务器存储组织配置"（`docs/IRB_HANDOFF_2026-10-28.md` 第 2 节）。

| 数据 | 放哪里 | 说明 |
| --- | --- | --- |
| 设置过程中的草稿 | **只在浏览器** localStorage（单独一个键，完成或 Reset demo 时删除） | 不碰 `src/organization/` 的草稿/归档代码 |
| 章程文件 | **只在浏览器里读**（pdfjs/mammoth 在浏览器运行） | 从不上传；也不保存原件 |
| 发给 AI 的内容 | 只有用户点 "Read it with AI" 时，**提取出的文字**发到一个**新的、不存储的**服务器函数 | 函数只转发给 AI（ASU AIR）并把结果返回，**不用 Blobs、不写日志里的正文**；和现有 `/api/chat`、`/api/event/review` 同一类 |
| 参与者填的内容 | 全部虚构（沿用 Handoff 的提示 "Fictional example only"） | 界面在粘贴框旁明确写 "Fictional example only. Never paste a real constitution or member details." |
| 默认入口 | **"Use our sample constitution" 一键** | 参与者不需要自己找文件 |

**要加的"守门"测试：**
1. 新的服务器函数**不 import `serverStorage`**，调用 `getStore` 的次数为 0（和 `serverStorageHidden.test.ts` 同样的写法）。
2. 页面测试：走完整个合一后的流程，**对任何 `/api/org/` 或 `/api/workspace` 的请求数为 0**（沿用现有 e2e 的"0 个存储请求"断言）。
3. 新增的 AI 结果过滤：日期字段全部丢弃；只保留真实存在的字段；字数/条数设上限。
4. 构建检查：研究用构建里搜不到 `/api/org/setup` 这类字符串（可选，加一条单元测试读构建产物）。

## 6. 工作量，能不能在 11/9 前做完

| 会话 | 内容 | 大小 |
| --- | --- | --- |
| **M4a 数据地基**（无界面） | 新增的可选字段（`Role.departmentId/description/duties`、`org.departments`、额外步骤）；`syncHolders` 和"永远一致"测试；DP3 → 主应用的转换纯函数 `src/lib/orgAdapter.ts` 和映射表测试；部门 → 职能映射 | 1 个会话 |
| **M4b 设置界面** | Team 表格、Duties、Event steps、总览，用 5 个组件；Join 里同步；字数/无障碍/手机 | 1.5–2 个会话 |
| **M4c 读章程（可选加速器）** | 浏览器读文件 + 不存储的服务器函数 + 提示词 + 过滤 + 建议行界面 + 模拟 AI 的测试 + 守门测试 | 1 个会话 |
| **M4d 收尾** | e2e（桌面+手机）、a11y、文档（AGENTS.md、PROGRESS、DESIGN_TOKENS 如有新 token）、你的验收修改 | 1 个会话 |

合计 **4–5 个会话**，再加你每一步的验收往返。

**能不能 11/9 前做完？不建议。**
- 从今天（10/29）到 11/9 一共 11 天；扣掉测试前的冻结期（至少 3 天不改代码，11/6 起），只剩约 8 天。
- 4–5 个会话 + 每次你验收后的修改，最快也要 9–11 天，而且 M4b、M4c 会改动所有页面共用的 `Role`/`Person` 关系，出了问题没有时间慢慢查。
- 研究任务用不到"读章程"：参与者拿到的是虚构俱乐部。

**三个选项：**
- **A（建议）：** 11/9 之前什么都不做，方案冻结。Phase 3 结束后按 M4a → M4b → M4c → M4d 做。
- **B：** 11/9 前只做 **M4a**（看不见的数据地基：可选字段、`syncHolders` 和测试）。界面不变、风险最低，好处是 Phase 3 数据里已经带着新字段。我仍然建议留到测试之后，因为"零风险"也要你花一次验收。
- **C：** 全做。不建议，理由同上。

## 7. 要 Juanxi 拍板的问题

1. **现在做还是 Phase 3 之后做？** 建议 **A：Phase 3 之后**。（B 只做 M4a 也可以，但没有明显好处。）
2. **"读章程 + AI"要不要做？** 它是 M4c，**可选**。如果 Phase 3 只用虚构的示例俱乐部，参与者不会上传章程，可以先只做 M4a + M4b（人、部门、职责、额外步骤），把 AI 读章程留到 v1.5。建议：**先不做 M4c**。
3. **"额外步骤"要不要进第一版？** 就是第 5 步，让社团在标准流程之外加自己的步骤。它会让 Phase 3 参与者的流程变长；如果不需要，M4b 可以缩成 **Team + Duties 两步**，省约半个会话。建议：**第一版只做 Team + Duties，额外步骤留到之后**。
