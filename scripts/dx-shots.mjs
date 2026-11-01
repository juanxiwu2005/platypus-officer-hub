// Before/after screenshots for the design-upgrade packages (docs/design-upgrade/README.md).
//   node scripts/dx-shots.mjs <label> <baseUrl>        e.g.  node scripts/dx-shots.mjs before http://localhost:5103
//   node scripts/dx-shots.mjs --compare <labelA> <labelB>   tells you which images differ (byte for byte)
// Writes dx-shots/<label>/<page>-<desktop|mobile>-<light|dark>-<rail-open|rail-closed>.png (the folder is git-ignored).
// Animations are switched off and the demo starts from a clean browser, so two runs of the same code give identical files.
// Set PW_CHROMIUM=<path> on a machine that already has a Chromium.
import { chromium } from "@playwright/test"
import { createHash } from "node:crypto"
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"

const args = process.argv.slice(2)
const dir = label => `dx-shots/${label}`

if (args[0] === "--compare") {
  const [a, b] = [args[1], args[2]]
  if (!a || !b) { console.error("usage: node scripts/dx-shots.mjs --compare <labelA> <labelB>"); process.exit(2) }
  const hash = (label, f) => createHash("sha256").update(readFileSync(`${dir(label)}/${f}`)).digest("hex")
  const files = readdirSync(dir(a)).filter(f => f.endsWith(".png"))
  const missing = files.filter(f => { try { readFileSync(`${dir(b)}/${f}`); return false } catch { return true } })
  const different = files.filter(f => !missing.includes(f) && hash(a, f) !== hash(b, f))
  console.log(`${files.length} images in "${a}": ${files.length - different.length - missing.length} identical, ${different.length} different, ${missing.length} missing in "${b}"`)
  for (const f of different) console.log("  different:", f)
  for (const f of missing) console.log("  missing:  ", f)
  process.exit(different.length || missing.length ? 1 : 0)
}

const [label, baseUrl] = args
if (!label || !baseUrl) { console.error("usage: node scripts/dx-shots.mjs <label> <baseUrl>"); process.exit(2) }
const PAGES = [["today", "/"], ["events", "/events"], ["tasks", "/tasks"], ["team", "/team"], ["rules", "/rules"], ["partners", "/partners"], ["handoff", "/handoff"], ["settings", "/settings"]]
const VIEWPORTS = { desktop: { width: 1440, height: 900, deviceScaleFactor: 1 }, mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }
mkdirSync(dir(label), { recursive: true })
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
let count = 0
for (const [vp, size] of Object.entries(VIEWPORTS)) {
  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({ ...size, colorScheme: scheme, reducedMotion: "reduce" })
    const page = await ctx.newPage()
    for (const [name, path] of PAGES) {
      for (const rail of ["rail-closed", "rail-open"]) {
        await page.goto(`${baseUrl}/#${path}`)
        await page.evaluate(() => window.localStorage.clear())
        await page.reload()
        await page.waitForLoadState("networkidle")
        await page.evaluate(() => document.fonts.ready)
        // The side panel opens on its own on wide screens and stays closed on a phone; put it where this shot wants it.
        const open = await page.locator("[data-testid=rail]").count() > 0
        if (rail === "rail-closed" && open) await page.getByRole("button", { name: "Hide side panel" }).click()
        if (rail === "rail-open" && !open) await page.locator(".ask-fab, [data-testid=ask-toggle]").filter({ visible: true }).first().click()
        await page.waitForTimeout(250)
        await page.screenshot({ path: `${dir(label)}/${name}-${vp}-${scheme}-${rail}.png` })
        count++
      }
    }
    await ctx.close()
  }
}
await browser.close()
writeFileSync(`${dir(label)}/INFO.txt`, `${count} screenshots of ${baseUrl}\n`)
console.log(`${count} screenshots written to ${dir(label)}/`)
