# English repository cleanup handoff

November 19, 2026 (America/Phoenix) · Codex · Prepared for owner review

## Scope and versions

The owner requested English repository information/comments, an English-only collaboration rule for future work, and technical co-founder onboarding. Both production and Preview 14 are covered on separate review branches.

| Review branch / PR | Baseline | Target |
| --- | --- | --- |
| `docs/english-repository-onboarding`, [#16](https://github.com/juanxiwu2005/platypus-officer-hub/pull/16) | `b9e7a020898215219652534cc9f2f9573ebebf65` | `main` |
| `docs/english-preview-onboarding`, [#17](https://github.com/juanxiwu2005/platypus-officer-hub/pull/17) | `13f45274dcb65b9577375a290f861ec2cfb7ab78` | `claude/fervent-thompson-e2j5u2`, existing PR #14 |

Remote baselines were rechecked during the review. There are 3 production-only and 431 preview-only commits; compare patches rather than inferring missing functionality from counts. Neither production nor the existing Preview 14 branch was merged or deployed by this task. Existing preview identities, repository access, and production settings were preserved.

## Result

- English README, canonical AGENTS, CONTRIBUTING, Claude/Gemini/Copilot entrypoints, and documentation index distinguish current guidance, production, preview, experiments, and history.
- Documentation, code comments, developer messages, and prototype captions/examples are in English. The former long AGENTS narrative has a short [historical reading map](history/AGENT_HISTORY.md) and a [complete English baseline snapshot](history/AGENTS_BASELINE_SNAPSHOT.md).
- English-only reminders cover documentation, comments/docstrings, TODOs, commits, new branch names, issues, PRs, reviews, and GitHub notes. They appear in important entrypoints, historical task prompts, issue templates, and the PR template. Private conversation may follow the owner's preferred language.
- A dependency-free script guard and GitHub workflow detect selected non-Latin scripts in repository/collaboration text. They do not prove that Latin-script prose is English or prevent the act of posting a comment. Review enforces meaning; branch protection must require checks to enforce merging rules.
- Preserve 29 exact counted multilingual functional-data lines across 8 source/test/evaluation files. These parser patterns, runtime examples, and test inputs preserve behavior; no file-wide language exemption is used.
- [Technical co-founder onboarding](TECHNICAL_COFOUNDER_ONBOARDING.md) explains architecture, running/checking both versions, prototype limitations, a 2–4-week trial, responsibilities/access, and a first-month plan.
- Translate 13 existing PR titles/descriptions or formatting and one owner-authored CI comment. PR #1/#3 were already English. Visible labels/About were English, releases/milestones empty, Wiki/Discussions disabled. See [GitHub audit](GITHUB_LANGUAGE_AUDIT.md).

## Translation provenance

The first draft used a local machine-translation helper for the large historical archive. The owner then explicitly authorized multiple AI subagents for bilingual semantic review. That rough archive is replaced by source-based English translations, rather than left as an unreviewed machine-translation draft.

Six disjoint packets cover **188 unique Chinese source documents**, deduplicating identical content across the baselines. Their **1,667 translation units** assemble into **320 branch-specific document paths**: 135 production and 185 preview. Each assigned unit is translated against its saved Chinese original; each packet receives a self-check. The coordinator translates seven acceptance/calibration/reference documents, checks technical references and Markdown structure, repairs links, and integrates the packets. Current README/AGENTS, product plan, AI setup/verification, and ASU rules receive separate source review; the former AGENTS file is also preserved as a full English historical snapshot.

Review preserves technical identifiers, source identities, hashes, dates, numeric limits, negations, actor permissions, approval conditions, and distinctions among passed/failed/skipped/not-run/live/mock. Generated calibration tables remain controlled by the rule engine. Existing source inconsistencies are preserved or explicitly explained; translation is not a new policy verification, study interpretation, live-model evaluation, or deployment authorization. These are AI-assisted translations, not a claim of certified or human-reviewed translation.

Older commit messages/revisions, existing branch/tag names, and historical screenshot pixels remain as evidence. Translated commit-subject quotations are reading aids; use hashes/package IDs to identify commits. Unicode escapes in a few legacy local filenames identify the existing filename, without renaming it. **The owner's local thesis backup still needs synchronization**; this workspace cannot access that computer.

No participant records, product AI calls, email/text/WhatsApp delivery, collaborator invitations, or production-setting changes were used for this cleanup.

## Independent review findings incorporated

Separate source audits checked the full historical AGENTS snapshot, both Phase 3 dictionaries/runbooks, both AI setup/verification/rule documents, both product plans, and the calibration/reminder contracts. Corrections include preserving signed consent, exact endpoint paths and the 31.2-second timeout observation, the historical extension-approval actors, and the calibrated official-deadline-minus-buffer formula. Preview-specific rule/product updates omitted from the first draft are restored in English. Historical matching-code links point to the verified stage-1 commit because those files were later rolled back.

Some original records contradict each other. The Phase 3 dictionary describes the 2,000-entry cap as per-session in section 1 and as a retained browser-log cap in sections 1.1/9; section 7 describes a `ui.edit` CSV-name fallback while section 11.5 says that name is empty; section 8.1 excludes `onboarding.finish` for setup timing while section 11.2 lists it as a possible endpoint. These statements remain visible for a later study-method decision. Preview AI setup also explicitly retains the source's 8–10-second-headroom recommendation alongside its 26-second-budget/30-second-limit example. Translation does not silently resolve those methodological or operational decisions.

## Verification and known baseline failures

- Both versions: CSS/JS lint, frontend production build, Netlify server TypeScript, and page word budgets passed during the initial cleanup. Word budgets used installed `/usr/bin/chromium` after the default Playwright executable was found absent. The semantic follow-up changes documentation only.
- Both versions: language guard, its 5 regression cases, whitespace/diff checks, and Markdown link/reference checks are rerun after translation assembly. The guard cases cover script rejection, exact/count-limited functional exceptions, stale exceptions, GitHub event text, and binary/directory/symlink handling.
- Initial main cleanup commit `ccfcde1`: [complete CI #271](https://github.com/juanxiwu2005/platypus-officer-hub/actions/runs/44683069406) and English collaboration passed. Separately, 74 related task/command unit cases passed locally.
- Initial preview cleanup commit `629f6d6`: English collaboration passed; [complete CI #272](https://github.com/juanxiwu2005/platypus-officer-hub/actions/runs/44683077709) reported **2118 passed / 2 failed** across 161 unit-test files. Failures were `calibration.test.ts:163` (exhaustive 2026-11–2028-04 date sweep exceeds its existing 5-second timeout) and `uiLog.test.tsx:179` (export test reads an absent blob before async export completes). The latter was independently reproduced on untouched Preview 14 baseline `13f4527` with 20 passes/1 failure in that file. Both are recorded as existing preview problems; no assertion, timeout, date algorithm, or budget was weakened.
- Preview's translated calibration report initially needed engine-generated comparison tables refreshed. Its focused report-equality check passed after regeneration and is checked again after semantic assembly. This does not claim that the exhaustive sweep passed.
- Bash syntax and prototype JSON/Python syntax passed; compiled output of comment-only command/context files and CSS rules was unchanged. Historical test results quoted inside older reports remain the results of those dated versions.
- No additional full-site browser run, physical Safari/iOS check, paid-provider evaluation, or production deployment is required by this documentation-only semantic follow-up. GitHub workflow results belong to the exact commit/run shown; read the current PR checks before merging.

## Owner review

1. Follow README → documentation index → co-founder guide; confirm version boundaries and English rules.
2. Review translations relevant to the next engineering/study task, using baseline hashes for the original records when needed. Run `npm run lint:english` and `npm run test:english`.
3. Review #16 and #17 against their different baselines. This cleanup does not approve production integration of Preview 14.
4. Before expanding technical-partner write access, resolve the observed unprotected main branch, company-controlled recovery/access, and absent LICENSE/IP decision. These settings were assessed, not changed.
5. Synchronize the owner's thesis backup when authorized access to that machine is available.
