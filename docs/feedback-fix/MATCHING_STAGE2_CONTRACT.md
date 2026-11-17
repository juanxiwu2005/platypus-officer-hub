# 职责匹配阶段 2 开发契约

2026-11-16（America/Phoenix）。Juanxi 已批准第二阶段；只做可操作的职责设置及章程 AI 增强，不接实际任务创建或迁移旧业务存档。共享类型正本：`src/matching/setupContracts.ts`；阶段 1 契约和解析器继续复用。

## 文件负责人

- 主 Agent：共享类型、`setupWorkspace.ts`、`useMatchingSetup.ts`、`MatchingPage.tsx` 及其测试、App/Team/Settings 入口、样式 import、浏览器用例与交付文档。
- AI Agent：`src/matching/constitutionClient.ts` 及 AI 专属测试、`netlify/lib/matching/`、现有 `netlify/functions/constitution.mts` 的向后兼容分支。禁止修改其他产品 API 或 UI。
- UI Agent：`src/matching/ui/`、`src/styles/matching-setup.css` 及 UI 专属测试。不修改共享类型、控制器、旧页面、App 或样式总入口。

## AI 边界

客户端公共方法 `extractMatchingResponsibilities(request: MatchingExtractionRequest, options?: { signal?: AbortSignal }): Promise<MatchingExtractionResponse>`；另导出 `validateMatchingExtractionResponse(raw: unknown, request: MatchingExtractionRequest): MatchingExtractionResponse`，用于恢复及二次验证。HTTP 继续 POST `/api/setup/constitution`，新增 `part: responsibilities`；原 structure/duties 请求及响应保持兼容。请求和响应保留 requestId/sourceId，必须完全对应。

只根据传入的岗位 ID 关联职责，不产生固定职能枚举；允许没有岗位的 general 职责。AI 不直接更新已有职责或成员，不创建已确认记录，不给日期。原文引用须为本次输入文本中的连续原文；不支持的来源只能是 suggestion，不能称为已核实章程事实。无效条目可逐项拒绝并警告，但不能编造被缺失或截断的内容。支持显式 targetRoleIds 的局部请求；不因进入、返回或刷新页面自动调用 AI。

沿用服务器 ASU AIR 与现有超时预算。原始输入在浏览器保存成功后才请求；服务端依据 AGENTS 的数据基础要求，在调用前保存输入，在解析前使用 `chatJSON.onResponse` 保存原始回复与诊断，失败也保留。使用独立私有 prototype 归档命名空间，不把客户端 actor 或请求 ID 当作正式身份；归档不可用时应在收费调用前失败并允许人工继续，不悄悄跳过记录。没有真实多人账号或跨设备授权声明。真实 AI 测试默认不运行。

## UI 边界

UI 默认导出 `MatchingSetupView(props: MatchingSetupViewProps)`，文件 `src/matching/ui/MatchingSetupView.tsx`。使用普通命名导出也可，但与主 Agent 约定一致。父控制器负责校验、保存、请求和停止；所有操作经 props，不读写业务 store 或浏览器持久化。

最小操作路径：上传 PDF/docx/txt/md 或粘贴虚构章程 → 点击读取（可选岗位重试）→ 查看来源/警告 → 明确采用草稿 → 编辑/确认职责 → 岗位职责泡泡、直接成员包含/排除、成员可用情况与必要资格 → 默认承接人与备份 → 任务步骤关联及解析预览。支持人工创建、编辑、合并、归档职责。每个命令都用阶段 1 已有的 command，不直接改 matching 数组。可在预览里添加/重命名自定义岗位；成员资格仅为演练确认，不自动授予真实权限。

一个主要职责对应一个普通步骤；复合任务标为 needs_split。预览只展示解析器输出，不写实际任务或伪造认领。候选列表解释不合格/未知原因，备份需确认；默认/备份选项须能发现非候选、不可用和资格未知，不把未知当合格。

原人工职责及确认记录始终保留。采用 AI 只新增可编辑草稿及未确认关联，需人进一步确认；重复采用同一建议不生成重复记录。父组件保存失败时不提交新 document，展示错误并保留表单。损坏/新版本预览提供下载原文，不自动覆盖成空白示例。

UI 英文，文档中文；遵守 `docs/DESIGN_TOKENS.md`。新 CSS 只用已有 token 和响应式布局，语义表单、键盘操作、手机无横向溢出。用职责泡泡摘要和按需展开减少表单堆积；不显示 prompt。Stop 仅停止本次等待与采用，不谎称供应商停止计费。

## 隔离与保存

阶段 2 独立设置文档键 `platypus.matching.setup.v1`，只使用现有团队的预览副本；主控制器记录上下文标识，防止切换或重新设置组织后串用。成员与岗位副本仅为此独立原型输入，不成为业务正本。阶段 3 仍按 `MATCHING_COMPATIBILITY.md` 显式导入并统一正本。

预览文档带版本、独立修订、来源草稿、完整请求和结果、采用/拒绝及事件。写入检查预期修订；冲突时保留当前草稿，拒绝覆盖，不冒充跨标签原子事务。刷新后 pending 显示 interrupted，不能重新触发付费请求。采用响应前检查 source、岗位与已有职责快照仍相符；过期响应保留在记录里但不提供直接采用。
