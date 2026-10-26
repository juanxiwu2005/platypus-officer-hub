# Organization Setup AI：实现与验收

2026-10-25 · Codex · **线上部署与自动检查已完成；AIR 换供应商正在实测，待 Juanxi 验收。**

## 在线入口与保留版本

- [新 Organization Setup](https://deploy-preview-3--platypus-officer-hub.netlify.app/#/phase1/setup)
- [独立分支站](https://feat-organization-setup-ai--platypus-officer-hub.netlify.app/#/phase1/setup)
- [前一版设置参考](https://deploy-preview-3--platypus-officer-hub.netlify.app/#/phase1/setup-legacy)
- [原网站](https://platypus-officer-hub.netlify.app/) 保留；`main` 不合并。
- [草稿 PR #3，目标 v1](https://github.com/juanxiwu2005/platypus-officer-hub/pull/3)，分支 `feat/organization-setup-ai`。前一版 Phase 1 的 PR #2/分支保留。

旧 localStorage 数据键、旧页面和研究文件未改写。新域名不会自动携带原域名的浏览器数据；回原地址/浏览器仍可参考。新设置使用独立线上存储，不以重置旧数据实现。

## 已实施

Constitution → Your team → Responsibilities → Member programs → Board work → Review。删除组织类别/“How should plans move forward”题；每个转换先让 AI 整理下一屏，社长审核调整。

章程支持有文本的 PDF、Word `.docx`、TXT/Markdown、粘贴文本与一键虚构示例。浏览器解析原文件，只保存提取文本与来源信息；上限 8 MB、50 页 PDF、60,000 字符。扫描 PDF 暂无 OCR，会明确报错；旧二进制 `.doc` 暂不支持，应另存 `.docx`。提供真实 PDF/DOCX/TXT 虚构样本。

岗位从章程提取，附实际引文、来源和模型置信度；缺失信息才建议默认岗位。自定义岗位表单直接可见。职责用部门分组矩阵，多岗位复选框；后台生成 RACI，不要求用户填写 R/A/C/I。

成员流程保留机会/邀请的二选一入口、Outreach + Professional Development 首次会面、计划、Marketing 审核、Finance 总成本审核，再并行安排场地/注册/推广/人员，执行和反馈。流程可拖动位置、连接依赖、设置前后/并行、右键或按钮加节点、修改多人负责。移动位置不等于修改先后，依赖线/顺序控件才改变流程逻辑。悬停展示职责和岗位；手机用竖向节点及点击编辑。

Exec Board 按一句话目标生成 social/tabling 等具体事务链，可保留草稿并继续修改。AI 修改先生成提案，Accept 后替换。Review 展示核心摘要、两层 AI 指导、prompt 审核入口。

## 数据保存与 AI 上下文

Netlify Blobs 是实际服务端文档存储。每次更改经短暂自动保存写入，转换步骤和 AI 调用前强制等待保存；页面显示服务器修订号。HttpOnly 随机 cookie 隔离工作区；修订号+ETag 防止并发覆盖，AI 独占锁防重复请求，保存草稿与已批准快照分开。新修改不会覆盖先前批准快照，直到再次确认。

这是匿名测试工作区，并非跨设备组织账户数据库。cookie/数据七天过期，过期数据在再次读取时删除，未配置定时物理清扫。请用虚构资料；清除 cookie 或换域名会打开不同工作区。旧平台其它业务状态仍用原存储；未宣称全站迁移。

后端使用已有供应商适配器，不把 key 发到浏览器。记录供应商、模型、prompt 版本、时间和输入哈希；未知角色/动作、循环依赖、无效结构和非原文引文有程序校验。生成日期继续过滤，正式日期归规则引擎。无真实 AI 失败时的模拟成功兜底。

[Prompt 正本与审核原因](PROMPTS.md)；最终 Review 明确提醒 Juanxi 审核全部 prompt。新设置的核心/按需配置已存储，旧 Ask/Today/完整 planner 尚未改用新组织模型。

## 验证记录

- 完整 `npm run check`：TypeScript/Vite 构建通过，**309 单元测试通过，165 桌面/手机页面通过，13 原有跳过**。
- 包含 30 项组织契约/服务器验证；PDF/DOCX/TXT 真实解析；多选矩阵、来源、提案接受/丢弃、线上恢复模拟、来源页 axe/触控检查。
- 旧测试保留，前一版设置断言改在 `setup-legacy` 运行，新设置独立新增 24 个页面测试。测试用模型明确标记 Automated test fixture，不作为供应商验收。
- 线上实际保存服务已成功创建工作区并恢复职责矩阵。旧 DeepSeek 配置下角色提取和职责生成成功；成员流程有一次结构校验失败，因此不称整条旧供应商链路通过。
- Juanxi 随后把 key 改为 ASU AIR。Netlify 原只有 key，缺少供应商/模型参数，导致请求仍去 DeepSeek 而 401。已按 [ASU 官方 API](https://docs.rc.asu.edu/ai/api/) / [Chat 文档](https://docs.rc.asu.edu/ai/api/chat/) 补齐供应商，先用 auto 诊断；真实 AIR 全流程结果将在完成后补记。

## 分组设计的依据

参考 [CU Denver 干部职责](https://www.cudenver.edu/student-life/student-organizations/leaders) 和 [University of Dayton 岗位说明](https://1850.udayton.edu/csi/officer-roles/)，将经费/采购、活动策划、活动后勤、传播、对外关系、领导/记录分组。它们是本产品可改的默认导航，不是所有社团必须采用的结构。RACI 参考 [PMI 术语定义](https://www.pmi.org/-/media/pmi/documents/registered/pdf/pmbok-standards/pmi-lexicon-pm-terms.pdf?rev=447328d841c249af985d14177ddd5f95)，后台推断仍需实际组织校准。

## Juanxi 验收

1. 在线点 Use fictional example → Let AI prepare my team，核对岗位。
2. 进入 Responsibilities，试让 VP of Marketing 与 Marketing Intern 同时负责。
3. 检查成员链路，改两个环节为并行，再用一句话要求 AI 修改并接受提案。
4. 输入 Board social 或 tabling 目标，保存草稿；刷新核对保留内容。
5. Review 查看 AI instructions，审核五阶段 prompt 后确认设置。
