// R1.1 screenshots of the Give points form as built (docs/feedback-fix/CHEERS_R1_CONTRACT.md §8), viewer Maya, desktop 1440×900 at 2×.
// Usage: start `npx vite --port 5199`, then `node docs/prototypes/cheers-r1-final/source/snap-r1.1.cjs`.
// Set PW_CHROMIUM to a Chromium executable to use one already installed. Fictional seed club; nothing is sent anywhere.
const path = require("path")
const { chromium } = require(path.resolve(__dirname, "../../../../node_modules/playwright"))
const OUT = path.resolve(__dirname, "..")
const BASE = process.env.BASE || "http://localhost:5199/"
const NOTE = "You set up the sign-in table before anyone arrived, so check-in took two minutes instead of ten."

;(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  await page.goto(`${BASE}#/team`)
  await page.locator("main h1").waitFor()
  await page.evaluate(() => {
    const key = "platypus.v1.demo"
    const s = JSON.parse(localStorage.getItem(key))
    s.viewerId = "maya"
    localStorage.setItem(key, JSON.stringify(s))
  })
  await page.reload()
  await page.locator("main h1").waitFor()
  await page.getByTestId("cheer-give").click()
  const form = page.getByTestId("give-cheer")
  await form.waitFor()
  await form.getByLabel("To", { exact: true }).selectOption("jordan")
  for (let i = 0; i < 4; i++) await form.getByRole("button", { name: "More points" }).click() // 300
  await form.getByLabel(/What did they do/).fill(NOTE)
  await form.getByRole("button", { name: "Star" }).click()
  await form.getByLabel("Let others know too (optional)").selectOption("alex")
  await form.getByLabel("Let others know too (optional)").selectOption("priya")
  await page.mouse.move(4, 880)
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, "F2b-give-v2-desktop.png") })
  await form.getByTestId("cheer-send").click()
  await page.getByTestId("cheer-confirm").waitFor()
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, "F2c-confirm-desktop.png") })
  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
