# Platypus v1.0 进度

**最后更新：** 2026-10-22（ChatGPT）  
**当前阶段：** WP3 已完成；WP4 进行中（ChatGPT）。

**下一步：** 完成 WP4 首次设置、设置页与团队页，交 Juanxi 验收。

## 工作包

计划详见 `docs/PRODUCT_PLAN.md` 第 13 节。状态只用：未开始 / 进行中 / 待验收 / 已完成。

| 工作包 | 计划日期 | 状态 | 负责的 AI | 预览网址 | 备注 |
| --- | --- | --- | --- | --- | --- |
| WP0 地基 | 10/23–10/24 | 已完成 | Claude（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app | React + TS + Vite；演示数据与重置；10 个页面；帮助页；13 个单元测试 + 26 个页面测试；CI；draft PR #1 |
| WP1 引擎与流程图 | 10/24–10/27 | 已完成 | Claude（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app/#/events | 规则引擎（`src/engine/`）；ASU 日历；活动模板（OA101/102/201 + T-90/60/30/14 + R01–R16）；泳道流程图、甘特图、列表；侧栏编辑；68 个单元测试 + 38 个页面测试 |
| WP2 今日页与提醒 | 10/27–10/30 | 已完成 | ChatGPT（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app | 逐条审核的 `/api/command` 变更单；前三项风险与渠道草稿；`/api/nudge/draft`；活动条、目标、本周之星；120 个单元测试 + 50 个页面测试；固定命令 20/20 |
| WP3 任务与干部端 | 10/30–11/2 | 已完成 | ChatGPT（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app/#/tasks | 任务列表/看板/甘特；认领握手；四个状态；带草稿延期与社长审批；同浏览器一次性签名手机页；3/5/7/8/10 天私下跟进、RACI 和模拟时钟；146 个单元测试 + 62 个页面测试 |
| WP4 设置与团队 | 11/2–11/4 | 进行中 | ChatGPT（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app/#/settings | 首次设置 ≤ 5 分钟、设置页、团队页 |
| WP5 经费、规则、交接、关系、预测 | 11/4–11/7 | 未开始 | — | — | 提交前检查、规则卡片、换届季、联系人、预测 |
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

| 2026-10-22 | WP4 的系统连接按演示配置实现：选择渠道、保存链接和规划文件；不登录或读取真实账户。五步设置中统一安排此配置 | Juanxi（本次确认） |

## 等待外部的事

- 10/23 11:00 RTO 咨询：ASU AIR 的 key、可用模型、数据保留的书面确认。结果会影响 WP2 起的 AI 接口和 Phase 3 的 IRB 材料。
- 10/27 把 Phase 3 IRB 修改材料交给 Marcie（要点见计划第 14 节），10/30 前提交。
- 要问 Marcie：论文题目里的 “cloud-Excel-based” 是否要改；深访作为设计依据的写法是否合适。

## 交接记录（最新的在最上面）

| 日期 | AI | 做了什么 | 下一位要知道的 |
| --- | --- | --- | --- |
| 2026-10-22 | ChatGPT | 完成 WP3：任务列表/看板/甘特；认领及 48 小时未认领风险；四个状态、带草稿延期与社长批准/拒绝；一次性签名的干部手机页；模拟时钟和第 3/5/7/8/10 天私下跟进；临时接手与恢复时间线需人批准；复盘任务、RACI 私下收件箱和完成贡献去重。已记录 WP2 验收。本机 `npm run check` 全通过：146 个单元测试、62 个页面测试；原有测试保留。代码提交 `93acc4b` 的 GitHub Actions 也已通过。已同步本地备份（只覆盖指定 4 文件，未触碰 Reference/） | **验收：** [预览 Tasks](https://deploy-preview-1--platypus-officer-hub.netlify.app/#/tasks)（需 Netlify 登录）。① Reset demo → Jordan → Available to claim 点 RSVPs 任务 → I've got it，试 Waiting on… / Need help / Done；完成后刷新应保留。② Maya 的 Networking Night USG food request → Need more time，必须附草稿链接与更晚日期；切 Alex 批准，学校日期仍为 11/4。③ Reset demo → Alex → Tasks → Demo clock +10 days；默认 checklist 应有 Day 3/5/7/8/10 五项和对应私下收件人，接手与恢复时间线要单独批准。④ 从提醒的四个状态入口打开干部页，只有对应任务，成功回报后同一链接不能再用。⑤ 切 List / Board / Gantt 与角色，看各自任务和私下收件箱。**还剩：** Juanxi 用手机验收；WP4 设置与团队。**已知：** 签名链接是同浏览器本地演示，不能从电脑跨到另一手机或浏览器；请在手机直接打开预览再生成链接。模拟提醒只在私下收件箱展示，不自动向外发送；时钟按日计算。结构版本 3 会重置旧版演示。详细边界、日期、测试与下一位说明见 `docs/WP3_ACCEPTANCE.md`。 |
| 2026-10-22 | ChatGPT | 完成 WP2：今日页一句话与七种白名单变更单（逐条编辑、通过、拒绝）；双重过滤 AI 日期；风险前三项与私下提醒草稿（WhatsApp / 短信 / Gmail）；五段分点正文、100 词上限与禁用说法检查；活动当前步骤和后两步；学期目标、本周之星及计分依据。已记录 WP1 验收和两项提议获批。本机 `npm run check` 全部通过：120 个单元测试、50 个页面测试，原有测试均保留；固定命令 20/20。代码提交 `d5a1179` 的 GitHub Actions 也通过。已同步本地备份（只覆盖指定 4 个文件，未触碰 Reference/） | **验收：** [预览 Today](https://deploy-preview-1--platypus-officer-hub.netlify.app/#/)（需 Netlify 登录）。① Reset demo，输入 `Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding` → Review changes；检查 Event date，逐条 Apply 后才出现新活动。② Needs a nudge 的第一条点 Draft reminder，应该看到 Sam、首选 WhatsApp、五段分点和四个状态入口；切 Gmail 可打开草稿，无需发送。③ 活动条应有 Current / Next 1 / Next 2，Networking Night 的 Current 是海报，点步骤可看详情；下方有目标和本周之星。④ View as 切 Maya，不能发提醒或批准。最后 Reset demo。**还剩：** Juanxi 验收与提醒措辞范例；WP3 的实际认领、四种状态更新、延期、沉默协议与模拟时钟。**已知：** 四个状态入口目前只预览对应任务，明确提示未改状态；草稿不填真实收件人；打开不算已发，需人自己确认。20/20 是确定性命令路径，真实 DeepSeek/AIR 自由表达未实测；接口测试使用模拟 AI。短信外部应用兼容性需手机验收。提醒时段仅提示，无自动发送；本周之星暂按本周更新的已完成任务关联现有分数。详情与下一位的接口说明见 `docs/WP2_ACCEPTANCE.md`。 |
| 2026-10-22 | Claude | 完成 WP1：规则引擎（三个截止日、依赖倒推和顺推、红/黄提醒，每个日期附一句“为什么”）；ASU 日历；活动模板；活动页的泳道流程图、甘特图、列表和侧栏编辑；今日页的“需要推动”改用引擎的提醒排序；演示条显示演示日期；已同步本地备份 | **验收：** 打开预览网址的 Events 页。① 点 Treasurer 道里的“Submit the USG food request”，侧栏应显示 Wed Oct 28 / Fri Oct 30 / Wed Nov 4（和计划第 4 节的例子一致）。② 点 Marketing lead 道里的“Finish the event flyer”，把 Club deadline 改成 11/02，关掉侧栏：USG 请求变红，活动卡片显示“1 step cannot finish in time”。③ 再点 flyer，按“Use recommended”恢复。④ 切到 Gantt、List 看同样的步骤。⑤ 用手机打开，默认是列表。**WP2 从这里接：** `/api/command` 的变更单只能用 `buildEventNodes()` 和 store 的 `updateNode`/`updateEvent`，日期一律交给 `applySchedule()`；风险队列可以直接用 `useSchedule()` 的 issues。**已知：** 规则引擎没有处理“同一人同时有太多任务”（工作量在 WP4）；流程图不能拖动节点改日期（只能在侧栏改），这是有意的，避免误改 |
| 2026-10-22 | Claude | 完成 WP0：React + TS + Vite 骨架；v0.1 移到 `/legacy/`；虚构社团演示数据存在浏览器里，可一键重置；10 个页面各回答一个问题，没做的部分用“Coming in WPx”标出；Vitest + Playwright（桌面/手机）+ GitHub Actions；draft PR #1 给出预览网址；已同步本地备份 | **验收：** 打开预览网址，点左边每个页面；右上角“View as”换成 Maya，再点 Tasks 看她的任务；点“Reset demo”回到 Alex。**WP1 从这里接：** 规则引擎放 `src/engine/`，重算 `Node` 的三个日期；Events 页的 `Coming` 卡片列了要做的东西。**已知：** 预览网址受 Netlify 团队登录保护（只有登录 Netlify 的人能打开；正式网址不受影响，Phase 3 前要决定是否关掉这个保护或改用正式网址）；节点日期是临时的相对日期，等 WP1 引擎接管；命令框是禁用状态（WP2） |
| 2026-10-22 | Claude | 加入 `AGENTS.md`、`CLAUDE.md`、`docs/PRODUCT_PLAN.md`、`docs/PROGRESS.md`、`docs/RULES.md`、`docs/SEO_PLAYBOOK_REFERENCE.md`；同步本地备份 | 从 WP0 开始；先读 `AGENTS.md` |
