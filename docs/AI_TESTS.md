# AI verification record

October 22, 2026 · Codex · WP5 historical acceptance record

> **Live-provider acceptance was incomplete. Do not claim at least 90% live accuracy or perfect live refusal behavior from these mocks.** Later AIR-only policy, DeepSeek removal, and restrictions on paid tests supersede the old testing sequence below. This record does not authorize new live calls or login attempts.

| Date, Arizona | Provider/model | Method | Recorded result | Satisfies live AI gate? |
| --- | --- | --- | --- | --- |
| 2026-10-22 | Mock provider, not a real model | 40 fixed cases: 30 in-scope and 10 refusal cases through the actual `/api/ask` handler | 40/40 interface constraints, including 10/10 refusals; 3 additional malicious-output/interface checks | No. Constructed expected replies verify the interface/guardrails, not model comprehension. |
| 2026-10-22 | DeepSeek; deployed model was not inspected | Intended live preview test | Not run; no score | No |
| 2026-10-22 | ASU AIR; configuration/model unknown | Deployment environment was inaccessible | Not run; no score | No |
| 2026-10-22 | Mock handbook | Actual handbook handler and desktop/mobile flow with fabricated content/dates/source IDs injected into model output | Retained original source extracts only; source checks, outgoing confirmation, and president approval passed | No live-provider handbook acceptance established |

The preview required Netlify team login. The signed-in ASU account lacked project access; Juanxi explicitly requested stopping login attempts, and they stopped. Access protection was not disabled, keys were not read, provider configuration and `main` were not changed, and an older production endpoint was not substituted as evidence for the new revision.

## Fixed evaluation set and scoring

- `evals/rules.json` contains 40 fictional/general policy questions. Each expects specific rule IDs or `shouldRefuse: true`, without research data or personal information.
- In-scope cases require `inScope: true`, matching rule IDs, corresponding IDs in the answer, sources, and verification dates. The server displays stored rule wording; AI selects IDs only.
- Refusal cases require `inScope: false` and an empty citation array. Related questions unsupported by the library must also be declined.
- The original gate is at least 36/40 overall and 10/10 refusals, with the actual provider/model recorded. This measures the fixed set's selection/refusal behavior, not correctness on arbitrary open questions.
- CI and `npm test` use mocks, without paid-provider requests. Run `npm run eval:mock` for the offline evaluation.
- The historical live command was `npm run eval:rules -- --base-url https://deploy-preview-1--platypus-officer-hub.netlify.app --output <local-results-file>`. Use only an authorized accessible deployment and current testing approval. Login redirects/interface errors count as failures, without a passing fallback. The script does not accept or print a provider key.
- `--input <results-file>` scores actual per-question responses collected in an authenticated browser. UI examples and mocks are not measured provider results.
- The original plan called for before/after model-change evaluation, beginning with DeepSeek and separately testing AIR if configured, recording date/model/score/result path. DeepSeek was subsequently removed; current AI_SETUP and owner restrictions govern any future evaluation.

## Live role handbook still required owner review

The historical acceptance path was Handoff → Start handoff season → Treasurer handbook → Draft role handbook. Only an output labelled “AI-selected source extracts” with provider/model identifies a live-provider selection. “Example extract draft · live AI unavailable or off” is a local source-extract example and does not complete live-handbook acceptance.

Open Source on each item to verify evidence; switch to Maya for outgoing confirmation, then Alex for president approval. Later Handoff design and acceptance records supersede the original screen sequence where they differ.
