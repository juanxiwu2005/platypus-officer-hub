# 职责匹配阶段 2 交付

2026-11-16（America/Phoenix） · Codex · `claude/fervent-thompson-e2j5u2` · PR #14 预览

## 用户现在可以做什么

从 Team 或 Settings 点击 **Set up responsibilities**，进入独立的职责设置预览 `/#/matching`。页面分四块：来源 → 职责库 → 人员与默认人 → 分派预览。

1. 上传 PDF、Word、文本文件，或粘贴虚构章程；也可以直接手工创建职责。
2. 点击 **Draft responsibilities**，查看 AI 建议的职责定义、交付物、排除范围、关联岗位和引用。原文中能找到的引用标为 **Quote found in source**；其余标为建议。这个标记只证明引用确实存在，不等于解释已获批准。
3. 点击 **Use as draft** 后才加入职责库。可以逐条采用或拒绝同一批建议；采用后仍需编辑、确认职责，并确认岗位关联。
4. 勾选岗位的职责泡泡与成员；给个别人设置直接包含或排除，人工确认可用情况和必要资格，再设置默认人与备份。
5. 把工作流步骤关联到职责，查看建议人和原因。同一职责可跨工作流复用；复合步骤可标记为需要拆分或明确统筹。

职责支持新建、编辑、确认、合并和归档，岗位名称可自定义。平台没有强迫社团选择 Secretary、Marketing 等固定岗位，也没有自动授予外部学校系统的资格。

**本阶段保存的是独立设置预览，尚不改变现有任务或真实团队记录。** 任务创建、旧存档升级以及 46 个标准步骤的逐项适配，仍属于未批准的阶段 3。原有章程岗位结构读取与短职责读取继续保留；新版职责读取作为兼容扩展新增。

## 怎样验收

预览入口：

- [当前团队设置预览](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/matching)
- [12 人机器人社团示例](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/matching?example=1)

使用社长或副社长身份编辑；其他成员可以查看。页面里的 **Try 12-person example** 使用独立空间，保留当前手工配置。示例完全离线，不会因为打开、返回或刷新而调用 AI。

| 在示例里选择 | 应看到的结果 |
| --- | --- |
| Book a meeting room / Reserve a competition space | 两种流程复用场地职责，均预选 Demo Riley |
| Prepare the competition poster | 默认人不可用，建议 Demo Drew，明确需要确认备份 |
| Test the firmware | 多名候选、没有默认人，等待选择 |
| Prepare a flight demonstration | 资格未知，先核实资格 |

人工流程：新建职责 → 填定义与交付物 → Save draft → Confirm responsibility → 在岗位下勾职责 → 确认成员可用情况 → 设置默认人和备份 → 新建步骤并确认职责关联。刷新后配置应保持。导出使用 **Export preview**。

AI 流程请仅使用虚构章程。开发验证使用模拟回复；没有自动执行真实 AIR 调用，因此实际模型质量、耗时和本次预览的 Blob/AIR 联通状况尚未实测。若 AI 或归档服务不可用，界面会明确报错，人工设置仍可继续。

## 保留人工内容与请求的规则

- 新建议只新增草稿，不覆盖人工内容或确认记录。同一条建议只能采用或拒绝一次；一批建议可逐条处理。
- 确认本批刚采用的职责不会让其余建议过期；人工改写或归档它、修改原文或岗位后，剩余相关建议进入 stale，不能继续直接采用。
- 原文和完整请求先在浏览器保存成功，才发起 AI；保存失败不会发起收费请求。无变化时再次点击整份读取会复用当前完成结果，指定岗位或 general 的重试属于显式新请求。
- 刷新、离开页面及编辑输入会阻止过期回复被采用。中断请求不会自动重发；普通成员切回可编辑身份时，也能恢复中断状态。
- **Stop waiting** 停止等待和采用，不承诺供应商已停止执行或计费。全局 AI 开关关闭时，手工设置仍可用。
- 写入失败时保留未保存的预览供导出，并停止后续覆盖；修订冲突提示导出和重新读取。损坏或不支持版本的原文可下载，不用 Reset demo 代替恢复。
- 团队来自进入此独立设置时的副本；预览中的自定义岗位、资格、成员关系不回写旧业务。重新完成组织设置使用新的既有邀请标识隔离上一轮预览；该标识只作本地作用域，不能作为正式权限凭据。

## 技术交接

共享契约见 [MATCHING_STAGE2_CONTRACT.md](MATCHING_STAGE2_CONTRACT.md)。主要入口：

- `src/matching/MatchingPage.tsx`、`setupContext.ts`：旧团队只读适配、上下文隔离、路由入口。
- `setupWorkspace.ts`、`useMatchingSetup.ts`：受验证操作、保存、历史、请求与采用/拒绝控制。
- `src/matching/ui/`：组件只通过控制器操作，不直接写旧 store 或持久化。
- `constitutionClient.ts`：请求/响应二次校验、取消和超时。
- `netlify/functions/constitution.mts`：新增 `part: responsibilities`；原 structure/duties 分支保持兼容。
- `netlify/lib/matching/`：服务器提示词、条目校验、原文引用核对及私有归档。

本地预览文档使用 `platypus.matching.setup.v1:<编码后的上下文>`，包含源草稿、完整请求、已校验回复、采用/拒绝和操作历史。原有业务键、`DemoState` 与外层版本 22 均未修改。浏览器检查后写入不是原子事务，也不是跨设备数据库；阶段 3 必须按 [MATCHING_COMPATIBILITY.md](MATCHING_COMPATIBILITY.md) 统一正本，不能长期双写。

新 AI 请求使用独立私有 Netlify Blob store `platypus-matching-constitution-v1`：调用前保存输入与确切提示词；`chatJSON.onResponse` 在解析前保存原始回复和诊断；结果或失败另行归档。原子 `onlyIfNew` 认领同一个请求 ID，防止重复收费；已完成重放返回缓存，pending/failed 不自动再次调用。归档不可用时在新调用前失败。没有公开的归档列表或读取接口；客户端 ID 与 actor 不是正式账号体系。

首版限制：原文最多 60,000 字符、100 个岗位、500 个已有职责；超过时明确提示，不静默截断。提示词每次建议最多 12 项以控制耗时，验证最多接受 40 项完整条目；部分失败逐项警告，不猜测补全。职责语义重叠、工作流及政策是否全覆盖仍须人工审阅，AI 不宣称已经证明完整覆盖。

## Worktree 与检查记录

阶段 1 基线 `b883107`；阶段 2 契约 `8a5d0f4`。两个开发 Agent 从同一契约启动，保留包提交集成：

| 工作包 | 提交 | 内容 |
| --- | --- | --- |
| AI Agent | `4f31c58` | 提取服务、客户端、私有归档与 25 项模拟检查 |
| UI Agent | `805ef2a` | 职责设置组件、token 样式与 18 项组件检查 |
| 主 Agent | `3380d41`、`ccea818` | 保存控制器、入口、上下文、集成与复核修复 |

独立 Review 对最终运行时代码 `ccea818` 通过。发现的 3 项 P2 均已修复并复查：已采用职责改写后的建议过期、身份切换后的 pending 恢复、相同社团重新设置的隔离。另完成浏览器页面离开时的中断记录。

| 检查 | 结果 |
| --- | --- |
| 新旧相关单元/组件测试 | 15 个文件、276 项通过（阶段 2 新增 71 + 阶段 1 的 91 + 旧链路 114） |
| `npm run lint` | 通过 |
| `npm run build` | 通过，包含前端类型检查 |
| `npm run typecheck:netlify` | 通过 |
| `e2e/matching-stage2.spec.ts` | 桌面 9 + 手机 9，共 18 项通过 |
| 响应式与无障碍 | 两种尺寸无横向溢出，WCAG 2.0/2.1/2.2 A/AA 扫描通过，截图已目视检查 |
| 独立只读 Review | 通过，修复项已复查 |

单元命令：`npm test -- --maxWorkers=2 src/matching src/test/m4.test.ts src/test/orgWorkflow.test.ts src/test/workflowV2.test.ts src/test/m2b.test.ts src/test/onboardingTeam.test.ts src/test/fb-05-create.test.ts`。

浏览器命令：`PW_PORT=4312 PW_STORAGE_PORT=4313 PW_CHROMIUM=/usr/bin/chromium npx playwright test e2e/matching-stage2.spec.ts --project=desktop --project=mobile --workers=2`。所有 API 都拦截为模拟响应；本地生产构建执行测试。

初轮浏览器检查揭示：旧业务读取器首次 reopen 会补 `waitingOnPersonId: null`，因此保留断言从正常 reopen 后的完整业务对象开始比较；没有删除字段断言或修改旧读取器。刷新时浏览器可能先中断 fetch，现已在离开事件记录 interrupted。并行构建/浏览器负载下，一项组件用例曾超时；改用与该用例有关的精简团队夹具、保留原有全部断言，并以两 worker 复跑。没有提高超时或降低检查门槛。

本阶段没有重复全站 Playwright 或完整 `npm run check`。真实 AIR/Blob、Safari/iOS 和正式多人账号未验证，不能把模拟验证称为这些服务已实测。仅更新功能分支与 PR #14 预览，未合并 main。阶段 3 仍待批准。需要同步本地备份。
