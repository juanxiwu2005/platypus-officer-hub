# Settings dotted team-lane editor

2026-11-18 (America/Phoenix), Codex. User requested full implementation on `claude/fervent-thompson-e2j5u2` / PR14 / preview14; no main merge.

## Confirmed design

- Settings → Workflow uses compact dots, gray tracks, translucent team backgrounds, reusing actual Plan's dotted flow and current team foundation's identity/grouping rules.
- Exactly one lane per team, including empty teams; no duplicate pre/post-event rows. Team names editable, IDs stable.
- Every new workflow has fixed virtual Start / Done endpoints and gray connectors; not real tasks, generating no emails/effort/results and having no preset buttons.
- Add task creates/selects immediately; drag across teams, equivalent dropdown operation. Add branch creates one team and empty parallel track, immediately rename/add nodes; role/team association remains explicit.
- Presets: Full check, Event day. Repeated additions allowed (including two Event day), each real task with independent stable key; no title deduplication or misuse of reserved standard-workflow keys.
- Existing `src/teamWorkflow/` foundation is on feature branch. Cross-team reassignment changes only teamMap, not original role/conditions/dates/dependencies; legacy conditional branches remain separate from team tracks.
- New saves use explicit dependencies execution mode; opening/changing teams no longer automatically chains all same-team tasks. Keep explicit dependencies; intentional same-team reorder still passes cycle/policy checks. Old published sequential versions/events retain original snapshots.
- Canvas fit-to-width/zoom, compact nodes, two-line short titles; full names/effort/targets/conditions/notes in right editor. Retain Quick entry, Undo, draft/version saving, template copy, actual Plan instantiation.

## File owners

- Lead: WorkflowBuilder, WorkflowLibrary integration, docs, final integration/browser/push.
- Model agent: types, workflowTemplates, pure dotModel commands, targeted tests.
- Canvas agent: DotWorkflowCanvas, dotLayout, separate styles, targeted component/layout tests.
- Independent Review: final read-only review; original owner/lead fixes issues.

Lead integrates separate-worktree commits; no concurrent edits to the same files, real AI/email calls, or production-site changes.

## Validation focus

Empty Start—Done template; one-click task/empty branch; repeated Event day; mouse/touch cross-team drag, team rename/refresh/Undo; movement preserves dependencies/conditions/roles/effort; standard school-rule protection, no writes back to old versions/tasks; real Plan creation after saved version; both devices/themes, keyboard, severe accessibility/no horizontal page overflow, related unit/types/build/styles/words/entry budgets.
