# Technical co-founder onboarding

> Proposed collaboration plan for discussion, not an appointment, equity agreement, access grant, or approved product roadmap. Repository records and GitHub collaboration must be in English.

## Where the product stands

Platypus helps student organization leaders keep work moving and preserve knowledge through officer transitions. It is also an ASU Barrett Phase 3 research prototype. Juanxi owns product direction, user relationships, and study decisions. A technical co-founder would own engineering quality, architecture, and delivery in partnership with him.

The repository is public and currently belongs to Juanxi's personal GitHub account. Public source access does not imply permission to use research records, production credentials, institutional AI access, or third-party accounts. The repository metadata reports no license, and no tracked LICENSE file was found. Review licensing and ownership before commercial reuse; public visibility alone does not grant a general reuse license.

As checked on November 19, 2026, `main` is at `b9e7a02`, while the active PR #14 preview is at `13f4527`. There are 3 production-only and 431 preview-only commits. Check patch equivalence for the production server output-budget fix before any preview release; a production-only commit may already be represented by a different preview commit. The existing preview branch and PR number must remain stable during review.

## Read and run

Read the root README, `AGENTS.md`, `CONTRIBUTING.md`, the newest `docs/PROGRESS.md` entries, `docs/AI_SETUP.md`, and the relevant product plans. Run the quick start and offline checks from the README. Explore both the production prototype and Preview 14 using fictional data, and label findings by version.

| Area | Main files | What to establish |
| --- | --- | --- |
| Frontend | `src/pages/`, `src/components/`, `src/routes.ts` | Main navigation, right-side Ask/Details rail, lazy-loaded pages, and UI budgets |
| State and permissions | `src/data/types.ts`, `src/data/store.tsx`, `src/data/permissions.ts` | Browser persistence, schema repair, role visibility, and which checks are demo-only |
| Scheduling | `src/engine/calendar.ts`, `schedule.ts`, `taskDates.ts`, `workflow.ts` | Date ownership, school deadlines, dependencies, and regression coverage |
| AI boundary | `netlify/lib/ai.mts`, `src/lib/aiContext.ts`, `commands.ts`, `chatCards.ts` | Server-side credentials, approved context, command validation, latency/cost, and fallback behavior |
| Experiments | `src/organization/`, `src/workspace/`, `src/phase1/`, `netlify/lib/organization/` | Separate storage and flags; do not mistake them for migration of the main application |
| Delivery | `.github/workflows/ci.yml`, `netlify.toml`, `e2e/`, `src/test/` | CI versus live-provider evidence, deploy previews, rollback, and study consistency |

## Engineering work to prioritize together

1. **Establish one delivery path.** Compare production and PR #14, identify the intended next release, reduce future PR scope, and document acceptance and rollback. Do not release changes until Juanxi approves.
2. **Design real accounts and shared data.** The main prototype uses browser storage, role switching, and same-browser demo links. These are not secure multi-user accounts. Propose identity, server-enforced organization authorization, durable storage, migration, backup/recovery, and retention before a real shared pilot.
3. **Make reminders safe to operate.** Distinguish stored reminder previews from actual delivery. A future delivery system needs explicit recipient/channel consent, idempotent dispatch, delivery outcomes, retries, and an operator stop control. This is proposed work, not functionality claimed to be shipped.
4. **Make AI behavior measurable.** Track approved model routing, bounded latency and retries, fallback, privacy filtering, and cost without sending research records to models or running unsolicited paid evaluations.
5. **Preserve the study baseline.** Agree on how fixes affect participants and recorded evidence. Keep research access separate from engineering access and obtain any required institutional approvals before expanding use.

## Trial collaboration and responsibilities

Start with a two-to-four-week trial project before making a founder commitment. Choose one bounded improvement, such as a reproducible development setup plus a small bug fix with a regression test and preview. Agree in writing on hours, compensation if any, existing/new code ownership, and what would make either person stop the trial.

| Decision | Proposed owner |
| --- | --- |
| Users, problem definition, product priorities, partnerships, study scope | Juanxi |
| Architecture, implementation, code review, technical reliability, engineering estimates | Technical co-founder |
| Scope/effort tradeoffs, releases, access to sensitive systems, and company commitments | Both; current production approval stays with Juanxi until explicitly changed |

Evaluate whether the candidate can explain tradeoffs in plain language, maintain existing work, deliver a small tested change, handle feedback, and identify what should wait. Strong React/TypeScript and backend/auth/data experience matter more here than adding another model integration. US location can help with users and time zones; nationality is not a substitute for technical ownership or a working relationship.

## Proposed first month

| Period | Concrete outcome |
| --- | --- |
| Days 1–3 | Run locally, demonstrate one event/task/handoff flow, document actual limitations and required access |
| Week 1 | Produce a short production/preview comparison and agree on one trial issue with acceptance criteria |
| Week 2 | Ship the trial change to a review branch, explain its tests and rollback, and review it with Juanxi |
| Weeks 3–4 | Agree on architecture priorities, a realistic next milestone, working cadence, and whether to formalize the partnership |

Use English GitHub issues for decisions, one clear owner and acceptance criteria per issue, and a short weekly product/engineering review. Keep branches and PRs small enough to understand and revert.

## Access and ownership setup

For a trial, grant only the repository and preview access needed for the work. On the current personal repository, collaborator access is less granular than organization roles; document that limitation. If the team becomes permanent, consider transferring the repository to a company-controlled GitHub organization, preserving Netlify/GitHub integrations and previews, and using teams and appropriate repository roles. Do not transfer ownership as part of routine cleanup.

Protect `main` with PR review and required CI checks, restrict direct pushes and force pushes, and decide how administrator bypass works. The branch API reported `main` unprotected and no repository rulesets on November 19. Add enforceable review/check requirements before expanding write access; written instructions alone do not enforce them. The integration could not read the separate administrator-only protection endpoint, but the branch summary explicitly reported protection disabled. Require two-factor authentication where applicable. Agree on company-controlled recovery and billing access, and avoid one person's account being the only way to operate the product.

Give development credentials separately from production, scoped to the service and task. ASU AIR access must follow institutional authorization; do not share a personal institutional key. Never put credentials in a PR, issue, chat transcript, or onboarding document.

Before a founder agreement or commercial launch, resolve equity/vesting, time commitment, decision rights, departures, IP assignment, and the status of thesis/institutional work with appropriate professional and university input. Four-year vesting with a one-year cliff is a common discussion starting point, not a decided term for this team. Do not assume the existing project, school policies, or provider permissions automatically transfer to a company.

## References

- [GitHub licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [GitHub organization repository roles](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization)
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub outside collaborators](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-outside-collaborators/adding-outside-collaborators-to-repositories-in-your-organization)
- [YC: Keys to successful co-founder relationships](https://www.ycombinator.com/library/Im-keys-to-successful-co-founder-relationships)
- [YC: How to split equity among co-founders](https://www.ycombinator.com/library/5x-how-to-split-equity-among-co-founders)
