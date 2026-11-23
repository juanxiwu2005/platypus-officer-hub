// Word count per page (see the configured LIMITS below and docs/DESIGN_TOKENS.md). Usage: npm run build && npm run words [-- --report-only] [outDir]
// Counts the words in the page's main area (not the nav, top bar or side panel).
// It prints two numbers per page:
//   all     = every word in the page's HTML, including hover cards, closed <details> and other hidden text.
//             This is the real amount of text the page carries.
//   visible = only what shows on screen at first glance (the old way of counting).
// Each page has two limits (Juanxi 2026-10-29): [what shows at first glance, every word the page carries].
// A page fails if it is over either. Pass --report-only to print without failing.
// Each page is measured on its own fresh demo, in the state an officer actually uses:
//   /          the reminder centre a president sees. Since S2 every load is on the current reminder plan, so the
//              script only waits for the real centre to render (and fails loudly if it never does).
//   /settings  the enforced row is the first tab (Club). Every other Settings tab gets an extra "info" row
//              that is report-only and never fails the check (their budgets are not set yet).
import { chromium } from "@playwright/test"
import { spawn } from "node:child_process"

const args = process.argv.slice(2)
const enforce = !args.includes("--report-only")
const out = args.find(a => !a.startsWith("--"))
// /funding redirects to /events; its content is counted once under /events.
const LIMITS = { "/": [200, 500], "/events": [180, 420], "/rules": [340, 1700], "/tasks": [130, 130], "/team": [130, 290], "/handoff": [120, 120], "/settings": [150, 150], "/help": [9999, 9999] }
const PORT = Number(process.env.WORDS_PORT) || 4177
const base = `http://localhost:${PORT}`

// Start our own preview server so this works from `npm run check` and from CI without any other setup.
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore" })
const stop = () => server.kill()
process.on("exit", stop)
for (let i = 0; ; i++) {
  try { if ((await fetch(base)).ok) break } catch { /* not up yet */ }
  if (i > 60) { console.error("preview server did not start; run `npm run build` first"); process.exit(2) }
  await new Promise(r => setTimeout(r, 500))
}

const exe = process.env.PW_CHROMIUM || process.env.CHROMIUM
const browser = await chromium.launch(exe ? { executablePath: exe } : {})

/** Count the words in <main> as it is on screen right now. */
const measure = page => page.evaluate(() => {
  const m = document.querySelector("main")
  const shown = el => { for (let e = el; e && e !== m.parentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false } return true }
  const all = [], visible = []
  const walk = document.createTreeWalker(m, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const el = n.parentElement
    if (!el || el.closest("option, script, style")) continue
    all.push(n.textContent)
    if (shown(el) && el.getClientRects().length) visible.push(n.textContent)
  }
  for (const sel of m.querySelectorAll("select")) { const t = sel.selectedOptions[0]?.textContent ?? ""; all.push(t); if (shown(sel)) visible.push(t) }
  const count = parts => parts.join(" ").split(/\s+/).filter(w => /[A-Za-z0-9$]/.test(w)).length
  return { all: count(all), visible: count(visible), height: document.documentElement.scrollHeight }
})
const screens = r => `${(r.height / 900).toFixed(1)} screens`
const shot = async (page, name) => { if (out) await page.screenshot({ path: `${out}/${name}.png`, fullPage: true }) }
const slug = s => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

/** Wait for the real reminder centre (loads upgrade the reminder plan themselves since S2). */
async function openReminderCentre(page) {
  await page.getByTestId("reminder-centre").waitFor({ state: "attached", timeout: 10_000 })
  // The home row must measure the real reminder centre; if it never appears, this throws and the check fails loudly.
  await page.getByTestId("rq-summary").waitFor({ state: "visible", timeout: 10_000 })
  await page.locator('[data-testid="reminder-centre"][aria-busy="false"]').waitFor({ timeout: 10_000 })
  await page.waitForTimeout(900)
}

/** Every Settings tab after the first (Club), opened the way a user does: with the section buttons. Report only. */
async function reportSettingsTabs(page) {
  const nav = page.getByRole("navigation", { name: "Settings sections" })
  const labels = (await nav.getByRole("button").allInnerTexts()).map(s => s.trim()).slice(1)
  for (const label of labels) {
    // Report only: a tab that fails to open is reported, never a reason for the check to fail.
    try {
      await nav.getByRole("button", { name: label, exact: true }).click()
      await page.getByText("Loading workflows…").waitFor({ state: "hidden", timeout: 10_000 })
      await page.waitForTimeout(900)
      const r = await measure(page)
      console.log(`info /settings · ${label.padEnd(15)} visible ${String(r.visible).padStart(4)} · all ${String(r.all).padStart(4)} · ${screens(r)} (not enforced)`)
      await shot(page, `settings-${slug(label)}`)
    } catch (error) {
      console.log(`info /settings · ${label.padEnd(15)} not measured: ${error instanceof Error ? error.message.split("\n")[0] : error}`)
    }
  }
}

let over = 0
for (const [path, [vLimit, aLimit]] of Object.entries(LIMITS)) {
  // A fresh context per page, so pressing a button on one page cannot change what another page shows.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await page.goto(`${base}/#${path}`)
  await page.waitForTimeout(900)
  if (path === "/") await openReminderCentre(page)
  const r = await measure(page)
  const isOver = r.visible > vLimit || r.all > aLimit
  if (isOver) over++
  console.log(`${isOver ? "OVER" : "ok  "} ${path.padEnd(10)} visible ${String(r.visible).padStart(4)}/${String(vLimit).padStart(4)} · all ${String(r.all).padStart(4)}/${String(aLimit).padStart(4)} · ${screens(r)}`)
  await shot(page, path === "/" ? "today" : path.slice(1))
  if (path === "/settings") await reportSettingsTabs(page)
  await context.close()
}
await browser.close()
stop()
console.log(over ? `${over} page(s) over a limit.${enforce ? " Failing." : " Report only: the check does not fail."}` : "All pages within their limits.")
process.exit(enforce && over ? 1 : 0)
