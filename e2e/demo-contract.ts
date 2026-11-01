import { expect, type Page } from "@playwright/test"
import type { DemoState } from "../src/data/types"

/** Read the app's current demo, including configured dates and seed events, after its first save. */
export async function savedDemo(page: Page): Promise<DemoState> {
  await expect.poll(() => page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).not.toBeNull()
  return page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
}
