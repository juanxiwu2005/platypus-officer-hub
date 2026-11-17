# 提醒阶段1–3整合至 preview 14

2026-11-16（America/Phoenix） · Codex · 用户明确要求“不需要新增pull request，把代码整合到preview14里面就可以”。

## 交付范围

沿用 [PR #14](https://github.com/juanxiwu2005/platypus-officer-hub/pull/14) 与分支 `claude/fervent-thompson-e2j5u2`，从其最新回退结果 `57c7e55` 开始；将提醒开发分支 `feat/reminder-plan-v2@9f100b3` 以保留历史的合并提交 `0555fc4` 整合进来。运行时代码最终为 `6bb3e24`，其后只补交付文档；不新开 PR、不改写分支历史、不合并或发布 main。

保留规则生成的简短邮件、一个 Task due、唯一独立任务入口、四种进展状态、Waiting on 独立收件人与权限、Details 三段、提醒中心单条/批量/自动演示、新组织默认与旧存档显式启用，以及保存失败重试和历史记录保护。提醒规则及真实后台边界沿用[阶段三交付](REMINDER_STAGE3_HANDOFF.md)。

本次整合服从 preview 14 的最新撤回决定：`src/onboarding/`、App 路由、原任务创建页和 Team 相比 `57c7e55` 无变更；独立职责匹配模块不恢复。`matching` / `matchingContext` / 节点旧匹配字段保留为不解释的归档，移除新提醒页面对已撤下匹配模块的导入和判断。任务仍须先认领才能更新进度，改派仍使旧提醒链接失效；新增回归确认旧归档不会阻止认领，也不会被提醒更新改写。

仅为保持既有首页入口预算，将无 store/UI 依赖的提醒引擎与运行时校验独立为可缓存的 `reminder-rules` 模块。首页正常预加载，未隐藏功能、延后判断或提高门槛。

## 检查

- 相关单元/组件：31文件 **381项通过**，包括规则邮件、独立入口、等待对象、Provider、保存恢复、Details、设置、原 onboarding、业务工作流及职责撤回；新增归档任务的提醒入口认领/改派失效回归。
- lint、前后端类型、生产构建、新提醒CSS检查通过。9页文字预算通过，首页92/200（总92/500）、Settings147/150。
- 最终构建以 `COMMIT_REF=6bb3e2476c317069853d2db6a7486fa669358687`、实际 PR #14 分支及 `deploy-preview` 构建元数据生成。入口 `/assets/index-nmMIPOpH.js` 为 **542,788 / 550,000字节**；原打包首次551,793的超限已修正，没有调高预算。
- 最终打包版：桌面/手机关键16项全部通过，包括入口体积、首页初始请求、延迟路由、PDF按需加载、Details三段与无障碍/溢出、批量完整邮件、Waiting独立跟进和写失败保留输入。桌面/手机Details截图已实际查看。
- 首轮桌面/手机98项为95通过、1原设备限定项跳过、2入口超限失败；通过上述缓存拆分修复超限后，最终打包版关键16项全部通过（包含原失败的桌面/手机入口用例）。按不重复用例计 **97通过、1原有限制跳过**，分批验证，不称一次完整全站门禁。包括原main版onboarding确认/邀请及发送方式、职责撤回和旧归档认领、独立任务页刷新/四状态/改派撤权、三发送演示模式、批量、历史与回复、计算依据开关和无障碍。

未重复全站完整门禁、真实AI或邮件投递。职责回退交付中已记录的 First event 原文64词/60词预算差异没有修改；本轮没有运行该项并假称通过。此前 calibration 原5秒超时同样不因本轮局部检查视作解决。

## 验收与部署

沿用 [preview 14 提醒中心](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/)。已有存档先点 **Enable updated reminders**；从任务行打开 Details 核对一个截止日、具体要求与提醒对象。审核草稿后查看 Recorded email，通过唯一 Open task 链接检查 Working on it、Waiting on、Stuck 和 Done。原 onboarding 可从 `/#/welcome/test/president` 查看；`/#/matching` 应继续转到 Settings。

已从 GitHub 的 Netlify 状态和机器人记录确认准备提交 `d47fb5f` 自动部署成功；整合推送沿用相同连接，以 PR #14 的 `netlify/platypus-officer-hub/deploy-preview` 检查对应分支最终提交为核验依据，再向用户交付预览地址。推测的 preview 15 地址不再使用，也不要求用户另建站点。无可用的 Netlify 直接部署连接，不影响既有 PR #14 的 Git 自动部署。

本轮日志位于 `/tmp/preview14-reminders-{unit,lint-types,words,css,browser,final-browser,candidate-build}.log`。需要同步本地备份。
