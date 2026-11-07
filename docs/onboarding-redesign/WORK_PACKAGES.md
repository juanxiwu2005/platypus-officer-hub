# Onboarding 改版：工作包与 worktree 工作流

> **状态：待 Juanxi 说"开始"。** 设计依据在 [`../ONBOARDING_REDESIGN_STRATEGY.md`](../ONBOARDING_REDESIGN_STRATEGY.md)（先读它的第 0、2b、3、4、5、7 节）；本文件只讲"怎么拆、怎么并行、怎么回滚"。
> 做法沿用 v1.6（`../design-upgrade/README.md`）：每个包一个 worktree、独占文件、`--no-ff` 合并、可单独回滚。

## 1. 已定的前提（Juanxi 2026-11-01）

| 项 | 决定 |
| --- | --- |
| 日期 | 以 **11/6** 为参考，尽量在 11/6 之前做完（Phase 3 和冻结的确切日期还没定）。 |
| 参与者 | **都是社长。** 首次进入默认走社长流程 A；社员流程 B 只作为"预览"，在 A 之后看（看的是自己刚建的社团）。**没有"我是社员"的入口。** |
| 记录 | **onboarding 过程要记在参与者自己的浏览器里**（见第 4 节）。 |
| 未回答的 | Strategy 第 9 节 Q2–Q6 还没有明确答复；**开始前请你说一句"Q2–Q6 按建议"**（或指出哪条不同意）。 |

## 2. 分支、worktree 与一个限制

- **集成分支 = `claude/determined-johnson-yrdxwf`（PR #10，预览 10）。** 这个会话只能推这一条分支（推别的分支和标签会 403，见 `design-upgrade/ROLLBACK_LOG.md`），所以 onboarding **和 v1.6 在同一个预览里**。因为入口默认关闭，预览 10 里原有页面不会变；要看新流程要用第 6 节的网址。合并到 `main` 时仍选 **Create a merge commit**，不要 Squash。
- 每个包一个本地分支 `design/ob-NN-<短名>`、一个 worktree `../platypus-ob-NN`，从集成分支开出（只在本机存在，靠合并提交进入集成分支）。
- **端口错开**（`playwright.config.ts` 已支持）：`PW_PORT=52NN PW_STORAGE_PORT=53NN WORDS_PORT=54NN`，NN 是包号。
- 并行包只跑 `npm run lint`、`npm run build`、`npm test` 和自己的 `e2e/ob-NN-*.spec.ts`；**完整 `npm run check` 由整合人每一波合并后跑一次。**
- **并行包不改的文件**（只有整合人改）：`docs/PROGRESS.md`、`AGENTS.md`、`docs/DESIGN_TOKENS.md`、`src/styles.css`、`src/styles/index.css`、`src/App.tsx`、`src/data/store.tsx`（OB-02 例外）、`e2e/helpers.ts`、`playwright.config.ts`。
- 每个包完成后写一份 `docs/onboarding-redesign/reports/OB-NN.md`（自己的文件，不碰别人的）。
- 旧的 `src/pages/Setup.tsx`、`Join.tsx` 及它们的测试**不改一个字**（只是被包进新外壳）。

## 3. 工作包总览（含 worktree 适配）

**读法：** "并行"= 能和谁同时开 worktree；"独占文件"= 只有这个包能改的文件；"适配"= 对 Agent + worktree 工作流的评价。

| 波 | 包 | 内容 | 依赖 | 并行 | 独占文件 | worktree 适配 | 大小 | 回滚 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **0** | **OB-01 外壳与路由** | 专注外壳（无侧栏/Ask）；步骤状态机（前进/返回/跳过/恢复，纯函数 + 单测）；进度链指示器；Demo 条；**社长草稿的共享上下文**（把现有 `Setup.tsx` 的 15 个状态收成一个，所有屏只读写它）；文案表；**所有新屏的路由和空壳文件一次建好**；`ob-NN-*.css` 空文件一次建好；旧 setup/join 包进外壳（`/#/welcome/classic`）。 | 无 | 只和 OB-02 | `src/onboarding/shell/**`、`engine/**`、`draft.tsx`、`copy.ts`、`src/App.tsx`、`src/styles/ob-*.css`、`index.css` 的 `@import`、`e2e/ob-helpers.ts` | ✅ **专门为后面并行铺路**：它一次性建好所有"会冲突的共用文件"，之后每个包只改自己的空壳。**它自己必须串行**（碰共用文件）。 | M | R2 |
| **0** | **OB-02 记录** | 本机记录模块（第 4 节）：`src/lib/onboardingRecord.ts` + 单测；Export 里带出；Reset demo 不清记录、重新亮起入口。 | 无 | 只和 OB-01 | `src/lib/onboardingRecord.ts`、`src/test/onboardingRecord.test.ts`、`src/data/store.tsx`（只改 `buildExport` 和 `reset`） | ✅ **完全独立**，纯逻辑，最适合交给一个 Agent 单独做；唯一允许碰 `store.tsx` 的包，避免别人撞它。 | S | R2 |
| **0** | **OB-03 首次进入入口** | 欢迎页（Start walkthrough / Explore the sample club）；"是不是首次"判断；开关（默认关）；入口先指向 `/#/welcome/classic`；Demo 菜单 "Replay setup" → "Replay walkthrough"；记录接上。 | OB-01、OB-02 | 否（串行） | `src/onboarding/gate/**`、`src/components/chrome/DemoMenu.tsx`、`e2e/ob-03-gate.spec.ts` | ⚠️ 依赖前两个包的接口，**不并行**；但它小，串行不耽误。 | S | R2；R1 关开关 |
| **1** | **OB-04 Name + Constitution** | 流程 A 第 1–2 屏。复用 `ConstitutionStep` 和 `startReading` 的逻辑（只换界面）。 | OB-03 | 与 05、06、07、08 | `src/onboarding/founder/Name.tsx`、`Constitution.tsx`、`ob-04-*.css`、`e2e/ob-04-*.spec.ts` | ✅ 目录独占，只通过 `draft` 和 `copy` 与外界交互。 | M | R1 + R2 |
| **1** | **OB-05 Goals + Team** | 第 3–4 屏：建议目标 + 两格岗位行（Role / Person）+ 组织图（复用 `OrgChart`）+ 职责折叠。 | OB-03 | 同上 | `founder/Goals.tsx`、`Team.tsx`、`ob-05-*.css`、测试 | ✅ 同上。 | M | R1 + R2 |
| **1** | **OB-06 First event（见证时刻）** | 第 5 屏：一句话 → 进度链画出来 → 缓冲分段控件；复用 `parseCommand`/`prepare` 和 `completeSetup`；日期只来自规则引擎。 | OB-03 | 同上 | `founder/FirstEvent.tsx`、`ob-06-*.css`、测试 | ✅ 独立，但**最大最难**，**第一个开**，给它最长的时间。 | L | R1 + R2 |
| **1** | **OB-07 社员预览：Invitation + You + Reminders** | 流程 B 第 0–2 屏（Demo 条写 "Previewing as 某某"）；示例提醒气泡。 | OB-03 | 同上 | `src/onboarding/member/Invitation.tsx`、`You.tsx`、`Reminders.tsx`、`ob-07-*.css`、测试 | ✅ 独立；开发时用样例社团的邀请码，不依赖 A 的屏幕。 | M | R1 + R2 |
| **1** | **OB-08 社员预览：Busy weeks + About you + Done** | 周条（校历标好期末周/假期）、建议标签、"加入组织图"的一次动作、第一件事卡片。 | OB-03 | 同上 | `member/BusyWeeks.tsx`、`About.tsx`、`Done.tsx`、`ob-08-*.css`、测试 | ✅ 独立。 | M | R1 + R2 |
| **2** | **OB-09 确认 + 邀请 + A→B 衔接 + 提示** | 确认屏、邀请时刻（Copy/WhatsApp/Email + Invited/Joined 列表）、"See what your officers will see" 接到 B、Today 的 ≤3 条一次性小提示。 | OB-06、OB-07 | 否（整合型） | `founder/Confirm.tsx`、`Invite.tsx`、`src/onboarding/tips/**`、`ob-09-*.css`、测试 | ❌ **不适合并行**：要读 06 和 07 的成果、串起两条流程。串行，由整合人或一个 Agent 做。 | M | R1 + R2 |
| **3** | **OB-10 切换、加固、收口** | 把入口从旧屏指向新流程（A 和 B 各一个开关）；桌面+手机+深色+减少动效+减少透明度全套；记录的端到端测试；回滚演练；前后截图对比；文档；冻结说明。 | 前面全部 | 否 | 文档、开关、全局测试 | ❌ **必须串行，整合人亲自做**（全局检查）。 | M | R2 |

**可砍的（时间不够时按这个顺序，不影响入口和主线）：** ① OB-09 里的 Today 小提示 → ② OB-08（B 预览的后半段，改用旧的 `ProfileForm` 放进外壳）→ ③ OB-07 的示例提醒气泡 → ④ OB-04 的 Constitution 屏（用"样例章程一键"）。**不砍：** OB-01、02、03（入口 + 记录 + 外壳），和 A 流程的 OB-05、06。

### 并行图

```
波0   OB-01 ─┐
      OB-02 ─┴→ OB-03
                   │
波1   ┌────────────┼────────────┬────────────┬────────────┐
    OB-04       OB-05       OB-06 ★最大    OB-07       OB-08        ← 同时 ≤4 个 worktree，第 5 个等一个先结束
      └────────────┴──────┬─────┴─────┬──────┘
波2                     OB-09 ←───────┘（要 06 + 07）
                          │
波3                     OB-10
```

**为什么同时 ≤4 个：** 每个 worktree 要自己 `npm ci` 并开浏览器跑测试，机器会吃紧；v1.6 最多同时 6 个，但这次有 3 个包较重（06、09、10）。

## 4. "记录"怎么做（Juanxi："Onboarding 流程也要记录在浏览器里面"）

- **放哪：** 一个**新的**本机 key，例如 `platypus.v1.onboarding`，和现有交互记录（`platypus.v1.log`）分开。理由：现有记录最多留 2000 条、旧的会被挤掉，onboarding 在最开头，容易先丢；而且 Reset demo 一直不碰记录，这条也一样。
- **不改数据结构：** `SCHEMA_VERSION` 不变，`DemoState` 不变，现有的 key 一个都不动；多一个**新** key，回滚时忽略它就行（`design-upgrade` 规则 4 只对"已有数据"，这里是纯新增，请你确认）。
- **记什么（只记行为，不记内容）：** 每次尝试一条：`attemptId`、`flowVersion`、入口选择（Start / Explore）、每一屏的 进入 / 返回 / 跳过 / 完成 + 时间（毫秒）、是否走完、从哪一屏退出、第几次重播。**不记输入的文字**（社团名、姓名等）——这些本来就在导出的 state 里。
- **怎么看：** Settings → **Export my data** 的 JSON 里多一个顶层字段 `onboarding`（`formatVersion` 保持 1，是新增字段）。和现在一样，**只有参与者自己能导出**；没有任何自动上报。
- **失败时：** 浏览器屏蔽存储就不记，页面照常工作（和现有存储的处理一致）。
- **默认就开**（你已要求记录）。要不要在欢迎页写一句 "Your steps in this walkthrough are saved in this browser"：我建议写，一句话，诚实（Responsibility）。**这是研究告知的问题，请你对照 IRB 材料决定写不写、怎么写。**

## 5. 每个包的通用要求

1. **只改自己的独占文件。** 需要改共用文件？停下来，写进报告交给整合人。
2. **所有颜色、字号、圆角、层级、时长、曲线只用 token；** 新样式写在自己的 `ob-NN-*.css`；不写 `!important`、`transition: all`、裸毫秒数；只动 `transform` 和 `opacity`；动画可打断；有减少动效版本。
3. **界面英文。** 文案从 `copy.ts` 取（OB-01 建好），不在组件里散落字符串。
4. **日期只来自规则引擎；AI 不给日期；不调用任何 `/api/org/*`、`/api/workspace*`，不新增 AI 接口。** 只用现有的 `/api/setup/constitution`、`/api/command`。
5. **不放真实数据、不放密钥。**
6. **测试：** 单元 + 桌面和手机各一个 `e2e/ob-NN-*.spec.ts`（最快路径、完整路径、返回/跳过/恢复、无障碍、深色、减少动效）；**每个新守卫附一个"故意违规会变红"的样本**；旧测试一条不删、不放宽。
7. **字数：** 每屏"一眼看到的"英文词 ≤40（见证屏、邀请屏 ≤60）。
8. **每包写报告：** 做了什么、怎么验收（点哪里）、没验证什么（真机手指、Safari…）。**没验证的不说成验证过。**

## 6. 你怎么看（预览）

- 开关关着时（默认）：预览 10 的所有旧页面不变。
- 看新流程：OB-03 合并后，我会给你一个**带参数的预览网址**（例如在网址后加 `?walkthrough=1`），打开就是欢迎页；用隐身窗口打开等于"第一次来"。OB-01、02 合并后你看不到新东西（它们是地基），我会在报告里说明。
- 切换：OB-10 里，A 和 B 各一个开关，你验收一条切一条；**没验收通过的一条继续用旧的。**

## 7. 时间线（以 11/6 为参考，今天 11/1）

| 日 | 做什么 | 你要做什么 |
| --- | --- | --- |
| **11/1（今天）** | 你说"开始" → 我开 OB-01 与 OB-02（两个 worktree 并行）→ 合并 → OB-03 | 说"开始"和"Q2–Q6 按建议" |
| **11/2** | OB-03 合并，给你欢迎页预览；同时开波 1（OB-06 最先，04/05/07 随后） | 看欢迎页（1 分钟） |
| **11/3** | 波 1 陆续合并；给你社长流程 A 的预览 | 走一遍 A，回"可以/改哪里" |
| **11/4** | OB-08、OB-09；按你的反馈修 A | 走一遍 A→B |
| **11/5** | OB-10：切换、全套检查、回滚演练、截图对比 | 最终验收 |
| **11/6** | **缓冲日**：只修你点名的问题，不加新东西 | 确认冻结 |

**诚实的风险：** 这个节奏假设你每次验收在**一天内**回复；任何一次拖一天，11/6 就要靠"砍单顺序"。v1.6 的 27 个包在一天里做完过，所以拆分和并行本身是可行的，瓶颈是验收往返，不是写代码。**如果 Phase 3 提前或冻结早于 11/6，请马上告诉我。**

## 8. 回滚

- 每个包用 `git merge --no-ff design/ob-NN-xxx` 进集成分支，登记到 `docs/onboarding-redesign/ROLLBACK_LOG.md`（OB-01 建），记下合并提交 SHA（标签在这个会话里推不上去，沿用 v1.6 的做法，`ob/*` 标签只在本地）。
- 你只需要说一句 **"回滚 OB-06"** 或 **"整个入口关掉"**。
  - **R1（最快）：** 关入口开关 → 全站回到今天的样子；或在 `index.css` 注释掉某个包的 `@import`。
  - **R2：** `git revert -m 1 <合并提交>`。
  - 有修复提交的包，先撤修复再撤包；依赖先撤（06、07 → 09 → 10）。
- 所有包不改 `DemoState`，所以回滚不会弄坏浏览器里的旧数据；记录的新 key 回滚后被忽略。
