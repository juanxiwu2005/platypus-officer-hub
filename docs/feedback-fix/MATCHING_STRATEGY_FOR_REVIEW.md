# Job matching programme: for review before the redesign community

2026-11-16（America/Phoenix）。Juanxi requires that new interactions be discussed through reference interfaces or handwriting, after restoring the main onboarding and withdrawing the current overly complex setup of responsibilities.

This document records the design of a version that has just been withdrawn. The original complete saving is in the submission of `5e301d9`, and the current preview restores the original onboarding and task allocation entrance. The new interface is not being developed.

## It's a problem to solve.

There are three things you need to know about finding the right person for a mission: **, what it is, who's in charge of this job, and who it is when many people match. The** rule name cannot answer these questions alone; The same rule called Vice President may do something completely different in a different way.

The original scheme therefore separated "rolle" from "duty": "role" can be named arbitrarily; (b) A description of the actual work; I'm the one who actually executed it. A role can take on multiple duties, and one can be carried over by many.

## Three strategies selected

| Problem | Selected Policy | Explain in Mandarin. |
| --- | --- | --- |
| How to build your own pool of responsibilities | A2: AI Drafted, confirmed | Upload constitution, AI extracts duties and gives source text. The president modify, supplement, merge or confirm; AI, you can create it manually if you can't read it. |
| How mandates relate to responsibilities | B2: Workstream Linking Duty | Describe what duties are required for tasks such as booking a room, and then create an activity to repeat this connection without guessing by the name of the rolle |
| How many people with the same responsibilities choose their executors | C2: Default and backup | Maya is usually in charge. Jordan is the backup; Only one executor is identified for each actual assignment, and backup takes over requires clear confirmation |

## 1. What's the job pool?

The duties can be understood as work-type blisters, such as “site bookings” and “reimbursement files”. They are formed by student organization of its own constitution, workflow and manual supplementation and do not require all student organisation to use fixed rolls like Secretary, Marketing etc.

The original version maintains for each function the following information: name, range of responsibility, delivery, area of non-responsibility, source, confirmation and professional qualifications, if necessary.

For example, “site bookings” are responsible for submitting and obtaining confirmation of space requests; Does not include approved budgets or actual payments. This would reduce the number of responsibilities that claim responsibility for the same matter at the same time.

AI gives the content as a recommendation first. The reference can be found in the upload source text, showing the source text basis; If no basis is found, it is clearly marked as a recommendation. The manual can always be supplemented or modified.

**Still outstanding:** wrote the boundaries of duties, which does not mean that the system has proven that all functions do not overlap and cover the full extent of each other. The original version provided manual merge and review, but did not automatically prove that the duties of the entire student organization covered all workflows and policies.

## 2. How duties relate to people

The original design had two normal paths:

- Role's in charge of certain duties, and this role member is on the list.
- A person is directly responsible for a certain function, which may be complementary to the role relationship.

When the same person passes multiple rolls eligible, only once appears. The required system accounts or professional qualifications are validated and the platform does not pretend to have verified access to the school system.

The one-time manual designation of a task, recorded separately as this decision, does not permanently transform the member into a person with all relevant duties or qualifications.

## 3. How the mission finds its duty

The order of the original programme was: **Workstream Steps — Main responsibilities — eligible members — this person.**

For example:

| Tasks in the workflow | Related responsibilities | Acceptable |
| --- | --- | --- |
| General meeting: reservation | Place reservations | Maya、Jordan |
| Specter event: Reservation of the Reporting Room | Place reservations | Maya、Jordan |
| Speaker event: Preparation of guest posters | Visual design | Sam |

The two streams can share the same responsibilities, and there is no need to build an almost identical set of rolls. Universal jobs can also be associated with duties and need not all be placed in event planning.

For steps that include multiple professional moves, such as “PPTs, decorations and other activity material”, the original version would retain the status of “need to split or clearly integrate”. The fact that one of them could do a PPT does not mean that he can do the whole job.

The original version established a review portal for the existing 46 standard steps, of which 9 was initially marked as composite work. **represents a review list and does not mean that the 46 items have been correctly linked to each of the students, nor do they represent that all policy duties are covered.**

## 4. Choosing when more than one person is in the same position

Take Maya as a default, Jordan as an example of backup:

| Situation | Treatment of original programmes |
| --- | --- |
| Maya qualified and available | Preselection Maya, confirmed upon submission |
| Maya is not available, Jordan is available | I suggest Jordan, wait for a clear choice and not sneak him over. |
| No default, only one qualified candidate. | You can pre-select this member. |
| Many people match, no defaults. | Leave president to choose, not first in the order of the list |
| No qualified candidates, no qualifications or responsibilities | Keep to be assigned, indicate what's missing and don't throw it automatically to president |
| I've identified the person in charge. | Change template or defaulter does not automatically reassign old tasks |

The assignment and my recognition are two things: the creation of a mission for Maya does not mean that Maya has agreed to take over. The original programme retained this step in my own right.

## 5. Why is this interface too heavy?

The interface directly exposes four parts of the bottom configuration: constitution source, function editor, role/ member/ default person, workflow association. Users need to understand these relationships before completing and confirming them on a case-by-case basis in order to see how a task is assigned.

It also displays sources, functional boundaries, deliverables, qualifications, availability, membership exceptions, defaults, backup and composite mission states. Much information should come to light when decisions are needed; This version has turned them into set-ups.

The main issues are:

- The president needs to maintain many configurations before it can obtain the first automatic distribution of benefits.
- There is an excessive number of operations associated with each step of the workflow.
- Normal paths are mixed with abnormal processes, with a lot of text and little master action.
- It's hard for users to answer at first glance: "What has the system done for me? What do I have to decide now? ”

This time, the bottom rule became a direct user process and added to the setting burden. When redesigning, each of the rules should be discussed separately, which information needs to be displayed and which confirmations should be given to users; Users do not need to learn all data relationships.

## 6. The intention and practical limits of future expansion

The idea is that the pool of duties belongs to a regular organization and does not belong to a job stream. Adds a new type of activity in the future, or lets AI propose a new process according to one sentence, that allows you to re-use the same job pool with the memory and then lets the user handle the uncertain parts.

The actual limitation of the prototype is that only a standard template and a self-defined activity template are available for main operations; The custom process is still subject to the existing AAU step. No random number template management or free flow generator was delivered, nor were there any live organizational accounts, cross-equipment synchronization or multiple distributions at the end of the service.

After the current fallback, this new set of responsibilities is no longer connected to the actual task. The preview is done using the original distribution; The responsible person and the record-keeping has been maintained. Subsequent reuse would require a clear reconciliation of the team, tasks and old records at the time and could not be re-assigned automatically after a direct reopening.

## What's next?

Using the main indexing as a baseline, Juanxi will read the logic above and provide a reference interface or handwriting before deciding on the entrance to the new process, its sequencing and the decision that each screen requires only from the user. The required rules could be retained, or the original strategy could be modified; No new functional page is currently available in advance.

Focus of the follow-up discussion: what needs to be seen for the first time; How much should AI do in advance; When the default or backup needs to be asked; Gaps in responsibilities should be addressed centrally when set up or when the actual needs of a mission so warrant.
