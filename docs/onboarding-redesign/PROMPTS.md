# Onboarding 改版：三个阶段的提示词

> 配套文件：[`WORK_PACKAGES.md`](WORK_PACKAGES.md)（拆分与并行）、[`../ONBOARDING_REDESIGN_STRATEGY.md`](../ONBOARDING_REDESIGN_STRATEGY.md)（设计）。
> 沿用 v1.6 的"整合人口令 + 执行 agent 口令"结构（`../design-upgrade/PHASES.md` 末尾）。

## 0. 先说清楚：提示词给谁用

| 谁 | 用什么 | 长什么样 |
| --- | --- | --- |
| **Juanxi → 我（整合人，这个对话）** | **阶段口令**，第 1 节：每阶段一小段，Juanxi 贴给我 | 短。只说"开始哪个阶段、前提是什么"，细节全在仓库文档里 |
| **我 → 执行 agent（worktree 里的子 agent）** | **执行口令**，第 2–4 节：由我生成并发出，Juanxi 不需要写 | 长。一个包一份，必须自给自足，因为子 agent 一开始什么都不知道 |

**为什么不是 Juanxi 开多个窗口各发一份：** 工作包分支只存在本机的 worktree 里，靠整合人用 `--no-ff` 合并；多个独立会话彼此看不到对方的本地分支，而这个会话又推不了别的分支（`design-upgrade/ROLLBACK_LOG.md`）。所以执行 agent 必须由整合人在同一个环境里用 worktree 开出来。

**三个阶段对应：** 阶段 1 = 波 0（OB-01、02、03）；阶段 2 = 波 1（OB-04…08）；阶段 3 = 波 2 + 3（OB-09、OB-10）。

## 提示词怎么写（七条原则）

1. **自给自足。** 子 agent 不知道任何上下文：说清它是谁、读哪几个文件、在哪个 worktree、什么端口。
2. **指路，不复制。** 规则和设计写在仓库文档里，口令只写"读哪一节"；这样文档改了，口令不用改。
3. **文件白名单。** 明确写"只能改这些文件"。越界要停下来问，不要默默改——这是并行不冲突的根基。
4. **把接口钉死。** 并行的包要对同一个接口编程（比如记录模块的函数名），所以接口写进口令，而不是让每个 agent 自己猜。
5. **用证据定义"做完"。** 不写"做好看一点"，写"这几条命令全绿 + 这个新测试存在 + 反向验证会变红"。
6. **写明什么时候停。** 需要改共用文件、要改数据结构、要加依赖、测试削弱才能过——一律停下来写进报告。
7. **只要诚实的报告。** 报告必须有"没验证的"一栏；最终回复只给分支、提交、测试结果、报告路径。

---

## 1. 阶段口令（Juanxi 贴给整合人）

### 阶段 1（波 0：地基）

```
开始 Onboarding 阶段 1：OB-01 外壳与路由、OB-02 记录、OB-03 首次进入入口。
Q2–Q6 按策略文档的建议。11/6 是参考日。
你是整合人。先读 CLAUDE.md 要求的文件，再读 docs/ONBOARDING_REDESIGN_STRATEGY.md、
docs/onboarding-redesign/WORK_PACKAGES.md 和 PROMPTS.md。
按 PROMPTS.md 的"阶段 1 整合人口令"执行：OB-01 和 OB-02 各开一个 worktree 并行，
合并后再做 OB-03。做完停下，给我欢迎页的预览网址和三句话验收说明。
```

### 阶段 2（波 1：流程 A 与社员预览）

```
开始 Onboarding 阶段 2：OB-04…OB-08。阶段 1 我已验收（或：阶段 1 的反馈是 …）。
按 PROMPTS.md 的"阶段 2 整合人口令"执行：同时最多 4 个 worktree，OB-06 最先开。
每合并一个包就登记 ROLLBACK_LOG。做完停下，给我"走一遍社长流程"的预览网址。
```

### 阶段 3（波 2 + 3：衔接、切换、收口）

```
开始 Onboarding 阶段 3：OB-09、OB-10。阶段 2 的反馈已处理（或：反馈是 …）。
按 PROMPTS.md 的"阶段 3 整合人口令"执行。OB-10 里"切换哪一条"以我这次说的为准：
社长流程 A：<切 / 不切>；社员预览 B：<切 / 不切>。
做完停下，给我最终验收清单。
```

---

## 2. 阶段 1 的口令

### 2.1 整合人口令（阶段 1）

```
你是整合人。Onboarding 阶段 1。读 AGENTS.md、docs/ONBOARDING_REDESIGN_STRATEGY.md（第 0、2b、5、7 节）、
docs/onboarding-redesign/WORK_PACKAGES.md、本文件。
1. 确认 claude/determined-johnson-yrdxwf 已合并 origin/main，npm ci && npm run check 全绿。
   不绿就停下告诉 Juanxi，不要自己"顺手修"。打本地标签 ob/phase-1-before。
2. 为 OB-01、OB-02 各开一个 worktree（../platypus-ob-01、../platypus-ob-02，
   分支 design/ob-01-shell、design/ob-02-record，从集成分支开出），用第 2.2、2.3 节的口令并行启动执行 agent。
3. 等两个都交付。逐个审 diff：只动了"可以改的文件"吗？有没有削弱旧测试？有没有裸颜色、裸毫秒、!important？
   不合格就退回，不要自己默默改。
4. 先合 OB-02，再合 OB-01（--no-ff，打 ob/ob-NN-merged 本地标签，登记 docs/onboarding-redesign/ROLLBACK_LOG.md，
   OB-01 负责新建这个文件）。合并后跑完整 npm run check。
5. 自己做 OB-03（口令见 2.4，不需要子 agent，它很小）。在 worktree ../platypus-ob-03 里做，同样 --no-ff 合并。
6. 阶段末完整 npm run check（Node 22）。有红的：用标签二分，找出是哪个包，R2 撤掉，告诉 Juanxi。
7. 写 docs/PROGRESS.md 一条阶段交接：做了什么、预览网址（带参数的）和点哪里、没验证的、每个包的回滚方式。
   写"需要同步本地备份"。推送 claude/determined-johnson-yrdxwf。不碰 main，不推别的分支。
8. 停下，等 Juanxi 验收。
```

### 2.2 执行口令：OB-01 外壳与路由

```
你是执行 agent，只做一个工作包：OB-01「外壳与路由」。

## 先读（按顺序，读完再动手）
1. AGENTS.md 第 3、7、7.1 节；docs/DESIGN_TOKENS.md（全部）
2. docs/ONBOARDING_REDESIGN_STRATEGY.md 第 2、3.2、3.4、4.2、5 节
3. docs/onboarding-redesign/WORK_PACKAGES.md 第 2、5 节和 OB-01 那一行
4. src/pages/Setup.tsx（看它持有哪些状态）、src/pages/Join.tsx、src/App.tsx、src/components/Layout.tsx

## 你在哪里
worktree ../platypus-ob-01；分支 design/ob-01-shell；先 npm ci。
端口：PW_PORT=5201 PW_STORAGE_PORT=5301 WORDS_PORT=5401。没有预装浏览器时用 PW_CHROMIUM。
**不推送**（推不上去）。在分支上提交，提交信息 "[OB-01][Claude] …"，整合人会合并。

## 任务
1. 专注外壳 src/onboarding/shell/：没有侧栏、没有 Ask 右栏、没有 View as 和 AI 开关；顶栏有进度链、Exit（Save & exit）；
   手机上主按钮贴底（浮层用半透明，减少透明度下回退实心）。
2. 步骤状态机 src/onboarding/engine/：纯函数——前进、返回、跳过、恢复；跳过的步骤可点回去；
   **引擎只通过一个可注入的 onEvent(step, event) 回调报告 enter/leave/back/skip/complete/exit，
   不要 import 任何记录模块**（OB-02 并行在做，OB-03 负责把两者接起来）。单元测试覆盖。
3. 进度链指示器：用现有 Chain 的样子；走过的线用 scaleX 长出来、圆点用 --spring-pop；跳过的点是空心虚线；
   只在前进时动，减少动效下直接出现。
4. 社长草稿的共享上下文 src/onboarding/draft.tsx：把 Setup.tsx 现在持有的状态（step、ClubDraft、steps、buffer、sentence、
   constitution doc、reading、event、date、inviteCode 等，**逐个核对，一个都不能漏**）收成一个，所有屏只读写它。
   沿用现有的 7 天恢复（IndexedDB，键 setup-draft 的做法）。**之后别的包不准改这个文件，所以字段要一次给全。**
5. Demo 条（"Previewing as 某某 · Change"，琥珀色，和全站 Demo 小标同一个样子）。
6. 文案表 src/onboarding/copy.ts：策略第 3、4、6 节里出现的所有英文文案，先放进去（后面的包只引用、可以追加自己的 key 到自己的区块）。
7. 路由：在 src/App.tsx 一次建好 /welcome（入口，先放空壳）、/welcome/classic（旧 Setup 包进外壳）、
   /welcome/classic-join（旧 Join 包进外壳）、以及后面每个屏的路由；**每个屏建一个空壳文件**
   （founder/Name、Constitution、Goals、Team、FirstEvent、Confirm、Invite；member/Invitation、You、Reminders、BusyWeeks、About、Done；
   gate/Welcome），每个文件只导出一个"Coming soon"组件。这样后面的包只替换自己的文件，永远不碰 App.tsx。
8. 样式：src/styles/ob-00-shell.css 写外壳；再建空文件 ob-04…ob-09 的 css（各一个，名字见 WORK_PACKAGES），
   并在 src/styles/index.css 里按顺序 @import。
9. e2e/ob-helpers.ts：给后面的包用的测试助手（打开 /welcome、走到某一步、清空本机数据）。

## 只能改这些文件
src/onboarding/**（新）、src/App.tsx、src/styles/ob-*.css（新）、src/styles/index.css（只加 @import）、
e2e/ob-helpers.ts（新）、e2e/ob-01-*.spec.ts（新）、src/test/onboarding*.test.ts（新）、
docs/onboarding-redesign/ROLLBACK_LOG.md（新）、docs/onboarding-redesign/reports/OB-01.md（新）。
**不要改：** 旧的 Setup.tsx / Join.tsx（只能被引用）、store.tsx（OB-02 的）、Layout.tsx、DemoMenu.tsx（OB-03 的）、
styles.css、PROGRESS.md、AGENTS.md、DESIGN_TOKENS.md、playwright.config.ts。

## 不能做
界面英文；颜色、字号、圆角、层级、时长、曲线只用 token；不写 !important、transition: all、裸毫秒；只动 transform 和 opacity；
动画可打断、有减少动效版本；不调用 /api/org/*、/api/workspace*，不新增 AI 接口；不放真实数据和密钥；不改 SCHEMA_VERSION 和任何已有 localStorage 键。

## 怎么证明做完
- npm run lint、npm run build、npm test 全绿。
- 旧页面零变化：npm run e2e 里 setup、join、a11y 相关的 spec 桌面 + 手机仍绿（断言不能放宽）。
- 新测试 e2e/ob-01-shell.spec.ts：外壳里没有侧栏和 Ask；/welcome/classic 能走完旧设立；Back/Skip/恢复；
  无障碍（axe）；深色；减少动效下无位移。每个新守卫附"故意违规会变红"的样本。
- 用 git diff --stat 自查：没有白名单以外的文件。

## 停下来的条件
需要改白名单以外的文件；发现 Setup.tsx 的状态没法干净地收进一个上下文；需要加依赖；只有削弱旧测试才能过。
遇到就停，写进报告，不要绕。

## 交付
docs/onboarding-redesign/reports/OB-01.md：做了什么 / 怎么验收（点哪里）/ 没验证的（真机、Safari）/ 遇到的问题 / 回滚方式。
最终回复只写：分支名、提交列表、测试结果、报告路径。
```

### 2.3 执行口令：OB-02 记录

```
你是执行 agent，只做一个工作包：OB-02「记录」。

## 先读
1. AGENTS.md 第 3 节；docs/ONBOARDING_REDESIGN_STRATEGY.md 第 2b、7 节
2. docs/onboarding-redesign/WORK_PACKAGES.md 第 2、4、5 节
3. src/data/store.tsx 里的 LOG_KEY、loadLog、saveLog、buildExport、downloadExport、reset，以及 src/data/types.ts 的 LogEntry

## 你在哪里
worktree ../platypus-ob-02；分支 design/ob-02-record；PW_PORT=5202 PW_STORAGE_PORT=5302 WORDS_PORT=5402。
不推送；提交 "[OB-02][Claude] …"。

## 任务：本机 onboarding 记录模块（纯逻辑，没有界面）
- 新 key（例如 platypus.v1.onboarding），和现有 platypus.v1.log 分开；Reset demo 不清它；SCHEMA_VERSION 和 DemoState 不动。
- **接口已约定，不要改名**（OB-03 会按它调用）：
  ```ts
  // src/lib/onboardingRecord.ts
  export type OnboardingEvent = "enter" | "leave" | "back" | "skip" | "complete" | "exit"
  export function hasSeenWelcome(): boolean
  export function markWelcomeSeen(): void
  export function rearm(): void                          // Reset demo 调用：重新亮起入口，不删记录
  export function startAttempt(entry: "start" | "explore", flowVersion: string): string   // 返回 attemptId
  export function recordStep(attemptId: string, step: string, event: OnboardingEvent): void
  export function finishAttempt(attemptId: string, outcome: "completed" | "exited" | "explored"): void
  export function loadOnboardingRecord(): OnboardingRecord  // 供导出和测试
  ```
- 只记行为：attemptId、flowVersion、入口选择、每一屏的事件 + 毫秒时间戳、是否走完、从哪一屏退出、第几次重播。
  **不记任何输入的文字。** 条数设上限（防止撑爆 localStorage），旧的先丢。
- 浏览器屏蔽存储时：所有函数不抛错，hasSeenWelcome 退化为"本次会话内"的内存标记。
- store.tsx 里**只改两处**：buildExport 多一个顶层字段 onboarding（formatVersion 保持 1）；reset 里调用 rearm()。
  你是唯一允许改 store.tsx 的包。

## 只能改这些文件
src/lib/onboardingRecord.ts（新）、src/test/onboardingRecord.test.ts（新）、src/data/store.tsx（仅上述两处）、
现有导出相关测试里**必要的**期望更新（改成同样严格地测新字段，并在报告里写明）、
docs/onboarding-redesign/reports/OB-02.md（新）。

## 不能做
同 OB-01 的"不能做"；另外：不上报任何数据到任何地方，不加网络请求。

## 怎么证明做完
lint / build / npm test 全绿；单元测试覆盖：多次尝试、重播计数、条数上限、存储被屏蔽、导出里有 onboarding、
Reset demo 后记录还在而 hasSeenWelcome 为 false、记录里搜不到任何输入文本。
反向验证：故意把某个事件写进文字内容，测试要变红。

## 停下来的条件
需要改 store.tsx 其他部分；发现导出格式有外部使用者；需要改已有 key。

## 交付：同 OB-01（报告 OB-02.md，最终回复只写分支、提交、测试结果、报告路径）。
```

### 2.4 OB-03 首次进入入口（整合人自己做）

```
任务：OB-03「首次进入入口」。worktree ../platypus-ob-03，分支 design/ob-03-gate，端口 5203/5303/5403。
前提：OB-01、OB-02 已合并。
1. 欢迎页 src/onboarding/gate/Welcome.tsx：策略 2b 的线框；Start walkthrough（主）/ Explore the sample club（次）。
   Start → startAttempt("start", flowVersion) → /welcome/classic（先指向旧设立，OB-10 才切新流程）；
   Explore → startAttempt("explore") + finishAttempt("explored") + markWelcomeSeen → /。
2. 判断首次：开关打开 && 没有保存过演示数据 && !hasSeenWelcome()。开关默认关；打开方式：构建环境变量（Netlify）+ 网址参数 ?walkthrough=1 覆盖（预览用）。
   在 / 的最前面拦截，不动 Layout；存储被屏蔽时只在本次会话弹一次。
3. 把 OB-01 的引擎 onEvent 接到 OB-02 的 recordStep。
4. DemoMenu.tsx："Replay setup" 改名 "Replay walkthrough"，指向 /welcome/classic；重播也记录。
5. 欢迎页在记录告知上留一个位置，**默认不显示那句话**；是否显示等 Juanxi 对照 IRB 材料决定。
测试：开关关着时旧页面零变化（现有 spec 全绿）；开关开着：首次→欢迎页；选 Explore 后刷新不再弹；Reset demo 后再弹；
记录里有对应事件；桌面 + 手机 + 无障碍 + 深色。
```

---

## 3. 阶段 2 的口令

### 3.1 整合人口令（阶段 2）

```
你是整合人。Onboarding 阶段 2。读 AGENTS.md、WORK_PACKAGES.md、本文件、docs/onboarding-redesign/ROLLBACK_LOG.md。
1. 确认阶段 1 已合并且 npm run check 全绿；打 ob/phase-2-before。
2. 为 OB-04…OB-08 开 worktree（../platypus-ob-NN，分支 design/ob-NN-<短名>），**同时最多 4 个**；OB-06 最先开，
   最后一个等任意一个交付后再开。用第 3.2 节的模板和表格生成各自的口令。
3. 每个交付都审：diff 是否只在白名单里？旧测试是否被削弱？是否写了裸颜色/裸毫秒/!important？
   新守卫是否带"故意违规会变红"的样本？不合格退回。
4. 按编号从小到大 --no-ff 合并，打本地标签，登记 ROLLBACK_LOG.md。每合并一个先跑 lint + build + 单元，
   波末跑一次完整 npm run check。
5. 写 PROGRESS 阶段交接，推送，停下。预览网址必须能"走一遍社长流程"：给出点哪里的步骤。
```

### 3.2 执行口令模板（OB-04…OB-08 共用，填空）

```
你是执行 agent，只做一个工作包：OB-{NN}「{名字}」。

## 先读
1. AGENTS.md 第 3、7、7.1 节；docs/DESIGN_TOKENS.md
2. docs/ONBOARDING_REDESIGN_STRATEGY.md 第 {章节}、5、6 节
3. docs/onboarding-redesign/WORK_PACKAGES.md 第 2、5 节和 OB-{NN} 那一行
4. src/onboarding/（OB-01 已建好：外壳、引擎、draft.tsx、copy.ts、你的空壳文件）
5. {参考的旧代码}

## 你在哪里
worktree ../platypus-ob-{NN}；分支 design/ob-{NN}-{短名}；先 npm ci。
PW_PORT=52{NN} PW_STORAGE_PORT=53{NN} WORDS_PORT=54{NN}。不推送；提交 "[OB-{NN}][Claude] …"。

## 任务
{任务}

## 只能改这些文件
{独占文件}
你的空壳文件已经由 OB-01 建好并挂了路由：直接替换它的内容，**不要改 App.tsx、draft.tsx、copy.ts 的已有部分**
（copy.ts 只能在你自己的区块里追加 key）。需要 draft 里没有的字段：停下，写进报告。

## 不能做 / 怎么证明做完 / 停下来的条件 / 交付
同 OB-01 口令的对应四节，再加：
- 每屏"一眼看到的"英文词 ≤40（{特殊上限}）。
- 流程里每个"可跳过"的屏必须有 Skip for now + 一行"以后在哪找回"。
- 引擎的 onEvent 由外壳统一调用，你的屏不要自己写记录。
- 自己的 e2e：最快路径、完整路径、返回/跳过/恢复、桌面 + 手机、axe、深色、减少动效；
  动效测试要把减少动效切回"不减少"并逐帧采样（参考现有 dx-*.spec.ts），看到中间值才算动画存在。

最终回复只写：分支、提交、测试结果、报告路径。
```

| 包 | 名字 / 短名 | 策略章节 | 任务（填进"任务"） | 独占文件 | 参考旧代码 | 特殊 |
| --- | --- | --- | --- | --- | --- | --- |
| OB-04 | Name + Constitution / `name-constitution` | 3.1 第 1–2 屏 | 社团名一个输入框 + 只读学校标；三个选项行（Use sample 在前 / Upload / Paste）+ Skip；复用现有读取逻辑，结果以"AI suggested"进 draft | `founder/Name.tsx`、`Constitution.tsx`、`ob-04-*.css`、`e2e/ob-04-*.spec.ts` | `ConstitutionStep.tsx`、`Setup.tsx` 的 `startReading`、`lib/constitution.ts` | AI 失败文案按策略第 6 节（去掉状态码） |
| OB-05 | Goals + Team / `goals-team` | 3.1 第 3–4 屏 | 建议目标可开关 + 步进器；两格岗位行（Role / Person，可留空）；组织图；职责折叠；**不问邮箱、电话、ASU ID**（邮箱用 `fillEmails`） | `founder/Goals.tsx`、`Team.tsx`、`ob-05-*.css`、测试 | `SettingsForms.tsx`、`OrgChart.tsx`、`data/structure.ts` | 页面高度目标 ≤ 一屏半（桌面） |
| OB-06 | First event / `first-event` | 3.1 第 5 屏、3.2、5（见证时刻） | 一句话 + 示例按钮 → 进度链画出来（日期来自 `schedule.ts`）→ 缓冲分段控件（日期当场变）→ "Event details" 折叠；**只出一次演出，可打断，减少动效下整张直接出现** | `founder/FirstEvent.tsx`、`ob-06-*.css`、测试 | `Setup.tsx` 的 `prepare`、`data/settings.ts` 的 `completeSetup`、`lib/commands.ts` | **最大最难，先开**；上限 60 词；日期只来自规则引擎，AI 不给日期 |
| OB-07 | 社员预览前半 / `member-invitation` | 4.1 第 0–2 屏、4.2 | Invitation 落地屏（角色卡放大）、You（预填确认）、Reminders（渠道选项行 + Morning/Evening + 示例气泡）；Demo 条 | `member/Invitation.tsx`、`You.tsx`、`Reminders.tsx`、`ob-07-*.css`、测试 | `Join.tsx`、`SettingsForms.tsx` 的 `ProfileForm`/`RoleCard`、`data/settings.ts` 的 `saveProfile` | 开发用样例社团的邀请码；**ASU ID 不问**；电话只在选 WhatsApp/SMS 后出现并写用途 |
| OB-08 | 社员预览后半 / `member-finish` | 4.1 第 3–5 屏 | 周条（期末周/假期来自校历）、建议标签三问合一屏（可跳过）、Done：名字加入组织图 + 第一件事卡片 | `member/BusyWeeks.tsx`、`About.tsx`、`Done.tsx`、`ob-08-*.css`、测试 | `engine/calendar.ts`、`ProfileForm` | 忙碌周必须是周一（`validateProfile` 规则）；可砍包，砍时改用旧 `ProfileForm` |

---

## 4. 阶段 3 的口令

### 4.1 整合人口令（阶段 3）

```
你是整合人。Onboarding 阶段 3。读 AGENTS.md、WORK_PACKAGES.md、本文件、ROLLBACK_LOG.md。
1. 确认阶段 2 已合并、npm run check 全绿；打 ob/phase-3-before。
2. 先做 OB-09（整合型，串行；可开一个 worktree 的子 agent，用 4.2 的口令，但你要在它交付后逐行审）。
3. 合并 OB-09 后做 OB-10（4.3，由你亲自做，不交给子 agent）。
4. 切换以 Juanxi 本次口令为准：A、B 各一个开关，没被点名切的那条继续指向旧屏。
5. 阶段末：完整 npm run check（Node 22）；dx-shots 前后对比（旧页面应逐像素一致，只有 /welcome 下的新页面是新的）；
   回滚演练（先撤 OB-10 再撤 OB-09……，tsc 通过，与阶段开始前逐字一致）。
6. 写 PROGRESS 阶段交接 + AGENTS.md 增加一小节"onboarding 入口和记录"（只有整合人能改这两个文件）。
   写"需要同步本地备份"。推送，停下，给 Juanxi 最终验收清单和冻结说明（冻结那一刻开着的组合是什么、版本号 flowVersion 是多少）。
```

### 4.2 执行口令：OB-09 确认 + 邀请 + 衔接 + 提示

```
（用 3.2 的模板，OB-09，分支 design/ob-09-confirm-invite，端口 5209/5309/5409。依赖：OB-06、OB-07 已合并。）
任务：① Confirm 屏：一句话总结 + Start workspace / Keep current demo；首次进入时**不出现**"这会替换当前演示"的警告，只在从 Demo 菜单重播时出现；
② Invite 屏（邀请时刻）：Copy link / WhatsApp / Email（只是打开写好的消息，什么都不自动发，界面写明）+ 权限一句话 + Invited/Joined 列表；
③ 首次进入时主按钮 "See what your officers will see" → 进入社员预览（OB-07、08 的屏），结束回 Today；
④ Today 的一次性小提示 ≤3 条（贴着它说的东西、点一下消失、不再出现；放在 src/onboarding/tips/，通过自己的一个挂载点，
   不要改 Today.tsx 以外的页面；**改 Today.tsx 前先停下问整合人**，字数上限 npm run words 不能超）。
独占文件：founder/Confirm.tsx、Invite.tsx、src/onboarding/tips/**、ob-09-*.css、测试。
可砍：④。
```

### 4.3 OB-10 切换、加固、收口（整合人自己做）

```
1. 切换：A、B 各一个开关（构建环境变量 + ?walkthrough=1 覆盖），按 Juanxi 口令设置；R1 关入口即回到今天。
2. flowVersion：给流程一个版本号写进记录（例如 ob-1），冻结时写进 PROGRESS。
3. 全套：桌面 + 手机 + 浅/深 + 减少动效 + 减少透明度；axe；word budgets；旧 spec 全绿且没有被放宽。
4. 记录的端到端：走完整流程后 Export my data 里 onboarding 字段完整、没有输入文本；Reset demo 后记录还在、入口重新亮起。
5. 守门：整个新流程对 /api/org、/api/workspace 的请求数为 0（沿用现有断言写法）。
6. 回滚演练、前后截图、文档、冻结说明（见 4.1 第 5–6 条）。
```
