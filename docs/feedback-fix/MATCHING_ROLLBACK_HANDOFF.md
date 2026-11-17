# Onboarding 与职责匹配回退交接

2026-11-16（America/Phoenix） · Codex · 用户要求先回到 main 的 onboarding，阅读现有方案后再根据参考或手绘讨论新界面。

## 本轮结果

- 目标仍为 `claude/fervent-thompson-e2j5u2`、草稿 PR #14；`main@b9e7a02` 没有修改或合并。
- 代码回退提交 `4abc510`，原职责匹配完整实现保存在祖先提交 `5e301d9`。使用追加提交回退，没有重写分支历史。
- `src/onboarding/` 恢复 main 的 Name → Constitution → Goals → Team → First event → Reminders → Confirm → Invite；同 main 相比只有 Confirm 的保存边界不同：保存成功后才记完成、清草稿和离开。文案、布局、流程及组织图显示按 main 恢复，移除 FB-2/3 的 onboarding 样式覆盖。
- 章程上传、AI 岗位/职责文本识别和人工编辑保留 main 原行为。新版独立职责设置、资格/可用情况配置、默认人/备份界面及真实任务匹配适配已撤回；任务表单恢复原负责人选择方式。
- `/#/matching` 的旧地址跳转 Settings；Team/Settings 无职责设置入口；任务详情无新职责配置区，已启用过的旧标记也不能再让新建任务进入撤下的匹配链路。
- 提醒中心、FB-6 日期校准、新建活动/任务入口及其他无关功能保留。没有真实 AI 调用，没有做新界面或开始 RACI 等后续工作。

用户阅读的方案见 [职责匹配方案说明](MATCHING_STRATEGY_FOR_REVIEW.md)。下一步等待用户审阅及参考界面或手绘，再确认交互方案后实施。

## 存档保护

界面回退没有回写旧版本号：外层仍为 **23**，读取 22 时先保存原件，备份失败暂停写入。23 不重新建图；保留已有任务、负责人、状态、匹配记录和未知子字段。

`matching`、`matchingContext`、任务的 `matching`、工作区身份和旧模式标记保留为不参与运行的归档字段；新建/认领任务使用原逻辑，不再解析旧职责资格或追加旧匹配回执。完整业务导出保留这些字段。阶段 2 的独立本地草稿键及已写入的私有服务器档案没有被删除，回退后没有原设置编辑入口。

明确确认创建新社团或恢复其他业务存档时，Provider 先备份当前含匹配数据的完整快照；备份或主存档写入失败，不清草稿、不报成功、不离开。新社团不会继承旧社团的匹配身份。跨标签页覆盖保护保留。

后续若取回原匹配方案，先显式核对团队、任务与历史回执；回退期间的普通业务操作不维护旧匹配图，不能直接把旧记录当成当前已确认配置自动启用。

## 检查与证据

| 检查 | 结果 |
| --- | --- |
| 与 main 对比 | onboarding 全目录及 OrgChart 仅 Confirm 保存逻辑 2 增/2 删；源页面、文案、步骤和样式恢复 main |
| 相关单元/组件 | 10 文件 **117 项通过**，含 8 项专门的 23 存档、未知字段导出恢复、旧模式不拦任务、备份失败和跨标签页保护 |
| 浏览器首组 | 120 项，114 通过/6 失败；6 项为新测试遗漏 main 必填 Mission，以及恢复旧测试后仍期望首页标题 Today。补全真实输入、保留原断言并对应保留的 Reminders 首页后，6 项复测通过 |
| 浏览器补充组 | 132 项，126 通过/2 跳过/4 失败；其中规则工作流 fixture 未去掉保留的 FB-6 timing，恢复原 FB-6 夹具后两端 2 项复测通过；余下 2 项文字预算见下方 |
| 回退核心浏览器场景 | 桌面/手机 **6 项通过**：main 独立章程/目标/团队步骤可达，旧职责 URL/入口撤下，旧标记不改变负责人选择，历史任务可认领且归档内容刷新后保留 |
| UI | main 的团队页已目视桌面/手机截图；原有 onboarding 无障碍和溢出检查已随相关页面回归 |
| 静态检查 | lint、生产 build（含前端类型）、Netlify 类型通过；最大入口约 533.84 kB，低于现有 550,000 bytes 上限 |
| 全局文字预算 | `PW_CHROMIUM=/usr/bin/chromium WORDS_PORT=4377 npm run words` 全部 9 页通过 |

**保留的检查差异：** 用户要求恢复 main 原页面与文案，同时保留当前分支的日期校准；Spring dinner 示例在恢复的 First event 页显示 **64 词**，超过 main 原测试的 60 词限制，桌面/手机两项仍失败。没有提高上限、删除断言或为测试重做用户要求恢复的界面。这一处文字预算差异留在下一轮界面讨论中，不能称本轮所有检查全绿。

main 原测试的“标准流程 buffer 永不改变任何日期”也与保留的 FB-6 规则不符，单元测试沿用已有 FB-6 校验：只能使期限提前、不能推迟，移动须经 ASU 截止日约束。没有改变日期算法。

本轮未重复全站 `npm run check` 或 1158 项全站浏览器。未实测真实 AIR、Safari/iOS、跨设备或真实多人服务。

日志：`/tmp/matching-rollback-unit.log`、`/tmp/matching-rollback-browser.log`、`/tmp/matching-rollback-followup.log`、`/tmp/matching-rollback-buffer-final.log`、`/tmp/matching-rollback-build.log`、`/tmp/matching-rollback-lint.log`、`/tmp/matching-rollback-words.log`。截图 `/tmp/matching-rollback-{desktop,mobile}-team.png`。

## 验收入口

<https://deploy-preview-14--platypus-officer-hub.netlify.app/#/welcome/test/president>：查看 main 版 onboarding；该 Test 入口沿用原测试模式，不启动研究会话。只有明确按 Start workspace 才按原规则创建测试社团。

<https://deploy-preview-14--platypus-officer-hub.netlify.app/#/matching>：应转到 Settings，不能继续进入已撤下的职责设置。

等待用户阅读方案与提供参考，不自动恢复原三阶段实现，不提前设计或开发下一版。**需要同步本地备份。**
