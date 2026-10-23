# WP2 验收说明（2026-10-22，ChatGPT）

## 已交付

- 今日页一句话入口：调用 `/api/command`，返回白名单变更单；每项可修改、通过或拒绝。通过之前不改活动或任务，通过后保存在这个浏览器里，重复通过无效。
- 支持新建活动、加节点、指定负责人、设难度档、连依赖、提议提醒、回答规则问题。答案展示实际规则正文及出处；无有效出处就拒答。已有节点修改继续走 store；新活动继续走 `buildEventNodes()`；任务日期继续由 `applySchedule()` / `computeSchedule()` 写入。
- AI 返回的日期、锚点和未知字段全部丢弃，包括保留的 `/api/parse-brief` 接口。活动日期只从人的原句读取明确的年月日，或由人在审核表填写并确认；相对日期需要人补填，不让 AI 猜。
- 风险继续沿用 WP1 的红/黄原因和排序，最多三件。无负责人先指定负责人；完成、有回应、收到后续更新或达到三次上限的任务不再起草提醒。
- `/api/nudge/draft` 返回完整分点草稿；AI 只改写意义句，真实日期和依赖说明由程序重新填入，并再次检查。正文最多 100 个英文单词，How 最多三步，附四个状态入口。
- 默认按个人渠道打开 WhatsApp、短信或 Gmail 草稿。演示不预填真实号码或收件人，不自动发送；打开草稿不算发送，只有人按“I sent this reminder”才记为自行确认发送，不能据此判断送达。
- 活动条显示当前未完成步骤和后两步；按规则引擎的开始日期和依赖排序，避免把活动后的复盘误放在最前。点步骤能打开现有侧栏。
- 保留学期目标；本周之星按“本周更新的已完成节点”关联的现有贡献分数计算，并公开依据、去重、并列展示。WP3 之后可用实际完成时间进一步完善。

## 自动检查

本机已执行 `npm run check`：构建成功、120 个单元测试和 50 个页面测试全部通过。原有的 68 个单元测试和 38 个页面测试均保留。另检查了两个新增服务器函数能够打包。

固定测试命令 **20/20** 生成预期操作，测试文件为 `src/test/commands.test.ts`。这验证的是实际 `/api/command` 共用的确定性命令解析；不是 DeepSeek 或 AIR 的自由表达准确率。服务器测试使用可控的模拟 AI 返回，覆盖日期注入、未授权操作、未知负责人和不合格提醒。

| # | 测试命令 | 预期 |
| --- | --- | --- |
| 1 | Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding | 新活动；30 人；校外餐饮；USG |
| 2 | Create a workshop on December 3, 40 attendees, college funding | 工作坊；40 人；学院经费 |
| 3 | Schedule Spring Speaker Panel on February 11, 60 students, sponsor | 嘉宾活动；60 人；赞助 |
| 4 | Organize a team meeting on 2026-11-05, 12 people | 会议；12 人 |
| 5 | Plan Fundraiser on Nov 20, 80 guests, dues | 筹款活动；会费 |
| 6 | Add task: Review speaker slides for Spring Speaker Night | 对应活动添加任务 |
| 7 | Create a node: Prepare name tags for Networking Night | 对应活动添加任务 |
| 8 | Add step: Check microphones for Networking Night assigned to Jordan | 添加任务；Jordan 负责 |
| 9 | Add task: Clean the supply box | 独立任务；人补填截止日 |
| 10 | Assign Send the October newsletter to Priya | 更换负责人 |
| 11 | Give Reconcile September receipts to Maya | 指定负责人 |
| 12 | Unassign Book the spring weekly meeting room | 清空负责人 |
| 13 | Set Send the October newsletter to heavy | 重档 |
| 14 | Make Reconcile September receipts light | 轻档 |
| 15 | Mark Book the spring weekly meeting room medium | 中档 |
| 16 | Make Send the October newsletter depend on Reconcile September receipts | 连接依赖 |
| 17 | Remind Sam about Send the October newsletter | 只提议提醒 |
| 18 | Nudge Maya about Reconcile September receipts | 只提议提醒 |
| 19 | Can we serve homemade food? | R08 及出处 |
| 20 | What do outside caterers need? | R06 及出处 |

页面检查覆盖电脑和手机：活动审核时编辑名称和日期、刷新保存与重置、改负责人和拒绝、风险条数与原因、渠道和四个状态入口、普通干部权限、AI 关闭或服务器失败后的明确标注，以及非法输出不生效。

## Juanxi 的四步验收

预览：https://deploy-preview-1--platypus-officer-hub.netlify.app/#/ （仍需登录 Netlify）。

1. 点 **Reset demo**。在今日页输入第 1 句，点 **Review changes**。应该先出现变更单，活动数量仍是两个；检查/修改 **Event date**，点 **Apply this change** 后才出现第三场活动。
2. 在 **Needs a nudge** 点第一条的 **Draft reminder**。应该显示 Sam、首选 WhatsApp、五段分点正文及 100 词以内的计数，最后四个状态入口。切换 Text message / Gmail 后，打开按钮也应跟着变化。无需实际发送。
3. 关闭草稿，看活动条的 **Current / Next 1 / Next 2**；Networking Night 的 Current 应为海报。点步骤能看负责人和三个日期。下方有学期目标和本周之星的计分依据。
4. 顶部 **View as** 切 Maya。风险旁不应出现提醒按钮，变更单的批准按钮不可用。最后点 **Reset demo** 恢复。

## 已知边界与 WP3 交接

- 四个状态入口现在能打开对应任务的预览，明确提示尚未改状态；实际认领、完成、等待、求助、带草稿延期留在 WP3，符合工作包划分。
- 提醒时段只给人提示偏好时间和 8:00–22:00 范围。当前只打开草稿，不运行自动发送或后台计时；模拟时钟与沉默协议留在 WP3。
- 本机未调用真实 DeepSeek/AIR，不能把模拟供应商测试当作供应商实测。上线后自由表达走现有 AI 适配器，供应商配置失败时会明确标注本地演示回退；不认识的命令要求重新描述。
- WhatsApp、短信、Gmail 的链接和内容已做自动检查；第三方应用实际打开后的外观和短信兼容性，需要 Juanxi 在自己的设备上验收。没有真实发送或送达测试。
- 浏览器原型的 View as 用于演示权限，并非正式登录；真实身份验证仍在 v1.5。
- `ChangeSet.reviews` 为可选字段；没有改变旧数据的结构版本。WP3 可沿用 `nudges` 里的人工发送确认和 `response`，继续实现停止提醒与沉默升级。状态更新需补测试。
- GitHub 的 v1 是唯一正本。本次本地测试目录 `/private/tmp/platypus-officer-hub-wp2` 是连接器下载的快照，不能把该目录的独立本地历史直接推到远程；下一位请重新克隆 v1 或继续用连接器提交。
