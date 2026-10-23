import { chromium } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
for (const path of ["/", "/events", "/tasks", "/team", "/funding", "/handoff", "/partners", "/rules", "/settings", "/help"]) {
  await p.goto("http://localhost:4173/#" + path); await p.waitForTimeout(700)
  const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa"]).analyze()
  console.log(path, r.violations.map(v => `${v.id}(${v.nodes.length}): ${v.nodes.slice(0, 2).map(n => n.target.join(" ")).join(" ; ")}`).join("\n   ") || "clean")
}
await b.close()
