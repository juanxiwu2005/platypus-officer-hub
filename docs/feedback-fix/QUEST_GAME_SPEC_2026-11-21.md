# 游戏方案：Plan Your First Event（审核版，2026-11-21，Claude）

依据：`ONBOARDING_QUEST_PLAN_2026-11-21.md`（Juanxi 已同意方向）。本文件给出全部细节，供审核；**还没有写代码**。
- 游戏里玩家看到的文字用英文（界面规则）；说明用中文。
- 所有"原文"都逐句对照 `03_Full_Rules_Archive.txt`，标了记录编号和行号（L）。
- "Handbook"指 2026–27 Student Club and Organization Handbook（ASU-R-004），《》里是它的小节名。

---

## 1. 一页总览

| 项 | 内容 |
| --- | --- |
| 谁玩 | 所有新 exec（含 President）；连任者可走"跳过测试" |
| 时长 | 7 章 32 个决定 + 1 个收尾反思，约 55 分钟，分两天：第 1 天第 1–4 章（约 30 分），第 2 天第 5–7 章（约 25 分） |
| 故事 | Desert Founders Society 在 Tempe 的 Memorial Union 办 **Spring Speaker Night**：付费讲者、约 80 人、提供食物、Instagram 宣传。从活动前 7 周走到活动后 1 周 |
| 角色 | 玩家 = 新 officer。**向导 Pip**（Platypus 吉祥物，等同右栏 Ask）只给提示。同伴：Taylor（Treasurer）、Morgan（Marketing）、Riley（Events）、Sam（Secretary）、Alex（President）、Dr. Lee（Advisor） |
| 每个决定 | 情境 → 选项 → "有多确定" → 结果卡（对：为什么＋原文＋流程图点亮；错：现实后果＋原文＋重选） |
| 红线 | 13 个决定标 🔴：必须最终答对，第 3 天还会再考 |
| 通关后 | 一张完整的活动流程图（日期由规则引擎算）＋ 5 个"换条件重玩" |
| 完成标准 | 全部红线最终答对 ＋ 第 3 天复测通过 ＋（另计）社长通过真实任务 |
| 存的数据 | 每个决定首次对错、确定程度、重试次数、用时；章节完成；复测结果；升级问题 |

---

## 2. 画面（9 个）

| # | 画面 | 内容 | 用到的现有组件 |
| --- | --- | --- | --- |
| S1 | 探险地图 | 7 章一条线（Chain），已完成章节点亮；"Continue"；右上角"Handbook map" | `Chain`、`StatusPill` |
| S2 | 决定卡 | 日期条（"6 weeks before the event"）、同伴头像和一句话、情境 ≤40 词、2–4 个选项、确定程度（Not sure / Pretty sure / Very sure）、"Ask Pip for a hint" | 卡片、右栏 Ask |
| S3 | 答对卡 | 一句为什么（≤25 词）、原文 1–2 句、"Read this in the Handbook →《小节》"、流程图上新点亮的点 | `MetroChart` |
| S4 | 答错卡 | 同伴说现实后果（≤25 词）、原文 1–2 句、"Try again"（选项顺序打乱） | — |
| S5 | 章末 | 本章点亮的流程图片段、本章用到的 Handbook 小节列表 | `MetroChart` |
| S6 | 通关 | 完整 Speaker Night 流程图（每步负责人、最晚日期）、"Replay with a twist"（5 个）、"Save this plan as a template" | `MetroChart` |
| S7 | Handbook 地图 | Handbook 目录 12 节，玩过的点亮；每节链到原文；不计分 | `.tbl` |
| S8 | 第 3 天复测 | 只出首次答错或"Very sure 但错"的决定，换一种问法 | 同 S2–S4 |
| S9 | 社长视图（可关） | 完成人数、最常错的 3 个决定、待回答问题数；**无个人分数** | `.tbl`、`StatusPill` |

- 每张卡最多：标题 1 行 ＋ 情境 ≤40 词 ＋ 选项；不倒计时，不排名。
- 手机上同一流程竖排；键盘可完成全部操作；动效只用现有 token。
- 纸上版：S2–S4 的 32 张卡可导出成 PDF，exec 会议一起玩。

---

## 3. 全部决定

格式：**编号 情境**（英文=游戏原文）→ 选项（✓ 正确）→ 选错时 → 原文依据 → 主做岗位（P President · T Treasurer · E Events · M Marketing · S Secretary · 全员）→ Pip 的提示。

### 第 1 章 Is your club ready?（活动前 7 周）

**1.1 🔴** *Taylor (Treasurer) wants to submit the budget request. Taylor isn't one of the three officers on your registration form. Who submits?*
A. Taylor　B. ✓ A top-three officer submits; Taylor prepares it　C. Dr. Lee, the advisor
错：Taylor："They'll ignore it — only top three officers count."｜原文："Only the top three officers of an organization should submit a budget request … Submissions from advisors or general members will not be considered."（R026 L4521）｜主做：P、T｜提示："Check who is listed on the registration form."

**1.2** *Which training must every officer complete — not only the top three?*
A. ✓ Anti-hazing training　B. USG-T appropriations training　C. None
原文："All student organization officers and advisors will be required to complete anti-hazing training during the registration process."（Handbook《Risk Management / Hazing》L800）；Top 3 另须完成 Student Organization Officer Training（L484）｜主做：全员｜提示："One training applies to officers and advisors alike."

**1.3** *Before anyone requests USG-T funding, who must pass the appropriations training?*
A. Every member　B. ✓ A top-three officer, scoring 100% on each quiz　C. The advisor
原文："a top 3 officer (for student organizations) must receive a 100% on each quiz and affirm that you completed the course in all funding requests you submit."（R037 L5429）｜主做：P、T｜提示："Funding training is tied to the person who submits."

**1.4** *Sam's roster on Sun Devil Central shows 8 members. Can you request USG funding?*
A. Yes　B. ✓ Not until at least 10 members are on the roster　C. Only for small amounts
错：Taylor："The request will be turned away — we're short on members."｜原文："a minimum of 10 members is required for USG funding"（R030 L4955）｜交接：S → T（准确名单）｜主做：S、T

### 第 2 章 Pick a date and a place（活动前 7–5 周）

**2.1 🔴** *Seven weeks out. What do you do first?*
A. Book Memorial Union in Mazevo　B. ✓ Register the event in the Event Registry　C. Post a teaser on Instagram
错 A：Pip 提示"Your room request will ask for a number. Where does it come from?"；错 C：见 2.2｜原文："Events should be registered 30 days prior to the event."（Handbook《Event Registry》L594）｜结果：流程图出现"Event Registry → RITM number → Mazevo"｜主做：E

**2.2 🔴** *The Event Registry is submitted but not approved yet. Morgan wants to post "Save the date" today.*
A. Post it　B. Post it without the date　C. ✓ Wait for approval
错：Riley："If we post before approval, the event can be cancelled."｜原文："Advertising the event prior to approval may result in event cancellation, event postponement, and/or referral for conduct review."（Handbook《Event Approval and Event Promotion》L598）｜交接：E → M（"已批准"）｜主做：M、E

**2.3** *Dr. Lee offers to book the room for you in Mazevo. Who can request the space?*
A. Dr. Lee　B. ✓ One of up to three registered elected officers with a Mazevo account　C. Any member
原文："User Accounts can be requested by up to three (3) elected officers … Organization advisors are not eligible to serve as requestors"（R013 L2143）｜主做：P（指定持账号的人）、E

**2.4** *When must the Memorial Union room request be in?*
A. One week before　B. ✓ At least 16 days before　C. The day before
原文："A minimum of sixteen (16) days is required to reserve all reservable spaces"（R015 L2438）｜主做：E

**2.5 🔴** *The room is booked, but nobody sent the RITM number to Student Unions. The event is 12 days away. What happens?*
A. Nothing — the booking stands　B. ✓ The event is cancelled and fees apply　C. They email a reminder
原文："Failure to register an event and/or communicate a RITM Number … 14 or more days in advance of the event will result in the cancellation of the event and applicable fees will be applied."（R014 L2294）｜复盘问："By when must the RITM reach Student Unions?" ✓ 14+ days｜交接：E → 持 Mazevo 账号的人｜主做：E

**2.6** *Your event has a paid guest speaker. Does Dr. Lee need to attend?*
A. Optional　B. ✓ Required
原文："Advisor attendance is required for events that include guest speakers, performers, vendors, external partners, travel, contracts…"（Handbook《Student Organization Advisor》L453）｜交接：E → Advisor（日期）｜主做：E、P

### 第 3 章 Where does the money come from?（活动前 6–4 周）

**3.1** *Taylor asks what you need to hand over for the budget request. Pick everything Taylor needs.*（多选）
✓ Date, place and expected attendance　✓ A vendor quote or screenshot for each item, with tax and shipping　✗ "A rough total — we'll fix it later"　✗ Just the vendor's name
原文："make sure to include screenshots and quotes for the items you are requesting … Don't forget to add tax or shipping if needed"（R037 L5544）｜交接：E/M → T｜主做：E、M、T

**3.2 🔴** *This event has a paid speaker. When is the budget request due?*
A. 2 weeks before　B. 4 weeks before　C. ✓ 6 weeks before
原文："the budget request is due at least 4 weeks prior … unless the request includes a speaker agreement, then the paperwork is due 6 weeks out from the event."（R037 L5476）；"Events that fail to meet the required submission deadlines are automatically ineligible for funding."（R038 L6580）｜注：来源对讲者期限说法不一，按最严的 6 周教｜主做：T、E

**3.3 🔴** *Supplies were approved at $700. With tax and shipping, the cart is $701.*
A. Submit — $1 is fine　B. ✓ Trim the order to $700 or ask the Appropriations Committee about a change　C. Pay the $1 yourself
错：Taylor："The purchase request has to match the approved amount exactly."｜原文："The total estimated amount MUST match the amount approved from your Budget Request."（R037 L5594）；改预算："Contact the USG-T Appropriations Committee."（R026 L4540）｜主做：T

**3.4 🔴** *You were awarded $75 for flyers and $125 for pens. Pens only cost $50. Can flyers go up to $150?*
A. Yes, the total is the same　B. ✓ No — each line has its own limit
原文："if you were awarded $75 for fliers and $125 for pens, those amounts are the most you will be able to spend. You will not be able to spend $150 on fliers even if you only spent $50 on pens."（R029 L4849）｜主做：T、M

**3.5 🔴** *A sale on table covers ends today, and the budget isn't approved yet. Buy now with your own card and get reimbursed later?*
A. Yes, keep the receipt　B. ✓ No — wait for approval
原文："Purchases made before approval will not be reimbursed."（R025 L4363）；"…automatically denied and not reimbursed."（R038 L6625）｜主做：全员

**3.6** *Approval is slow. Can USG funds pay for expedited shipping so things arrive in time?*
A. Yes　B. ✓ No — expedited fees are a prohibited expense
原文：禁止项"Expedited shipping, production, or processing fees"（R028 L4768）；"ASU cannot pay for these items, even if they have been approved to be funded by USG."（R028 L4792）｜主做：T

**3.7** *The budget was approved this morning. What must go with every purchase request?*
A. Nothing else　B. ✓ The flyer or ad used to promote the event　C. The attendee list
原文："All clubs and organizations MUST attach the flyer/advertisement used to promote an event to all purchase requests."（R029 L4881）；批准后需等 24 小时才能提交（R037 L5585），由 Top 3 提交（R035 L5194）｜交接：M → T（最终宣传稿）｜主做：T、M

### 第 4 章 Speaker, contracts and food（活动前 6–2 周）

**4.1** *The speaker's fee is $6,000. How much can USG-T event funding cover?*
A. All of it　B. ✓ Up to $5,000 per event
原文："Maximum funding for external speakers, panelists, or performers is $5,000 per event."（R038 L6556）｜主做：T、E

**4.2 🔴** *The speaker emails a contract and asks you to sign it today.*
A. Sign it — it's standard　B. Ask Dr. Lee to sign　C. ✓ Don't sign; send it through the university process (Business Office)
错：Pip："If you sign, you may be personally responsible for it."｜原文："Students do not have signature authority. DO NOT SIGN any contracts with vendors."（R037 L5676–77）；"Any agreement signed by a student or student organization may result in personal liability…"（Handbook《Contracts for Vendors, Guest Speakers, or Performers》L602）｜主做：E、T

**4.3** *The speaker's agent asks who to bill.*
A. Your club　B. You personally　C. ✓ Arizona State University
原文："The USG-T business office is unable to remit payment for invoices made out to anyone other than 'Arizona State University.'"（R029 L4891）｜主做：E、T

**4.4 🔴** *Riley wants to order pizza from a local shop for the Memorial Union room.*
A. Fine — order it　B. ✓ Use Sun Devil Hospitality, the venue's exclusive caterer　C. Have it delivered to the hallway
错：Riley："Memorial Union only allows its own caterer."｜原文："ASU Student Unions and Centers have an exclusive catering service with Sun Devil Hospitality. No other off-site catering services or third party food and beverage are permitted."（R015 L2392）；特殊需求可申请 Food Exception Request，须在活动前 14 天（Handbook《Food at Events》L648）｜主做：E

**4.5 🔴** *A member offers to bake cookies for everyone.*
A. Great — thank them　B. ✓ Politely decline: home-made food can't be served
原文："No home-prepared food or drink is allowed at campus events sponsored by student organizations."（Handbook《Food at Events》L633）｜主做：全员

**4.6** *You're using funds for food. What else must you submit?*
A. Nothing　B. ✓ A Business Meals Form and a list of every attendee, signed by an officer and the advisor
原文："Any purchase involving edible products must include a Business Meals Form and a list of every attendee."（R037 L5655）；"must be signed by a club officer and your advisor"（L5718）｜交接：S → T（出席名单）｜主做：T、S

### 第 5 章 Get the word out（批准之后）

**5.1** *The event is approved. Before posting, what does Morgan need from Riley?*
A. Nothing　B. ✓ The approval with the RITM number and the confirmed room
原文：批准后才可宣传（L598，见 2.2）｜交接：E → M｜主做：E、M

**5.2** *Morgan's flyer says "Desert Founders @ ASU Speaker Night" with the ASU sunburst logo. What needs fixing?*（多选）
✓ Use "at ASU®" at the end of the name, not "@"　✓ Remove the sunburst logo　✗ Nothing
原文："The word 'at' must be used and not the @ symbol."（Handbook L390）；"Students and student groups may not use the ASU sunburst logo or the seal."（L396）｜主做：M

**5.3** *Morgan wants to print $600 of posters.*
A. Fine　B. ✓ Printed marketing is capped at $500 per event
原文："Printed marketing materials (e.g., flyers, posters) must not exceed $500 per event."（R038 L6552）｜主做：M、T

**5.4** *You'd like T-shirts with an ASU-style design.*
A. Any print shop　B. ✓ A licensed vendor; mark "Expense Includes Logo" and attach the artwork to the request
原文："Student clubs must use a licensed vendor for all merchandise."（R009 L1530）；"'Expense Includes Logo' must be selected on the RFF … A copy of the artwork … must be attached"（R047 L9742–44）｜交接：M → T｜主做：M、T

### 第 6 章 Event day

**6.1** *It's Friday at 8:50 p.m. The DJ wants to keep the music going until 9:30.*
A. Sure　B. ✓ Amplified sound must end by 9:00 p.m. and stay under 75 dB at 30 feet
原文："Amplification is only permitted between … 5:00pm and 9:00pm Monday through Friday … may not exceed 75 decibels at a distance of 30 feet"（R015 L2376）｜主做：E

**6.2 🔴** *An attendee collapses during the talk. What do you do first?*
A. Text Alex　B. ✓ Call 911 and say you're on an ASU campus　C. Drive them to urgent care
原文："call 911 and tell the dispatchers you are on an ASU Campus and need to be connected to the ASU Police Department"（Handbook《Risk Management》L905）；送医后通知 Dean of Students（L914）｜主做：全员

**6.3** *Morgan wants to sell $2 raffle tickets for a prize.*
A. Fine　B. ✓ Not allowed; a free door prize with an equal chance for everyone is OK
原文："ASU and its departments … are NOT permitted to conduct raffles. Using an actual raffle ticket for a door prize is permitted, as long as attendees are not required to pay…"（Handbook《Raffles》L780）｜主做：M、E

### 第 7 章 Wrap up and hand over（活动后 1 周）

**7.1 🔴** *You paid for supplies and need reimbursement. When must itemized receipts reach the Business Office?*
A. By the end of the semester　B. ✓ Within 10 days
原文："All itemized receipts need to be turned into the Business Office within 10 days"（R037 L5726）｜交接：付款人 → T｜主做：全员、T

**7.2** *$150 of your budget is left at the end of the semester. Keep it for next semester?*
A. Yes　B. ✓ No — unused funds don't roll over; submit a new request next semester
原文："If funding was not used in a previous semester, it cannot be rolled over into the next semester."（R037 L5730）｜主做：T、P

**7.3** *Taylor hasn't sent the required paperwork after approval. What can happen?*
A. Nothing　B. ✓ The approval can be taken back
原文："the USG-T Business Office shall be required to rescind and deny the previously approved request."（R038 L6630）｜主做：T

**7.4 收尾反思（不计分）** *Write three short lines for the next officer: one thing still open, one thing that went wrong, one thing that worked.* → 存入该岗位的交接档案（Lessons），下一任交接时可见。

**红线一览（13）：** 1.1、2.1、2.2、2.5、3.2、3.3、3.4、3.5、4.2、4.4、4.5、6.2、7.1。

---

## 4. 五个"换条件重玩"

每个 6–8 个决定、约 8 分钟，从主线复用卡片，只改条件。

| 重玩 | 改了什么 | 新的关键决定 | 原文 |
| --- | --- | --- | --- |
| R1 期末那周 | 日期落在最后一周课到期末考试 | 学习小组类活动可以办，但**不能拿 USG-T 资金** | Handbook《Events During Finals》L625；R025 L4361 |
| R2 摆摊加赞助商 | tabling 时外部赞助商来主动互动 | 变成"活动"，要走活动审批和 advisor 在场；找供应商前先联系 Student Organizations Team | Handbook L590、L586 |
| R3 电影之夜 | 放映一部电影 | 需要购买公开放映权 | Handbook L606 |
| R4 公开、300 人 | 对公众开放、预计 300 人 | 全程需大学代表和 faculty advisor 在场 | R011 L1760 |
| R5 出城参访 | 坐车去外地 | 不用 12/15 座大巴；私家车司机自负全部责任 | Handbook L707、L695 |

第 2 天：先玩**和自己岗位最相关**的一个（T→R1，M→R2/R3，E→R4，P→R5）。

---

## 5. 规则和计分

- **首次作答**记一次对/错；错了必须重选直到对（选项打乱）。
- **确定程度**：选 Very sure 但答错 → 标"盲点"，第 3 天必考。
- **红线**：最终全部答对才算通关。
- **第 3 天复测**：只出首次答错和盲点题，换问法；答对才算完成。
- **之后**：第一次在真实 Plan 里订场、提预算、做宣传时，弹出相关 3 题（约 1 分钟）；2–4 周后再出一次 5 题。
- **跳过测试**（连任或换岗）：13 道红线题 + 本岗位 5 题，一次全对即视为通关，可直接玩"换条件重玩"。
- **没有积分、徽章、排行榜**；只有地图点亮和"你现在能处理 X"。

## 6. 向导 Pip（AI）

- 游戏里：每个决定有 1 条写好的提示（见第 3 节）。玩家问别的问题时，Pip 只给**提示和原文位置**，不说答案。
- 回答任何政策问题都**带原文段落和来源**；找不到原文就说"I'm not sure — I've sent this to your president."（进入升级队列）。
- **不生成日期**；流程图日期全部由规则引擎计算。
- 游戏外（真实办事）同一个 Ask 直接给带原文的答案。

## 7. 存的数据（Juanxi 已同意）

| 记录 | 字段 | 谁看得到 |
| --- | --- | --- |
| 决定作答 | 决定编号、首次对错、确定程度、重试次数、用时、日期 | 本人；无个人的汇总 |
| 章节／重玩 | 完成时间、是否跳过测试 | 本人；完成人数 |
| 复测 | 题目、结果 | 本人 |
| 升级问题 | 问题、Pip 的回答与引用、未解决原因、社长回答、是否转为 FAQ | 本人、社长 |
| 收尾反思 | 3 行文字 | 本人、下一任、社长 |

- 不存和 Pip 的完整对话（只存升级的）；成员个人信息不发给 AI。
- 新字段写进 `docs/PHASE3_DATA_DICTIONARY.md` 和导出；结构只加可选字段。

## 8. 请 Juanxi 审核的问题

1. **故事和角色名**：Speaker Night、向导 Pip、同伴 Taylor/Morgan/Riley/Sam/Alex/Dr. Lee —— 可以吗？
2. **红线 13 个**（上一版说"约 12 条"）：这 13 个够不够、有没有要加或删的？
3. **3.2 讲者 6 周**：来源有 14 个工作日 / 2 周 / 6 周三种说法，按最严 6 周教，同意吗？
4. **7.1 之外的报销上限**：来源有 $999 / $999.99 每天 / 每笔 / 满 $999.99 自动拒四种写法，所以**没有放进主线**，只在 Ask 里带冲突提示回答 —— 同意吗？
5. **社长视图 S9** 默认关闭还是打开？
6. **入口**：新成员首次登录 onboarding、Handoff 页、Help 页 —— 放哪几处？
7. **"Save this plan as a template"**：通关的流程图要不要能直接存成社团的第一个活动模板？

审核通过后，按流程先出静态效果图（S1、S2、S3、S4、S6、S9 各一张），再写代码。
