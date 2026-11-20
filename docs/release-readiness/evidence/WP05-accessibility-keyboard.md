# WP05 Accessibility and Keyboard Validation

Date: 2026-11-01. Independent branch: `codex/rr-wp05-a11y`. Starts with a visible fetch `refs/heads/integration/v1.0:refs/remotes/origin/integration/v1.0`, and both HEAD and remote are `1975bc122f5823e033c29493a5d20ce84b85ec23`. Unoperatedmain, unposted, uncalled live Air.

## Product repair and return

- Owners' Escape only consumes the current list of candidates; The right bar respects the processed keys. A clear failure to return to pre-modified production construction: `task-form` disappears after entering `Jordan, Treas`, Enter and Escape. Post-repair check list closed, form still in place, input is still focused, three owner labels and `Create 2 tasks` are kept.
- The live button size of the flow node has been changed from 20 x 20 to to token `--s7` (24 x 24), keeping the full WCAG 2.2 AA Axe check.
- The cellular flow layout was originally used to fold desktop swimming lanes with `abs(row) * 2 + offset`, and Event Lead and Special Event landed simultaneously at row 10. Axe Facture Backup is partially blocked by Accessibility Check, with only 24 x 10. 7px available. All active mobile phones now use independent continuous swimming lanes. Adds a full template layout single measure, and the page scan covers all setup steps.
- The process action menu is now truly isolated and Tab/Shift+Tab circulates in the menu; Escape consumption event and restoring process node focus. When a cell phone opens Details from the menu, release the background and restore the node focus to the right bar to make sure that Escape returns again.
- Adds a visible Tab loop to the right side of the cell/ tablet, retaining background inert, Escape close and trigger button focus recovery. Enter edits the cell phone process to open the details directly; The finger tab reserves the action menu.
- Update focus recovery records when switching to details triggered by another page; The embedded editor opened inside the right bar retains the page trigger element. Returns to open details from two flow nodes in a row, and Escape must return to the second node.
- Read-only Funding Panel: After Sam/Jordan expands `Pre-submission check` under Pixel 7, drops one time from the original base tab to BoDY. 11 Fieldset subcontrols match `:disabled` but do not have its own `disabled` properties; The original candidate filter also missed the submary to include these non-focus controls. The new returns failed both in the original construction. It is now included in the original submary to be screened for `:disabled`, reference and original hidden/inert/size conditions; The return check is clearly  →  Ask and Ask  → summary, and the 25 Tab + 25 are verified sequentially that Shift+Tab remains in the range and Escape returns Funding application.
- The accessibility test moves to the current TaskDetail, default Boards, Events  →  Budget  →  Funding application, Settings  →  Workflow/Tasks. Keeps and expands the keyboard 's assertion: complete single tab through regional order, input box, and texttarea `/` without focus, Board finishes it from the card via the Done button of Details.
- Delete `flow-edit.spec.ts` original cell phone `target-size` results filter. No Axe filters, disallowed rules, skip, force click or extended timeout.

Corresponds to interactive requirements: WCAG 2.1.1 keyboard operational, 2.1.2 exit focus area, 2.4.3 focus order and recovery after closing, 2.5.8 target size. Axe automatically scan over WCAG 2.0/2.1/2.2 A/AA; This is not a substitute for manual screen reading and complete WCAG authentication.

## Recoverable environment and command

Node `22.23.4`；Independent `npm ci`; Chromium `/usr/bin/chromium`；This package of baseline tools `@axe-core/playwright 4.10.2` (axe-core 4.10.3), Playwright `1.56.1`.

All npm checks are performed with `npm exec --yes --package=node@22 -- sh -c '…'`. The temporary Playwright configuration inherits the original configuration, selecting only the desktop/mobile project, changing baseURL/ preview to exclusive 4505 or 4506 port and `reuseExistingServer: false` with the original 30 second test timeout; Provisional documents are not submitted.

Temporary configuration (the other 4506 for 4505 only):

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

## Validate Results

- `npm ci`, Lint, Build: adopted.
- Unit tests: 56 files, 809 all through (including re-entry of new mobile phones), 28.40 seconds. Read-only Funding review revises by stage main agent instructions that do not repeat irrelevant full units and eventually integrates to run again.
- `a11y.spec.ts` desktop/mobile full reversion after revision: 61 passed, 3 equipment excluded, 57.5 seconds; All scanned WCAG A/AA information is 0 (including serious/ criminal and target-size). The four new Sam/Jordan x desktop/mobile all use the 412 x 915 mobile phone and all pass through. The 3 exclusions are still the desktop project non-repeated cases of exclusive mobile phones and the mobile project non-repeal two flatstered cases without additional exclusions.
- Reexecut Node after revision 22Down `npm run lint`、`npm run build`: adopted;  The browser repeats the command to `PW_CHROMIUM=/usr/bin/chromium npx playwright test --config .pw-wp05-late.config.ts e2e/a11y.spec.ts --workers=2` and is temporarily configured as above, port 4505.
- `flow-edit.spec.ts` + `m2b.spec.ts` desktop/mobile: 29 eliminated by 3 original mobile mouse operation, 52.4 seconds.
- `git diff --check`: adopted.

## Integrated Borders

WP06 also changes the tooltip of `MetroChart.tsx` to mount, facus/hover description of association as required; This package is directly coordinated and changes menus, keyboard clicks, layouts and dimensions. After integration, two packages of behavior must be retained and all Axe and keyboard assertions must be repeated.

WP08 will be upgraded Playwright/Axe; The package has not been modified to coverage.json, lock or tool chain configurations. The final integration must be validated again with an upgraded tool, and the old baseline results of this package cannot be considered as new tool chain results. Word door is disabled by WP06; Issuance of certifications and live Air reserved for follow-up phase/manual authorization.
