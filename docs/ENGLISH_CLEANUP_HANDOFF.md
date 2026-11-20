# English repository cleanup handoff

November 19, 2026 (America/Phoenix) · Codex · Ready for review

## Scope and versions

The owner requested English repository information/comments, explicit English-only collaboration rules, and technical co-founder onboarding. The owner selected both production and Preview 14, each on its own review branch.

| Review branch | Baseline | Target |
| --- | --- | --- |
| `docs/english-repository-onboarding` | `b9e7a020898215219652534cc9f2f9573ebebf65` | `main` |
| `docs/english-preview-onboarding` | `13f45274dcb65b9577375a290f861ec2cfb7ab78` | `claude/fervent-thompson-e2j5u2`, existing PR #14 |

Both remote baselines were rechecked before delivery. There are 3 production-only and 431 preview-only commits; compare patches rather than inferring missing functionality from commit counts. No existing preview branch, PR state, access, or production deployment was changed.

## What changed

- Replace the outdated README and oversized active AGENTS narrative with English entrypoints, a current version distinction, code map, and links to detailed history.
- Translate the tracked documentation and developer comments/messages. Preserve historical records in place and provide a manually organized historical-agent index.
- Write the English-only rule in README, AGENTS, CONTRIBUTING, Claude/Gemini/Copilot entrypoints, task-prompt reminders, and issue/PR templates. It covers documentation, comments, TODOs, commits, branch names, issues, PRs, reviews, and GitHub notes.
- Add a dependency-free language guard, regression cases, and a GitHub workflow for repository and collaboration text. The guard detects selected non-Latin scripts; it does not prove English or block the act of posting a comment. Reviews still enforce the policy, and branch protection must make required checks enforceable.
- Preserve 29 exact, counted multilingual functional-data lines across 8 source/test/evaluation files. These are parser patterns, runtime prompt examples, and test inputs; they are not untranslated developer comments. No file-wide exemptions are used.
- Add an English technical co-founder guide with architecture, prototype limits, a bounded trial project, responsibility/access suggestions, and a first-month plan.
- Translate 13 existing PR titles/descriptions or formatting and one owner-authored CI comment. See [GitHub audit](GITHUB_LANGUAGE_AUDIT.md). Existing PR #1/#3 were already English. Wiki/Discussions are disabled, releases/milestones empty, and visible labels/About already English.

## Translation provenance and review limits

README, current AGENTS/assistant entrypoints, CONTRIBUTING/templates, the product-plan baseline and update summaries, AI configuration, AI verification limits, ASU rules, historical-agent index, co-founder guide, and edited GitHub metadata were manually organized against the source records. They distinguish original plans from released behavior and current approval.

The much larger dated archive was translated with a local OPUS-MT helper and then checked for language, technical references, code/example preservation, links, and obvious rendering problems. It has **not received an exhaustive bilingual semantic review**. Keep the PRs as drafts until a reviewer has checked the historical records relevant to their work, especially study-analysis definitions and old operational instructions. Do not use a mechanically translated historical phrase to change study interpretation, permissions, dates, release rules, or security behavior. Current code, owner decisions, and the manually reviewed active entrypoints govern.

Older commit messages/revisions, branch/tag history, and screenshot pixels remain for traceability. Rewriting Git history or altering old screenshots would break the evidence trail. Translated quotations of commit subjects are reading aids; locate original commits using hashes/package IDs. In the few legacy local filenames rendered with `\uXXXX`, those sequences denote the original Unicode filename, not a renamed backup. No inaccessible local backup was synchronized; **owner's thesis backup synchronization is pending**.

No product AI calls, participant records, email/text/WhatsApp deliveries, production-setting changes, or collaborator invitations were used for this cleanup.

## Verification

- Both versions: existing CSS/JS lint, frontend production build, server TypeScript, and page word budgets passed. Word budgets used installed `/usr/bin/chromium`; the initial default-browser launch failed because that Playwright download was absent, then passed with the supported configured executable.
- Main: 74 related task/command unit cases passed.
- Preview: the related 114-case run initially passed 112 and failed 2 calibration checks. One was the pre-existing five-second exhaustive date-enumeration timeout. The other was the expected generated-report wording mismatch after English translation; regenerate its comparison tables from the engine, then the report-equality check passed in a focused rerun. No test timeout, date algorithm, assertion, or budget was weakened. The exhaustive timeout remains an unresolved baseline limit; this is not an all-green full-suite claim.
- The language guard's 5 regression cases exercise English acceptance, non-English comment rejection, exact/count-limited functional exceptions, stale exceptions, GitHub event text, and binary/directory/symlink handling.
- Bash syntax and prototype JSON/Python syntax passed. Compiled output for comment-only command/context files and CSS rules was unchanged.
- Local Markdown links introduced by this cleanup were checked; existing heading-fragment references were remapped where possible. The generated calibration report uses its original engine-controlled markers.
- Full-site Playwright, physical Safari/iOS, live-provider quality, and production deployment were not rerun for this documentation/comment task. GitHub CI results belong to the actual review commits and must be read separately.

## Review and acceptance

1. Open this branch's README and follow Start here → documentation index → co-founder guide.
2. Confirm the production/preview distinction, English policy, required exceptions, and prototype limitations.
3. Run `npm run lint:english` and `npm run test:english`; inspect translations in the historical areas you depend on.
4. Review the separate production and preview PRs against their stated baselines. Do not merge either to production as part of accepting a language policy implicitly; `main` release still needs explicit owner approval.
5. Before granting a permanent technical partner broad write access, address the observed unprotected `main`, company-controlled access/recovery, and the absent LICENSE/ownership decision. Those settings were assessed, not changed.
