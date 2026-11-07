import { expect, test } from "@playwright/test"
import { closeRail } from "./helpers"

// Settings → Club → Tasks and events → "Who can create events": each radio sits next to its own label on one line.
// A general rule once made every non-checkbox input in .form-stack full width, so the radios took the whole row and
// their labels were squeezed to one letter per line at the far right.
test("Who can create events: small radios with their labels beside them, on one line", async ({ page }) => {
  await page.goto("/#/settings")
  await closeRail(page)
  const box = page.getByTestId("tasks-events-settings")
  await box.locator("summary").click()
  const group = box.locator("fieldset").filter({ hasText: "Who can create events" })
  for (const name of ["President and VP", "President, VP and officers I choose", "Every officer"]) {
    const radio = group.getByRole("radio", { name })
    await expect(radio).toBeVisible()
    const r = (await radio.boundingBox())!
    const label = (await group.locator("label").filter({ hasText: name }).boundingBox())!
    expect(r.width).toBeLessThanOrEqual(24)                       // a radio, not a full-width box
    expect(label.height).toBeLessThanOrEqual(48)                  // the label stays on one or two lines, not a letter per line
    expect(label.x).toBeLessThanOrEqual(r.x)                       // text follows the radio inside the same label
  }
  await page.screenshot({ path: test.info().outputPath("who-can-create-events.png"), fullPage: true })
})
