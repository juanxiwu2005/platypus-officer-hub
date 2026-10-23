# Platypus v1.0 进度

**最后更新：** 2026-10-23（Claude）
**当前阶段：** UX 简化改版（U1–U5）进行中（Claude）；WP5 并入改版一起验收；真实 AI 验收闸门尚未通过。

**下一步：** Claude 按《Platypus 简化改版方案》（https://claude.ai/artifact/QhCthf71crEC62bBua5zJD）做 U1–U5，每包推到 v1 并给出验收要点。

## 工作包

计划详见 `docs/PRODUCT_PLAN.md` 第 13 节。状态只用：未开始 / 进行中 / 待验收 / 已完成。

| 工作包 | 计划日期 | 状态 | 负责的 AI | 预览网址 | 备注 |
| --- | --- | --- | --- | --- | --- |
| WP0 地基 | 10/23–10/24 | 已完成 | Claude（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app | React + TS + Vite；演示数据与重置；10 个页面；帮助页；13 个单元测试 + 26 个页面测试；CI；draft PR #1 |
| WP1 引擎与流程图 | 10/24–10/27 | 已完成 | Claude（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app/#/events | 规则引擎（`src/engine/`）；ASU 日历；活动模板（OA101/102/201 + T-90/60/30/14 + R01–R16）；泳道流程图、甘特图、列表；侧栏编辑；68 个单元测试 + 38 个页面测试 |
| WP2 今日页与提醒 | 10/27–10/30 | 已完成 | ChatGPT（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app | 逐条审核的 `/api/command` 变更单；前三项风险与渠道草稿；`/api/nudge/draft`；活动条、目标、本周之星；120 个单元测试 + 50 个页面测试；固定命令 20/20 |
| WP3 任务与干部端 | 10/30–11/2 | 已完成 | ChatGPT（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app/#/tasks | 任务列表/看板/甘特；认领握手；四个状态；带草稿延期与社长审批；同浏览器一次性签名手机页；3/5/7/8/10 天私下跟进、RACI 和模拟时钟；146 个单元测试 + 62 个页面测试 |
| WP4 设置与团队 | 11/2–11/4 | 已完成 | ChatGPT（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app/#/settings | 社长五步/干部五问；演示链接与文件；可编辑设置和私有缓冲；工作量、贡献榜、会议交集；174 个单元测试 + 76 个页面测试，首次使用计时待 Juanxi 验收 |
| WP5 经费、规则、交接、关系、预测 | 11/4–11/7 | 待验收 | Codex（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app | 五页与接口完成；233 单元 + 90 页面测试；真实 AI 40 题和真实手册审阅待补，见 AI_TESTS.md |
| UX 改版 U1–U5 | 10/24–10/30 | 进行中 | Claude（2026-10-23） | https://deploy-preview-1--platypus-officer-hub.netlify.app | 三栏布局与 5 个组件；右侧 AI 面板与 `/api/chat`；单主线流程图；可拖看板；经费物流链；交接接力卡；伙伴表格；规则直达链接；设置分块自动保存；每页字数至少减 60% |
| WP6 定版 | 11/7–11/8 | 未开始 | — | — | 切 AIR 跑测试集、合并到 `main`（需 Juanxi 批准） |

## 决定记录

| 日期 | 决定 | 谁定的 |
| --- | --- | --- |
| 2026-10-21 | 产品名定为 Platypus；Phase 3 用方案 C（Netlify + 服务器函数） | Juanxi |
| 2026-10-22 | 批准产品计划 v1.0 第 16 节全部 10 个决定 | Juanxi |
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
| 2026-10-22 | Codex | WP5 功能完成：固定种子 1,000 次依赖预测与今日风险；六类规则与带出处问答、报错队列、40 题评估脚本；经费阶段/提交检查/用款提醒/Plan B；带逐条来源的岗位手册、卸任确认→社长批准、SEO/R16 第一周清单、岗位与联系人交接；关系页与私有缓冲渐进调整/关闭/换届重置。本机 `npm run check` 全通过：233 个单元测试 + 90 个页面测试，原有测试保留；主体提交 b8a6986 的 CI 通过。已同步本地备份（仅指定 4 文件） | **验收：** [预览 Handoff](https://deploy-preview-1--platypus-officer-hub.netlify.app/#/handoff) → Start handoff season → Treasurer handbook → Draft role handbook，点每条 Source；切 Maya 确认，再切 Alex 批准。Today 展开 Forecast details 才见比例；Rules 问校外餐饮应引 R06、税务题应拒答；Funding 在 11/4 未批时展示 Plan B；Partners 显示岗位与下一场活动。**还剩/已知：** 真实 DeepSeek 40 题、如已配 AIR 则另跑 AIR，以及 Juanxi 审真实 AI 手册，均未完成，不宣称达到 ≥90% / 拒答全对。用户要求停止登录，已停止；示例回退不能冒充真实 AI。**WP6：** 结构版本 5，规则仍待正式复核，保留访问保护与 main；完整说明见 `docs/WP5_ACCEPTANCE.md`、`docs/AI_TESTS.md`。 |
| 2026-10-22 | ChatGPT | 完成 WP4：社长五步设置、干部五问手机页、可修改设置、私有缓冲及关闭选项；按 Juanxi 确认保存演示渠道/链接/小型虚构规划文件；工作量档位、带来源贡献榜、只用自报时间的会议查找；岗位改名同步流程图与手册目录。本机 `npm run check` 全通过：174 个单元测试、76 个页面测试；原有测试保留。已同步本地备份（只覆盖指定 4 文件，未触碰 Reference/） | **验收：** [预览 Settings](https://deploy-preview-1--platypus-officer-hub.netlify.app/#/settings)。① Replay setup 计时走五步，确认首场活动后才替换演示数据并进入流程图；第四步为演示配置，没有真实账户登录。② Settings 把 Treasurer 改为 VP of Finance 并保存，Events 与 Handoff 应同步。③ Invite officers → Try officer setup，选 Maya 填五问，检查个人偏好。④ Team 看工作量依据、贡献来源和默认 10/22 18:30 的会议交集；12/8 应无时段。⑤ Reset demo 恢复并使旧邀请失效。**还剩：** Juanxi 首次使用计时与手机验收，WP5 完整手册及其余工作。**已知：** 本地虚构身份演示，不支持跨设备邀请；文件只保存、不由 AI 阅读；会议不读取日历；完整手册在 WP5；实时供应商表达质量未实测。结构版本 4。接续说明见 `docs/WP4_ACCEPTANCE.md`。 |
| 2026-10-22 | ChatGPT | 完成 WP3：任务列表/看板/甘特；认领及 48 小时未认领风险；四个状态、带草稿延期与社长批准/拒绝；一次性签名的干部手机页；模拟时钟和第 3/5/7/8/10 天私下跟进；临时接手与恢复时间线需人批准；复盘任务、RACI 私下收件箱和完成贡献去重。已记录 WP2 验收。本机 `npm run check` 全通过：146 个单元测试、62 个页面测试；原有测试保留。代码提交 `93acc4b` 的 GitHub Actions 也已通过。已同步本地备份（只覆盖指定 4 文件，未触碰 Reference/） | **验收：** [预览 Tasks](https://deploy-preview-1--platypus-officer-hub.netlify.app/#/tasks)（需 Netlify 登录）。① Reset demo → Jordan → Available to claim 点 RSVPs 任务 → I've got it，试 Waiting on… / Need help / Done；完成后刷新应保留。② Maya 的 Networking Night USG food request → Need more time，必须附草稿链接与更晚日期；切 Alex 批准，学校日期仍为 11/4。③ Reset demo → Alex → Tasks → Demo clock +10 days；默认 checklist 应有 Day 3/5/7/8/10 五项和对应私下收件人，接手与恢复时间线要单独批准。④ 从提醒的四个状态入口打开干部页，只有对应任务，成功回报后同一链接不能再用。⑤ 切 List / Board / Gantt 与角色，看各自任务和私下收件箱。**还剩：** Juanxi 用手机验收；WP4 设置与团队。**已知：** 签名链接是同浏览器本地演示，不能从电脑跨到另一手机或浏览器；请在手机直接打开预览再生成链接。模拟提醒只在私下收件箱展示，不自动向外发送；时钟按日计算。结构版本 3 会重置旧版演示。详细边界、日期、测试与下一位说明见 `docs/WP3_ACCEPTANCE.md`。 |
| 2026-10-22 | ChatGPT | 完成 WP2：今日页一句话与七种白名单变更单（逐条编辑、通过、拒绝）；双重过滤 AI 日期；风险前三项与私下提醒草稿（WhatsApp / 短信 / Gmail）；五段分点正文、100 词上限与禁用说法检查；活动当前步骤和后两步；学期目标、本周之星及计分依据。已记录 WP1 验收和两项提议获批。本机 `npm run check` 全部通过：120 个单元测试、50 个页面测试，原有测试均保留；固定命令 20/20。代码提交 `d5a1179` 的 GitHub Actions 也通过。已同步本地备份（只覆盖指定 4 个文件，未触碰 Reference/） | **验收：** [预览 Today](https://deploy-preview-1--platypus-officer-hub.netlify.app/#/)（需 Netlify 登录）。① Reset demo，输入 `Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding` → Review changes；检查 Event date，逐条 Apply 后才出现新活动。② Needs a nudge 的第一条点 Draft reminder，应该看到 Sam、首选 WhatsApp、五段分点和四个状态入口；切 Gmail 可打开草稿，无需发送。③ 活动条应有 Current / Next 1 / Next 2，Networking Night 的 Current 是海报，点步骤可看详情；下方有目标和本周之星。④ View as 切 Maya，不能发提醒或批准。最后 Reset demo。**还剩：** Juanxi 验收与提醒措辞范例；WP3 的实际认领、四种状态更新、延期、沉默协议与模拟时钟。**已知：** 四个状态入口目前只预览对应任务，明确提示未改状态；草稿不填真实收件人；打开不算已发，需人自己确认。20/20 是确定性命令路径，真实 DeepSeek/AIR 自由表达未实测；接口测试使用模拟 AI。短信外部应用兼容性需手机验收。提醒时段仅提示，无自动发送；本周之星暂按本周更新的已完成任务关联现有分数。详情与下一位的接口说明见 `docs/WP2_ACCEPTANCE.md`。 |
| 2026-10-22 | Claude | 完成 WP1：规则引擎（三个截止日、依赖倒推和顺推、红/黄提醒，每个日期附一句“为什么”）；ASU 日历；活动模板；活动页的泳道流程图、甘特图、列表和侧栏编辑；今日页的“需要推动”改用引擎的提醒排序；演示条显示演示日期；已同步本地备份 | **验收：** 打开预览网址的 Events 页。① 点 Treasurer 道里的“Submit the USG food request”，侧栏应显示 Wed Oct 28 / Fri Oct 30 / Wed Nov 4（和计划第 4 节的例子一致）。② 点 Marketing lead 道里的“Finish the event flyer”，把 Club deadline 改成 11/02，关掉侧栏：USG 请求变红，活动卡片显示“1 step cannot finish in time”。③ 再点 flyer，按“Use recommended”恢复。④ 切到 Gantt、List 看同样的步骤。⑤ 用手机打开，默认是列表。**WP2 从这里接：** `/api/command` 的变更单只能用 `buildEventNodes()` 和 store 的 `updateNode`/`updateEvent`，日期一律交给 `applySchedule()`；风险队列可以直接用 `useSchedule()` 的 issues。**已知：** 规则引擎没有处理“同一人同时有太多任务”（工作量在 WP4）；流程图不能拖动节点改日期（只能在侧栏改），这是有意的，避免误改 |
| 2026-10-22 | Claude | 完成 WP0：React + TS + Vite 骨架；v0.1 移到 `/legacy/`；虚构社团演示数据存在浏览器里，可一键重置；10 个页面各回答一个问题，没做的部分用“Coming in WPx”标出；Vitest + Playwright（桌面/手机）+ GitHub Actions；draft PR #1 给出预览网址；已同步本地备份 | **验收：** 打开预览网址，点左边每个页面；右上角“View as”换成 Maya，再点 Tasks 看她的任务；点“Reset demo”回到 Alex。**WP1 从这里接：** 规则引擎放 `src/engine/`，重算 `Node` 的三个日期；Events 页的 `Coming` 卡片列了要做的东西。**已知：** 预览网址受 Netlify 团队登录保护（只有登录 Netlify 的人能打开；正式网址不受影响，Phase 3 前要决定是否关掉这个保护或改用正式网址）；节点日期是临时的相对日期，等 WP1 引擎接管；命令框是禁用状态（WP2） |
| 2026-10-22 | Claude | 加入 `AGENTS.md`、`CLAUDE.md`、`docs/PRODUCT_PLAN.md`、`docs/PROGRESS.md`、`docs/RULES.md`、`docs/SEO_PLAYBOOK_REFERENCE.md`；同步本地备份 | 从 WP0 开始；先读 `AGENTS.md` |

