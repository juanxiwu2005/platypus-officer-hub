# WP10 · Deploy Preview 8 真实 AI 人工冒烟清单

执行人：Juanxi。状态：**未执行**；本次认证没有自动调用真实付费 AIR。

预览：[Deploy Preview 8](https://deploy-preview-8--platypus-officer-hub.netlify.app)。只使用虚构演示内容；本清单不授权合并 main、修改环境变量、关闭访问保护或打开服务器存储。

## 开始前

- [ ] 在 Netlify 的 Deploy Preview #8 详情确认部署成功，记下部署 commit、时间和部署链接；commit 应与本次认证报告的远端最终 SHA 一致。
- [ ] 如果预览要求登录，使用自己的 Netlify 账号。401/403 或登录页属于访问限制，不能记成 AI 通过；不关闭访问保护。
- [ ] 打开预览的 `/api/health`（不加 `?check=1`）：记录 `configured`、`provider` 和 routing version；应配置 ASU AIR。健康检查只证明配置，不证明模型生成成功。
- [ ] 回到 Today，Reset demo，View as 选 Alex，打开 AI。服务器存储保持关闭；不要为此次 smoke 启用隐藏的 Organization Setup 或 Deeper review。
- [ ] 打开浏览器开发者工具 → Network，保留请求记录。不要复制 Cookie、Authorization、密钥或完整 HAR 到仓库。

## 核心三项（逐项手动发送；不批量、不自动重试）

| 项目 | 在 Ask 输入 / 操作 | 通过条件 | 人工结果 |
| --- | --- | --- | --- |
| 带出处规则回答 | `Can we order food from an outside caterer?` | 显示相关 ASU 来源，来源链接可打开；不编造审批保证或日期。记录实际 `/api/policy-answer`、`/api/ask` 或 `/api/chat` 回执中的 provider/model、来源和状态。 | 未执行 |
| 任务与活动区分 | `Create an executable task: print flyers, owner Alex` | 出现任务表单，可核对标题与负责人；填写后只创建一次，Tasks 可见、刷新保留，可 Undo。截止日来自表单/规则引擎。 | 未执行 |
| 活动创建及 Plan check | `Plan a new event called Spring Mixer` | 出现活动表单。手动选择未来日期并核对 checklist，批准后 Events 中有且只有一个活动，流程按 checklist 生成；活动检查有明确结果/失败提示，不能把 fallback 记成真实 AI 成功。 | 未执行 |

**判定真实生成：** 至少规则回答和活动 Plan check 分别保留一次成功的服务器 AI 回执，标明 ASU AIR 与实际 model。任务意图可由本地确定性路由识别；其表单成功只证明交互正确，不能单独算真实 AIR 生成。`/api/health` 的配置模型也不能当作实际响应模型。若 UI 不显示实际模型，可由 Netlify 函数对应的 `ai_usage` 日志核对 provider/model/ok，勿分享凭据。

## 保护与恢复（先完成核心三项，再按需检查）

- [ ] 切换到普通干部 Maya，确认活动创建权限与 Settings 设置一致；不能绕过审批或查看其他人的私有数据。
- [ ] 开发者工具中临时阻断本站 `/api/chat` 或 `/api/event/review`，再发送一次虚构请求：失败/本地回退应明确可见，已保存内容保留，不自动升级模型、不自动重复收费。随后解除阻断。此项是故障恢复验证，不算真实模型质量通过。
- [ ] AI 关闭时重复一个本地支持的命令，界面不标为真实 AI；Network 中没有新的 AI 生成请求。完成后恢复原开关。
- [ ] 可选额外一次：要求 `Give me tax advice for our club`；应拒绝给出无来源的税务结论。不要为了凑分数反复调用。
- [ ] 如需检查旧版章程/工作流读取或 Handoff 手册，另行选择虚构材料并记录实际来源与模型。保留人工批准；不启用隐藏服务器存储。这些是额外调用，不默认执行。

## 记录和结束

| 记录项 | 填写 |
| --- | --- |
| Arizona 日期时间 / 执行人 / 浏览器与物理设备 | 待填写 |
| Deploy Preview commit / 部署链接 | 待填写 |
| 每项输入、HTTP 状态、实际 provider/model、用时、来源链接 | 待填写 |
| 哪些回执是真实 AI，哪些是本地路由、模拟或回退 | 待填写 |
| 失败、一次请求是否重复、保存/Undo/刷新结果 | 待填写 |
| 核心三项总体结果 | 未执行 |

完成后 Reset demo 清理本次虚构活动和任务，提交不含敏感头信息的结果。任何失败保留原始现象，不以反复重试代替通过。40 题真实评估不在本清单内；未执行前不宣称真实 AI 正确率或真实 AIR 人工验收通过。
