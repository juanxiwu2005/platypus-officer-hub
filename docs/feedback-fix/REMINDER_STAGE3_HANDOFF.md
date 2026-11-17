# 提醒阶段三交付：Details、提醒中心与统一规则邮件

2026-11-16（America/Phoenix）。Juanxi 明确要求“继续阶段3”。从 `feat/reminder-plan-v2@17b3e3c` 继续，保留职责匹配源分支 `5e301d9`；沿用 [PR #15](https://github.com/juanxiwu2005/platypus-officer-hub/pull/15)。当前范围技术实现与独立复核完成，交付待验收；完整门禁的既有超时单列如下。

## 实际结果

| 范围 | 已实现行为 |
| --- | --- |
| Details三段 | 活动→任务→负责人/状态→一个Task due；具体要求/完成标准/重要性、一个适用办理入口和状态操作；提醒对象/当前原因/审核或自动演示方式与折叠历史。学校风险保留，私人规划开始日只供原权限查看 |
| 四种状态 | Done、Working on it、Stuck、Waiting on；延期仍是单独申请。Waiting选择现任对象并填写具体协助说明，重复原样保存不重建请求；外部依赖不猜邮箱。保存失败保留输入，成功以真实写入为准 |
| 单条/批量/自动 | 复用规则邮件、签名任务入口和快照校验。批量、自动先异步准备，再按最新候选逐条核对状态、对象、归属版本、当前模式、日期和额度，完整保存才计数；旧相同记录不代表本次成功 |
| 自动演示 | 组织设置授权，在页面打开时处理当前候选，普通成员操作后也能为明确等待对象生成完整跟进；不切换成领导身份，日志actor为system:reminders。失败停止并可重试，StrictMode重复执行不重复记录 |
| 五区中心 | Needs your OK / This week / Sent / Replies / No reply yet均基于真实计划和持久记录；移除would虚拟发送。实际收件人快照不随改派或删任务消失，同日回复按sequence区分，领导改标题不算成员回复 |
| 新旧兼容 | 新组织默认runtime v2；既有无runtime/v1存档显式启用/升级。发送方式、自定义任务上限与旧成员/领导跟进设置保留；不认识或损坏的runtime不重置、不执行、不回退旧发送 |
| 旧历史 | 不能证明收件人的旧nudge/protocol记录保留且标明未知，不猜成当前负责人。领导明确核对当前分配后才允许未来提醒，旧正文与收件人不回填，核对不算负责人回复 |
| 恢复与冲突 | 临时写入失败可Retry browser saving，再重试未提交的表单/启用/批准；恢复仍核对真实storage，另一标签有新数据时暂停，不覆盖新副本。自动准备与Settings也各有明确重试 |

规则仍是开始日、任务截止日、逾期第3天；开始日使用现有引擎latestStart，不擅自改为固定减3个自然日。每任务/负责人任期/收件人最多既有设置的1–3封，每人滚动7天最多6封，同日同任务同收件人去重；迟开只处理当前最相关候选。Working保留到期检查，Waiting/Stuck暂停普通催办，Done停止候选并保留历史。学校日期算法和正式政策未改。

次数使用新版能证明对象与任期的记录；旧未知收件人历史不猜成某人的次数，必须先明确核对才允许未来提醒。审核后平台发送与自动模式都在候选阶段要求有效邮箱，即使个人偏好WhatsApp；个人发送方式继续允许其他渠道。

## 如何验收

**预览状态更新（2026-11-16，America/Phoenix）：** Juanxi 实际访问此前推测的 PR #15 地址显示 Site not found；尚无有效的在线预览地址。当前对话无可用 Netlify 部署连接，Sites 未启用，云环境无预览端口，不能把推测的网址作为已发布交付。已准备工作区静态包`/workspace/shared/platypus-reminders-preview.zip`（代码`8b591e1`，61文件，ZIP完整性及入口资源检查通过）；可通过 [Netlify Drop](https://app.netlify.com/drop) 新建独立静态预览站点，不含服务器AI功能。恢复部署连接后须实际部署并核验，再登记网址。

在可用预览中进入提醒中心后按下列步骤验收：

1. 已有演示存档先点 **Enable updated reminders**。原先的发送方式和设置保留；Earlier reminder仍显示原记录，只有明确核对当前对象后才允许该任务的未来提醒。
2. 点一行任务名称打开Details，核对活动、任务、唯一Task due、具体要求与意义；滚到Reminder plan，看清正在提醒谁、为何提醒/暂停、需要谁审核。办理按钮的说明区分学校入口和具体申请，不捏造不存在的直达表。
3. `I review, then I send`打开草稿后由人确认；`I review, Platypus sends`可逐条或Approve all；`Send automatically`生成持久的Automatic demo记录。Sent中的Recorded email可查看当时完整文字，刷新不产生第二封。
4. 在任务页或Details选择Working on it、Waiting on或Done；刷新检查状态。Waiting on必须有对象及具体说明，对方入口只能Acknowledge/Update provided，不能完成原任务。尚未认领、财务控制、改派失效和权限限制继续有效。
5. Settings的旧成员Reminder 1/2 days标成Legacy并保留，v2下禁用该两项编辑；领导跟进仍使用原参数。新规则摘要和实际任务上限可见。已有“查看计算依据”开关仍可开关，关闭时说明不进DOM。

仅有本地数据的链接仍限创建它的浏览器；演示中邮件目的地由外部草稿的用户选择，本站不核实投递。自动演示只在应用打开时运行，浏览器关闭期间不承诺定时发送。

## 数据、文件与分工

运行时仍存同一业务键，外层schema v23与导出formatVersion未改。runtime v2新增mailRequiredAfter：升级前的历史可无正文，之后的新delivery必须带完整规则邮件。旧v1读取兼容，旧代码不能把v2当v1执行；快照与签名入口不自动回填。

主Agent负责store/版本、delivery/batch、权限与自动钩子、Settings、兼容和集成；Details/Actions与Centre分别在独立worktree开发，独立Review复核。契约见 [阶段三契约](REMINDER_STAGE3_CONTRACT.md)。界面开发后由两Agent分担新端到端和旧浏览器兼容，不互改文件。

`src/lib/reminderQueue.ts`保留历史FB-8投影导出和旧版测试；当前产品无该模块的导入，Today和Details统一读取`src/reminders/centre.ts`。不将旧辅助函数的would记录视作新版实际发送。

## 验证结果

最终运行时代码 `8b591e14ab48a8a4d39156524821cfd819a2c72a`，独立Review通过，无开放产品阻塞；其后只有交付文档变更。

| 浏览器组（桌面/手机） | 最终结果 |
| --- | --- |
| 新阶段三实际启用/Details/批量/自动Waiting/写失败重试，含Axe与溢出、标题纵向几何和截图检查 | 8通过 |
| 提醒中心和阶段二任务入口兼容 | 27通过、1原有手机限定项在桌面跳过 |
| Tasks/Today/AI等待/研究导出/入口体积 | 46通过；旧标签/显式启用前置4项先失败，改测试预期后双端原操作复验通过 |
| 旧Details/计算依据开关/研究事件/按下动效/forecast悬停 | 35通过、3原有手机鼠标限制项跳过 |
| 原引导/新组织样例/完整演练与键盘 | 16通过 |
| 最后补齐普通成员计算依据与原开关、入口预算 | 6通过，其中4项与上述重叠、2项新增 |
| 最终邮箱校验增量构建后的入口预算 | 2通过，与上述预算项重叠 |

按不重复用例计134通过、4原有限制跳过。以上分批运行且包含定点复测，未运行全站Playwright，不把这些数字写成一次全站门禁。新流程和Details双端截图已经实际查看，临时输入仅虚构社团数据。

完整单元命令`npm test -- --maxWorkers=2`执行126文件、1809项：**1807通过、2个原5秒超时**。单worker定点复跑MatchingSetupView与calibration共58项为57通过/1超时：Matching18项全过，calibration逐日枚举仍超时。这个枚举在匹配交付的阶段二基线也超时，见[MATCHING_STAGE3_HANDOFF](MATCHING_STAGE3_HANDOFF.md)；本轮不改日期引擎、断言或5秒上限，不称完整check全绿。末次普通成员计算依据目标13项、最后邮箱规则/真实Provider/centre/Today目标4文件98项均通过，包含新增回归。

lint、前后端类型、生产构建、新CSS检查与全站字数通过。以40字符`COMMIT_REF=8b591e14ab48a8a4d39156524821cfd819a2c72a`、`BRANCH=feat/reminder-plan-v2`、`CONTEXT=deploy-preview`构建，主入口`/assets/index-DdCS42CM.js`为**539,919 / 550,000字节**；未提高上限。首页92/200、总92/500，Settings150/150；新增说明通过精简重复内容守预算，未隐藏文本过线。TaskDetail由Rail按需加载，首页原交互保留。

独立实测覆盖StrictMode一次记录、签名准备时跨标签新写入、保存失败与重试、旧/坏runtime不自动启用、准备期间日期/要求/邮箱/成员/权限改变均不发过期邮件，及无旧grant残留。额外检查修正了旧.card header样式覆盖、成员计算依据遗漏和平台审核队列缺邮箱提前拦截；均有目标回归或双端检查。

没有真实AI调用、外部邮件投递或Safari/iOS真机验证。本地生产构建与截图不等同线上验证；线上预览的最新排查结果见上方“如何验收”。

## 已知边界

新后台服务、服务器共享数据、跨设备身份、真实定时投递、失败退信和外部联系人邮件路由仍在后续；本轮只实现本地规则演示和完整记录。RACI、新人上手与组织交接没有扩展实施。没有真实AI调用、外部邮件投递、main合并或正式发布。需要同步本地备份。
