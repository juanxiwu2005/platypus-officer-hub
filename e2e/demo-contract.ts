import { expect, type Page } from "@playwright/test"
import type { DemoState } from "../src/data/types"

/** Read the app's current demo, including configured dates and seed events, after its first save. */
export async function savedDemo(page: Page): Promise<DemoState> {
  await expect.poll(() => page.evaluate(() => localStorage.getItem("platypus.v1.demo"))).not.toBeNull()
  return page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
}

/**
 * The newest saved event with this name, once the app has saved it. The New event form drafts the event and Create event in the
 * change list creates it (review option B, 2026-11-28); a test that used to read the review card checks the created event here.
 */
export async function savedEvent(page: Page, name: string): Promise<DemoState["events"][number]> {
  const read = () => page.evaluate(x => (JSON.parse(localStorage.getItem("platypus.v1.demo") ?? "{}").events ?? []).filter((e: { name: string }) => e.name === x).at(-1) ?? null, name)
  await expect.poll(read).not.toBeNull()
  return read()
}
