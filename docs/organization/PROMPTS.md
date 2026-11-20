# Current Prompt-Mouse Contract

2026-10-26。The current server is [ programs. mts ](../../netlify/lib/organization/prompts.mts), version `organization-setup-v3.1`. The product page is not available as View Prompt or Review AI instructions. The current four groups of accurate Prompt have developed chat attachments to be delivered to Juanxi; Changes continue to be reviewed during chats and are not displayed on the product page.

| Tasks | Current Input Range | Output and Constraints |
| --- | --- | --- |
| constitution | Constitution Text, Existing Organisation/ Department/ Rule | Department/ rule/function with evidence; (a) Presumption of marking; Manual field retention |
| risk_check | Organizational mission and audited role duties | Up to four major risks, two-three programmes per issue; Do not repeat general form details as an omission |
| member_workflow | Organisation, role duties, related consultation snippets | Streamlining nodes/dependency/regimes; Do not generate coordinates and final dates |
| edit | Current organizational configuration, screens and valid selected entities, recent dialogues; Selected History Version | Clarifications or partial proposals for the white list; Zero applications before approval |

No changes in navigation, Review compiles, layouts and general manual changes to non-call models. The change of duties and processes does not allow silence to overwrite other fields. History is evidence and choosing a particular version does not automatically restore it. All input as data is not granted for additional missions.

[ MOdelPolicy.ts ](../../src/organization/modelPolicy.ts): `air-task-routing-v3`; Gemma `gemma4-31b-it` long structure, Muse `muse-glimmer-30b` short editor, GLM `glm-5-3` user-specific depth check only. Request none does not guarantee that the gateway actually works. Retain the actual level of reasoning and model return name. JSON schema still needs local validation.

History Muse input 765 a single time to 1846 output tokens, first content 16.715 seconds, total 50.396 seconds and shape validation failed. This figure cannot be called Gemma speed evidence, nor can it wait to be identified as a supplier from the beginning. AIR is not consumed during this round of offline inspections and does not automatically regenerate or perform multi-model assessments. Diagnosis and acceptance see [ Implementation Record ](F1_F7_IMPLEMENTATION.md).

## History Note (Surce text retained below, not current UI or route)

> **v3. 1 Update:** Gemma 4 31B Process long constitution/risk/activity structure, Muse Process short dialogue editor, GLM 5.3 user-only active depth check. The results of a live Muse proved that the request did not represent actual compliance by the gateway; Now Prompt clearly gives a precise JSON field, has observed a strict and unambiguous conversion of the alias of the field, and the missing content is still rejected. For more details, see [v3 physical records](V3_CHANGELOG.md)。 The speed of the new edition is yet to be measured and model names cannot be used as a guarantee of speed.

> **v3 Original:** `netlify/lib/organization/prompts.mts`. Prompt is hidden at the service end and not displayed in products; Sending development chats directly to Juanxi for modification. The old document is kept for historical compatibility with `src/organization/prompts.ts`'s v2 stage V.
> New four tasks: Constitution (department/ rule/function), Risk check (significant risk only), Member workflow (curve structure), Edit (local changes to the white list, explicit approval). Coordinates, final machine configuration and unaltered navigation are completed by program and no model is called.
> Muse Glimer 30B + reading none; Deeper review only calls GLM 5.3 low. Original JSON schema + Zod/map/ID/level check; Records output caps and original responses. Allows a small number of field data live smoke, and other returns are simulated. See [ v3 Modify Record ](V3_CHANGELOG.md).

# Organization Setup: Actual Prompt and Audit

**pending review by Juanxi.** Quality clearance is a product process; The completion of the development does not amount to a product approval. Final Review has the "Review AI instructions" portal and clearance alarms, and steps can also be expanded to view accurate system progress. The only original that is officially operational is [ `src/organization/prompts.ts` ](../../src/organization/prompts.ts), not the summary in this note; Version is recorded in each successfully generated server AI record.

## Every step of the way, give the model what it wants to do.

| Phase | Read Organizational Content | Specific output and cause |
| --- | --- | --- |
| Basic → Constitution | Organisation name, text/check values, action directory; No organizational category | Draws the live roll title, duties and word-for-word quotations, extrapolating that missing items must be named Suggested; To avoid filling out and taking speculation as a fact |
| Team → Responsibilities | Editd role, comment, action directory, ticked | Multiple role arrays for all actions; Manual ticking (including deliberately left blank) priority, president only fine-tuned |
| Responsibilities → Member programs | Roll, approved distribution, audit status, system activity reference chain | DAG process node, dependency, responsibility for roll, cause, internal RACI; Keeping two access points and parallel execution |
| Member programs → Board work | role, allocate, have a meeting process, president a single target, has a draft officer | Generate links for specific objectives such as social/tabling; Adjustments require acceptance of the proposal, which may be saved |
| Board work → Review | Current configuration, two review processes, confirmation status | Always Read Core Document + OnDemand Detailed Document with Search Conditions + Undefined Item |

Live requests to send versions separate from JSON data. Organisation name, role name, document, adjustment request and old AI output are data that do not cover system rules. The document is extracted from the browser and only text is sent to this website server, which then sends it to the configured vendor; Original PDF/Word binary not available.

## Why does the core command say that?

- **Evidence**: Constitution Source must be a word-by-word in the actual text; The non-existent quotation will be dropped to Suggested. Model confidence is not a calibrated probability of reliability.
- **Organizational Difference**: Sectors are navigational and cannot harden custom titles into eight styles; The same department VP and Intern are jointly responsible.
- **Manual priority**: The manual matrix allocation is again retained by the program and cannot be trusted simply as prompt. Process AI changes are first shown and accepted before being replaced.
- **RACI**: ticking roll is R, with a maximum of one base A, and the remaining C/I must refer to known roll; If you are not sure, leave it. Backstage results still need to be calibrated for follow-up products and cannot be awarded automatically.
- **Security and Border**: Prohibition of fielding, taxation/legal conclusions, missions and final dates; All final dates continue to be handled by the existing rule engine. Structures fields are filtered by schema, and often date formats in the text are masked.
- **Retroactive**: Save Prompt version, supplier, model, phase, time and input to Hashe; Do not record secret key or original conversation.

## Two-storey configuration

`contextPacket()` Every time a setup calls to read the organizational name/mission, rale and assignment of duties, confirm state, context version and core guidance that has been compiled. Setup phase to read basis for the current task; Generates the process by re-reading the corresponding existing processes and targets, and ultimately both processes and all support configurations when compiled. Detailed guidance is stored with topic/wen/content.

This is access to the Organization Setup range. The old Ask/ Today/ Planner still uses its original operational state with its former prompt and has not automatically migrated to these new configurations; The full business connection should be continued here after the establishment of acceptance. No old unconnected functionality is referred to as read new guidance.

## Checklist for Juanxi

1. Whether defaults are still wrong when constitution has clear role?
2. Is there a different distribution of responsibilities between similar organizations?
3. Does Marking VP + Intern share the right thing?
4. Did AI respect the blanks after a manual cancellation?
5. Maymber processes maintain the order of clearance for the Outlook/President entrances with the Marshalling & Finance?
6. Does Social have any actual different staffing arrangements with Tabling?
7. (b) The source and the authenticity of the item; Is there a wild guess when approval rights are missing?
8. Do you still follow system constraints when uploading files containing malicious instructions?
9. Are always Read short enough to cover core work habits? Are the conditions on Demand clear?

The review will then be followed by a revision of the pampt, an increase in the sample to be evaluated and an upgrade of the version. Automatic tests only demonstrate data constraints and interactions, not prompt quality for all organizations.


## Select model by task: current v2

Juanxi asked for speed priorities and reduced consumption after a very long period of time. Configure original [ `modelPolicy.ts` ](../../src/organization/modelPolicy.ts), current version `air-task-routing-v2`:

| Mode | Model | Usage |
| --- | --- | --- |
| Default Quick Process | `muse-glimmer-30b` | All generic steps, day-to-day dialogue and short structured tasks; `reasoning_effort=none` |
| Active depth check | `glm-5-3` | User deeper resoning, or click Review with fronter model; Backstage. `low` Logically, keep a larger output budget |

No longer defaulting on GLM, nor do you automatically repeat or upgrade the model. AIR gateway/key; User input cannot specify any model ID. Actual supplier/request model/return model, level of reasoning for request and gateway reports, time-consuming, router and Prompt versions are recorded in the file. The GLM return name may be `glm-5-3-mxfp4`, with the original return name retained.

Live records for previous v1: Gemma condition 56s, matrix 15s; GLM minutes process 81s, organisational guidance approximately 56– 91s. They include gateway waiting and generation, and these figures do not make it possible to conclude that delays are either from models or from queues. The Muse default configuration has been changed and **has not started the Live Muse test**, as required by the user; Speed and quality are assessed by Juanxi, and there is no claim that a lift rate has been measured.

Complex workflows request the use of the original JSON schema binding field, followed by checking known roll/actions, manual priority, source and DAG; Nor can stronger models circumvent these constraints. The current version of Prompt is v2. 3, and the final review retains all audit portals and reminders for Prompt.

Based on: [ ASU Chat Complements ](https://docs.rc.asu.edu/ai/api/chat/), which describes the selection of the same gateway with reference_offort; The list of candidate models is from the AIR page in Juanxi. This route is based on engineering trade-offs and is not a certificate of onboarding quality from the general list. The rules for saving AI requests, exports and manual decisions can be found in [ Data Base ](DATA_FOUNDATION.md).
