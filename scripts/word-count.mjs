// Word count per page (AGENTS.md §7.5). Usage: npm run build && npm run words [-- --report-only] [outDir]
// Counts the words in the page's main area (not the nav, top bar or side panel).
// It prints two numbers per page:
//   all     = every word in the page's HTML, including hover cards, closed <details> and other hidden text.
//             This is the real amount of text the page carries.
//   visible = only what shows on screen at first glance (the old way of counting).
// Each page has two limits (Juanxi 2026-10-29): [what shows at first glance, every word the page carries].
// A page fails if it is over either. Pass --report-only to print without failing.
import { chromium } from "@playwright/test"
import { spawn } from "node:child_process"

const args = process.argv.slice(2)
const enforce = !args.includes("--report-only")
const out = args.find(a => !a.startsWith("--"))
// /funding redirects to /events; its content is counted once under /events.
const LIMITS = { "/": [160, 450], "/events": [180, 420], "/rules": [170, 560], "/tasks": [130, 130], "/team": [130, 290], "/handoff": [120, 120], "/partners": [120, 120], "/settings": [150, 150], "/help": [9999, 9999] }
const PORT = 4177
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
let over = 0
for (const [path, [vLimit, aLimit]] of Object.entries(LIMITS)) {
  await page.goto(`${base}/#${path}`)
  await page.waitForTimeout(900)
  const r = await page.evaluate(() => {
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
  const isOver = r.visible > vLimit || r.all > aLimit
  if (isOver) over++
  console.log(`${isOver ? "OVER" : "ok  "} ${path.padEnd(10)} visible ${String(r.visible).padStart(4)}/${String(vLimit).padStart(4)} · all ${String(r.all).padStart(4)}/${String(aLimit).padStart(4)} · ${(r.height / 900).toFixed(1)} screens`)
  if (out) await page.screenshot({ path: `${out}/${path === "/" ? "today" : path.slice(1)}.png`, fullPage: true })
}
await browser.close()
stop()
console.log(over ? `${over} page(s) over a limit.${enforce ? " Failing." : " Report only: the check does not fail."}` : "All pages within their limits.")
process.exit(enforce && over ? 1 : 0)
