# 阶段 2 提示词（交给另一个 AI）

> 用法：发送前只改最上面两处【发送前填写】，把下面代码块整段贴给对方。阶段 2 做完、你验收之后，再交阶段 3。
> 同一时间只让一个 AI 做阶段 2（包括我），否则会在同一条分支上互相覆盖。

```
你好。你要接手 Platypus 仓库里 Onboarding 改版的**阶段 2**。你看不到之前的对话，所以一切以仓库里的文档和代码为准，不要猜。

【发送前填写 1】Juanxi 对策略文档 docs/ONBOARDING_REDESIGN_STRATEGY.md 第 9 节 Q2–Q6 的答复：按建议 / 改为：________
【发送前填写 2】阶段 1 验收：Juanxi 已验收 / 反馈是：________

## 0. 背景与规矩
- 项目负责人 Juanxi 不写代码。和他说话用简单的中文，一次只讲一步，不用术语；需要他动手的地方写清楚点哪里。界面文字一律英文；文档、报告用中文。
- 仓库 GitHub juanxiwu2005/platypus-officer-hub，工作分支 claude/determined-johnson-yrdxwf（也是预览 10 的 PR）。不要改名、不要删除。
- 绝对不要：改 main、推送或合并 main、强制推送、改写别人的提交。合并到 main 不是你的任务。
- 参考日期 11/6。参与者都是社长，默认先走社长流程 A；社员流程 B 只是 A 之后的"预览"。

## 1. 先读（按顺序，读完再动手）
1. AGENTS.md（第 3、4、7、7.1 节）
2. docs/PROGRESS.md 最上面几条，尤其是 2026-11-02 那条"阶段 0 补齐"
3. docs/DESIGN_TOKENS.md
4. docs/ONBOARDING_REDESIGN_STRATEGY.md（第 2、3、4、5、6、7 节）
5. docs/onboarding-redesign/WORK_PACKAGES.md、PROMPTS.md（**第 3.2 节的模板和表格就是每个包的任务说明书**）、ROLLBACK_LOG.md
6. docs/onboarding-redesign/reports/OB-04-prep-stage0-gap-fix.md（阶段 0 做了什么、为什么）
设计已定，不要重新设计，也不要改动策略、工作包、提示词这几份文档；认为它们有错就停下来写进报告。

## 2. 阶段 0 已经给你准备好的东西（不要重做、不要改）
- 路由：src/App.tsx 里 /welcome/founder/* 和 /welcome/member/* 的所有路由已建好，**每个屏是一个只有占位内容的空壳文件**（src/onboarding/founder/*.tsx、member/*.tsx）。你只替换自己包的空壳，**永远不改 App.tsx**。
- src/onboarding/draft.tsx：完整的社长草稿上下文（俱乐部、章程、AI 阅读状态、岗位、工作流、缓冲、第一场活动、日期、邀请码、skipped 等）。屏只通过 useOnboardingDraft() 的 draft / patch / update 读写。**需要里面没有的字段：停下写进报告，不要改这个文件。**
- src/onboarding/engine/flows.ts + useFlow.ts：步骤表和由路由驱动的步骤机。屏里用 const flow = useFlow()，调 flow.next() / back() / skip() / exit()；跳过只对 optional 步骤有效；记录事件由它统一发出，**屏里不要自己写记录**。
- src/onboarding/shell/（外壳、ProgressChain、DemoStrip）、src/onboarding/copy.ts（文案表）。文案只能引用，或在**自己包的区块**里追加 key，不改别人的区块。
- 样式：src/styles/ob-04-name-constitution.css、ob-05-goals-team.css、ob-06-first-event.css、ob-07-member-invitation.css、ob-08-member-finish.css、ob-09-confirm-invite.css 已建好并已 @import；每个包只写自己那个，不改 index.css 和 styles.css。
- 记录：src/lib/onboardingRecord.ts（浏览器本机，只记行为不记内容）。你不需要调用它。
- 入口开关默认关；打开方式：网址加 ?walkthrough=1。Start walkthrough 目前仍然去旧的设立页（src/onboarding/target.ts 的 FOUNDER_START），**切到新流程是阶段 3 的事，你不要改它**。看自己的新屏直接打开 /#/welcome/founder/name 之类的网址。
- 测试助手 e2e/ob-helpers.ts；参考 e2e/ob-01-shell.spec.ts、ob-03-gate.spec.ts 的写法。

## 3. 你的工作：5 个包，按这个顺序，一次一个
任务说明书 = PROMPTS.md 第 3.2 节的模板 + 那张填空表。关键点：
- **OB-06 First event（先做，最大最难）：** 一句话 + 示例按钮 → 进度链自己画出来（日期只来自 src/engine/schedule.ts，AI 不给日期）→ 缓冲分段控件（1·2·3·5·7，拨一下日期当场变）→ 折叠的 Event details。复用 Setup.tsx 的 prepare 逻辑、data/settings.ts 的 completeSetup、lib/commands.ts。**画一次演出，可被打断，减少动效下整张直接出现。** 文件：src/onboarding/founder/FirstEvent.tsx、ob-06 样式、e2e/ob-06-*.spec.ts。
- **OB-05 Goals + Team：** 建议目标（开关 + 步进器）；岗位行只有 Role / Person 两格（Person 可留空 = Open position），组织图复用 OrgChart，职责折叠；**不问电话、ASU ID、邮箱**（邮箱用 data/structure.ts 的 fillEmails）。文件：founder/Goals.tsx、Team.tsx、ob-05 样式、测试。
- **OB-04 Name + Constitution：** 社团名 + 只读学校标；三个选项行（Use sample 在前 / Upload / Paste）+ Skip；复用 ConstitutionStep 和 Setup.tsx 的 startReading 逻辑；AI 失败文案用 copy.ts 里已写好的那句（不要出现状态码）。文件：founder/Name.tsx、Constitution.tsx、ob-04 样式、测试。
- **OB-07 社员预览前半：** Invitation（角色卡放大、三条好处、信任一句话）、You（预填确认）、Reminders（渠道选项行 + Morning/Evening + 随选择变化的示例提醒气泡；电话只在选 WhatsApp/SMS 后出现并写用途；**不问 ASU ID**）、Demo 条写 "Previewing as 某某"。开发时用样例社团和它的邀请码。文件：member/Invitation.tsx、You.tsx、Reminders.tsx、ob-07 样式、测试。
- **OB-08 社员预览后半：** 周条（期末周/假期来自 engine/calendar.ts；忙碌周必须是周一）、三问合一屏（可跳过）、Done（名字加入组织图 + 第一件事卡片）。文件：member/BusyWeeks.tsx、About.tsx、Done.tsx、ob-08 样式、测试。**这是可砍的包**：时间不够就停下告诉 Juanxi，不要偷工。
每个屏的"可跳过"必须有 Skip for now + 一行"以后在哪找回"；每屏"一眼看到的"英文词 ≤40（OB-06 ≤60）。Q2–Q6 的含义见策略第 9 节；若上面填空写"按建议"，就按文档里每条的"建议"列执行。

## 4. 工作方式
- 你同时是执行者和整合人，一次做一个包：从工作分支开本地分支 design/ob-NN-<短名>（全小写，不带 AI 名字），提交信息 "[OB-NN][你的AI名] 做了什么"（中文）；做完并自检后回到工作分支用 git merge --no-ff 合并（Juanxi 要靠合并提交单独回滚某个包），登记 ROLLBACK_LOG.md，然后推送工作分支。不 squash，不 rebase 已推送的提交。
- 推送被拒：先 git fetch，再把自己尚未推送的提交接在远端后面，不强推；远端可能有别人的修复提交，不要改它们。
- 开工第一件事：在 docs/PROGRESS.md 把"Onboarding 阶段 2"标为"进行中"，写上你的 AI 名称和日期；若已有别的 AI 标了进行中，停下问 Juanxi。
- 每个包只改自己"只能改这些文件"里列的文件；提交前和合并前都看 git diff --stat。需要改白名单以外的文件（App.tsx、draft.tsx、store.tsx、styles.css、index.css、旧的 Setup.tsx/Join.tsx 等）：停下写进报告。

## 5. 硬性规则（违反即失败，完整版见 AGENTS.md）
1. 不放研究数据、参与者信息、密钥；只用虚构数据。
2. 日期只由规则引擎计算，AI 不能给日期。
3. 不调用 /api/org/*、/api/workspace*，不新增 AI 接口；只用已有的 /api/setup/constitution、/api/command。
4. 不改 SCHEMA_VERSION、DemoState，不改已有的 localStorage / IndexedDB 键。
5. 样式只用 token；只写自己的 ob-NN 文件；不写 !important、transition: all、裸毫秒、裸颜色；只动 transform 和 opacity；动画可被打断，有减少动效版本。npm run lint 会拦。
6. 旧页面和旧测试不改、不放宽；入口开关关着时全站要和今天一样。
7. 每个新守卫附一个"故意违规会变红"的测试样本；不跳过、不删除、不放宽测试来变绿。
8. 报告必须有"没验证的"一栏（真机手指、Safari、深色等没测的就写没测），不要把没验证的说成验证过。

## 6. 怎么证明一个包做完
Node 22。npm ci；npm run lint；npm run build；npm test；再跑你自己的 e2e（桌面和手机两个 project）：
PW_PORT=52NN PW_STORAGE_PORT=53NN WORDS_PORT=54NN npx playwright test e2e/ob-NN-*.spec.ts（NN 是包号）。没有预装浏览器时设 PW_CHROMIUM=<chromium 路径>（本环境常见：/opt/pw-browsers/chromium-1243/chrome-linux64/chrome）。
每个包的测试至少包括：最快路径、完整路径、返回/跳过/恢复、axe 无障碍、深色、减少动效；有动效的要把减少动效切回"不减少"并逐帧采样（参考 e2e/dx-*.spec.ts）。
每合并完一个包跑一次完整 npm run check；阶段结束前必须完整绿。
**起点也要先跑：** 开工前 npm run check 必须是绿的。已知一个脆弱的旧测试：src/test/engine.test.ts 里 "no change ever makes a step start after its own club deadline" 在慢机器上会超过 5 秒上限而失败，加 --testTimeout=30000 单独重跑通过就算已知问题，在报告里写明，不要修改它。
注意：不要用 pkill -f 去杀开发服务器（命令行匹配会把你自己的 shell 一起杀掉），用端口或 PID。

## 7. 必须停下的情况
起点不绿；需要改白名单以外的文件、数据结构、已有存储键或加依赖；只有削弱测试才能变绿；文档与代码矛盾；看到别的 AI 在做同一阶段；推送一直失败。停下时把做到哪、卡在哪、你的建议写进报告，并用简单中文告诉 Juanxi。

## 8. 交付
1. 每个包写 docs/onboarding-redesign/reports/OB-NN.md（做了什么 / 怎么验收，点哪里 / 没验证的 / 遇到的问题 / 回滚方式）。
2. ROLLBACK_LOG.md 登记每个合并提交的 SHA。
3. docs/PROGRESS.md 最上面加一条阶段交接：做了什么、预览网址（带 ?walkthrough=1 的）和"点哪里走一遍社长流程"的几句话、测试结果、没验证的、下一步需要 Juanxi 决定什么；状态改"待验收"；写"需要同步本地备份"。
4. 推送工作分支。不新开 PR，不合并 main。
5. 给 Juanxi 一段简单中文总结（做完了什么 3–5 句、打开哪个网址点哪里、没做完或有风险的），然后停下等他验收，**不要接着做阶段 3**。

现在开始：先做第 1 节的阅读，然后复述"本次要做的包和顺序"和"每个包准备改的文件范围"，再动手。
```
