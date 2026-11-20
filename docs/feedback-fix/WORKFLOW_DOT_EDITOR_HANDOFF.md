# Settings Dotted Team-Lane Delivery

2026-11-18 (America/Phoenix) · Codex main agent, Model, Canvas, Browser, independent Review.

Runtime cc1fbe9481dc3c7416b4fb1b8098f8147e88ff80, baseline d5b4025, existing claude/fervent-thompson-e2j5u2 / PR14. Netlify confirmed deploy-preview success for this runtime; accept at [preview14 Settings](https://deploy-preview-14--platypus-officer-hub.netlify.app/#/settings) → Workflow. No main merge.

## Delivered behavior

- Cards replaced with dots, gray parallel tracks, translucent team backgrounds. Unique team IDs, one container per team including empty teams; more than 8 tasks wrap within the same container. Maximum canvas 924px; duration no longer stretches width. Fit and 86%–160% zoom; 14px labels still about 12px at minimum zoom; internal mobile scrolling without page expansion.
- Start/Done always fixed virtual endpoints, with gray line even in empty templates; excluded from task arrays/effort/results/reminders, no preset buttons.
- + Task adds immediately and opens right Details; each team branch also has + Add node. Add branch creates organization team/empty parallel track, default Team N, editable in team heading; next + Task goes to new team.
- Full check/Event day may repeat with independent UUIDs. Event day defaults T0, zero working days; ordinary independently editable target, not the unique event-date stop or a second event date.
- Mouse/touch drag dots across teams or into empty teams; Team dropdown equivalent. assignStepsToTeam changes mapping only, preserving role/condition group/dependencies/dates/effort; entire action undoable.
- Deliberate within-team reorder adjusts only that node's existing simple chain. Independent tasks/forked graphs retain parallelism; same-position drops write nothing. placement.order stores display order; explicit dependencies win, cycles/standard school rules still rejected.
- New drafts/versions use teamExecution:dependencies; opening/changing team never serializes all its work. Old published sequential versions/events/task IDs/results/dates/reminder entries are not rewritten. Preserve Quick entry/template copying/defaults/drafts/version instantiation.
- Preserve business condition groups, edited in Details → Include with. User's team branch represented by teamMap so dragging does not change applicability. Existing validation protects school-required steps/prerequisites/official dates.

Team foundation is now in the feature branch; TEAM_WORKFLOW_ADAPTER_READY's "not integrated" describes history, not this delivery. Reused team identity/mapping/compiler without overwriting Role/Person with projections; People settings not rebuilt.

## Independent review fixes

1. Old reorder could serialize the whole team after slight same-position drag. Compare order and reconnect only original simple chain; no new dependencies for independent/sibling/unrelated nodes. Review checked actual save/publish/JSON reload/event generation.
2. Open Teams form could overwrite canvas-created/renamed teams. Compare source team/role-map snapshots before save, reject conflicting overwrite/preserve local input. Browser verified team count 4→5→5 and retained unsaved name; three component regressions passed.

## Verification

- Final 21 files, 209 unit/component tests passed: foundation/model/layout/pointers/editor/template storage/versions/conditions/policy/legacy sequential schedule-forecast/Rail/Teams conflicts.
- Three browser specs, 34 unique device cases passed, no skips. Final dot-editor+compact desktop/phone groups: 18 passed; original workflow-builder 16 previously passed, paths unchanged afterward. Two earliest container-count errors came from old-build track test-ID prefixes; latest build rechecked, no double counting.
- Actual mouse/CDP touch across teams/empty teams, reorder/Undo, cycle rejection, 46 tasks/four containers/original dependencies, repeated Event day→independent Plan tasks, version/event-result isolation, draft refresh/departure, target/duration, light/dark checked. Zero serious/critical axe, page horizontal overflow, script errors.
- Final lint/frontend-backend types/production build/three separate CSS/9-page words passed; Settings 147/150; entry 495,864/550,000 bytes, no raised gate; no unrelated full-site repeat.
- [Actual production-build screenshot manifest](../prototypes/workflow-dot-editor/manifest.json): desktop-canvas is complete 46-node canvas; other desktop/phone/light/dark/unselected overview/Details captures. Actual screenshots, not generated concepts. Interaction acceptance uses identical local production build; online deployment evidence is Netlify success status.

## Next owner

Main files: src/components/workflowBuilder/{WorkflowBuilder,DotWorkflowCanvas,dotLayout,dotModel}, src/components/workflowLibrary/, src/data/workflowTemplates.ts, WorkflowTemplateContent.teamExecution. Design authority: [contract](WORKFLOW_DOT_EDITOR_CONTRACT.md); tests e2e/workflow-dot-editor.spec.ts, workflow-compact-sequence.spec.ts, workflow-builder.spec.ts.

Gray tracks represent team paths only; select a node for actual prerequisites or Show all prerequisites. Team operations must not call old role-based branch reassignment. Never remove/edit explicit dependencies for visual compactness. A new team is organization-wide and appears across templates, not a temporary single-template label; old activity team snapshots remain independent.

Still same-browser prototype storage; no new real AI/email/server accounts/cross-device data/study-log types. Zero real product AI/external email. PRODUCT_PLAN/RULES/PROGRESS synced; local backup sync required.
