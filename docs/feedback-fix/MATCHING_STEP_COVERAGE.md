# 标准工作流的职责关联覆盖

2026-11-16（America/Phoenix） · 职责匹配阶段 3 · Workflow Adapter Agent

本表逐项核对当前 `EVENT_STEPS` 的 46 种标准步骤，包含条件分支。单场活动只产生适用步骤，不一定有 46 个任务。表内是**步骤的职责边界审阅提示**，不是要求社团创建 46 个固定职责，也不预设 Secretary、Marketing 等岗位。多个步骤或不同工作流可以复用本组织确认过的同一职责。

程序正本为 `src/matching/adapters/steps.ts`。`standardRequirementCommands` 仅对缺少的工作流/步骤组合添加未关联记录，责任 ID 均为 null；不替换已有人工关联。37 项初始 draft、9 项 needs_split，全部须人审阅。复合步骤只有在拆分或明确专业统筹后才应确认为可分派需求。不得因某一个专业匹配就认定整项工作可完成。

| 步骤 ID | 现有标题 | 需要确认的职责边界 | 初始状态 | 现有来源 |
| --- | --- | --- | --- | --- |
| `plan` | Event Plan | Own the documented event purpose, scope and operating plan; coordinate specialist inputs without assuming their execution duties. | `draft` | PLAN-01 |
| `backup` | Back-up Plan | Produce the agreed fallback plan for event disruptions; obtaining each replacement service remains a separate execution task. | `draft` | PLAN-01 |
| `venuechoice` | Candidate Venue | Compare suitable venues and record the selected candidate; booking and school registration are separate work. | `draft` | VENUE-01 |
| `registry` | Event Registry (SDC & Special Event) | Prepare and submit the required event registrations and retain confirmation; split submissions if different access or approvers are required. | `needs_split` | R01 |
| `venue` | Book Room & Layout | Submit the venue and layout reservation and retain confirmation; this does not grant access to a school reservation account. | `draft` | VENUE-01 |
| `moderator` | Moderator Lead Staffing | Confirm who owns moderator selection versus staffing recruitment; separate execution if these require different responsibilities. | `needs_split` | Organization standard |
| `materials` | Event Materials PPT Decorations | Separate slide production, signage, decorations and run-of-show materials, or explicitly name one coordinator before assigning. | `needs_split` | Organization standard |
| `checkin` | Check-in Forms Photo Release Liability | Separate check-in preparation, photo-release handling and liability paperwork when different responsibilities or approvals apply. | `needs_split` | Organization standard |
| `headcount` | Headcount | Record the final attendance count from check-in evidence; submitting attendance to a funding system is separate. | `draft` | Organization standard |
| `thankyou` | Thank You Note | Prepare and send the approved thank-you communication; recipient approval and financial closeout remain separate. | `draft` | Organization standard |
| `feedback` | Feedback | Collect feedback and record the reusable retrospective; archive management is a separate responsibility. | `draft` | CLOSE-03 |
| `postmarketing` | Post Marketing | Publish approved post-event communications; selecting and retaining source photographs belongs to photo management. | `draft` | Organization standard |
| `photoBackup` | Photo Backup | Collect and preserve event photographs in the agreed location; consent decisions and promotional publication are separate. | `draft` | Organization standard |
| `invoice` | Invoice | Collect and validate invoices for approved commitments; payment execution and purchase approval remain separate. | `draft` | CLOSE-02 |
| `attendance` | Attendance Submit | Submit documented attendance through the required reporting process; the attendance count itself is a separate input. | `draft` | CLOSE-02 |
| `spending` | Paid Reimbursed | Record approved payments or reimbursements using the applicable financial route; this responsibility does not grant spending authority. | `draft` | CLOSE-02 |
| `financeRecord` | Finance Record | Reconcile and retain the event's financial evidence; initiating purchases and approving reimbursement are separate. | `draft` | CLOSE-02 |
| `documentation` | Documentation | Archive approved event records, final materials and reusable lessons; their production remains with the corresponding responsibilities. | `draft` | CLOSE-03 |
| `partner` | Partner Meeting | Coordinate the partner meeting and record agreed goals, audience and contributions; specialist delivery is assigned separately. | `draft` | SPEND-02 |
| `speakerPacket` | Speaker SAP Headshot | Separate speaker agreement/SAP handling from headshot and publicity asset collection when permissions or execution differ. | `needs_split` | SPECIAL-04 |
| `travel` | Partner Travel Plan | Coordinate confirmed guest travel arrangements and record logistics; split bookings requiring different accounts or approval routes. | `draft` | TRAVEL-01 |
| `partnerReview` | Partner Speaker Review | Obtain and record the partner's approval of their presentation and materials; creating the materials is separate. | `draft` | Organization standard |
| `parking` | Parking Validation | Confirm the appropriate parking or transport arrangements and access instructions; travel purchasing is separate. | `draft` | VENUE-02 |
| `budget` | Budget | Prepare the event budget and funding-source proposal; budget approval and actual purchases remain distinct controlled work. | `draft` | FUND-02 |
| `foodCompliance` | Food Exception Permit | Obtain the applicable food exception evidence or permit; sourcing quotes and approving spending remain separate. | `draft` | R06 |
| `quotes` | Quote Gather | Collect the quote evidence required for the selected purchasing route; do not treat this as purchasing approval. | `draft` | FUND-04 |
| `budgetRequest` | Budget Request | Submit the documented budget request and supporting evidence; approving the request is a separate controlled action. | `draft` | FUND-02 · FUND-04 |
| `budgetApproval` | Budget Approval | Obtain and record the funding decision; a responsibility tag cannot grant the authority to approve a budget. | `draft` | FUND-02 |
| `purchaseRequest` | Purchase Request | Prepare and submit the approved purchase request using the applicable institutional process; approval and ordering are separate. | `draft` | R09 |
| `purchaseApproval` | Purchase Approval | Obtain and record purchase authorization from the proper authority; this step does not place an order. | `draft` | R09 |
| `advisor` | Advisor Involved | Coordinate the advisor participation or signature required by this event; it does not transfer the advisor's authority. | `draft` | PLAN-03 |
| `access` | Accessibility Check | Coordinate and verify the required accessibility arrangements with the appropriate specialists; split their implementation where needed. | `draft` | VENUE-03 |
| `security` | Security | Identify security requirements and obtain the appropriate security arrangements; medical planning and permits remain separate. | `draft` | RISK-01 |
| `eams` | EAMS Plan | Prepare and route the required event and medical safety plan; approved specialist actions require their own execution responsibility. | `draft` | RISK-01 |
| `permit` | Permit Insurance | Separate permit applications from insurance or certificate acquisition when they use different authorities or providers. | `needs_split` | RISK-01 |
| `alcohol` | Alcohol Permit | Clarify the alcohol permit, venue and insurance responsibilities before assigning this combined approval route. | `needs_split` | SPECIAL-03 |
| `drone` | Drone Approval | Obtain the applicable drone or aviation approval; actual operation requires separately confirmed pilot qualifications. | `draft` | SPECIAL-06 |
| `schoolApproval` | School Admin Approval | Obtain and retain the school's administrative approval; the tag does not confer approval authority. | `draft` | PLAN-03 |
| `marketingNeeds` | Marketing Needs | Specify the communications deliverables, channels and associated costs; content production and distribution are separate. | `draft` | Organization standard |
| `contentCreation` | Content Creation | Separate copywriting, graphic design and other production specialties, or explicitly confirm one coordination responsibility. | `needs_split` | Organization standard |
| `promotionItems` | Promotion Items | Prepare the agreed promotional items or print materials; design approval and purchase authorization remain separate. | `draft` | Organization standard |
| `rsvp` | Open RSVPs | Configure and open the approved registration form or system; promotion and attendance reporting are separate. | `draft` | Organization standard |
| `content` | Content Distribution | Distribute approved campaign assets through the chosen channels; authoring and approving assets are separate. | `draft` | Organization standard |
| `reminder` | Event Reminder | Prepare and send the attendee-facing event reminder; this does not configure the platform's task reminder service. | `draft` | Organization standard |
| `orderPlaced` | Order Placed | Place an already authorized order and record confirmation; budget and purchase authorization remain separate controls. | `draft` | R09 |
| `finalcheck` | Full Check Alert Changes | Review all active routes, coordinate readiness and notify changes; clarify the coordinator and split specialist corrective work. | `needs_split` | CLOSE-01 |

## 自定义工作流与范围

`WorkflowResponsibilityMap` 可分别编辑标准流程 `seo-event` 与现有自定义流程 `club-event`，二者使用工作流 ID + 步骤 ID 定位。自定义步骤通过实际 `StepTemplate` 传入同一初始化器，没有第二套按岗位名猜人的规则；其未审核职责初始 draft。完整自由工作流生成器不在本阶段。

这张表只证明当前 46 个标准定义逐项有审阅记录入口，不代表所有 ASU 政策已提取或全社团职责库已满足语义互斥和完整覆盖。外部系统账号、专业资格和审批授权必须另外人工核实。RACI 与预算控制保持现有规则；职责泡泡不授予预算、采购或校方审批权限。

`buildEventNodes` 新增 ownerMode=unassigned 时只生成无执行人的图；锚点、条件、依赖、预计用时、校准和原有 RACI 元数据不变。实际候选与已确认分派由统一职责解析器及适配层处理，不退回旧职能或列表第一人。
