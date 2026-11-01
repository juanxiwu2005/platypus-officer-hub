# M3 排序题方案：用"排序题"改步骤顺序，地铁图实时重算

**状态：待 Juanxi 审核。这份文档只是方案，没有改任何代码。** 起草：Claude，2026-10-29，分支 `integration/v1.0`。
依据：执行方案第 10.2 节（含"M3 的硬性约束"）和第 9.4 节第 ② 条；已逐项对照代码：`src/data/types.ts`（Node、Phase）、`src/engine/schedule.ts`、`src/engine/playbooks.ts`、`src/components/flow/metro.ts`、`src/pages/Events.tsx`、`src/components/NodePanel.tsx`、`src/data/store.tsx`。

## 0. 先说四个和执行方案不一样的发现（都已在代码里核实）

1. **"处理所需天数"的字段叫 `Node.estDays`，不是 `Node.effort`。** 执行方案里写的 `effort` 在代码里不存在。`estDays` 是"工作日天数"，范围 0–30（`updateNode` 会取整并夹住）；引擎算"最晚开始日"时，用的是 **`estDays` 加上负责人的个人缓冲天数**。
2. **`estDays` 不影响预测百分比。** 预测（`forecast.ts`）用的是另一个字段 `Node.tier`（light 1–2 天、medium 3–5 天、heavy 5–10 天）。所以只改天数，日期会变，但"准时概率"不会变，界面会显得不一致。这是第 9 节的问题 3。
3. **"顺序"没有地方存。** 数据里没有"这一步排第几"这个字段（`Node.rank` 只用于看板列里的排序）。步骤的先后**完全由 `dependsOn`（谁等谁）决定**。所以拖拽后，列表顺序每次都是**从依赖关系重新算出来的**。结论：**每一次拖拽必须表达成一条依赖关系的改动，或者一个 Phase 的改动**，否则松手后行会弹回原位。
4. **Phase（大排序）的顺序和依赖的顺序并不一致。** 模板里有 3 条"倒着"的依赖：`approve`（plan）要等 `budget`（money）；`foodex`（prepare）要等 `quote`（money）；`usg`（money）要等 `flyer`（marketing）。所以不能把"按 Phase 分组的列表顺序"当成"先后顺序"。

## 1. 放在哪里：Events 页，某个活动的 "Edit steps"

Events 页现在有 Flow / List 两个视图。加第三个：**Flow · List · Edit steps**（只有社长和副社长看得到；其他人看到的 List 不变）。电脑上左边是排序题、右边是地铁图（**同一个活动、同一份数据**，每次改动立刻重算）；手机上排序题在上、地铁图（竖排）在下。

```
Events   [Networking Night ▾]            [ Flow | List | Edit steps ]
┌──────────────────────────────────────────┬───────────────────────────┐
│ Club buffer: 3 working days · Settings → │   (地铁图，实时重算)        │
│ Your reminder lead: 1 day (private) [-][+]│                           │
│                                          │  ●──●──●──●──●──◆──●      │
│ ▼ Plan                          3 steps  │     \_●_/   \__●__/       │
│ ┌────────────────────────────────────┐   │                           │
│ │≡ ▲▼ Meet the speaker      Days [ 2 ▾]│   │  (选中的行，对应的点高亮)   │
│ │      waits for: —                    │   │                           │
│ │      Start Oct 21 · Club Oct 23 · ASU│   │                           │
│ ├────────────────────────────────────┤   │                           │
│ │≡ ▲▼ Draft the event plan  Days [ 2 ▾]│   │                           │
│ │      waits for: Meet the speaker ×  [+]│  │                           │
│ │      Start Oct 23 · Club Oct 27 · —  │   │                           │
│ └────────────────────────────────────┘   │                           │
│ ▼ Prepare                       9 steps  │                           │
│   …                                      │                           │
└──────────────────────────────────────────┴───────────────────────────┘
 每行：≡ 拖拽把手 · ▲▼ 上移下移 · 标题 · Days 数字框 · "waits for" 标签（可点 × 去掉，+ 添加）
       ⋯ 菜单：Do after the row above / Do alongside the row above / Move to phase…
       日期一行：只读，来自引擎（Start / Club / ASU 三个日期，三个日期分开）
```

要点：
- **大排序 = Phase 分组（6 个），小排序 = 组内的步骤。** 一个组里步骤数不一样：plan 4、prepare 9、money 5、marketing 4、run 3、close 3（共 28 步）。prepare 有 9 个，超过你说的"约 5 个"，所以每组可以折叠。
- 每行的日期行是**只读**的，三个日期分开写；"Start"这一项只有**负责人本人**看到带个人缓冲的算法说明，别人只看到通用说明（和现在的详情面板一致，保护个人缓冲的隐私）。
- 打开 Behind the scenes 开关时，日期行下面会出现来源说明（沿用 S7 的机制，不造第二套）。
- 不进 Events 默认视图，所以不占 AGENTS.md §7.5 的 Events 字数上限（字数检查只量默认视图）。

## 2. 大排序对应 Phase：Phase 的顺序能不能拖？

**建议：Phase 的先后顺序不能拖，固定为 plan → prepare → money → marketing → run → close。** 理由：

| 拖 Phase 顺序会怎样 | 结论 |
| --- | --- |
| 顺序存在哪里？ | 只存在代码常量里（`src/lib/phases.tsx` 的 `ORDER`），数据里没有这个字段。要存就得新增字段（改数据结构），违反"界面只写 dependsOn / 天数 / phase" |
| 对**引擎**有影响吗？ | **没有"顺序"的影响，只有"是不是 close"的影响。** 引擎只关心 `phase === "close"`：close 的步骤被排在活动**之后**（活动后 3 个工作日、不早于活动后第一个工作日），其他 Phase 完全一样对待（`schedule.ts` 193/199/214/307 行） |
| 对**预测**有影响吗？ | 同上，只有 close 特殊（活动日之前不开始，且不计入"关键路径"，`forecast.ts` 42/76 行） |
| 对**地铁图**有影响吗？ | 地铁图按**依赖关系**排主线，不看 Phase（只用 `phase==="close"` 判断"活动后"一侧，`metro.ts` 51 行）。所以拖 Phase 顺序不会改变地铁图 |
| 对**今天页进度点**有影响吗？ | 有：今天页每个活动的进度链，一个点就是一个 Phase，顺序来自 `ORDER` |

所以**拖 Phase 的顺序只会让今天页的进度点顺序和编辑页不一致，却不会改变任何日期**，没有意义，还容易误会。

**可以做的是"把步骤搬到另一个 Phase"：** 拖一行到另一个 Phase 组里，只改这一行的 `phase`（≤ 一个字段，不改依赖）。⚠️ **搬进或搬出 Close 会改变日期**（搬进 Close = 被排到活动之后；搬出 = 被排到活动之前），所以搬的时候要显示一行提示："Close-out steps are scheduled after the event.（收尾步骤排在活动之后）"，并且显示改前改后日期。

另一个要补的小缺口：`NodePatch`（`src/data/store.tsx`）目前**不允许改 `phase`**，M3 要把 `phase` 加进去（只加这一个字段）。

## 3. ⚠️ 最关键：列表顺序怎么变成 `dependsOn`，不丢掉并行关系

### 3.1 为什么不能"按列表顺序串成一条链"

模板一共 28 步，**大量步骤是并行的**。例子：`approve` 之后，`registry`、`venue`、`offvenue`、`advisor`、`quote`、`dining`、`permit`、`foodplan`、`flyer` 这 9 步全都只等 `approve`，彼此并行；`sap` 只等 `partner`，和 `draft`、`mktneeds` 并行；`usg` 同时等 `quote`、`flyer`、`budget` 三个（汇合）。

如果把 28 步按列表顺序串成一条链：每一步的"处理天数"会被**全部累加**，总共 **37 个工作日**，而现在真正的最长路线（关键路径）只有 **15 个工作日**。结果：几乎所有步骤的最晚开始日被推早 22 个工作日，很多会"早于今天"或"赶不上 ASU 截止日"，地铁图会变成一条直线。**这就是你担心的错误，所以绝对不能这样做。**

### 3.2 方案：依赖关系是"真相"，列表只是它的一种显示

| 规则 | 内容 |
| --- | --- |
| **R0 不从列表重建依赖** | 永远不会"遍历列表，给每一行写 `dependsOn = 上一行`"。依赖只在你明确做动作时，被**逐条**改动 |
| **R1 列表怎么排** | 先按 Phase 分组（固定顺序），组内按：依赖深度（谁在前）→ 引擎算出的社团截止日 → 标题。这个顺序每次改动后重新算，所以松手后行会落在它的新位置 |
| **R2 拖到"某行 U 的下面"** | 意思是 **"这一步在 U 之后做"**：只给被拖的这一行 R **加一条依赖 U**（R 等 U）。别的行一概不动。如果 R 原来等的某一步 d，其实 U 已经（直接或间接）在等 d，那条 d→R 就**多余**，一并去掉（日期不变，地铁图线更少） |
| **R3 拖到"某行 V 的上面"** | 意思是 **"这一步在 V 之前做"**：只给 V 加一条依赖 R（V 等 R）。同样去掉多余的 |
| **R4 在两行之间松手** | 松手时弹出一个小框，两个选项：**① Do after「上面那行」**（默认勾上，= R2）；**② Do before「下面那行」**（默认不勾，= R3）。可以都勾（夹在中间），也可以只勾一个。看得见、选得出，不会悄悄多出依赖 |
| **R5 想让两步并行（Do alongside）** | 行菜单里的 **Do alongside the row above**：去掉 R 和上面那行 U 之间的依赖，并让 R 等 **U 所等的那些步骤**（所以它们同时开始）。R 原来别的前置步骤保留 |
| **R6 不许造成环** | 提交前先检查：新依赖会不会让 R 间接等自己。会，就**拒绝**，并说明是哪几步（例如 "Reserve the room waits for Add the RITM number, which already waits for it"）。引擎只会事后报"环"，所以检查必须在界面这边做 |
| **R7 跨过有依赖关系的行** | 拖过一个和自己**直接有依赖**的行，就是"**对调两者的先后**"：去掉原来的那条依赖，加反方向的一条。这是个大动作，所以松手前要显示"改前 / 改后日期"让你确认；会造成环就拒绝 |
| **R8 一次拖拽 = 一个动作 = 一条日志 = 一次撤销** | 见第 6 节 |

### 3.3 一个具体例子（用模板里的真实步骤）

出发状态（节选）：`approve` ← `registry`、`venue`；`ritm` 等 `registry` 和 `venue`；`offvenue`、`advisor`、`quote` 也只等 `approve`。

**操作：** 把 **Reserve the room（`venue`）** 拖到 **Register the event（`registry`）** 的下面，勾 "Do after Register the event"。

| | `venue` 的依赖 | 其他步骤 |
| --- | --- | --- |
| 之前 | `[approve]` | `registry:[approve]`、`ritm:[registry, venue]`、`offvenue:[approve]`、`advisor:[approve]`、`quote:[approve]`…… |
| 按 R2 | 加上 `registry` → `[approve, registry]`；`registry` 已经等 `approve`，所以 `approve` 是多余的，去掉 → **`[registry]`** | **一条都没动**：`offvenue`、`advisor`、`quote`、`dining`、`permit`、`foodplan`、`flyer`、`sap`…… 仍然各自只等原来的步骤，**并行关系全部保留**；`ritm` 仍等 `registry` 和 `venue`，没问题 |

引擎重算后你会看到：`venue` 要等 `registry` 做完，`registry` 的社团截止日因此被提前（它要在 `venue` 开始前做完），`venue` 自己的 ASU 截止日（R03）不变；地铁图上 `venue` 从"和 `registry` 并排"变成"跟在 `registry` 后面"，其余分支不变。改动只有 **1 个步骤的 1 条依赖**。

**对比"按列表串成链"：** 同样一次拖拽，会让 28 步里每一步的依赖都被改写，总天数从 15 变成 37。

### 3.4 两个边界情况

- **组内顺序"弹回"：** 因为顺序不存储，把两个互不相关的行互换位置、又不勾任何选项，什么都不会改变，松手后它们会回到原来的位置，并提示："These steps don't depend on each other, so their order is set by their dates. Tick "Do after" to make one wait for the other."（这两步互不相关，顺序由日期决定。想让一个等另一个，请勾 "Do after"。）
- **有人手动设了社团截止日（`clubDeadlineOverride`）的步骤：** 编辑器不碰这个字段；这样的行日期旁显示一个小标记 "Club deadline set by a person"。

## 4. "处理所需天数"和"提前天数"怎么写、怎么显示

| 东西 | 写到哪 | 界面上怎么显示 |
| --- | --- | --- |
| **处理所需天数** | `Node.estDays`（0–30 整数；现有的 `updateNode` 已经会夹范围） | 每行右边的数字框 "Days"；改了立刻重算 |
| **社团统一提前天数** | 不在这里改。它是 `org.settings.clubBufferBusinessDays`（默认 3 个工作日），已有设置在 Settings → "Deadline and follow-up defaults" | 编辑器顶部一行只读文字 "Club buffer: 3 working days before every ASU deadline" + 去 Settings 的链接；对所有任务统一生效 |
| **个人提前天数**（"提前 2 天提醒我"） | `Person.personalBufferDays`（0–5，Settings → My preferences 里已有，只有本人能改，而且可以关闭） | 编辑器顶部"Your reminder lead: N days (private)"，**只给当前查看者本人**，带 −/＋ 按钮（写的是本人自己的偏好，不是日期）；别人的个人缓冲数字**不显示**（和现在一致） |
| **最晚开始日怎么来的** | 不写。引擎：`最晚开始日 = 社团截止日 − (estDays + 负责人个人缓冲)`，按负责人的工作日算（跳过忙碌周） | 每行日期行的 Start；点开/开 Behind the scenes 看算法 |

日期分三个，行里并排写出：**Start**（每个人自己的最晚开始日）· **Club**（社团截止日）· **ASU**（学校截止日，没有规则就不显示）。

## 5. 不拖拽也能操作（键盘、手机）

- 每行有 **▲ ▼ 两个按钮**，是真按钮，Tab 能到，Enter/空格触发。语义和拖拽一致：**▼ = 排到下面那行之后（Do after 它）；▲ = 排到上面那行之前（Do before 它）**；碰到有直接依赖的行就是对调（R7）。
- 行菜单（⋯）里还有 **Do after the row above / Do alongside the row above / Move to phase…**，手机上最好用。
- **拖拽本身**：电脑用鼠标拖（沿用 Tasks 看板已有的拖拽写法，不新增依赖库）；**手机上第一版不做触摸拖拽**（HTML5 拖拽在触屏上不工作），靠 ▲▼ 和菜单。以后要再加。
- 拖拽把手是一个带说明文字的按钮（"Drag to reorder: Draft the event plan"），读屏能读，朗读"行位置"。
- 被拒绝的操作（会造成环、跨 Phase 的限制）用一行 `role="status"` 的文字说明，不弹窗。

## 6. 谁能改、怎么撤销、会不会进交互日志

- **权限：** 和现在的 `updateNode` 一样，只有**社长和副社长**（`canLead`）。其他人看不到 "Edit steps"。AI **不能**走这个入口（AI 的白名单操作不变，不新增 `unlink`、`set_phase` 之类的 AI 操作）。
- **新增一个动作** `applyStepEdits`（store 里）：一次拖拽 = 一个动作，里面是若干个步骤的补丁，**每个补丁只允许 `dependsOn`、`estDays`、`phase` 三个字段**（可选第四个 `tier`，见问题 3）；进来先过白名单、检查环、夹范围，最后**只调一次 `applySchedule()`**。
- **撤销：** 每个动作先把受影响步骤"改之前"的值存起来；界面上松手后出现一个 **"Undo"** 提示条（和 AI 的小改动同样的做法，复用 `undoAuto` 那套"恢复 before"的思路），可撤销最近 10 次。刷新页面后撤销记录不保留（和现有一致）。
- **交互日志：** `store.tsx` 里每个动作都会自动记日志（动作内容 + 改前的值）。给 `applyStepEdits` 补上 `payloadOf` / `beforeOf` 两个分支，日志里记的是"哪个步骤、`dependsOn`/`estDays`/`phase` 从什么变成什么"，**日志里不会有日期字段**。

## 7. 硬约束（逐条）

1. **界面只写 `dependsOn`、`estDays`（= 你说的 effort）、`phase`。绝不写 `officialDeadline`、`clubDeadline`、`latestStart`、`clubDeadlineOverride` 任何日期字段。** 在 `applyStepEdits` 里用白名单只挑这三个（加可选的 `tier`）字段；并加一条单元测试：对任意补丁，提交前后所有日期字段只能由 `applySchedule` 改变。
2. **改完调 `applySchedule()`**（store 里 `updateNode` 已经是这么做的，新动作照做）。
3. **不改 `src/engine/`。** 所有新逻辑放在新的纯函数文件 `src/lib/stepOrder.ts`（列表排序、拖拽 → 补丁、环检查、去多余依赖）和 store/界面里。
4. 地铁图实时更新 = 重新跑 `computeSchedule()` + `metro.ts` 布局（已经是这样），**不存坐标**。
5. 新样式只用 token（S6 的 stylelint/eslint 会检查）；不新增依赖。

## 8. 要加的测试、预计工作量

**单元测试**（`src/test/stepOrder.test.ts`、store 测试）：
- 列表顺序：按 Phase 分组；有 3 条"倒着"的跨 Phase 依赖时不报错、不乱序。
- 拖拽 → 补丁：R2、R3、R4、R5、R7 各一条；第 3.3 节的例子**逐条断言**（`venue` 变成 `[registry]`，其余步骤的 `dependsOn` 一条没变）。
- **"不串成链"测试：** 对完整模板连做若干次拖拽，被改动的步骤数 ≤ 拖拽数 × 2，且总天数/关键路径不变成 37。
- 环：直接环、间接环都被拒绝，并说出是哪几步。
- 去多余依赖（传递约简）；`phase` 搬进/搬出 close 的提示。
- **无日期字段：** 任何补丁里出现日期字段都被丢弃；提交前后 `clubDeadlineOverride` 不变。
- 权限：非社长/副社长的动作被忽略。撤销：恢复后 `dependsOn`、`estDays`、`phase` 与之前完全一致，日期重算一致。日志：有一条记录、没有日期字段。

**页面测试**（桌面 + 手机，`e2e/`）：
- 鼠标拖拽一行 → 松手小框 → 勾选 → 地铁图上的点和日期变化（用点的 `aria-label` 里的社团截止日断言）。
- 只用键盘：Tab 到 ▼ 按钮，Enter，行位置和日期变化；菜单 "Do alongside"。
- 手机：用 ⋯ 菜单和 ▲▼ 完成同样的事（手机不拖）。
- 改 Days → 日期行和地铁图变化；超过 30 被夹住。
- 非社长看不到 "Edit steps"；被拒绝的操作有文字提示；Undo 恢复；刷新后改动保留（和现有存档一致）。
- a11y（axe，桌面 + 手机，含 wcag22aa 触摸目标 24×24）；Behind the scenes 开着时的日期行说明。

**预计工作量：一个会话做不完，建议拆三个：**

| 步骤 | 内容 | 大小 |
| --- | --- | --- |
| **M3b** | `src/lib/stepOrder.ts` 纯函数 + `phase` 加进 `NodePatch` + `applyStepEdits`/撤销/日志 + 全部单元测试。**没有界面** | 约 1 个会话 |
| **M3c** | "Edit steps" 视图：分组列表、Days 数字框、waits-for 标签、▲▼、行菜单、日期行、顶部缓冲说明；右边接地铁图；键盘/手机 e2e 和 a11y。**没有鼠标拖拽** | 约 1 个会话 |
| **M3d** | 鼠标拖拽 + 松手小框 + 改前改后日期预览 + 剩余 e2e | 约 0.5–1 个会话 |

先做 M3b、M3c 就已经能完整使用（键盘、手机都行），M3d 只是电脑上更顺手。

## 9. 要 Juanxi 拍板的问题

1. **Phase（大排序）要不要能拖顺序？**
   - **(a) 建议：不能。** 6 个 Phase 固定顺序；只能把步骤搬到别的 Phase。原因见第 2 节：Phase 顺序不影响任何日期，也不存在数据里。
   - (b) 想要自定义大分组（自己建、自己排序）：需要在数据里**新增字段**，这违反"只写 dependsOn / 天数 / phase"，要另做决定。
2. **"拖一下"默认要不要等于"加一条依赖"？** 因为顺序不存储，拖两个互不相关的步骤如果不加依赖，什么都不会改变。
   - **(a) 建议：** 拖到 U 下面 = 默认勾 "Do after U"（松手小框里可取消）。这样拖拽总是有意义，且每次最多改 1–2 条依赖。
   - (b) 想要"纯视觉排序"（不改依赖、顺序保存）：需要新增 `order` 字段，要另做决定。
3. **改"天数"要不要同时改"工作量档位 `tier`"？** 现在预测的准时概率用的是档位（light/medium/heavy），不看天数。
   - **(a) 建议：** 天数 1–2 → light，3–5 → medium，6 以上 → heavy，自动同步（多写一个 `tier` 字段，仍然不碰日期）。这样改天数时，日期和准时概率一起变，不会不一致。
   - (b) 只改天数，档位和预测不动（界面会提示 "Forecast uses the effort size, not days"）。
