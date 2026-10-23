import { expect, test } from "@playwright/test"

const PAGES: [string, string][] = [
  ["/", "Who should I nudge today?"],
  ["/events", "Where is each event, and who is up next?"],
  ["/tasks", "What should I do next?"],
  ["/team", "Who is overloaded, who deserves credit, and when can we meet?"],
  ["/funding", "Where is each request, and will we spend what we asked for?"],
  ["/handoff", "How do we hand over without starting from zero?"],
  ["/partners", "Which relationships need a touch?"],
  ["/rules", "What does ASU require?"],
  ["/settings", "How should Platypus work for this club?"],
  ["/help", "How does Platypus work?"],
]

for (const [path, h1] of PAGES) {
  test(`page ${path} loads`, async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", e => errors.push(e.message))
    await page.goto(`/#${path}`)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(h1)
    expect(errors).toEqual([])
  })
}

test("view-as switches whose tasks are shown, and reset restores the demo", async ({ page }) => {
  await page.goto("/#/tasks")
  await page.getByTestId("view-as").selectOption("maya")
  await expect(page.getByTestId("my-tasks")).toContainText("Food Exception Request")
  await page.reload()
  await expect(page.getByTestId("view-as")).toHaveValue("maya")
  await page.getByTestId("reset-demo").click()
  await expect(page.getByTestId("view-as")).toHaveValue("alex")
})

test("no horizontal scroll", async ({ page }) => {
  await page.goto("/#/")
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test("legacy prototype is still reachable", async ({ page }) => {
  const res = await page.goto("/legacy/")
  expect(res?.status()).toBe(200)
})
