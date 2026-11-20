# Rollback Registration Form

Integration of one work pack for each man; Every rollback, update that line of "state" and write the reason.
Rollback is available from `README.md` for R0-R5. `dx/dx-NN-merged` tag points to "Merge Submit".

| Work package | Status | Merge Commit | Label | Merge Date | Rollback Command (R2) | Rollback Date / Reason |
| --- | --- | --- | --- | --- | --- | --- |
| DX-01 | **Already Mege** (Phase 0) | `9d5a9f0` | `dx/dx-01-merged` | 2026-11-01 | `git revert -m 1 dx/dx-01-merged` | |
| DX-02 | **Already Mege** (Phase 0) | `f1dbd24` | `dx/dx-02-merged` | 2026-11-01 | `git revert -m 1 dx/dx-02-merged` | |
| DX-03 | **Already Mege** (Phase 1) | `055af30` | `dx/dx-03-merged` | 2026-11-01 | `git revert -m 1 dx/dx-03-merged` | |
| DX-04 | **Already Mege** (Phase 1) | `39aab5a` | `dx/dx-04-merged` | 2026-11-01 | `git revert -m 1 dx/dx-04-merged` | |
| DX-05 | **Already Mege** (Phase 1) | `b5ee333` | `dx/dx-05-merged` | 2026-11-01 | `git revert -m 1 dx/dx-05-merged` | |
| DX-06 | **Already Mege** (Phase 1) | `0187d36` | `dx/dx-06-merged` | 2026-11-01 | `git revert -m 1 dx/dx-06-merged` | |
| DX-07 | **Already Mege** (Phase 1) | `775264a` | `dx/dx-07-merged` | 2026-11-01 | `git revert -m 1 dx/dx-07-merged` | |
| DX-08 | **Already Mege** (Phase 1) | `eb55e5a` | `dx/dx-08-merged` | 2026-11-01 | `git revert -m 1 dx/dx-08-merged` | |
| DX-09 | **Already Mege** (Phase 2) | `d419447` | `dx/dx-09-merged` | 2026-11-01 | `git revert -m 1 dx/dx-09-merged` | |
| DX-10 | **has merge** (phase 2); Merge has been submitted for restoration. `6f62b17`And when the DX-10 is gone, it's going to go together. | `5a32bf7` | `dx/dx-10-merged` | 2026-11-01 | `git revert -m 1 dx/dx-10-merged` | |
| DX-11 | **Already Mege** (Phase 2) | `b54de9b` | `dx/dx-11-merged` | 2026-11-01 | `git revert -m 1 dx/dx-11-merged` | |
| DX-12 | **Already Mege** (Phase 2) | `e8ff3ec` | `dx/dx-12-merged` | 2026-11-01 | `git revert -m 1 dx/dx-12-merged` | |
| DX-13 | **Already Mege** (Phase 2) | `4b118e7` | `dx/dx-13-merged` | 2026-11-01 | `git revert -m 1 dx/dx-13-merged` | |
| DX-14 | **Already Mege** (Phase 2) | `d83af1f` | `dx/dx-14-merged` | 2026-11-01 | `git revert -m 1 dx/dx-14-merged` | |
| DX-15 | **Already Mege** (Phase 3) | `d89d959` | `dx/dx-15-merged` | 2026-11-01 | `git revert -m 1 dx/dx-15-merged` | |
| DX-16 | **Already Mege** (Phase 3) | `e6618b8` | `dx/dx-16-merged` | 2026-11-01 | `git revert -m 1 dx/dx-16-merged` | |
| DX-17 | **Already Mege** (Phase 3) | `8613954` | `dx/dx-17-merged` | 2026-11-01 | `git revert -m 1 dx/dx-17-merged` | |
| DX-18 | **Already Mege** (Phase 3) | `12f079e` | `dx/dx-18-merged` | 2026-11-01 | `git revert -m 1 dx/dx-18-merged` | |
| DX-19 | **Already Mege** (Phase 3) | `a5fcff5` | `dx/dx-19-merged` | 2026-11-01 | `git revert -m 1 dx/dx-19-merged` | |
| DX-20 | **Already Mege** (Phase 4, only 20a) | `cc6a3d6` | `dx/dx-20-merged` | 2026-11-01 | `git revert -m 1 dx/dx-20-merged` | |
| DX-21 | **Already Mege** (Phase 4) | `f6bd79a` | `dx/dx-21-merged` | 2026-11-01 | `git revert -m 1 dx/dx-21-merged` | |
| DX-22 | **Already Mege** (Phase 4) | `bfafc89` | `dx/dx-22-merged` | 2026-11-01 | `git revert -m 1 dx/dx-22-merged` | |
| DX-23 | **Already Mege** (Phase 5) | `0e93cd6` | `dx/dx-23-merged` | 2026-11-01 | `git revert -m 1 dx/dx-23-merged` | |
| DX-24 | **Already Mege** (Phase 5) | `8ac5b82` | `dx/dx-24-merged` | 2026-11-01 | `git revert -m 1 dx/dx-24-merged` | |
| DX-25 | **Already Mege** (Phase 5) | `7ef5a87` | `dx/dx-25-merged` | 2026-11-01 | `git revert -m 1 dx/dx-25-merged` | |
| DX-26 | **Already Mege** (Phase 6) | `255c009` | `dx/dx-26-merged` | 2026-11-01 | `git revert -m 1 dx/dx-26-merged` | DX-24 `dragSort.ts`: To evacuate DX-24, we must withdraw it first. |
| DX-27 | **Already Mege** (phase 6, step 3 not done) | `7c27bea` | `dx/dx-27-merged` | 2026-11-01 | `git revert -m 1 dx/dx-27-merged` | It only contains documents, `.stylelintrc.json`、`dxStyleGuard.test.ts`；When we're gone, `AGENTS.md` Section 0 goes back to the old version. |

## Phase Label

| Label | Meaning | Called |
| --- | --- | --- |
| `dx/baseline` | plan document before any code changes ( `77c94ee`）| Local only (can't push up) |
| `dx/phase-0-before` | Phase 0 before start (= baseline) | Local only |
| `dx/phase-1-before` | stage 1 before starting ( `8c70057`）| Local only |
| `dx/phase-2-before` | stage 2 before starting ( `17af284`）| Local only |
| `dx/phase-3-before` | stage 3 before starting ( `a13f037`）| Local only |
| `dx/phase-4-before` | stage 4 before starting ( `8e7cdf3`）| Local only |
| `dx/phase-5-before` | stage 5 before starting ( `d4bcbda`）| Local only |
| `dx/phase-6-before` | stage 6 before starting ( `d8b0cbb`）| Local only |

## There's a "follow-up delivery" package: **to be evacuated first, then**.

Merge subsequently identified problems during a consolidation check or a screenshot and completed the repair package, which was submitted to the same line. The **conflict** (actually: DX-10, DX-16). In the correct order, **withdraws the restoration submission and then withdraws the merge**:

| The bag to be removed. | Departure from these repairs first (new in advance) | Again. |
| --- | --- | --- |
| DX-10 | `git revert --no-edit 6f62b17` | `git revert -m 1 dx/dx-10-merged` |
| DX-15 | `git revert --no-edit a8775e6` | `git revert -m 1 dx/dx-15-merged` |
| DX-16 | `git revert --no-edit 3972412`Again. `git revert --no-edit a8775e6`It changed the DX-16 style at the same time. | `git revert -m 1 dx/dx-16-merged` |

(`a8775e6` simultaneous repair of DX-15 and DX-16, so withdrawing any of them first; The withdrawal of DX-15 but the retention of DX-16 requires that the DX-16 component be retained manually. ）

## Rollback Exercise Record

| Date | Exercise | Results |
| --- | --- | --- |
| 2026-11-01 | Execute the top of the integrated branch in a temporary worktree `git revert -m 1 dx/dx-02-merged`、`git revert -m 1 dx/dx-01-merged`Run after every step. `tsc` | Both steps are clean and conflict-free. After DX-02 `Layout.tsx` Back to the 168 line; Both of them are retreating. `src`、`package.json`、`playwright.config.ts`、`.stylelintrc.json`、`scripts`、`.gitignore` and `77c94ee` **Word-by-word.**（ `git diff` It's empty. Temporary worktree abandoned, not pushed |
| 2026-11-01 | Phase 1: Implementation of post-mege history from behind in temporary worktree `git revert -m 1 dx/dx-08-merged` … `dx-03-merged`(six) | All six steps are clean and conflict-free. `tsc` Adopted; When we're done, `src`、`package.json`、`playwright.config.ts`、`.stylelintrc.json`、`scripts`、`index.html`、`.gitignore`、`e2e` and `dx/phase-1-before` **word-for-word**. Another DX-05: Clean. `tsc` Through, `RISK_SHAPE` Disappeared. Temporary worktree abandoned |
| 2026-11-01 | Phase 2: Implementation of post-mege history from behind in temporary worktree `git revert -m 1 dx/dx-14-merged` … `dx-09-merged`(six) | Six steps clean. `tsc` Adopted; When we're done, `src`, configurations, `scripts`、`index.html`、`e2e` and `dx/phase-2-before` **word-for-word**. Just DX-09 is clean. **Note**: This exercise was done before the DX-10 restoration was submitted; Fix submission only `dx-10-menu-motion.css` and `e2e/helpers.ts`We're going to go with DX-10. `aria-expanded` Change will stay, no harm) |
| 2026-11-01 | Stage 3: Two restorations to the history after metge, then forward `dx-19-merged` … `dx-15-merged`(five) | All clean; `tsc` Adopted; ♪ Once we're done with `dx/phase-3-before` **word-for-word**. DX-17 is clean. **also found that**: direct withdrawal of DX-16 without first withdrawing the repairs would be in conflict. Retrovert DX-10 also conflicts (table above) |
| 2026-11-01 | Stage 4: The history of the post-merge is moving forward. `dx-22-merged`、`dx-21-merged`、`dx-20-merged` | Three steps clean. `tsc` Adopted; ♪ Once we're done with `dx/phase-4-before` **Word-by-word.**(inclusive)  `e2e/helpers.ts` and 12 test files replaced by machines. DX-21 is clean. At this stage, **has not been submitted for restoration after** metge |
| 2026-11-01 | Stage 5: The history of the post-merge is moving forward. `dx-25-merged`、`dx-24-merged`、`dx-23-merged` | Three steps clean. `tsc` Adopted; ♪ Once we're done with `dx/phase-5-before` **word-for-word**. DX-24 is clean. **Reliance on finding**: single DX-22 git not conflicted, but `tsc` Report to 3, "Cannot find mode '..../lib/motion" (DX-24, DX-25) - so the withdrawal of DX-22 must be preceded by DX-24, DX-25 (refilled). `PHASES.md` (b) The dependency table). No post-merge restoration submission at this stage |
| 2026-11-01 | Phase 6: The history of the post-Merge `dx-27-merged`Again. `dx-26-merged`(Temporary worktree) | Both steps are clean. `tsc` Adopted; ♪ Once we're done with `dx/phase-6-before` **Word-by-word.**（ `git diff --name-only` is 0 files). DX-26 (DX-27) is clean. `tsc` Through.  |

## Why can't this session push the other branches and labels? 2026-11-01Investigations)

| Try what? | Results |
| --- | --- |
| `git push -u origin <new-branch> --tags`  | `HTTP 403`Remote hang up. |
| Alone. `git push origin dx/baseline`(one label only) | The same failure. **, so it's not the label special**, it's any ref that doesn't belong to this session. |
| Push Session Branch `claude/determined-johnson-yrdxwf` | It's been a success. |
| GitHub Tool (MCP) `create_branch` | Success (with another set of vouchers). `integration/v1.6` That's how it was built. |
| Current Agent Status `__agentproxy/status` Failed records | It's not about anything. `mcp.uk.definely.com`**no github.com**, which means it's not an export agent. |

**Conclusion (inference, not GitHub Official Note):** The git of this session is authorized to write only its own branch. The GitHub tool has separate documents that can build branches, open PRs, but there is no "upgrading" or "labelling" tool, so I can't push it when the branch is built.

### Reconstruct command (need account or session for missions, executed in repository)

```bash
git fetch origin claude/determined-johnson-yrdxwf
# 1. Label (Red)  git revert -m 1 dx/dx-NN-merged Yes.  GitHub I can use it.
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
# 2. Work package branch (optional); These submissions are already in progress.  claude/determined-johnson-yrdxwf In history)
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
