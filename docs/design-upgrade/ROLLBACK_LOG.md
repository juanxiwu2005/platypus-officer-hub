# Rollback register

The integrator adds a row for each merged package; every rollback updates its status and records a reason.
See R0–R5 in `README.md` for rollback methods. Tags `dx/dx-NN-merged` point to merge commits.

| Package | Status | Merge commit | Tag | Merge date | Rollback command (R2) | Rollback date / reason |
| --- | --- | --- | --- | --- | --- | --- |
| DX-01 | **Merged**（stage 0）| `9d5a9f0` | `dx/dx-01-merged` | 2026-11-01 | `git revert -m 1 dx/dx-01-merged` | |
| DX-02 | **Merged**（stage 0）| `f1dbd24` | `dx/dx-02-merged` | 2026-11-01 | `git revert -m 1 dx/dx-02-merged` | |
| DX-03 | **Merged**（stage 1）| `055af30` | `dx/dx-03-merged` | 2026-11-01 | `git revert -m 1 dx/dx-03-merged` | |
| DX-04 | **Merged**（stage 1）| `39aab5a` | `dx/dx-04-merged` | 2026-11-01 | `git revert -m 1 dx/dx-04-merged` | |
| DX-05 | **Merged**（stage 1）| `b5ee333` | `dx/dx-05-merged` | 2026-11-01 | `git revert -m 1 dx/dx-05-merged` | |
| DX-06 | **Merged**（stage 1）| `0187d36` | `dx/dx-06-merged` | 2026-11-01 | `git revert -m 1 dx/dx-06-merged` | |
| DX-07 | **Merged**（stage 1）| `775264a` | `dx/dx-07-merged` | 2026-11-01 | `git revert -m 1 dx/dx-07-merged` | |
| DX-08 | **Merged**（stage 1）| `eb55e5a` | `dx/dx-08-merged` | 2026-11-01 | `git revert -m 1 dx/dx-08-merged` | |
| DX-09 | **Merged**（stage 2）| `d419447` | `dx/dx-09-merged` | 2026-11-01 | `git revert -m 1 dx/dx-09-merged` | |
| DX-10 | **Merged**（stage 2; post-merge fix `6f62b17` must also be reverted with DX-10）| `5a32bf7` | `dx/dx-10-merged` | 2026-11-01 | `git revert -m 1 dx/dx-10-merged` | |
| DX-11 | **Merged**（stage 2）| `b54de9b` | `dx/dx-11-merged` | 2026-11-01 | `git revert -m 1 dx/dx-11-merged` | |
| DX-12 | **Merged**（stage 2）| `e8ff3ec` | `dx/dx-12-merged` | 2026-11-01 | `git revert -m 1 dx/dx-12-merged` | |
| DX-13 | **Merged**（stage 2）| `4b118e7` | `dx/dx-13-merged` | 2026-11-01 | `git revert -m 1 dx/dx-13-merged` | |
| DX-14 | **Merged**（stage 2）| `d83af1f` | `dx/dx-14-merged` | 2026-11-01 | `git revert -m 1 dx/dx-14-merged` | |
| DX-15 | **Merged**（stage 3）| `d89d959` | `dx/dx-15-merged` | 2026-11-01 | `git revert -m 1 dx/dx-15-merged` | |
| DX-16 | **Merged**（stage 3）| `e6618b8` | `dx/dx-16-merged` | 2026-11-01 | `git revert -m 1 dx/dx-16-merged` | |
| DX-17 | **Merged**（stage 3）| `8613954` | `dx/dx-17-merged` | 2026-11-01 | `git revert -m 1 dx/dx-17-merged` | |
| DX-18 | **Merged**（stage 3）| `12f079e` | `dx/dx-18-merged` | 2026-11-01 | `git revert -m 1 dx/dx-18-merged` | |
| DX-19 | **Merged**（stage 3）| `a5fcff5` | `dx/dx-19-merged` | 2026-11-01 | `git revert -m 1 dx/dx-19-merged` | |
| DX-20 | **Merged**（stage 4, 20a only）| `cc6a3d6` | `dx/dx-20-merged` | 2026-11-01 | `git revert -m 1 dx/dx-20-merged` | |
| DX-21 | **Merged**（stage 4）| `f6bd79a` | `dx/dx-21-merged` | 2026-11-01 | `git revert -m 1 dx/dx-21-merged` | |
| DX-22 | **Merged**（stage 4）| `bfafc89` | `dx/dx-22-merged` | 2026-11-01 | `git revert -m 1 dx/dx-22-merged` | |
| DX-23 | **Merged**（stage 5）| `0e93cd6` | `dx/dx-23-merged` | 2026-11-01 | `git revert -m 1 dx/dx-23-merged` | |
| DX-24 | **Merged**（stage 5）| `8ac5b82` | `dx/dx-24-merged` | 2026-11-01 | `git revert -m 1 dx/dx-24-merged` | |
| DX-25 | **Merged**（stage 5）| `7ef5a87` | `dx/dx-25-merged` | 2026-11-01 | `git revert -m 1 dx/dx-25-merged` | |
| DX-26 | **Merged**（stage 6）| `255c009` | `dx/dx-26-merged` | 2026-11-01 | `git revert -m 1 dx/dx-26-merged` | Uses DX-24 `dragSort.ts`: revert this before DX-24 |
| DX-27 | **Merged**（stage 6, step 3 not done）| `7c27bea` | `dx/dx-27-merged` | 2026-11-01 | `git revert -m 1 dx/dx-27-merged` | Only docs, `.stylelintrc.json`, `dxStyleGuard.test.ts`; reverting restores stale AGENTS.md section 0 |

## Stage tags

| Tag | Meaning | Created |
| --- | --- | --- |
| `dx/baseline` | After plan-document commit, before any code changes（`77c94ee`）| Local only (push blocked)|
| `dx/phase-0-before` | stage 0  before starting(= baseline)| Local only |
| `dx/phase-1-before` | stage 1  before starting（`8c70057`）| Local only |
| `dx/phase-2-before` | stage 2  before starting（`17af284`）| Local only |
| `dx/phase-3-before` | stage 3  before starting（`a13f037`）| Local only |
| `dx/phase-4-before` | stage 4  before starting（`8e7cdf3`）| Local only |
| `dx/phase-5-before` | stage 5  before starting（`d4bcbda`）| Local only |
| `dx/phase-6-before` | stage 6  before starting（`d8b0cbb`）| Local only |

## ⚠ Packages with follow-up fixes: **revert fixes before the package**

For packages with post-merge fixes found during integration checks or screenshot review, those fixes edit the same lines. Reverting the merge directly causes **conflicts** (confirmed for DX-10 and DX-16). **Revert fix commits first, then the merge**:

| Package to revert | Revert these fixes first (newest first) | Then revert |
| --- | --- | --- |
| DX-10 | `git revert --no-edit 6f62b17` | `git revert -m 1 dx/dx-10-merged` |
| DX-15 | `git revert --no-edit a8775e6` | `git revert -m 1 dx/dx-15-merged` |
| DX-16 | `git revert --no-edit 3972412`, then `git revert --no-edit a8775e6`(also changes DX-16 styles)| `git revert -m 1 dx/dx-16-merged` |

(`a8775e6` fixes both DX-15 and DX-16, so revert it before either. To revert DX-15 while retaining DX-16, manually preserve the DX-16 portion; the integrator must handle that case separately.)

## Rollback drill records

| Date | Drill | Result |
| --- | --- | --- |
| 2026-11-01 | In a temporary worktree at the integration tip, ran `git revert -m 1 dx/dx-02-merged`, then `git revert -m 1 dx/dx-01-merged`, running `tsc` after each | Both clean, conflict-free; after DX-02, Layout.tsx returned to 168 lines; after both, `src`, `package.json`, `playwright.config.ts`, `.stylelintrc.json`, `scripts`, `.gitignore` were **byte-identical** to `77c94ee` (empty `git diff`). Temporary worktree discarded, no push |
| 2026-11-01 | stage 1：In a temporary worktree, reverted merged history in reverse order: `git revert -m 1 dx/dx-08-merged` … `dx-03-merged`(six)| All six clean, conflict-free; `tsc` passed; afterward `src`, `package.json`, `playwright.config.ts`, `.stylelintrc.json`, `scripts`, `index.html`, `.gitignore`, `e2e` were **byte-identical** to `dx/phase-1-before`. Standalone DX-05 revert also clean, `tsc` passed, `RISK_SHAPE` removed. Temporary worktree discarded |
| 2026-11-01 | stage 2：In a temporary worktree, reverted merged history in reverse order: `git revert -m 1 dx/dx-14-merged` … `dx-09-merged`(six)| All six clean; `tsc` passed; afterward `src`, configuration, `scripts`, `index.html`, `e2e` were **byte-identical** to `dx/phase-2-before`. Standalone DX-09 revert clean too. **Note:** drill predates DX-10 fix; that fix only edits `dx-10-menu-motion.css` and `e2e/helpers.ts`, and must accompany DX-10 rollback (otherwise the harmless helpers `aria-expanded` change remains)|
| 2026-11-01 | stage 3：Reverted two fixes first, then merged history in reverse order: `dx-19-merged` … `dx-15-merged`(five)| All clean; `tsc` passed; **byte-identical** to `dx/phase-3-before` afterward. Standalone DX-17 revert clean. **Also found:** reverting DX-16 without fixes first conflicts; subsequently confirmed the same for DX-10 (table above)|
| 2026-11-01 | stage 4：Reverted merged history in reverse order: `dx-22-merged`、`dx-21-merged`、`dx-20-merged` | All three clean; `tsc` passed; **byte-identical** to `dx/phase-4-before` afterward (including `e2e/helpers.ts` and 12 mechanically updated test files). Standalone DX-21 revert clean. **No** post-merge fixes in this stage |
| 2026-11-01 | stage 5：Reverted merged history in reverse order: `dx-25-merged`、`dx-24-merged`、`dx-23-merged` | All three clean; `tsc` passed; **byte-identical** to `dx/phase-5-before` afterward. Standalone DX-24 revert clean. **Dependency found:** standalone DX-22 revert has no git conflict, but `tsc` reports 3 "Cannot find module '../../lib/motion'" errors (DX-24/DX-25 use it), so revert DX-24/DX-25 before DX-22 (added to PHASES.md dependency table). No post-merge fixes this stage |
| 2026-11-01 | stage 6：Reverted `dx-27-merged`, then `dx-26-merged` from merged history (temporary worktree)| Both clean; `tsc` passed; **byte-identical** to `dx/phase-6-before` afterward (`git diff --name-only`: 0 files). Standalone DX-26 revert retaining DX-27 also clean, `tsc` passed. |

## Why this session cannot push other branches/tags (2026-11-01 investigation)

| Attempt | Result |
| --- | --- |
| `git push -u origin <new-branch> --tags` | `HTTP 403`, remote disconnected |
| Only `git push origin dx/baseline`(one tag only)| Same failure. **Tags are not special**; any ref outside this session is rejected |
| Push this session branch `claude/determined-johnson-yrdxwf` | Consistently succeeds |
| GitHub tool (MCP)`create_branch` | Succeeds (separate credentials). This created `integration/v1.6` |
| Failures in local proxy status `__agentproxy/status` | Only unrelated `mcp.uk.definely.com`, **no github.com**, indicating no outbound-proxy block |

**Conclusion (inference, not an official GitHub explanation):** this session's git push credentials authorize only its own branch. GitHub tools have separate credentials and can create branches/PRs, but lack tools to update existing branches or create tags, so I cannot push into a branch after creating it.

### Commands to create missing refs (run in the repository with an authorized account/session)

```bash
git fetch origin claude/determined-johnson-yrdxwf
# 1. Tags (make git revert -m 1 dx/dx-NN-merged available from GitHub too)
git tag dx/baseline 77c94ee732cb07ab7ecda635d2814f6da37b6947
git tag dx/phase-0-before 77c94ee732cb07ab7ecda635d2814f6da37b6947
git tag dx/dx-01-merged 9d5a9f0a2f35ca88371a8b0204f866325a6adebb
git tag dx/dx-02-merged f1dbd2401736b2630e7395807ae22083e94374b6
git tag dx/phase-1-before 8c70057bfaffd1394506c16c438bdbf41d258039
git tag dx/dx-03-merged 055af308552c8c0035d1000f0723b61af92751b7
git tag dx/dx-04-merged 39aab5aeb7f9fca42ad6e05e28a7cbe0a30014a2
git tag dx/dx-05-merged b5ee33311193819c10bb78ae1b13b6a74ef169cc
git tag dx/dx-06-merged 0187d36dd0dacbe866494de54233b5f46a0b3e61
git tag dx/dx-07-merged 775264a829b5b0c2108a303dcf811a399855d9e1
git tag dx/dx-08-merged eb55e5a25cb3db86f969c823b8896b7595217237
git tag dx/phase-2-before 17af284dde66fae2b10d27f805a9724496e10a53
git tag dx/dx-09-merged d4194474f009914337a0a0d9e372c950265d1780
git tag dx/dx-10-merged 5a32bf78e3645346c433afab7a151001aa816b6d
git tag dx/dx-11-merged b54de9b817e5d3b19ea4eb6882d8b4757643df02
git tag dx/dx-12-merged e8ff3ec1c24d20fa5c4fb764456f8e6102d4e802
git tag dx/dx-13-merged 4b118e700c448aed1e624f326f3c106e64e47162
git tag dx/dx-14-merged d83af1fbd7e2d85ea0a32eb4a39c9dc168138967
git tag dx/phase-3-before a13f037ca61a24f8731624d48b53d5d13f77b538
git tag dx/dx-15-merged d89d95989e361f9f3f9ba9d0316c841850f8b28d
git tag dx/dx-16-merged e6618b8058ae3b98cc4dca36834f511071ff23d1
git tag dx/dx-17-merged 8613954992e0888674eb58fb4cc9c13d9965c880
git tag dx/dx-18-merged 12f079e23cd52153e54ee40692f420a0ed205e0b
git tag dx/dx-19-merged a5fcff5e436bfe4e0b5286603aeb084cac2c3faa
git tag dx/phase-4-before 8e7cdf32e68eaf1c9f3239ee8b61a1ba2cf71c7d
git tag dx/dx-20-merged cc6a3d687d70a8bc1850a1045f0cee65d2868028
git tag dx/dx-21-merged f6bd79ab1939ba43083653cb113d4bc7433cd52e
git tag dx/dx-22-merged bfafc89701446364fa67c2cf35b69bc58d645624
git tag dx/phase-5-before d4bcbda5e05478c8297b4f4c2d7ba9228355ccb0
git tag dx/dx-23-merged 0e93cd644cfcf36a349c3d49aaa5e9f995064694
git tag dx/dx-24-merged 8ac5b82bab9a4820b40ab757fcc3fa8cab2e50dc
git tag dx/dx-25-merged 7ef5a877506835367ccbecbee0f3b593a15de30b
git tag dx/phase-6-before d8b0cbb9c9d8405da93519dc3b43f9857c07ed73
git tag dx/dx-26-merged 255c00964616ee604bb2bda0a0b831b5ec2e66aa
git tag dx/dx-27-merged 7c27beac87c6baa48e960dcdade28dc4fc3dd91c
git push origin dx/baseline dx/phase-0-before dx/phase-1-before dx/phase-2-before dx/phase-3-before dx/phase-4-before dx/phase-5-before dx/phase-6-before dx/dx-01-merged dx/dx-02-merged dx/dx-03-merged dx/dx-04-merged dx/dx-05-merged dx/dx-06-merged dx/dx-07-merged dx/dx-08-merged dx/dx-09-merged dx/dx-10-merged dx/dx-11-merged dx/dx-12-merged dx/dx-13-merged dx/dx-14-merged dx/dx-15-merged dx/dx-16-merged dx/dx-17-merged dx/dx-18-merged dx/dx-19-merged dx/dx-20-merged dx/dx-21-merged dx/dx-22-merged dx/dx-23-merged dx/dx-24-merged dx/dx-25-merged dx/dx-26-merged dx/dx-27-merged
# 2. Package branches (optional; commits already in claude/determined-johnson-yrdxwf history)
git push origin 8a941e68f9039cd90230d88fa169e1ee26138ad7:refs/heads/design/dx-01-foundation
git push origin 84f29c19f84c85363fcd08a36d5bd26b68106564:refs/heads/design/dx-02-split-layout
git push origin 2fd91d65c0b7ce173ca4aea4e4e79d822cced8d8:refs/heads/design/dx-03-press-feedback
git push origin d50dd30430ac258fa4261a2572bf2723cf58bfca:refs/heads/design/dx-04-touch-targets
git push origin 09e6c1d69a31d1eb097821a92ef0fba2ee9f31cd:refs/heads/design/dx-05-risk-shapes
git push origin cf21d37047bc989c0c30e720e6546f0b0c738882:refs/heads/design/dx-06-type-details
git push origin aa4fc035aab7c423f51111391aac4944f4581f23:refs/heads/design/dx-07-shell-meta
git push origin 1889e2c0f3053540d3d8c4b27edad31ebc57f445:refs/heads/design/dx-08-motion-guards
git push origin fd37d68fca92e926946afe1f2d5562986d52d011:refs/heads/design/dx-09-rail-motion
git push origin 8a10f35224157393e21cd38946420c9f447f2f39:refs/heads/design/dx-10-menu-motion
git push origin e6c5009a9af33c3faa3b6046541aab8d40bed4d8:refs/heads/design/dx-11-toast-motion
git push origin 1eb3aea9852b3321b67604dd686c63fc064878b8:refs/heads/design/dx-12-touch-hover-sheet
git push origin eb707ae248c3b6daea3b7d98eee595d22109c57f:refs/heads/design/dx-13-details-motion
git push origin 3efe52c5a39b683637337ba92fbfc7e03e46f7f4:refs/heads/design/dx-14-loading-skeleton
git push origin 5dbb0fad003d98e92394c964cf5a25673ea557a5:refs/heads/design/dx-15-events-layout
git push origin 23a2ccf8c586b484eb262d42dff151e48d48468a:refs/heads/design/dx-16-board-layout
git push origin 0372acdce350361b135ac7fb75460f070134491c:refs/heads/design/dx-17-ask-panel
git push origin 7c58010e7b874867de82442113efda53b11c99ae:refs/heads/design/dx-18-empty-states
git push origin 22eb91f8207d19e9debcf5740af8b095ec3a2652:refs/heads/design/dx-19-detail-swap
git push origin 5a3a8235afe4e3799add6af246e5aa2a2841bc68:refs/heads/design/dx-20-mobile-shell
git push origin 01a2e73219660a8a03790c380c66a70169501e6f:refs/heads/design/dx-21-board-headers
git push origin 012f54b7adda19f169fc3fa832f83c9a3ed6394c:refs/heads/design/dx-22-flow-motion
git push origin c158b065f3fb3559ef52b070a433c621adc0d21d:refs/heads/design/dx-23-glass-topbar
git push origin 248bdcb4aa8194fe4fd66e1c353bc965dd9ef9fd:refs/heads/design/dx-24-board-drag
git push origin 37828546afc583f89bd3d70de6d5b6cc45e7bf24:refs/heads/design/dx-25-done-moment
git push origin 9cb8020c96887c25804af9bbfd414dd003ae23c6:refs/heads/design/dx-26-crm-drag
git push origin 6f050b7234760cd2a51905ec4756862a83d26e52:refs/heads/design/dx-27-docs-closeout
```
