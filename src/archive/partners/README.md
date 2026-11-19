# Partners 暂时归档

2026-11-19（America/Phoenix） · Codex。用户明确要求暂时隐藏Partners、保留代码；Team移到主导航。归档基线`ac19513`，沿用PR14/preview14。

- `Partners.tsx`原为`src/pages/Partners.tsx`，保留People/Board/Organizations、筛选和新增等完整页面代码；只修正移动后的导入路径，并显式保留Partners标题。
- `dx-26-crm-drag.css`原为`src/styles/dx-26-crm-drag.css`，逐字保留，退出活动样式导入。
- 专属浏览器测试移至仓库`archive/partners/e2e/`，不再列入当前产品的e2e目录；混合测试里的Partners专属空态场景也单独存档。共享CRM数据单元测试继续执行。
- 当前App没有导入归档页面，导航没有Partners，旧`/#/partners`和下级路径安全返回首页；不构建独立Partners页面chunk。Team在主导航直接出现，无活动More项时不显示空More按钮。
- `data/crm.ts`、联系人/组织/联系历史类型、store操作和已有存档原样保留。Handoff仍使用`components/crm/ContactDetail`等共享联系资料组件；这些共享代码及相关基础样式留在原处，避免破坏交接资料。工作流里Partner meeting等真实任务和一般联系问题不属于此独立页面，不删除/改名。schema和存储键不变。

## 以后恢复

重新接入此组件到App的`partners`路由（去掉当前重定向），在`src/routes.ts`恢复Partners页面定义；在`src/styles/index.css`导入归档CSS，再把`archive/partners/e2e/`测试放回e2e目录并调整helpers导入。恢复`scripts/word-count.mjs`中该页原120/120字预算和截图/无障碍页面列表，运行CRM与页面验收。

也可从基线`ac19513`读取原始文件核对，但不要整次回滚，避免覆盖同期工作流、提醒及后续改动。当前仅冻结独立页面，未清理用户数据；不需要数据迁移才能重新启用。
