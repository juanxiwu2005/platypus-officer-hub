# Platypus v1.0 进度

**最后更新：** 2026-10-22（Claude）  
**当前阶段：** WP0 待验收（Juanxi 打开预览网址看一遍）。  
**下一步：** Juanxi 说“可以”后开始 WP1 引擎与流程图（建议用 Opus 5.5 Extra）。

## 工作包

计划详见 `docs/PRODUCT_PLAN.md` 第 13 节。状态只用：未开始 / 进行中 / 待验收 / 已完成。

| 工作包 | 计划日期 | 状态 | 负责的 AI | 预览网址 | 备注 |
| --- | --- | --- | --- | --- | --- |
| WP0 地基 | 10/23–10/24 | 待验收 | Claude（2026-10-22） | https://deploy-preview-1--platypus-officer-hub.netlify.app | React + TS + Vite；演示数据与重置；10 个页面；帮助页；13 个单元测试 + 26 个页面测试；CI；draft PR #1 |
| WP1 引擎与流程图 | 10/24–10/27 | 未开始 | — | — | 规则引擎、三个截止日、流程模板（OA101/102/201）、泳道流程图 |
| WP2 今日页与提醒 | 10/27–10/30 | 未开始 | — | — | `/api/command`、风险队列、一键提醒、`/api/nudge/draft` |
| WP3 任务与干部端 | 10/30–11/2 | 未开始 | — | — | 认领、四个状态按钮、带草稿延期、沉默协议、RACI |
| WP4 设置与团队 | 11/2–11/4 | 未开始 | — | — | 首次设置 ≤ 5 分钟、设置页、团队页 |
| WP5 经费、规则、交接、关系、预测 | 11/4–11/7 | 未开始 | — | — | 提交前检查、规则卡片、换届季、联系人、预测 |
| WP6 定版 | 11/7–11/8 | 未开始 | — | — | 切 AIR 跑测试集、合并到 `main`（需 Juanxi 批准） |

## 决定记录

| 日期 | 决定 | 谁定的 |
| --- | --- | --- |
| 2026-10-21 | 产品名定为 Platypus；Phase 3 用方案 C（Netlify + 服务器函数） | Juanxi |
| 2026-10-22 | 批准产品计划 v1.0 第 16 节全部 10 个决定 | Juanxi |
| 2026-10-22 | 提醒改为分点结构：Why now → What → When → How（≤3 步）→ Why it matters，正文约 100 词以内 | Juanxi |
| 2026-10-22 | 多个 AI 轮流开发；GitHub 为正本，本地文件夹为备份 | Juanxi |

## 等待外部的事

- 10/23 11:00 RTO 咨询：ASU AIR 的 key、可用模型、数据保留的书面确认。结果会影响 WP2 起的 AI 接口和 Phase 3 的 IRB 材料。
- 10/27 把 Phase 3 IRB 修改材料交给 Marcie（要点见计划第 14 节），10/30 前提交。
- 要问 Marcie：论文题目里的 “cloud-Excel-based” 是否要改；深访作为设计依据的写法是否合适。

## 交接记录（最新的在最上面）

| 日期 | AI | 做了什么 | 下一位要知道的 |
| --- | --- | --- | --- |
| 2026-10-22 | Claude | 完成 WP0：React + TS + Vite 骨架；v0.1 移到 `/legacy/`；虚构社团演示数据存在浏览器里，可一键重置；10 个页面各回答一个问题，没做的部分用“Coming in WPx”标出；Vitest + Playwright（桌面/手机）+ GitHub Actions；draft PR #1 给出预览网址；已同步本地备份 | **验收：** 打开预览网址，点左边每个页面；右上角“View as”换成 Maya，再点 Tasks 看她的任务；点“Reset demo”回到 Alex。**WP1 从这里接：** 规则引擎放 `src/engine/`，重算 `Node` 的三个日期；Events 页的 `Coming` 卡片列了要做的东西。**已知：** 预览网址受 Netlify 团队登录保护（只有登录 Netlify 的人能打开；正式网址不受影响，Phase 3 前要决定是否关掉这个保护或改用正式网址）；节点日期是临时的相对日期，等 WP1 引擎接管；命令框是禁用状态（WP2） |
| 2026-10-22 | Claude | 加入 `AGENTS.md`、`CLAUDE.md`、`docs/PRODUCT_PLAN.md`、`docs/PROGRESS.md`、`docs/RULES.md`、`docs/SEO_PLAYBOOK_REFERENCE.md`；同步本地备份 | 从 WP0 开始；先读 `AGENTS.md` |
