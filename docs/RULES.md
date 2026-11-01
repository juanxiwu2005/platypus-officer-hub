# ASU 规则库 v0（官方层）

规则引擎和 `/api/ask` 只能使用这里的规则。每条带出处；**2026-10-07 打开原文核对过，上线前（WP6）必须逐条重新核实并更新“核实日期”。** 同一事项两处说法不一致时，取更严格的一个，并同时显示两个出处。代码 `src/data/rules.ts` 里有一份同样内容的 `RULES` 数组（v0.1 旧版在 `public/legacy/index.html`）；改规则时两边一起改。规则引擎怎么用这些时限，见 `src/engine/playbooks.ts`（每个步骤挂哪条规则、提前几天）。

| 编号 | 类别 | 规则 | 时限 | 出处 | 核实日期 |
| --- | --- | --- | --- | --- | --- |
| R01 | 场地与活动 | 校内实体活动，以及用学校经费或学生费用的校外活动，须在 Event Registry 登记 | 至少 14 天；学生组织手册写 30 天（取 30 天） | [Event Registry 指南](https://eventreg.asu.edu/about-registry/event-guidelines)；[学生组织手册 2025–26](https://eoss.asu.edu/sites/default/files/2025-04/ASU%20Student%20Organization%20-%2025_26%20Handbook.pdf) | 2026-10-23 |
| R02 | 安全与合规 | 学生组织办的活动须有指导老师在场；公开或预计超过 250 人的活动须有校方代表全程在场 | — | [Event Registry 指南](https://eventreg.asu.edu/about-registry/event-guidelines) | 2026-10-23 |
| R03 | 场地与活动 | 学生活动中心场地经 Mazevo 预约，每个社团最多 3 名选举产生的干部可以开账号 | 至少 16 天；户外摆摊至少 3 个工作日；复杂布置至少 2 周 | [Submit a Space Request](https://eoss.asu.edu/student-unions/submit-a-space-request) | 2026-10-23 |
| R04 | 场地与活动 | 场地预约须填上活动登记的 RITM 号 | 至少提前 14 天，否则可能取消并收费 | [Submit a Space Request](https://eoss.asu.edu/student-unions/submit-a-space-request) | 2026-10-23 |
| R05 | 餐饮 | Memorial Union、Student Pavilion 等场馆由 Aramark/Sun Devil Dining 独家供餐 | 至少提前 2 周安排 | [学生组织手册 2025–26](https://eoss.asu.edu/sites/default/files/2025-04/ASU%20Student%20Organization%20-%2025_26%20Handbook.pdf) | 2026-10-23 |
| R06 | 餐饮 | 使用校外餐饮须提交 Food Exception Request 和供应商保险证明（proof of insurance） | 提前 14 天 | 同上 | 2026-10-23 |
| R07 | 餐饮 | 现场制作食物须申请临时食品许可（$85） | 至少 7 个工作日 | [Catering and Food FAQ（2023，需复核）](https://eoss.asu.edu/sites/default/files/2023-09/FAQ%20-%20Catering%20and%20Food%20Guidelines%202.pdf) | 2026-10-23 |
| R08 | 餐饮 | 不得提供自制食物 | — | 学生组织手册 2025–26 | 2026-10-23 |
| R09 | 经费 | USG 餐饮类和服务类（租赁、布置、灯光等）申请 | 提前 10 个工作日 | [USG Spending Guidelines](https://www.asuusgt.org/spending-guidelines) | 2026-10-23 |
| R10 | 经费 | USG 嘉宾或表演申请，须附签好的 SAP 协议 | 提前 14 个工作日 | 同上 | 2026-10-23 |
| R11 | 经费 | USG 采购申请须附活动海报、写明公共目的；发票抬头须为 ASU；报销上限 $999（原文紧跟在 Amazon 那句后面，可能只指 Amazon；Platypus 按 $999 提醒），Amazon 可能不予报销；报销支票约 3 周内寄出 | — | 同上 | 2026-10-23 |
| R12 | 经费 | 人均 $25 及以上的餐饮须交 Business Meals Form 和出勤名单 | — | [USG Funding Rules](https://www.asuusgt.org/funding-rules) | 2026-10-23 |
| R13 | 场地与活动 | 期末考试期间不得办活动 | — | 学生组织手册 2025–26 | 2026-10-23 |
| R14 | 安全与合规 | 学生干部最好不要签有法律约束力的合同 | — | 学生组织手册 2025–26 | 2026-10-23 |
| R15 | 安全与合规 | ASU 不能办抽奖（raffle）；参与者不付费、机会均等的门票抽奖可以 | — | 学生组织手册 2025–26 | 2026-10-23 |
| R16 | 换届 | 换届：联系指导老师；新干部完成培训、读手册和章程；告知 Campus Liaisons；更新 Sun Devil Central 与银行账户权限；每年春季重新注册 | 春季 | 学生组织手册 2025–26 | 2026-10-23 |

六个类别（第 6 节规则页）：场地与活动、餐饮、经费、宣传、安全与合规、换届。“宣传”目前没有官方规则，渠道提前量见 `SEO_PLAYBOOK_REFERENCE.md`。

待办：手册另有 8 月 27 日更新版，要查是否已有 2026–27 版；有疑问可发邮件问 Tempe 学生组织办公室（tempeclubs@asu.edu）——只问规则，不做研究招募。

## ASU 日历（规则引擎用）

规则引擎按 ASU 工作日计算“官方截止日”和“社团截止日”，并让社团的工作避开期末考试周和两个学期之间的假期。数据在 `src/engine/calendar.ts`，**2026-10-22 核对过；2027 秋和 2028 春于 2026-10-27 补入。每学期开始前要重新核对。**

| 类型 | 日期 | 出处 |
| --- | --- | --- |
| 学校放假（不算工作日） | 2026：11/11 退伍军人节；11/26–27 感恩节；12/24–25 冬假闭校。2027：1/1 元旦；1/18 马丁·路德·金纪念日；5/31 阵亡将士纪念日；7/5 独立日（补休）；9/6 劳动节；11/11；11/25–26；12/24、12/27。2028（周五 2027-12-31 为元旦补休）：1/17 马丁·路德·金纪念日；5/29 阵亡将士纪念日；7/4 独立日；9/4 劳动节；11/10 退伍军人节（补休）；11/23–24 感恩节；12/25–26 冬假 | [ASU holiday schedule](https://cfo.asu.edu/holiday-schedule) |
| 期末考试周（R13：不能办活动；社团工作也避开） | 2026 秋：12/7–12/12；2027 春：5/3–5/8；**2027 秋：12/6–12/11**；2028 春：5/1–5/6（**预计**） | [Academic Calendar](https://registrar.asu.edu/academic-calendar)（到 2027 秋为正式日期）；2028 春见 [Projected Dates for Future Semesters](https://registrar.asu.edu/projected-dates-future-semesters) |
| 上课期间 | 2026 秋：8/20–12/12；2027 春：1/11–5/8；**2027 秋：8/19–12/11**；2028 春：1/10–5/6（**预计**）。两个学期之间不排社团工作 | 同上 |
| 不闭校的假期（算工作日，但活动会提示“很多成员不在”） | 秋假 2026：10/10–10/13；春假 2027：3/7–3/14；**秋假 2027：10/9–10/12**；春假 2028：3/5–3/12（**预计**） | 同上 |

注意：v0.1 的假期表把 12/31 和春假当成闭校日，这两处是错的，v1 已改正。

**2028 春学期是注册处公布的“预计日期”（页面写明 “projected, not official … subject to change without notice”），不是正式日历。** 正式公布后要核对并改掉 `calendar.ts` 里带 “(projected)” 的三条（学期、期末周、春假）。假日表的 2028 列是学校 CFO 办公室已公布的。

**日历范围与红色报错（A9，2026-10-27）：** 引擎只认识 `2026-08-20`（2026 秋开学）到 `2028-05-06`（2028 春期末周最后一天）。活动日期、或引擎算出的任何官方/社团截止日、最晚开始日落在这个范围之外时，该步骤和该活动会出现红色问题 `calendar_range`：“outside the ASU calendar Platypus knows”。以前范围外的每一天都被当成“学期之间”，倒推日期会悄悄往前跳（2027-10-15 的活动倒推 14 个学生工作日会错到 2027-04-13，正确是 2027-09-27）。续写日历时，在 `calendar.ts` 的 `TERMS / FINALS / BREAKS / HOLIDAYS` 里加新学期，范围会自动延长。


## v1.1 界面短句（2026-10-23）

Rules 页每条只显示一句短句（`src/data/rules.ts` 的 `short`）和时限标签（`timing`），全文、出处和核实日期在悬停卡里。短句只是缩写，规则内容以上面的原文为准；改原文时一起检查短句。

## 2026-10-23 逐条复核（WP6 要求）

16 条全部打开原网页核对过，内容仍然成立，核实日期改为 2026-10-23。改动只是措辞更准确：
- R01：Event Registry 页面写的是“学校场地上的所有实体活动，以及与学校事务相关或用学校经费/学生费用的校外活动”都要登记；该页最少 14 天，手册第 15 页写 30 天，仍取 30 天。
- R03：原文是“最多 3 名选举产生的干部可以申请账号”，不是“前三名”。
- R06：手册第 14 页写的是 “vendor proof of insurance”。
- R07：FAQ 没有日期；申请交给 ASU Food Safety & Health Manager，费用通常由供应商付；时限是 “7 working days”。
- R11：$999 那句紧跟在 Amazon 句后，可能只适用于 Amazon；Platypus 继续按 $999 提醒（偏保守）。
- R16：手册第 12 页还要求联系 Campus Liaisons 让换届生效。


## 新版工作区的组织时间默认（2026-10-26）

8周确定采购项目、7周确定报价、6周提交预算申请是用户指定的社团内部完成目标，不是新增的ASU规则。管理层可在Organization Setup调整，未调整使用默认；周按7自然日保存，实际排程考虑工作日、依赖与用时。官方截止与内部目标分别保存。USG仅明确餐饮/服务挂R09，嘉宾挂R10，College及其它类别不冒用这些公式；用款期限是申请关联的绝对限制，不随活动改期移动。相关实现为src/workspace/schedule.ts与服务端runtime；旧演示规则保留。新学生日历未覆盖时明确无法可靠排程，不伪造未来年份日期。
