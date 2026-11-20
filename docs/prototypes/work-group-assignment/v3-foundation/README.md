# Onboarding prototype v3: explicit teams + task-pack canvas

2026-11-17 (America/Phoenix) · Interactive prototype, awaiting Juanxi review, not integrated into actual site.

Changes only selected “department relay board” and “whole task-pack assignment.” Shared People / Work groups settings on one page enable “change team → assign pack” experiments. v1 five screens, v2 four people concepts/six work-group concepts retained; new-event, Finance assignment, Marketing handoff, coordinator reassignment screens remain frozen.

## Try directly

Open `foundation.html`; all fictional demo data, no API calls, invitations, emails.

1. **People:** Add team creates empty team only; Add role creates role, team preselection or Assign later. Add role under a team preselects it.
2. Drag top-right ⠿ on Jamie's **Finance Treasurer 2** card at bottom into Finance: two members become three; Team dropdown does same.
3. Edit role/person/invitation email/team names directly. Role rename never creates team; moving role never rewrites reporting. Moving team lead clears old lead, requires manual choice, no automatic replacement.
4. **Work groups:** Overview for whole, Detail view enlarges selected pack; drag blank area to pan, card top edge to move, +/− zoom. Mobile centers current pack with Selected task pack below, instead of illegibly shrinking whole graph.
5. Zoomed cards show tasks; all original task titles/descriptions/sources always accessible below. Select responsible team on right to assign entire pack; members/leads come from People.
6. Click output › then another input ○ to connect, or Connections & sequence dropdowns. Cycles/duplicates blocked. New packs empty, no task copies; no task-content editor this round.
7. Arrange reorders left-to-right by dependencies. Suggested links deletable, template dependencies retained. Undo structural edits. Save draft works in session-state-capable preview; direct-file mode retains current page only, **no website save/local persistence connected**.

## Model/user purpose

| Object | Meaning | Stable reference |
| --- | --- | --- |
| Team | Actual team, multiple roles/members possible | `team.id`, never inferred from title/reporting |
| Role | Treasurer, Finance Associate, etc. | `role.teamId`, separate `reportsToRoleId` |
| Person | Name, invite email | `role.personId`, title edits leave person unchanged |
| Task pack | Tasks generally suited to one team | `pack.teamId`, explicit `taskIds` |
| Connection | Pack prerequisites | `from` / `to` / `origin` |

Defaults Club leadership, Finance, Marketing, Operations illustrative, not mandatory roles. Custom teams assigned by ID, no AI guessing Finance Treasurer 2's team. Reassigned packs show actual team members; never copy a task to everyone.

**Future integration boundaries:** Onboarding saves team structure/template default grouping; on event creation, president confirms team, lead, collaborators per pack, saving event-specific assignment snapshot; lead later assigns/reassigns each task's sole executor. Event layer/four later screens unimplemented; existing site allocation engine unchanged.

Constitution AI role/duty extraction retained; future Team / Role drafts need human confirmation; formal pack→team assignments explicit. Any workflow may have its own packs/graph; Finance, Secretary examples never fixed system categories.

## Sources for 46 tasks/connections

`workflow-data.json` retains v2 full **46 tasks / 43 original task dependencies** extracted from `src/engine/playbooks.ts` (source `e87b19c95e6eece07a3a695fdc0438de3f92fb67`), including original/two-word names, conditions, descriptions, sources. Not a new runtime-rule source of truth.

- Every task appears exactly once across **13 packs**. Leadership Review split into pre-event Readiness Check (finalcheck) and post-event Event Review (feedback), separating before/after work.
- Compressing task graph gives **11 actual cross-pack dependencies**, solid lines; all internal dependencies retained in data.
- Another **8 suggested links**, dashed, for discussion: planning→partners/safety/publicity, publicity→readiness, event→media archive/review, finance closeout/media archive→club archive.
- Suggestions are prototype proposals, not existing-template claims or date-calculation inputs. New connections draft; original graph/date/policy engines unchanged.
- Retains selected v2 direction of feedback as record work, mapped Operations here. Defaults Finance 12, Marketing 8, Operations 25, Club leadership 1; not runtime reassignment.
- Orthogonal connections avoid pack cards to prevent false implied precedence. Connection validation does not establish full future condition/join execution semantics.

## Checks/limits

Browser checks: Add role/team separation, actual pointer drag into Finance, role renaming without team creation, reporting retention, lead departure, whole-pack reassignment, unique 46-task coverage, 43 original dependencies, 11+8 cross-pack links, initial links avoid other packs, pan/zoom, pack drag, cycle rejection, new packs/connections/Undo, state recovery, contacts absent from modelContent, light/dark, mobile. Also both tabs at 320/736/1024 without horizontal overflow. See verification / layout-verification.

`verify.cjs`, `layout-check.cjs` isolate prototype checks, require Playwright/Chromium, default-compatible with container installation. Screenshots show edited/dragged test states; default still starts two Finance members +one unassigned card.

No website permissions, multiuser collaboration, backend saving, real invitations, event-level assignment, automatic scheduling; no new AI calls, research records, email, schema upgrade, deployment. privateContent may retain entered contacts; modelContent only counts, entity IDs, assignments/connections, no names/emails. Preview snapshot cap 16 KiB; overflow warns/remains on page, never claims save success.

## Files/handoff

- `foundation.html`: self-contained interactive prototype, not imported by app.
- `workflow-data.json`: task snapshot, 13 packs, 19 links with clear sources.
- `verification.json`, `layout-verification.json`: checks.
- `verify.cjs`, `layout-check.cjs`: prototype-only checks.
- `previews/`: test-state screenshots; `manifest.json`: SHA-256 for all archived files.

Only after direction confirmed, split into product components and define formal storage/compatibility for teams, templates, event assignments. Prototype storage is not business-data foundation. Local backup needs synchronization.
