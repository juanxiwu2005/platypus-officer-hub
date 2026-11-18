# Start 与再次设置共用一条流程

2026-11-17（America/Phoenix），Codex。实现提交：`d616bb1`；检查与部署结果见文末。

## 改了什么

问题原因是两套页面同时存在：Start 使用 founder 八步流程，Settings → Replay setup 和旧地址 `/setup` 仍渲染 `pages/Setup.tsx` 的六步大表单。因此仅恢复 main 代码，仍不能让两个入口一致。

现在旧六步页面已删除，所有社长设置入口最终共用同一套页面、进度条、校验和草稿：

**Name → Constitution → Goals → Team → First event → Reminders → Confirm → Invite。**

| 入口 | 现在进入哪里 |
| --- | --- |
| `/#/start`、Welcome → Start、Demo → Replay walkthrough | 同一组 founder 页面；按原规则开始一次研究记录 |
| Settings → Replay setup | `/#/welcome/setup` → 同一组 founder 页面，不创建研究尝试 |
| 原 `/#/setup`、`/#/welcome/classic` | 兼容跳转到同一个设置入口 |
| Demo → Test onboarding as president | 同一组 founder 页面；维持原来的不记录测试规则 |

Team 直接展示 Role、Person、Reports to，职责由 Edit duties 展开；不再在设置中要求社长逐人填写 Email、Phone、ASU ID。新成员加入时填写自身资料的既有链条保留。章程上传、AI 岗位/职责识别、手动修改、首次活动与提醒问题均保留 Start 当前行为。

隐藏的服务器工作区实验 `/phase1/setup*` 属于另一原型，未改动。提醒阶段 1–3 整合、预算权限、日期引擎、组织交接也未改动。

## 旧草稿怎么继续

有旧 `setup-draft` 时先出现 Continue your setup，可选 Continue saved setup，进入对应的共享页面。有效草稿中的岗位、成员资料、职责、章程、组织工作区链接、已编辑工作流、缓冲和原活动描述一起保留。

替换当前 founder 草稿时，在**同一个 IndexedDB 事务**中先归档原草稿，再写入新草稿；只有事务完成才继续。失败不替换、不留下半份备份，仍在原页供重试。旧六步草稿原件始终保留，完成导入以源时间戳标记，不会每次重放都再次提示。退出期间完成的异步操作不会把人拉回设置。

恢复的岗位和职责不自动重新调用章程 AI；刷新也不触发。旧版本从未保存已经准备好的活动和日期，因此旧第4–6步恢复到 First event，要求重新审阅活动。无法安全读取的旧记录原样保留并提示，用户也可以打开当前设置指南；不清理或猜测坏数据。

现有业务存档仍为23版，未知/已撤回匹配字段保留。导入和预览不修改现有组织，只有 Confirm → Start workspace 才执行既有替换演示工作区操作；拒绝写入时保留确认页与草稿。

## 用户怎么检查

1. 打开 [preview 14 的再次设置入口](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/setup)。如有旧草稿，点 Continue saved setup。
2. 用虚构名字继续，上传章程或选 Skip — use standard roles；填写 Mission，再进入 Team。
3. 与 [Start 入口](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/start) 比较：应该是相同的八步和 Team 布局；电脑、手机都可检查。
4. 从 Settings 点 Replay setup 再检查一次；旧 `/welcome/classic` 地址也应进入同一流程。只验界面可在 Team 点 Exit，不需要点最后的 Start workspace。

已有正式研究尝试的浏览器不要为了比较界面反复使用研究 Start；可用 Demo 的 Test onboarding as president 或另一个测试浏览器。研究 Start 原有新建记录行为保持。

## 新的任务分组方向

[按工作流任务组分配负责人：供讨论方案](EVENT_TASK_GROUP_ASSIGNMENT_PROPOSAL.md) 已结合代码整理：模板定义任务组，每次活动选每组一名具体负责人，任务继承，个别任务允许人工改派。组不固定为标准岗位，不依赖 AI 选人；多工作流、版本快照、后续补任务和旧活动兼容已有设计说明。

**此项只有方案，没有接入新界面或分配引擎。**

## 检查与部署

- 相关单元/组件18文件156项通过，含章程、Team、首次活动、研究记录、职责回退、设置与工作流。
- 最后一轮设置/记录/刷新/旧入口/角色/工作流/体积浏览器检查：131通过、1项仅手机适用而在桌面跳过。另两端逐步无障碍检查2项通过，共133通过、1跳过。前轮移植旧测试时发现的选择器及草稿尚未保存便刷新等问题均在最终原样流程重验；没有放宽产品预算。
- lint、前端类型与生产构建、服务器类型、9页文字预算通过；Settings 147/150。入口542,460/550,000字节。
- 桌面与手机深色截图已人工查看。所有AI接口使用模拟或本地回退；0真实AI、0外部邮件。
- 代码`d616bb105abda4b376cd9ccb98f82b95c2e6f476`已推送原功能分支，GitHub上的Netlify deploy-preview状态为success，目标为既有preview 14。PR #14保持草稿，不新建PR，不合并main；main仍为`b9e7a02`。

本轮未重复全站门禁。保留main First event原文的64/60词旧预算差异及calibration既有超时，仍按前次交付记录处理，不声称全站全绿。新任务组分配仅有方案，待讨论。需要同步本地备份。
