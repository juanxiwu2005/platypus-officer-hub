// Word count per page (AGENTS.md §7). Usage: npm run build && npx vite preview --port 4173 & node scripts/word-count.mjs [outDir]
// Counts the words a person sees in the page's main area (not the nav, top bar or side panel).
import { chromium } from "@playwright/test"
const out = process.argv[2]
const LIMITS = { "/": 160, "/events": 180, "/rules": 170, "/tasks": 130, "/team": 130, "/funding": 160, "/handoff": 120, "/partners": 120, "/settings": 125, "/help": 9999 }
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
let failed = 0
for (const [path, limit] of Object.entries(LIMITS)) {
  await page.goto(`http://localhost:4173/#${path}`)
  await page.waitForTimeout(900)
  const r = await page.evaluate(() => {
    // Only text a person can actually see: skip hidden hover cards, closed <details>, and unselected <option>s.
    const m = document.querySelector("main")
    const visible = el => { for (let e = el; e && e !== m.parentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false } return true }
    const parts = []
    const walk = document.createTreeWalker(m, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement
      if (!el || el.closest("option, script, style") || !visible(el) || !el.getClientRects().length) continue
      parts.push(n.textContent)
    }
    for (const sel of m.querySelectorAll("select")) if (visible(sel)) parts.push(sel.selectedOptions[0]?.textContent ?? "")
    const text = parts.join(" ")
    return { words: text.split(/\s+/).filter(w => /[A-Za-z0-9$]/.test(w)).length, height: document.documentElement.scrollHeight }
  })
  const ok = r.words <= limit
  if (!ok) failed++
  console.log(`${ok ? "ok  " : "OVER"} ${path.padEnd(10)} ${String(r.words).padStart(4)} words (limit ${limit}) · ${(r.height / 900).toFixed(1)} screens`)
  if (out) await page.screenshot({ path: `${out}/${path === "/" ? "today" : path.slice(1)}.png`, fullPage: true })
}
await browser.close()
process.exit(failed ? 1 : 0)
