# 交给另一个 AI 的提示词（Onboarding 改版）

> **怎么用：** 发送前只改最上面框里的两处"【发送前填写】"，然后把下面整个代码块原样贴给对方 AI。
> **一次只交一个阶段。** 阶段做完、你验收之后，再改"本次只做"那一行，发下一个阶段。
> **别让两个 AI 同时改同一个阶段**（包括我）：同一条分支上会互相覆盖。交出去的阶段，我这边就不再动。
> 提示词里不含任何密钥或研究数据。它假设对方能读写这个 GitHub 仓库、能跑 Node 22 和 Playwright；如果对方做不到，它会按提示词里的"停下来"条款告诉你。

```
你好。你要接手 Platypus 仓库里的一项工作：Onboarding 改版。下面是你需要知道的全部。你看不到我和上一个 AI（Claude）的对话，所以不要猜，一切以仓库里的文档为准。

【发送前填写 1】本次只做：阶段 1（可改为 阶段 2 或 阶段 3）
【发送前填写 2】Juanxi 对策略文档第 9 节 Q2–Q6 的答复：按建议 / 改为：________

## 0. 你是谁、给谁做事
- 项目负责人 Juanxi 不写代码。和他说话用简单的中文，一次只讲一步，不用术语；需要他动手的地方写清楚点哪里。
- 界面文字一律英文；文档、报告、给 Juanxi 的话用中文。代码标识符用英文。
- 仓库：GitHub juanxiwu2005/platypus-officer-hub。
- 工作分支（也是预览网址对应的 PR）：claude/determined-johnson-yrdxwf。预览：https://deploy-preview-10--platypus-officer-hub.netlify.app 。
  这个分支名带 AI 名字，违反常规命名，但 Juanxi 已同意只在这个预览上使用，**不要改名、不要删除**（删了预览就作废）。
- **绝对不要**：改 main、推送 main、合并 main、强制推送（--force）、改写别人的提交历史。只有 Juanxi 明确说"批准合并"才能合并到 main，而且那不是你的任务。

## 1. 开工前，先按这个顺序读（读完再动手）
1. AGENTS.md（全部；重点是第 3 节"硬性规则"、第 4 节"轮流工作的交接规则"、第 7 和 7.1 节"界面和动效规则"）
2. docs/PROGRESS.md 最上面几条，尤其是标题含"Onboarding"的两条
3. docs/DESIGN_TOKENS.md
4. docs/ONBOARDING_REDESIGN_STRATEGY.md（设计依据：第 0、2、2b、3、4、5、6、7 节）
5. docs/onboarding-redesign/WORK_PACKAGES.md（怎么拆、文件归属、记录方案、回滚）
6. docs/onboarding-redesign/PROMPTS.md（**每个工作包的"执行口令"就是你的任务说明书**；整合人口令告诉你合并和验收的做法）
设计已经定了，**不要重新设计**，也不要改动策略、工作包、提示词这三份文档。如果你认为它们有错，停下来在报告里写清楚，等 Juanxi 决定。

## 2. 这项工作是什么（一句话）
给 Platypus 做两条新的 onboarding：社长第一次设立组织；社员收到邀请后的体验。Phase 3 研究的参与者**都是社长**，他们首次打开网站时先看到一个欢迎页，可选 Start walkthrough（走社长流程，再预览社员视角）或 Explore the sample club。onboarding 过程要**记录在参与者自己的浏览器里**（独立的新 key，只记行为不记内容，只有参与者自己能导出）。参考日期 11/6，具体冻结日未定。

## 3. 你的工作方式（和 PROMPTS.md 的差别，以这一节为准）
PROMPTS.md 是为"整合人 + 并行 worktree 子 agent"写的。你是**一个** AI，所以：
- 你同时是执行者和整合人，**按顺序一次做一个包**。顺序：
  阶段 1：OB-01 → OB-02 → OB-03
  阶段 2：OB-06 → OB-05 → OB-04 → OB-07 → OB-08（OB-06 最大最难，先做）
  阶段 3：OB-09 → OB-10
- 每个包：从工作分支开本地分支 design/ob-NN-<短名>（全小写，不带 AI 名字），在上面提交，提交信息格式 "[OB-NN][你的AI名] 做了什么"（中文）。
  做完并通过自检后，回到工作分支用 git merge --no-ff 合并（保留合并提交，Juanxi 之后要靠它单独回滚某个包），然后推送工作分支。
  不要 squash，不要 rebase 已经推送的提交。
- 推送被拒（远端有新提交）：先 git fetch，再把自己的提交接在它后面（git rebase origin/<分支> 只用于你自己尚未推送的提交），不要强推。
  远端可能有别人（Juanxi 或别的 AI）推过修复提交；不要改它们。
- 开工第一件事：在 docs/PROGRESS.md 把 Onboarding 对应阶段标为"进行中"，写上你的 AI 名称和日期（AGENTS.md 第 4 节），提交并推送。如果看到别的 AI 已经标了"进行中"，**停下来问 Juanxi**。
- 并行包本来互不碰对方文件。你顺序做，也要守同一条规矩：**每个包只改自己"只能改这些文件"里列出的文件**；需要改别的文件（App.tsx、store.tsx、styles.css、PROGRESS.md 以外的共用文件）而 PROMPTS.md 没授权，就停下写进报告。
- 合并时、以及每个包提交前，都要看 git diff --stat，确认没有白名单以外的文件。

## 4. 硬性规则（违反就是失败，完整版在 AGENTS.md）
1. 不放研究数据、问卷、访谈、参与者信息；只用虚构演示数据。不放任何密钥（不要把任何 API key 写进代码、文档、提示词、提交）。
2. 日期只由规则引擎（src/engine/）计算；AI 不能给日期。
3. 不调用 /api/org/*、/api/workspace*，不新增 AI 接口；只用现有的 /api/setup/constitution 和 /api/command。ORG_SETUP_ENABLED 保持不设。
4. 不改 SCHEMA_VERSION，不改 DemoState，不改任何已有的 localStorage / IndexedDB 键。记录用的是**新增**的 key（见 WORK_PACKAGES.md 第 4 节）。
5. 样式：颜色、字号、圆角、层级、时长、曲线只用 token；新样式只写在自己的 src/styles/ob-*.css；不写 !important、transition: all、裸毫秒；
   动画只动 transform 和 opacity，可被打断，必须有"减少动效"版本。运行 npm run lint 会拦。
6. 旧页面和旧测试：src/pages/Setup.tsx、Join.tsx 一个字不改；旧测试一条都不能删、不能放宽断言。新开关关着时，全站要和今天一模一样。
7. 每个新守卫（会拦违规的检查）都要附一个"故意违规会变红"的测试样本。
8. 不要为了让测试变绿而跳过、删除或放宽测试。红了就找原因；找不到就停下来报告。
9. 每个包的报告必须有"没验证的"一栏（真机手指、Safari 等没测的就写没测）。没验证的不要说成验证过。

## 5. 怎么证明一个包做完（每个包都要）
在 Node 22 下：npm ci；npm run lint；npm run build；npm test；再跑这个包自己的 e2e（npx playwright test e2e/ob-NN-*.spec.ts）。
端口：PW_PORT=52NN PW_STORAGE_PORT=53NN WORDS_PORT=54NN（NN 是包号，避免和别的进程抢端口）。
没有预装浏览器时用环境变量 PW_CHROMIUM=<chromium 可执行文件路径>。
每合并完一个包，跑一次完整 npm run check（lint + 构建 + 单元 + 全部页面测试 + 字数）。阶段结束前必须完整绿。
起点也要先跑一次：开工前 npm run check 必须是绿的；不绿就**停下**告诉 Juanxi，不要"顺手修"。

## 6. 什么时候必须停下来（不要绕过去）
- 起点 npm run check 不绿。
- 需要改"只能改这些文件"以外的文件，或改 SCHEMA_VERSION / 已有存储键 / 数据结构，或加依赖。
- 只有削弱测试才能变绿。
- 文档之间互相矛盾，或和代码不符。
- 看到别的 AI 在做同一件事。
- 推送一直失败（不要强推；告诉 Juanxi 你卡在哪条命令、输出是什么）。
停下时：把你做到哪了、卡在哪、你的建议写进报告，并用简单中文告诉 Juanxi。

## 7. 本次做完之后（交付）
1. 每个包写 docs/onboarding-redesign/reports/OB-NN.md（做了什么 / 怎么验收，点哪里 / 没验证的 / 遇到的问题 / 回滚方式）。
2. 在 docs/onboarding-redesign/ROLLBACK_LOG.md 登记每个合并提交的 SHA（OB-01 负责新建这个文件）。
3. 在 docs/PROGRESS.md 最上面加一条阶段交接：做了什么、预览网址和"点哪里"的三五句话、测试结果（命令和通过数）、没验证的、下一步需要 Juanxi 决定什么；
   把工作包状态改成"待验收"；写上"需要同步本地备份"。
4. 推送工作分支。**不要新开 PR，不要合并 main。**
5. 最后给 Juanxi 一段简单中文总结：做完了什么（3–5 句）、他该打开哪个网址点哪里验收、有什么没做完或有风险。**然后停下，等他验收。**不要自己接着做下一个阶段。

现在开始：先做第 1 节的阅读，复述一遍"本次要做的包和顺序"和"你准备改的文件范围"，再动手。
```
