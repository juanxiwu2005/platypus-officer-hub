# Organization Setup：上线交接

2026-10-26 · Codex · **待 Juanxi 实操验收**。已停止新增真实 AI 测试。

## 在线入口

- [最新 Organization Setup](https://deploy-preview-3--platypus-officer-hub.netlify.app/#/phase1/setup)
- [独立分支站](https://feat-organization-setup-ai--platypus-officer-hub.netlify.app/#/phase1/setup)
- [前一版设置参考](https://deploy-preview-3--platypus-officer-hub.netlify.app/#/phase1/setup-legacy)
- [原网站](https://platypus-officer-hub.netlify.app/) 保留，main 未合并。
- [草稿 PR #3，目标 v1](https://github.com/juanxiwu2005/platypus-officer-hub/pull/3)，分支 feat/organization-setup-ai。前一版 Phase 1 的分支和 PR #2 保留。

旧 localStorage 键和旧页面保留。新域名不自动带入原域名的浏览器数据；原地址仍可参考。没有改研究资料或 IRB 文件。

## 已落实的设置改版

Constitution → Your team → Responsibilities → Member programs → Board work → Review。删除组织分类和流程偏好题；章程提取岗位/职责、直接显示自定义岗位、部门分组的多岗位复选矩阵；后台 RACI。每步 AI 准备下一屏，用户审核调整。

上传有文本的 PDF、Word .docx、TXT/MD，或用虚构示例/粘贴文本。8 MB / PDF 50 页 / 文本 60,000 字符。扫描 PDF 暂无 OCR，旧 .doc 需另存 .docx。**从本版起保存原件与历史**，并提供 Download original、Export records；以前未保存的二进制原件无法倒补。

成员流程包含机会/邀请两种入口、Outreach + Professional Development 首次会面、策划、Marketing→Finance 审核、并行准备、执行、反馈。可拖节点、改依赖/并行、加节点（按钮/右键）、多人负责与 AI 修改提案。拖动位置不等于改变顺序，依赖线或顺序控件才改变逻辑；手机提供竖向节点和编辑。

Exec Board 按 social/tabling 等目标生成专属链路，支持保留草稿；换目标会使旧流程失效，避免拿旧 plan 进入 Review。最后生成两层组织指导、显示 prompt 审核提醒和模型生成记录。

## 数据比 AI 更底层

新设置的操作、原件、修改历史、对话请求、AI 输入输出/错误/采用或拒绝均进入带时间戳的私有工作区档案。访问会话到期不删除历史，当前不自动跨组织共享。详见 [数据基础](DATA_FOUNDATION.md)。这是当前设置的实际实现；旧业务页未全面迁移到新组织数据库，真实账号/多人权限/跨组织分享与能效分析仍需后续建设。

## 当前模型与速度

默认 `muse-glimmer-30b`，关闭额外思考；GLM 5.3 只在用户主动勾选 Use deeper reasoning 或点击 Review with stronger model 时调用。共用现有 AIR key，路由版本 v2。配置与取舍见 [Prompt/模型说明](PROMPTS.md)。

历史实测（更换默认模型之前）：AIR auto/north-mini-code 跑通岗位、矩阵、成员流程、多人负责 AI 修改、Board social 和带两班人员的 tabling。Gemma 章程 56s、矩阵 15s；GLM 指导 56–91s、成员流程 81s，实际模型名 glm-5-3-mxfp4。一次 GLM 流程结构失败后已加入原生 JSON schema + 简短说明约束并成功复测。

这些耗时含网关等待与生成，尚不能区分模型耗时和排队耗时。按 Juanxi 最新要求，**切换 Muse 后未继续请求真实模型作测试**，不声称已测出加速比例；由 Juanxi 实操感受。后台任务解决了托管环境实际约 30 秒的同步请求上限。

## 检查与后续验收

更早的完整检查通过构建、319 单元和 167 桌面/手机页面（13 原有跳过）。最新数据基础只做必要构建及 43 项离线组织/服务器/模型/档案检查，包括原件哈希、不可覆盖、事件时间戳、去重、工作区隔离、访问到期不删档案；**这些检查不调用 AIR、不消耗模型额度**。GitHub CI 独立运行；不再手动重复整套真实 AI 验收。

1. 在线用虚构示例或自己的虚构 PDF/Word，检查角色与矩阵。
2. 修改流程/负责人，试一句话调整；普通模式先看等待时间，必要时才选深度检查。
3. 试 Export records / Download original，确认记录与原件。
4. Review 查看两层指导和全部 prompt；prompt 质量仍需 Juanxi 审核，开发完成不等于已获产品批准。

最近活动区保留，按用户要求留待下一轮修改。
