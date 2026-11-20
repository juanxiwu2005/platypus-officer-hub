# Organization Setup v3 · 2026-10-26

Juanxi's current requirements recorded, superseding old six-step matrix plan. main/old site/setup-legacy/archives retained.

## Interaction/data

Five chapters: Constitution → Team → Responsibilities → Activity workflow → Review. Team checks departments then edits org chart, with department colors/role descriptions/reporting/dragging/top-bar role creation. Responsibilities editable by department/role, final Check; major risks choose solutions question by question, custom guidance, batch apply after final review; explicit skip. Right-side AI knows current screen/selection/org config throughout; preview before approval.

Event chart edits titles/multiple owners inside nodes, + steps, curved add/delete/reconnect, cycles rejected. Department colors across team/duties/chart. Board work has no fixed upfront flow; currently saves only later request-specific generation mode and social/tabling template names, no complete board-planner claim.

Review shows actual configuration. Server validates/compiles JSON on confirmation, saving alwaysRead/onDemand layers, internal responsibility routing/source pointers/version/time; Python reads JSON directly. Arbitrary model-written Python is never executable configuration.

Unchanged Back/Forward makes no AI request. Stable role IDs/manualFields protect manual duties; constitution reread merges by ID/title without deleting downstream data. Role deletion confirms, cleans only related references, marks affected flow nodes for review. Task-specific AI context reduced, cache isolated by content/prompt/mode/private workspace. History retrieval index keeps latest 20 substantive config versions, AI reads latest 6 only on requested history/restore; full append-only archive never deleted for this limit.

## JSON errors/speed

Previously adapter discarded finish_reason and archived raw reply only after successful parse, preventing distinction among truncation/empty output/format contamination. Now save reply/finish reason/input-output counts/first-token-total timing before parse. Supports JSON fences, commentary around one complete object, closed think tags; rejects truncation/ambiguous multiple objects/incomplete streams. No model auto-completion/unreviewed overwrites. AIR native schema, at most one JSON-object fallback on explicit rejection.

One real fictional constitution extraction before redesign on 2026-10-26 succeeded, Muse about 65s; user's JSON error not reproduced, old archive lacks granular metrics, cannot conclude queueing. v3 streams metrics; first-token wait includes network/prefill/possible queueing, cannot isolate cause. Removed duplicate context/coordinates/long RACI-Review document generation; Review compile/unchanged navigation zero AI. Few post-release smoke results appended HANDOFF/PROGRESS.

## Boundaries

New storage covers Organization Setup only. Real identity/cross-device org accounts/cross-org sharing/efficiency analytics/formal Handoff not implemented. Anonymous private workspace access 7 days, archives not automatically removed; fictional test materials only. Models may still suggest incorrectly; valid format does not mean correct content.

## Real smoke findings/fixes (v3.1)

Isolated fictional constitution at 79e352f: Muse input 765/output 1846 tokens; headers 3.872s, first content 16.715s, total 50.396s, finish=stop. Requested reasoning none, gateway served low. Endpoint accepted json_schema but replied with organization wrapper/role.name/department_id/duties/quotes, showing requested schema is not guaranteed provider compliance. Validation blocked result; config unchanged.

v3.1 system prompt adds exact JSON examples/no wrapper-alias. Deterministically translates observed unambiguous constitution wrappers/field aliases, raw result still archived; missing duties never guessed, still rejected. Independent Schema/Zod/reference/cycle checks remain. Added latest_ai diagnostic read, avoiding full archive export for diagnosis.

Routing v3: Gemma 4 31B for longer structured setup; Muse short chat/edits; GLM 5.3 only explicitly requested Deeper review. Selection is not a proven performance ranking; new measurements appended separately. Record requested/served reasoning differences; first-token wait alone does not prove queueing. Operation archive now independent appends of 25 per batch/5 per group, retaining event IDs/times/order, reducing pre-save wait without deleting records.
