# AGENTS.md — 给任何接手的 AI（Claude、ChatGPT、DeepSeek……）

这个仓库是 **Platypus** 的代码和计划：一个给学生社团用的“团队型 AI 幕僚长”网站，也是 Juanxi (Steve) Wu 的 ASU Barrett 荣誉论文（STUDY00024727）第 3 阶段的原型。几个 AI 会轮流在这里工作，所以**每次开始前先读这份文件，结束时按第 4 节交接**。

## 1. 先读什么（按顺序）

1. `docs/PROGRESS.md` —— 现在做到哪了、谁在做、下一步是什么。
2. `docs/PRODUCT_PLAN.md` —— 已批准的产品计划 v1.0（唯一正本）。工作包和验收标准在第 13 节，范围和砍单顺序在第 12 节。
3. 按任务再读：`docs/RULES.md`（ASU 规则库）、`docs/SEO_PLAYBOOK_REFERENCE.md`（流程模板来源）、`docs/AI_SETUP.md`（AI 供应商怎么切换）。

## 2. 关于项目负责人

- Juanxi 不写代码。用简单的中文向他解释，一次只讲一步，不用术语；需要他动手的地方写清楚点哪里。
- 他通过**预览网址**验收每个工作包，只回答“可以”或“改哪里”。
- 计划的任何改动都要他同意，并记在 `docs/PROGRESS.md` 的“决定记录”里。

## 3. 硬性规则（不能破）

1. **不放研究数据。** 不提交问卷原始回答、访谈转写、录音、参与者姓名或引语。仓库里只有虚构的演示社团数据。也不要把这些资料贴给任何 AI。
2. **不放密钥。** API key 只放在 Netlify 的环境变量里（见 `docs/AI_SETUP.md`），绝不写进代码、文档或提交记录。
3. **日期只由规则引擎计算。** AI 只能起草“变更单”（白名单操作，见计划第 11 节）、提醒、答案和手册；AI 输出里的日期字段一律丢弃。
4. **`main` 分支就是正式网站。** 每次推送到 `main`，Netlify 都会自动上线。11/8 之前，所有 v1 的工作都在 `v1` 分支上做，**只有 Juanxi 批准后才能合并到 `main`**。
5. **AI 供应商：** 开发时用 DeepSeek，只处理虚构数据；有真实参与者的 Phase 3 会话必须用 ASU AIR（或 IRB 批准的供应商）。
6. **界面文字用英文**（用户是美国学生）；文档用中文。
7. 不做计划第 12 节标为“不做”的功能（例如库存、成员名单）。

## 4. 轮流工作的交接规则

**开始前：**

1. 拉取最新代码：`git fetch origin && git checkout v1 && git pull`。
2. 读 `docs/PROGRESS.md`。如果某个工作包写着“进行中”且标了别的 AI，就不要碰它，避免冲突。
3. 在 `docs/PROGRESS.md` 里把你要做的工作包标为“进行中”，写上你的名字（例如 ChatGPT、Claude、DeepSeek）和日期，然后提交并推送。

**工作中：**

- 小步提交。提交信息格式：`[WP1][ChatGPT] 规则引擎：加入三个截止日`。
- 改了行为就补测试；改了规则就同时改 `docs/RULES.md` 和代码里的规则数组。

**结束时：**

1. 在 `docs/PROGRESS.md` 写清楚：做完了什么、还剩什么、怎么验收（预览网址、要点哪里）、已知问题。
2. 把工作包状态改成“待验收”或“已完成”，在“交接记录”加一行。
3. 推送。如果改了 `docs/PRODUCT_PLAN.md`，在交接记录里注明“需要同步本地备份”。

**没有仓库权限的 AI（例如只在聊天窗口里的 DeepSeek）：** 让 Juanxi 把这份文件和相关章节贴给它，它只输出完整的文件内容或补丁，再由有权限的 AI 提交，并在交接记录里注明来源。

## 5. 本地备份

GitHub 是唯一正本。Juanxi 电脑上的 Honors Thesis 文件夹 `05_Phase3_Prototype/Plan/` 里有一份备份（`Platypus_产品计划_v1.0.md`、`PROGRESS.md`、`RULES.md`，以及本文件的副本 `AGENTS_repo.md`）。能访问他电脑的 AI（目前是 Claude）在每个工作包结束时同步一次；其他 AI 只要在交接记录里写“需要同步本地备份”。

## 6. 现在的代码

- `public/index.html`：v0.1 前端（单文件，约 13.7 万字符），正在线上运行。v1 将按计划改为 React + TypeScript + Vite + React Flow（WP0）。
- `netlify/functions/*.mts`：服务器接口 `/api/health`、`/api/ask`、`/api/parse-brief`、`/api/plan/draft`、`/api/replies/classify`；`netlify/lib/ai.mts` 是 AI 供应商适配器，换供应商只改环境变量。
- `netlify.toml`：发布目录和函数目录（WP0 改用 Vite 后，发布目录会变成 `dist`）。
- 正式网址：https://platypus-officer-hub.netlify.app 。`v1` 分支的预览：开一个从 `v1` 到 `main` 的 draft PR，Netlify 会自动给出 Deploy Preview 网址。
