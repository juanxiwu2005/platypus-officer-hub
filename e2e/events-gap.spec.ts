import { expect, test } from "@playwright/test"
import { closeRail } from "./helpers"

// Juanxi 2026-11-01: opening Events on a wide screen left a big empty strip between the navigation and the list of events.
// The list of events now sits next to the navigation (the same distance as on a narrow screen), with the side panel open or closed.
test.skip(({ isMobile }) => isMobile, "wide-screen layout")
for (const width of [1440, 1728, 1920, 2560]) {
  for (const panel of ["open", "closed"] as const) {
    test(`Events: the event list sits next to the navigation at ${width}px with the side panel ${panel}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.goto("/#/events")
      await page.evaluate(() => window.localStorage.clear())
      await page.reload()
      if (panel === "closed") await closeRail(page)
      await expect(page.getByRole("navigation", { name: "Events", exact: true })).toBeVisible()
      const gap = await page.evaluate(() => {
        const side = document.querySelector("nav.sidenav")!.getBoundingClientRect()
        const list = document.querySelector(".event-nav")!.getBoundingClientRect()
        return Math.round(list.left - side.right)
      })
      expect(gap, "the strip between the navigation and the event list").toBeLessThanOrEqual(32)
    })
  }
}
