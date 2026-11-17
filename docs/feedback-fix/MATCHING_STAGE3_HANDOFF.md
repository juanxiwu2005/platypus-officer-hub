# 职责匹配阶段 3 交付

2026-11-16（America/Phoenix） · Codex 主 Agent + 独立 Workflow / Integration / Review Worktree Agent。

Juanxi 已明确授权“继续阶段3”。阶段 2 基线为 `dbfc47d`，目标仍是 `claude/fervent-thompson-e2j5u2`、草稿 PR #14；不合并 `main`。本轮完成“任务匹配”三个阶段的业务接入，等待用户验收；RACI、提醒计划、邮件、邮件跳转、后台发送和新人上手没有在本轮启动。

## 用户现在可以做什么

预览：<https://deploy-preview-14--platypus-officer-hub.netlify.app/#/matching>。

1. 用社长/VP 查看，进入 Team 或 Settings → **Set up responsibilities**。旧组织先点 **Enable responsibility matching**；此动作不会更改已有任务、成员或岗位。
2. 在实际组织职责库中上传虚构章程或粘贴文本，显式请求 AI 草稿并逐条核对来源；也可直接 **New responsibility**，填职责边界、交付物、必要资格，再确认。
3. 在岗位职责泡泡、成员例外中关联现有岗位与成员，填写实际可用情况和所需资格；为每个职责设置 **Default person** 与 **Backup**。职责不会授予平台管理或学校审批权限。
4. 到 **Workflow links** 选择工作流，给各步骤选择本组织职责并确认；复合工作先拆分或明确统筹。标准 46 步均有审阅入口，初始没有被偷偷确认为某个固定岗位。
5. Tasks → **+ New task** 选职责和一个人；或 Events → **+ New event**，在申请活动的审阅卡中确认实际任务人选。默认人合格可用时预选；备份须明确选择；缺职责、资格未知或无人可用时保留未分配。
6. 分给别人的任务为 **Not claimed**，由本人点 **I've got it** 接手。任务详情的 **Responsibility & assignment** 可以明确补关联或重新确认分派；旧任务不会伪造过去的回执。

已有阶段 2 预览可以 **Import this preview**：必须属于当前组织且引用有效，不能覆盖现有非空职责库，也不会导入示例的假想任务回执。`?example=1` 的 12 人示例仍是隔离演练；不要把示例当成当前团队。

职责库顶部可导出全业务备份、显式恢复、暂停或恢复职责匹配。恢复前备份当前数据。**Pause responsibility matching** 保留库、任务与历史；若数据保存或升级备份失败，页面会说明并保留原件。另一个标签页已保存时，本页暂停写入，可以下载本页副本再 reload。

## 这次接通的架构

| 内容 | 结果 |
| --- | --- |
| 唯一业务正本 | `DemoState.matching` 保存职责、关系、步骤要求、规则和不可覆盖的回执；`matchingContext` 保存来源审阅、资格可用情况、导入来源和单任务人工例外。姓名和在任情况读取原 people/roles |
| 真正创建入口 | 活动审阅、Tasks、Ask 任务表单、活动加步骤、首次组织设置及辅助建任务路径使用同一适配器；新模式不再按九类职能猜执行人 |
| 同职责多人 | 候选去重，默认人/唯一合格人预选，备份等待选择，多人无默认则待选；确认只生成一个任务、一位实际执行人 |
| 人工例外 | 明确勾选 **Assign manually for this task** 才可绕过本次职责资格；独立记录缺口，不授予永久职责或资格 |
| 历史保护 | 启用、导入、配置变化不改写已有节点；旧未关联任务改派不从当前模板猜职责；已有任务保留自身工作流身份 |
| 认领和改派 | 认领按钮、底层认领和看板拖动检查资格；改派沿用 ownerVersion 等转移内核，旧签名链接不会因改回原人而复活 |
| 工作流拓展 | 标准和自定义流程按 workflowId + stepId 区分，可共用同一组织职责；[46 步表](MATCHING_STEP_COVERAGE.md) 明确 37 个 draft、9 个 needs_split |
| 持久化 | 外层 22→23 原件备份后升级，保留旧任务；启用后只写业务正本。需确认的操作保存成功后才展示成功；写失败和已发生的跨标签页冲突暂停，不覆盖别页 |

原日期引擎、条件步骤、依赖、预算及现有角色权限保留。为保持原首页入口 550,000 字节门槛，构建单独拆出不依赖 store 的 matching-core 和 Zod validation；没有加依赖或提高门槛。

## Worktree 交付及复核

- 主 Agent：冻结契约 `0755270`，业务接入 `89c9418`，拆包 `8335cc7`，数据/认领保护 `5aee6e6`，跨标签页保护 `f5a0c4b`，表单与有效冲突断言 `26af354`，旧设置失败不清草稿 `62ed759`；最终代码/测试候选 `8b9633d`。
- Workflow Agent：`79a16b6` 首包，`08b788d` 历史工作流身份修复；33 项适配器测试通过，保留提交集成。
- Integration Agent：独立创建/迁移/恢复/浏览器测试包，从真实 reducer 和网页入口验证，最终浏览器包 `3d9c87b`；没有以直接调用初始化 helper 代替实际启用流程。
- 独立 Review：完整审阅运行时 `89c9418`，在 `f5a0c4b` 复查通过。发现的旧节点误改、坏配置崩溃、改派旧链接、认领绕过、复盘身份、模板串用、升级暂停与跨标签页覆盖均已修复。独立双 Provider 实验验证已发生外部写入后旧页被拒绝。后续窄范围复核通过表单/有效操作断言及旧 `/setup` 的保存边界修复；按照建议追加了刷新恢复 IndexedDB 草稿的浏览器断言。

## 验证记录

完整 `npm run check` 已执行：lint、生产构建通过，单元阶段 **1553 通过 / 5 超时（111 文件、1558 项）**，命令因此停止，后续浏览器和文字检查另行运行。5 项均为 5 秒超时；不删除断言、不改超时上限。

其中 engine 51 项与 uiLog 21 项在低并发复跑共 72 项通过；MatchingSetupView 18 项单独复跑全部通过。剩下 calibration 的逐日全量枚举在阶段 2 基线 `dbfc47d` 同命令也为 **39 通过 / 1 超时**，该条约 19.59 秒，当前分支单独运行约 19.54 秒；并未因本轮新匹配而出现功能断言差异。完整门禁不能据此称为全绿。

最终 `npm run build`（含前端类型检查）、`npm run typecheck:netlify` 通过；最大入口 **524.04 kB < 550,000 bytes**。`PW_CHROMIUM=/usr/bin/chromium WORDS_PORT=4357 npm run words` 全页通过；Settings 新增入口后曾超 3 词，已简化说明到 150/150，没有提高上限。Netlify 对代码 `26af354` 的 Deploy Preview 状态为 success；本环境代理对预览域名 CONNECT 返回 403，未把本地浏览器测试当成线上点击验证。GitHub 未返回该提交的 PR workflow run。

完整浏览器检查在生产构建 `26af354` 上运行 **1158 项：1038 通过 / 107 跳过 / 13 失败（22.9 分钟）**。失败逐项处理，没有删断言、改质量上限或把跳过计入通过：

- 7 项菜单/提示/流程动效采样在低并发定点复跑通过。
- 4 项失败来自测试在 Provider 挂载后直接清主存档，触发新跨标签页保护：`rehearsal`、`dx-18-empty`、`dx-25-done` 的清理移至首次文档加载前；Rules 另先等待列表实际呈现。原任务计数、完整参与者路径、空结果恢复断言保留，最终复测均通过。任务计数基线 `dbfc47d` 也单独运行通过，未将此项误记为原有失败。
- 2 项确认页词数超出：压缩新增开关为 **Responsibility matching**，包括重复建组织的替换警告在内，桌面/手机亮暗两种主题原 40 词预算与无障碍检查全部通过。
- 追加旧 `/setup` 保存失败回归：仅阻止主存档写入，校验原 raw、URL、活动名、确认框不变，再刷新、Restore it 并核对原社团名。桌面/手机两项通过；先保存成功才清草稿和离开的修复没有放宽旧业务校验。

修复后的定点检查全部通过；没有再次运行 1158 项全站检查，不将分次复测写为一次全站全绿。完整 `npm run check` 仍因原有 calibration 超时未全绿。全站原始产物保存在 `/tmp/matching-s3-full-results-26af354`，日志分别为 `/tmp/matching-s3-final-check.log`、`/tmp/matching-s3-full-e2e-final.log`、`/tmp/matching-s3-final-rerun.log`、`/tmp/matching-s3-confirm-and-count.log`、`/tmp/matching-s3-count-final.log`。

已完成的针对性验证：

- 最终代码的创建/持久化/恢复、适配器、onboarding 参数保护及 Store 回归共 **6 文件 104 项通过**（`npm test -- src/matching/stage3Creation.test.ts src/matching/stage3Persistence.test.ts src/matching/stage3RecoveryUI.test.tsx src/matching/adapters/adapters.test.tsx src/test/onboardingInvite.test.ts src/test/store.test.tsx --maxWorkers=2`）。跨标签页用例先证实命令本来有效，确保拒绝不是因为命令不合法。
- 适配器 33 项通过；认领、旧签名链接、标准与自定义流程、12 人自定义岗位、旧节点完整对象保留、导出恢复有回归。
- 最终业务桌面 9 + 手机 9，共 18 项浏览器通过；全部 `/api/**` 模拟。实际职责库、建任务和任务详情三屏在桌面/手机共六次 Axe 检查无 critical/serious，无横向溢出。截图 `/tmp/matching-s3-{desktop,mobile}-{live-library,new-task,task-detail}.png`；主 Agent已目视，并据此调整建任务布局。
- 真实 AI 调用 **0 次**；未做真实 Blob/AIR 联通或真实用户数据测试。

## 仍然存在的限制

1. 主业务仍为浏览器本地存储，没有真实组织账号、跨设备同步或服务端原子事务；跨标签页检查能拦截已发生的外部写入，不能承诺同时写入的原子 CAS。
2. 当前主业务只有一个 `org.eventWorkflow` 自定义模板，另有标准模板；自定义流程仍受现有 ASU 必须步骤约束。本轮验证是标准流程与保留政策骨架、增加专业步骤的自定义流程，没有交付任意数量模板管理或自由流程生成器。匹配核心支持不同 workflowId；未来多模板需新增稳定模板 ID 和选择入口，复用同一职责库和解析器。一句话生成流程可产出待审阅步骤，再走相同的职责和分派接口。
3. 本轮没有自动证明职责在语义上完全互斥或覆盖全部政策。46 个标准步骤逐项有未解决标记；所有政策和 general 工作职能的完整提取审计仍未完成。
4. 外部系统账号与专业资格由人确认，未知仍为未知。旧 `Role.holderId` / `Person.roleId` 继续服务原权限与交接，职责多人候选不等于已经重做完整多岗任职系统。
5. Safari/iOS、真实断电恢复、真实 AI 输出质量、私有 Blob 联通未实测；本地 Chromium 模拟结果不代表这些环境已通过。

## 回退和下一步

优先使用页面 **Pause responsibility matching**。如需回退代码，兼容读取基点 **`e370361`** 必须保留：能读取 23 并保留匹配和未知字段，不能直接回到只认识 22 的代码。不要改低版本号、清存档或 Reset demo。详细迁移与恢复见 [兼容说明](MATCHING_COMPATIBILITY.md)。

等待 Juanxi 看预览并提出修改。此交付不批准合并 main，也不自动进入 RACI 等后五项工作。**需要同步本地备份。**
