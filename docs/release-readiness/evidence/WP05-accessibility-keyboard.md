# WP05 Accessibility and keyboard verification

Date: 2026-11-01. Independent branch: `codex/rr-wp05-a11y`. Explicit initial fetch `refs/heads/integration/v1.0:refs/remotes/origin/integration/v1.0`; HEAD/remote both `1975bc122f5823e033c29493a5d20ce84b85ec23`. No main operations, pushes, real AIR.

## Product fixes/regressions

- Owners Escape consumes only current candidate list; rail respects handled key events. Regression clearly fails on prior production build: `Jordan, Treas`, Enter, Escape removes `task-form`. After fix: list closes, form remains, input focused, three owner tags and `Create 2 tasks` retained.
- Actual flow-node button 20×20→token `--s7` (24×24), full WCAG 2.2 AA Axe retained.
- Mobile layout folded desktop lanes using `abs(row) * 2 + offset`, putting Event Lead/Special Event both row 10. Axe measured Backup partly covered by Accessibility Check, only 24×10.7px clickable. Now independent consecutive lanes for all active mobile paths; new full-template layout unit test, scans cover every setup step.
- Flow action menu truly isolates background; Tab/Shift+Tab loops internally; Escape consumed and restores node focus. Mobile Details from menu first releases background/restores node, then hands off to rail, so next Escape returns node.
- Explicit Tab cycle for mobile/tablet rail; retain inert background, Escape close, trigger focus restoration. Enter in mobile flow editing opens details directly; finger tap retains menu.
- Update focus-return record when details opened by another page trigger; nested rail editors retain page trigger. Regression opens two flow nodes successively, Escape returns second.
- Supplemental read-only Funding check: Sam/Jordan on Pixel 7, after expanding `Pre-submission check`, one Tab from native summary reached BODY.11 fieldset children matched `:disabled` without own `disabled`; old candidate filtering omitted summary/included unfocusable controls. Both new regressions failed original build. Now include native summary, filter effective `:disabled`, visibility, existing hidden/inert/dimension conditions; explicit summary→Ask/Ask→summary checks, each of 25 Tab +25 Shift+Tab stays in rail, Escape returns Funding application.
- Accessibility tests migrated to current TaskDetail, default Board, Events → Budget → Funding application, Settings → Workflow / Tasks. Retain/expand keyboard assertions: full Tab traversal region order, `/` in input/textarea does not steal focus, Board card→Details Done completes task.
- Removed mobile `target-size` result filter in `flow-edit.spec.ts`. No added Axe filters, disabled rules, skip, force click, longer timeout.

Interaction requirements: WCAG 2.1.1 keyboard operation, 2.1.2 no keyboard trap, 2.4.3 focus order/restoration, 2.5.8 target size. Automated Axe covers WCAG 2.0/2.1/2.2 A/AA; not a substitute for manual screen readers/full WCAG certification.

## Reproducible environment/commands

Node `22.23.4`; independent `npm ci`; Chromium `/usr/bin/chromium`; baseline `@axe-core/playwright 4.10.2` (axe-core 4.10.3), Playwright `1.56.1`.

All npm checks via `npm exec --yes --package=node@22 -- sh -c '…'`. Temporary Playwright config inherits repository config, selects desktop/mobile only, uses exclusive 4505 or 4506 for baseURL/preview, `reuseExistingServer: false`, original 30-second timeout; not committed.

Temporary config (other copy changes 4506→4505 only):

```ts
import config from './playwright.config'
export default {
  ...config,
  use: { ...config.use, baseURL: 'http://localhost:4506' },
  webServer: [{ command: 'npx vite preview --port 4506 --strictPort', url: 'http://localhost:4506', reuseExistingServer: false, timeout: 60000 }],
  projects: config.projects?.filter(p => p.name === 'desktop' || p.name === 'mobile'),
}
```

```sh
npm ci
npm run lint
npm run build
npm test
PW_CHROMIUM=/usr/bin/chromium npx playwright test --config .pw-wp05-regression.config.ts e2e/a11y.spec.ts --workers=2
PW_CHROMIUM=/usr/bin/chromium npx playwright test --config .pw-wp05.config.ts e2e/flow-edit.spec.ts e2e/m2b.spec.ts --workers=2
git diff --check
```

## Results

- `npm ci`, lint, build: passed.
- Initial product fixes: all 809 unit tests/56 files passed (including mobile-lane regression), 28.40 seconds. Per stage lead, no unrelated full-unit repeat after supplemental Funding revision; final integration reruns it.
- Full desktop/mobile `a11y.spec.ts` after supplemental revision: 61 passed, 3 existing device exclusions, 57.5 seconds; all scanned WCAG A/AA violations 0 (including serious/critical, target-size). Four new Sam/Jordan ×desktop/mobile cases all use actual 412×915 mobile viewport, all passed. 3 exclusions unchanged: desktop omits mobile-specific, mobile omits two tablet cases, no new exclusions.
- Node 22 `npm run lint`, `npm run build` rerun after supplemental revision: passed; browser recheck `PW_CHROMIUM=/usr/bin/chromium npx playwright test --config .pw-wp05-late.config.ts e2e/a11y.spec.ts --workers=2`, temporary config above, port 4505.
- `flow-edit.spec.ts` + `m2b.spec.ts` desktop/mobile: 29 passed, 3 existing mobile mouse-operation exclusions, 52.4 seconds.
- `git diff --check`: passed.

## Integration boundaries

WP06 concurrently changes `MetroChart.tsx` on-demand tooltip mounting/focus-hover descriptions; coordinated directly, this package owns menus, keyboard clicks, layout, dimensions. Preserve both behaviors and rerun all Axe/keyboard assertions after integration.

WP08 upgrades Playwright/Axe; this package changes no package.json, lock, toolchain config. Final integration must reverify with upgraded tools, never treat old-baseline results as new-toolchain results. WP06 owns word gates; release certification/real AIR reserved for later stages/manual authorization.
