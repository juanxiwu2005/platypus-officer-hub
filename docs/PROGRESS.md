# Platypus v1.0 进度

**最后更新：** 2026-10-27（Codex，Night Mode 工作流与跨 AI 交接文档）
**当前阶段：** Production 产品仍以 `main` 的 `4dc55ba` 为基线。独立的 Night Mode 自动开发工作流已在 `feat/ai-night-mode` 完成，位于 Draft PR #7，尚未合并 `main`。产品本身的历史状态和真实 AI 验收缺口继续按下文记录。

**Night Mode 当前事实：** Node 22、OpenCode、ASU AIR、GitHub CLI、项目级权限、受保护控制器、独立 Critic、三轮返工和 GitHub CI 已串接。2026-10-27 的 `--doctor`、PR CI 与 Deploy Preview 已通过。详细运行方法见 `docs/NIGHT_MODE.md`；未来每次运行仍须重新验证，不能把这次通过当成永久状态。

**下一步（第二部分）：** ① 用真实 DeepSeek 试 Ask 面板并补跑 WP5 的 40 道规则题（需要 Juanxi 登录 Netlify 或关掉预览保护）；② 精写 `/api/chat` 提示词；③ 对照官网复核 R01–R16；④ 更新 PRODUCT_PLAN 第 6 节；⑤ 键盘与无障碍检查；⑥ 换 ASU AIR；⑦ 定版合并 main（需批准）。

## 工作包

计划详见 `docs/PRODUCT_PLAN.md` 第 13 节。状态只用：未开始 / 进行中 / 待验收 / 已完成。

| 工作包 | 计划日期 | 状态 | 负责的 AI | 预览网址 | 备注 |
| --- | --- | --- | --- | --- | --- |
| Night Mode 自动开发 | 10/27 | 已完成（Draft PR） | Codex + OpenCode ASU Agents | https://deploy-preview-7--platypus-officer-hub.netlify.app | PR #7；Agent 编码 → 本地完整检查 → 独立 Critic → 控制器 commit/push → GitHub CI → `READY_FOR_CLAUDE`。永不自动 merge/Production；README、AGENTS、Claude/Gemini/Copilot 入口和任务模板已补齐。 |
| 2026-10-23 | Claude | **合并上线 + 真 DeepSeek 实测。** v1 快进合并到 main（f868709），正式网站 `/api/health` 显示 DeepSeek 已接通。浏览器实测：①问 USG 表谁负责、何时截止，答对负责人、俱乐部截止日和 ASU 截止日；②“把传单标为进行中”立即生效，Undo 成功恢复；③“把预算改成 $450”时发现 bug：服务器核对改动只认活动/任务/人员 ID，不认经费/伙伴/角色/标签，改预算被丢掉而 AI 嘴上说“待批准”——已修，并且改动全部无效时会明确告诉用户。253 个单元测试 + 107 个页面测试通过。已同步本地备份。 | Juanxi 自己继续测（测试清单见对话）。v1.0 标签 11/8 再打。 |
| 2026-10-23 | Claude | **AI 数据权限 v1.2。** ①`aiContext.ts`：每次提问把当前查看者能看到的全部数据（社团、角色、人员和工作量、活动、全部任务含状态/负责人/风险/准时概率/三个截止日、经费、伙伴、交接、本人通知、规则摘要）发给 `/api/chat`，约 25 KB；服务器再删一遍可疑字段（key/token/secret/password/signature/phone/文件）并限长。②`sharedPool.ts` + `/api/pool`：虚构共享池（4 个示例社团的审批用时、场地、供应商、经验），只读，AI 只能引用。③新白名单操作：小改动 set_status / rename_task / set_tags / set_tier / mark_contacted 按查看者权限立即生效，Ask 面板显示“Done · Undo”；大改动 assign_owner / add_node / link_dependency / update_event / add_contact / set_funding_amount / advance_funding / create_event 仍走审批卡。④日期：AI 文字中与数据一致的日期保留，其余遮掉。⑤提示词重写。⑥检查：252 个单元测试 + 107 个页面测试全部通过。⑦发现预览网站一直是模拟回答：Netlify 里 `AI_API_KEY` 只填了 Production，Deploy Previews / Branch deploys 为空，已请 Juanxi 补填。已同步本地备份。 | 真实 DeepSeek 试用要等 Juanxi 在 Deploy Previews 填好 key 并重新部署。共享池是虚构演示，v1.5 换成数据库时要做“社团选择共享哪些字段”的设置。 |
| 2026-10-23 | Claude | **第二部分。** ①逐条复核 R01–R16（来源核对日 2026-10-23），修正 R01/R03/R06/R07/R11/R16 措辞，记录在 RULES.md。②产品计划第 6 节改写为 v1.1 界面说明。③无障碍：6 个状态色对比度达到 AA；右栏标签结构修正；新增 axe 扫描 10 页 + 面板、键盘操作测试。④AI 面板提示词重写：更会追问（一次只问一个问题，办活动直接给表单）、更会推荐（先逾期/红色风险，再无人认领，再最早开始）；请求里新增一份精简状态摘要（任务状态、负责人、所属活动、风险色、是否逾期、每人工作量档），服务器逐项核对，只留真实 ID 和允许的值，不含档案、缓冲或文件。⑤检查：245 个单元测试 + 107 个页面测试（含无障碍）全部通过；已同步本地备份。 | **需要 Juanxi：** 真实 DeepSeek 试用 Ask 面板和 40 题规则评估（需要登录 Netlify 或关掉预览保护）；RTO 给出 AIR 的 key 和模型后再切换；说“批准合并”后才合并 main 并打 v1.0 标签。 |
| WP0 地基 | 10/23–10/24 | 已完成 | Claude（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app | React + TS + Vite；演示数据与重置；10 个页面；帮助页；13 个单元测试 + 26 个页面测试；CI；draft PR #1 |
| WP1 引擎与流程图 | 10/24–10/27 | 已完成 | Claude（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app/#/events | 规则引擎（`src/engine/`）；ASU 日历；活动模板（OA101/102/201 + T-90/60/30/14 + R01–R16）；泳道流程图、甘特图、列表；侧栏编辑；68 个单元测试 + 38 个页面测试 |
| WP2 今日页与提醒 | 10/27–10/30 | 已完成 | ChatGPT（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app | 逐条审核的 `/api/command` 变更单；前三项风险与渠道草稿；`/api/nudge/draft`；活动条、目标、本周之星；120 个单元测试 + 50 个页面测试；固定命令 20/20 |
| WP3 任务与干部端 | 10/30–11/2 | 已完成 | ChatGPT（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app/#/tasks | 任务列表/看板/甘特；认领握手；四个状态；带草稿延期与社长审批；同浏览器一次性签名手机页；3/5/7/8/10 天私下跟进、RACI 和模拟时钟；146 个单元测试 + 62 个页面测试 |
| WP4 设置与团队 | 11/2–11/4 | 已完成 | ChatGPT（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app/#/settings | 社长五步/干部五问；演示链接与文件；可编辑设置和私有缓冲；工作量、贡献榜、会议交集；174 个单元测试 + 76 个页面测试，首次使用计时待 Juanxi 验收 |
| WP5 经费、规则、交接、关系、预测 | 11/4–11/7 | 待验收 | Codex（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app | 五页与接口完成；233 单元 + 90 页面测试；真实 AI 40 题和真实手册审阅待补，见 AI_TESTS.md |
| UX 改版 U1–U5 | 10/24–10/30 | 已完成 | Claude（2026-10-23） | https://deploy-preview-1--platypus-officer-hub.netlify.app | 三栏布局与 5 个组件；右侧 AI 面板与 `/api/chat`；单主线流程图；可拖看板；经费物流链；交接接力卡；伙伴表格；规则直达链接；设置分块自动保存；每页字数至少减 60% |
| WP6 定版 | 11/7–11/8 | 未开始 | — | — | 切 AIR 跑测试集、合并到 `main`（需 Juanxi 批准） |

## 决定记录

| 日期 | 决定 | 谁定的 |
| --- | --- | --- |
| 2026-10-27 | Night Mode 只在 `feat/ai-night-mode` 和 Draft PR #7 工作；Agent 不提交、不推送、不碰保护文件；控制器负责本地检查、独立 Review、commit/push 和 CI；最终仍由 Claude 与 Juanxi 人工检查，绝不自动合并 `main` 或部署 Production | Juanxi（要求建立低成本、尽量无人值守但保留人工闸门的多模型工作流） |
| 2026-10-21 | 产品名定为 Platypus；Phase 3 用方案 C（Netlify + 服务器函数） | Juanxi |
| 2026-10-22 | 批准产品计划 v1.0 第 16 节全部 10 个决定 | Juanxi |
| 2026-10-23 | 批准把 v1 合并到 main（正式网站），v1.0 标签等 11/8 定版再打 | Juanxi |
| 2026-10-23 | AI 数据权限（v1.2）：AI 能看到当前查看者能看到的全部数据（别人的私人缓冲和私信除外）；服务器上先放虚构的共享池（只读），正式数据库留到 v1.5/v2；小改动直接生效可撤销，大改动先确认；AI 可说系统已算出的日期 | Juanxi |
| 2026-10-22 | 提醒改为分点结构：Why now → What → When → How（≤3 步）→ Why it matters，正文约 100 词以内 | Juanxi |
| 2026-10-22 | 多个 AI 轮流开发；GitHub 为正本，本地文件夹为备份 | Juanxi |
| 2026-10-22 | WP0 验收通过（Juanxi：“继续WP1”） | Juanxi |
| 2026-10-22 | 演示从固定日期 2026-10-22（周四）开始，示例活动 Networking Night 固定在 11/19，Phase 3 每位参与者看到同样的日期；WP3 的模拟时钟从这里往后走 | Juanxi（2026-10-22 确认） |
| 2026-10-22 | 干部的工作日避开期末考试周和两个学期之间的假期（沿用 v0.1 “挪到寒假前”的做法）；ASU 的官方截止日仍按学校工作日算 | Juanxi（2026-10-22 确认） |
| 2026-10-22 | ASU 假期表按官方页面更正：12/31 不是假期；春假学校照常开放（v0.1 两处都算错了） | Claude（有出处，见 `docs/RULES.md`） |
| 2026-10-22 | WP1 验收通过；授权 ChatGPT 在 v1 接续 WP2 | Juanxi |
| 2026-10-22 | WP2 验收通过（Juanxi：“继续WP3”）；授权 ChatGPT 在 v1 接续 WP3 | Juanxi |
| 2026-10-22 | WP3 验收通过（Juanxi：“继续WP4”）；授权 ChatGPT 在 v1 接续 WP4 | Juanxi |
| 2026-10-22 | WP4（设置与团队）已验收通过；授权 Codex 在 v1 分支接续 WP5 | Juanxi（本次明确授权） |
| 2026-10-22 | 停止尝试登录 Netlify。WP5 真实 AI 测试未运行，保留原验收门槛并如实记录缺口；不关闭访问保护、不改 main | Juanxi（本次明确要求） |
| 2026-10-22 | WP4 的系统连接按演示配置实现：选择渠道、保存链接和规划文件；不登录或读取真实账户。五步设置中统一安排此配置 | Juanxi（本次确认） |
| 2026-10-23 | 批准《Platypus 简化改版方案》及其 8 个决定：①AI 与详情共用右栏（两个标签）；②Events 只留 Flow + List，甘特图移到 Tasks 的 Timeline；③看板：自己的任务随便拖，社长/副社长可拖所有人的并给本人留私下记录；④v1.0 状态名称与颜色可改、可加标签，自定义新列/字段留到 v1.5；⑤Settings 自动保存 + Undo；⑥规则加 ≤12 词短句，全文放悬停，同步 `docs/RULES.md`；⑦插入 U1–U5（10/24–10/30），WP5 并入一起验收，WP6 不变；⑧“Road 模块”即 Rules 页 | Juanxi（“非常好，开始执行”） |

## 等待外部的事

- 10/23 11:00 RTO 咨询：ASU AIR 的 key、可用模型、数据保留的书面确认。结果会影响 WP2 起的 AI 接口和 Phase 3 的 IRB 材料。
- 10/27 把 Phase 3 IRB 修改材料交给 Marcie（要点见计划第 14 节），10/30 前提交。
- 要问 Marcie：论文题目里的 “cloud-Excel-based” 是否要改；深访作为设计依据的写法是否合适。

## 交接记录（最新的在最上面）

| 日期 | AI | 做了什么 | 下一位要知道的 |
| --- | --- | --- | --- |
| 2026-10-27 | Codex | 完成 Night Mode 跨 AI 交接：README 加入人类入口和自动开发入口；AGENTS 记录仓库、分支、PR、Agent/模型、网络和密钥边界；扩写 `docs/NIGHT_MODE.md`；新增任务模板、`CLAUDE.md`、`GEMINI.md` 和 Copilot 指令。重新运行 `--doctor` 得到 PASS；提交前基线 PR #7 CI 与预览通过。 | 未来先重验 `git status`、`--doctor`、PR 与 CI。模型映射以 `opencode debug agents` 为准。`READY_FOR_CLAUDE` 不是合并许可；不要把 CI mock 当成真实模型质量验收。 |
| 2026-10-23 | Claude | **第一部分收尾。** ①手机：发现隐藏的悬停卡和 Today 风险表把手机页面撑宽（页面被缩小、右下角按钮点不到），已修（`html, body { overflow-x: clip }`、悬停卡限宽、窄屏隐藏次要列）；手机上换页自动收起右栏；Demo 菜单在手机上改为整宽。②看板拖拽：找到并修了一个真问题——卡片标题是按钮，Chrome 不允许从按钮开始拖，抓标题拖不动；改成可点击的文字后，用真实鼠标拖拽的自动测试通过。③深色模式看过 Today / Events / 看板，无看不清的地方。④删掉不用的 `@xyflow/react`。⑤字数全部在上限内（同上一行）。⑥检查：244 个单元测试 + **95 个页面测试（电脑 48 + 手机 47，悬停测试只在电脑跑）全部通过**；已同步本地备份。 | 第二部分见文件开头“下一步”。看板在开着右栏的 1440 宽屏上 6 列需要横向滚动（有意保留，和 monday 一样）。 |
| 2026-10-23 | Claude | **UX 简化改版 U1–U5 主体完成**（一次做完，未分包验收）。①三栏布局：左导航 / 中间内容 / 右栏（`src/components/rail/`：Ask 与 Details 两个标签，`useRail().show()` 打开详情）；演示条收进顶栏 “Demo” 小标（重置、时钟、重放设置），私下更新收进铃铛。②5 个通用组件 `src/components/ui/`：StatusPill（6 色状态）、Chain（物流链）、`.tbl` 表格、Hover/Info 悬停卡、右栏详情；页面标题改为 1–2 个词，问句移到导航悬停。③唯一 AI 入口 Ask 面板：`src/lib/assistant.ts`（本地先处理明确请求：策划活动→表单、前 N 个任务、谁需要提醒、规则关键词、命令语法）+ 新接口 `netlify/functions/chat.mts`；6 种卡片（文字、补信息表单、任务清单、变更单、提醒、规则答案），服务器和浏览器都用 `src/lib/chatCards.ts` 过滤，AI 写的日期全部丢弃；Today 和 Rules 的旧输入框已删。④流程图换成单主线（`src/components/flow/metro.ts` 布局 + `MetroChart.tsx`），泳道图、甘特图和 React Flow 依赖代码已删；手机竖排。⑤Tasks：表格（按活动分组、远期组折叠、负责人和截止日原地改）/ 可拖拽看板（`src/data/board.ts`：自己的随便拖，社长/副社长可拖所有人并给本人留私下记录，认领握手不变）/ Timeline；Customize 面板改状态名称颜色、标签、卡片字段。⑥Funding 物流链表；Partners 可搜索表格 + 新增；Handoff 接力卡 + 右栏分步手册；Rules 一行一条 + 直达出处按钮 + 问 AI 按钮（规则加 `short`/`timing`）；Settings 分 5 块、自动保存 + Undo；Team 工作量条、贡献表、一周空闲热力图；解释文字移到 Help。⑦字数（`scripts/word-count.mjs`）：Today 105、Events 95、Rules 134、Tasks 111、Team 108、Funding 45、Handoff 34、Partners 37、Settings 89，全部在上限内。⑧测试：244 个单元测试通过；页面测试已按新界面重写，**桌面版 48/48 通过**。 | **还没做 / 要接着做：** ① 手机版页面测试（Pixel 7）还没跑：`PW_CHROMIUM=<chromium 路径> npx playwright test --project=mobile`，预计有布局问题要修；② 看板**鼠标拖拽**只人工看过逻辑，自动测试改用卡片上的移动菜单（同一个动作），需要真人在预览里拖一次；③ Ask 面板只用模拟和本地回退测过，没连真实 DeepSeek；④ `@xyflow/react` 依赖已不用，可删；⑤ docs/PRODUCT_PLAN.md 未改（改版依据见《Platypus 简化改版方案》和 AGENTS.md §7）；⑥ 已同步本地备份。 |
| 2026-10-22 | Codex | WP5 功能完成：固定种子 1,000 次依赖预测与今日风险；六类规则与带出处问答、报错队列、40 题评估脚本；经费阶段/提交检查/用款提醒/Plan B；带逐条来源的岗位手册、卸任确认→社长批准、SEO/R16 第一周清单、岗位与联系人交接；关系页与私有缓冲渐进调整/关闭/换届重置。本机 `npm run check` 全通过：233 个单元测试 + 90 个页面测试，原有测试保留；主体提交 b8a6986 的 CI 通过。已同步本地备份（仅指定 4 文件） | **验收：** [预览 Handoff](https://deploy-preview-1--platypus-officer-hub.netlify.app/#/handoff) → Start handoff season → Treasurer handbook → Draft role handbook，点每条 Source；切 Maya 确认，再切 Alex 批准。Today 展开 Forecast details 才见比例；Rules 问校外餐饮应引 R06、税务题应拒答；Funding 在 11/4 未批时展示 Plan B；Partners 显示岗位与下一场活动。**还剩/已知：** 真实 DeepSeek 40 题、如已配 AIR 则另跑 AIR，以及 Juanxi 审真实 AI 手册，均未完成，不宣称达到 ≥90% / 拒答全对。用户要求停止登录，已停止；示例回退不能冒充真实 AI。**WP6：** 结构版本 5，规则仍待正式复核，保留访问保护与 main；完整说明见 `docs/WP5_ACCEPTANCE.md`、`docs/AI_TESTS.md`。 |
| 2026-10-22 | ChatGPT | 完成 WP4：社长五步设置、干部五问手机页、可修改设置、私有缓冲及关闭选项；按 Juanxi 确认保存演示渠道/链接/小型虚构规划文件；工作量档位、带来源贡献榜、只用自报时间的会议查找；岗位改名同步流程图与手册目录。本机 `npm run check` 全通过：174 个单元测试、76 个页面测试；原有测试保留。已同步本地备份（只覆盖指定 4 文件，未触碰 Reference/） | **验收：** [预览 Settings](https://deploy-preview-1--platypus-officer-hub.netlify.app/#/settings)。① Replay setup 计时走五步，确认首场活动后才替换演示数据并进入流程图；第四步为演示配置，没有真实账户登录。② Settings 把 Treasurer 改为 VP of Finance 并保存，Events 与 Handoff 应同步。③ Invite officers → Try officer setup，选 Maya 填五问，检查个人偏好。④ Team 看工作量依据、贡献来源和默认 10/22 18:30 的会议交集；12/8 应无时段。⑤ Reset demo 恢复并使旧邀请失效。**还剩：** Juanxi 首次使用计时与手机验收，WP5 完整手册及其余工作。**已知：** 本地虚构身份演示，不支持跨设备邀请；文件只保存、不由 AI 阅读；会议不读取日历；完整手册在 WP5；实时供应商表达质量未实测。结构版本 4。接续说明见 `docs/WP4_ACCEPTANCE.md`。 |
| 2026-10-22 | ChatGPT | 完成 WP3：任务列表/看板/甘特；认领及 48 小时未认领风险；四个状态、带草稿延期与社长批准/拒绝；一次性签名的干部手机页；模拟时钟和第 3/5/7/8/10 天私下跟进；临时接手与恢复时间线需人批准；复盘任务、RACI 私下收件箱和完成贡献去重。已记录 WP2 验收。本机 `npm run check` 全通过：146 个单元测试、62 个页面测试；原有测试保留。代码提交 `93acc4b` 的 GitHub Actions 也已通过。已同步本地备份（只覆盖指定 4 文件，未触碰 Reference/） | **验收：** [预览 Tasks](https://deploy-preview-1--platypus-officer-hub.netlify.app/#/tasks)（需 Netlify 登录）。① Reset demo → Jordan → Available to claim 点 RSVPs 任务 → I've got it，试 Waiting on… / Need help / Done；完成后刷新应保留。② Maya 的 Networking Night USG food request → Need more time，必须附草稿链接与更晚日期；切 Alex 批准，学校日期仍为 11/4。③ Reset demo → Alex → Tasks → Demo clock +10 days；默认 checklist 应有 Day 3/5/7/8/10 五项和对应私下收件人，接手与恢复时间线要单独批准。④ 从提醒的四个状态入口打开干部页，只有对应任务，成功回报后同一链接不能再用。⑤ 切 List / Board / Gantt 与角色，看各自任务和私下收件箱。**还剩：** Juanxi 用手机验收；WP4 设置与团队。**已知：** 签名链接是同浏览器本地演示，不能从电脑跨到另一手机或浏览器；请在手机直接打开预览再生成链接。模拟提醒只在私下收件箱展示，不自动向外发送；时钟按日计算。结构版本 3 会重置旧版演示。详细边界、日期、测试与下一位说明见 `docs/WP3_ACCEPTANCE.md`。 |
| 2026-10-22 | ChatGPT | 完成 WP2：今日页一句话与七种白名单变更单（逐条编辑、通过、拒绝）；双重过滤 AI 日期；风险前三项与私下提醒草稿（WhatsApp / 短信 / Gmail）；五段分点正文、100 词上限与禁用说法检查；活动当前步骤和后两步；学期目标、本周之星及计分依据。已记录 WP1 验收和两项提议获批。本机 `npm run check` 全部通过：120 个单元测试、50 个页面测试，原有测试均保留；固定命令 20/20。代码提交 `d5a1179` 的 GitHub Actions 也通过。已同步本地备份（只覆盖指定 4 个文件，未触碰 Reference/） | **验收：** [预览 Today](https://deploy-preview-1--platypus-officer-hub.netlify.app/#/)（需 Netlify 登录）。① Reset demo，输入 `Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding` → Review changes；检查 Event date，逐条 Apply 后才出现新活动。② Needs a nudge 的第一条点 Draft reminder，应该看到 Sam、首选 WhatsApp、五段分点和四个状态入口；切 Gmail 可打开草稿，无需发送。③ 活动条应有 Current / Next 1 / Next 2，Networking Night 的 Current 是海报，点步骤可看详情；下方有目标和本周之星。④ View as 切 Maya，不能发提醒或批准。最后 Reset demo。**还剩：** Juanxi 验收与提醒措辞范例；WP3 的实际认领、四种状态更新、延期、沉默协议与模拟时钟。**已知：** 四个状态入口目前只预览对应任务，明确提示未改状态；草稿不填真实收件人；打开不算已发，需人自己确认。20/20 是确定性命令路径，真实 DeepSeek/AIR 自由表达未实测；接口测试使用模拟 AI。短信外部应用兼容性需手机验收。提醒时段仅提示，无自动发送；本周之星暂按本周更新的已完成任务关联现有分数。详情与下一位的接口说明见 `docs/WP2_ACCEPTANCE.md`。 |
| 2026-10-22 | Claude | 完成 WP1：规则引擎（三个截止日、依赖倒推和顺推、红/黄提醒，每个日期附一句“为什么”）；ASU 日历；活动模板；活动页的泳道流程图、甘特图、列表和侧栏编辑；今日页的“需要推动”改用引擎的提醒排序；演示条显示演示日期；已同步本地备份 | **验收：** 打开预览网址的 Events 页。① 点 Treasurer 道里的“Submit the USG food request”，侧栏应显示 Wed Oct 28 / Fri Oct 30 / Wed Nov 4（和计划第 4 节的例子一致）。② 点 Marketing lead 道里的“Finish the event flyer”，把 Club deadline 改成 11/02，关掉侧栏：USG 请求变红，活动卡片显示“1 step cannot finish in time”。③ 再点 flyer，按“Use recommended”恢复。④ 切到 Gantt、List 看同样的步骤。⑤ 用手机打开，默认是列表。**WP2 从这里接：** `/api/command` 的变更单只能用 `buildEventNodes()` 和 store 的 `updateNode`/`updateEvent`，日期一律交给 `applySchedule()`；风险队列可以直接用 `useSchedule()` 的 issues。**已知：** 规则引擎没有处理“同一人同时有太多任务”（工作量在 WP4）；流程图不能拖动节点改日期（只能在侧栏改），这是有意的，避免误改 |
| 2026-10-22 | Claude | 完成 WP0：React + TS + Vite 骨架；v0.1 移到 `/legacy/`；虚构社团演示数据存在浏览器里，可一键重置；10 个页面各回答一个问题，没做的部分用“Coming in WPx”标出；Vitest + Playwright（桌面/手机）+ GitHub Actions；draft PR #1 给出预览网址；已同步本地备份 | **验收：** 打开预览网址，点左边每个页面；右上角“View as”换成 Maya，再点 Tasks 看她的任务；点“Reset demo”回到 Alex。**WP1 从这里接：** 规则引擎放 `src/engine/`，重算 `Node` 的三个日期；Events 页的 `Coming` 卡片列了要做的东西。**已知：** 预览网址受 Netlify 团队登录保护（只有登录 Netlify 的人能打开；正式网址不受影响，Phase 3 前要决定是否关掉这个保护或改用正式网址）；节点日期是临时的相对日期，等 WP1 引擎接管；命令框是禁用状态（WP2） |
| 2026-10-22 | Claude | 加入 `AGENTS.md`、`CLAUDE.md`、`docs/PRODUCT_PLAN.md`、`docs/PROGRESS.md`、`docs/RULES.md`、`docs/SEO_PLAYBOOK_REFERENCE.md`；同步本地备份 | 从 WP0 开始；先读 `AGENTS.md` |

