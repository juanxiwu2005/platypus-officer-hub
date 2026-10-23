# ASU 规则库 v0（官方层）

规则引擎和 `/api/ask` 只能使用这里的规则。每条带出处；**2026-10-07 打开原文核对过，上线前（WP6）必须逐条重新核实并更新“核实日期”。** 同一事项两处说法不一致时，取更严格的一个，并同时显示两个出处。代码 `src/data/rules.ts` 里有一份同样内容的 `RULES` 数组（v0.1 旧版在 `public/legacy/index.html`）；改规则时两边一起改。规则引擎怎么用这些时限，见 `src/engine/playbooks.ts`（每个步骤挂哪条规则、提前几天）。

| 编号 | 类别 | 规则 | 时限 | 出处 | 核实日期 |
| --- | --- | --- | --- | --- | --- |
| R01 | 场地与活动 | 校内实体活动须在 Event Registry 登记 | 至少 14 天；学生组织手册写 30 天（取 30 天） | [Event Registry 指南](https://eventreg.asu.edu/about-registry/event-guidelines)；[学生组织手册 2025–26](https://eoss.asu.edu/sites/default/files/2025-04/ASU%20Student%20Organization%20-%2025_26%20Handbook.pdf) | 2026-10-07 |
| R02 | 安全与合规 | 学生组织办的活动须有指导老师在场；公开或预计超过 250 人的活动须有校方代表全程在场 | — | [Event Registry 指南](https://eventreg.asu.edu/about-registry/event-guidelines) | 2026-10-07 |
| R03 | 场地与活动 | 学生活动中心场地经 Mazevo 预约，只有前三名干部能提交 | 至少 16 天；户外摆摊至少 3 个工作日；复杂布置至少 2 周 | [Submit a Space Request](https://eoss.asu.edu/student-unions/submit-a-space-request) | 2026-10-07 |
| R04 | 场地与活动 | 场地预约须填上活动登记的 RITM 号 | 至少提前 14 天，否则可能取消并收费 | [Submit a Space Request](https://eoss.asu.edu/student-unions/submit-a-space-request) | 2026-10-07 |
| R05 | 餐饮 | Memorial Union、Student Pavilion 等场馆由 Aramark/Sun Devil Dining 独家供餐 | 至少提前 2 周安排 | [学生组织手册 2025–26](https://eoss.asu.edu/sites/default/files/2025-04/ASU%20Student%20Organization%20-%2025_26%20Handbook.pdf) | 2026-10-07 |
| R06 | 餐饮 | 使用校外餐饮须提交 Food Exception Request 和供应商保险证明 | 提前 14 天 | 同上 | 2026-10-07 |
| R07 | 餐饮 | 现场制作食物须申请临时食品许可（$85） | 至少 7 个工作日 | [Catering and Food FAQ（2023，需复核）](https://eoss.asu.edu/sites/default/files/2023-09/FAQ%20-%20Catering%20and%20Food%20Guidelines%202.pdf) | 2026-10-07 |
| R08 | 餐饮 | 不得提供自制食物 | — | 学生组织手册 2025–26 | 2026-10-07 |
| R09 | 经费 | USG 餐饮类和服务类（租赁、布置、灯光等）申请 | 提前 10 个工作日 | [USG Spending Guidelines](https://www.asuusgt.org/spending-guidelines) | 2026-10-07 |
| R10 | 经费 | USG 嘉宾或表演申请，须附签好的 SAP 协议 | 提前 14 个工作日 | 同上 | 2026-10-07 |
| R11 | 经费 | USG 采购申请须附活动海报、写明公共目的；发票抬头须为 ASU；报销上限 $999，Amazon 可能不予报销；报销支票约 3 周内寄出 | — | 同上 | 2026-10-07 |
| R12 | 经费 | 人均 $25 及以上的餐饮须交 Business Meals Form 和出勤名单 | — | [USG Funding Rules](https://www.asuusgt.org/funding-rules) | 2026-10-07 |
| R13 | 场地与活动 | 期末考试期间不得办活动 | — | 学生组织手册 2025–26 | 2026-10-07 |
| R14 | 安全与合规 | 学生干部最好不要签有法律约束力的合同 | — | 学生组织手册 2025–26 | 2026-10-07 |
| R15 | 安全与合规 | ASU 不能办抽奖（raffle）；参与者不付费、机会均等的门票抽奖可以 | — | 学生组织手册 2025–26 | 2026-10-07 |
| R16 | 换届 | 换届：联系指导老师；新干部完成培训、读手册和章程；更新 Sun Devil Central 与银行账户；每年春季重新注册 | 春季 | 学生组织手册 2025–26 | 2026-10-07 |

六个类别（第 6 节规则页）：场地与活动、餐饮、经费、宣传、安全与合规、换届。“宣传”目前没有官方规则，渠道提前量见 `SEO_PLAYBOOK_REFERENCE.md`。

待办：手册另有 8 月 27 日更新版，要查是否已有 2026–27 版；有疑问可发邮件问 Tempe 学生组织办公室（tempeclubs@asu.edu）——只问规则，不做研究招募。

## ASU 日历（规则引擎用）

规则引擎按 ASU 工作日计算“官方截止日”和“社团截止日”，并让社团的工作避开期末考试周和两个学期之间的假期。数据在 `src/engine/calendar.ts`，**2026-10-22 核对过，每学期开始前要重新核对。**

| 类型 | 日期 | 出处 |
| --- | --- | --- |
| 学校放假（不算工作日） | 2026：11/11 退伍军人节；11/26–27 感恩节；12/24–25 冬假闭校。2027：1/1 元旦；1/18 马丁·路德·金纪念日；5/31 阵亡将士纪念日；7/5 独立日（补休）；9/6 劳动节；11/11；11/25–26；12/24、12/27 | [ASU holiday schedule](https://cfo.asu.edu/holiday-schedule) |
| 期末考试周（R13：不能办活动；社团工作也避开） | 2026 秋：12/7–12/12；2027 春：5/3–5/8 | [Academic Calendar](https://registrar.asu.edu/academic-calendar) |
| 上课期间 | 2026 秋：8/20–12/12；2027 春：1/11–5/8。两个学期之间不排社团工作 | 同上 |
| 不闭校的假期（算工作日，但活动会提示“很多成员不在”） | 秋假 10/10–10/13；春假 3/7–3/14 | 同上 |

注意：v0.1 的假期表把 12/31 和春假当成闭校日，这两处是错的，v1 已改正。


## v1.1 界面短句（2026-10-23）

Rules 页每条只显示一句短句（`src/data/rules.ts` 的 `short`）和时限标签（`timing`），全文、出处和核实日期在悬停卡里。短句只是缩写，规则内容以上面的原文为准；改原文时一起检查短句。
