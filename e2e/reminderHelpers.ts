import { expect, type Page } from "@playwright/test"
import type { ReminderMode } from "../src/data/types"
import { closeRail } from "./helpers"
import { savedDemo } from "./demo-contract"

/**
 * Opens the reminder centre on the current reminder plan. Since S2 (2026-11-22) every loaded, reset or imported demo is upgraded
 * automatically, so this only checks that: the "Enable updated reminders" card must not appear. The name is kept for older specs.
 * `mode` saves another sending choice first (the sample club starts on "review_then_auto"), the way Settings would store it.
 */
export async function enableUpdatedReminders(page: Page, mode?: ReminderMode) {
  await page.goto("/#/")
  if (mode) {
    await savedDemo(page)
    await page.evaluate(mode => {
      const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
      s.org.settings.reminderMode = mode
      localStorage.setItem("platypus.v1.demo", JSON.stringify(s))
    }, mode)
    await page.reload()
  }
  await expect(page.getByTestId("reminder-centre")).toBeVisible()
  await closeRail(page)
  await expect.poll(async () => (await savedDemo(page)).reminderRuntime?.version).toBe(2)
  await expect(page.getByTestId("reminder-plan-status")).toHaveCount(0)
}

/**
 * R-S0 (2026-11-27): in the review modes a person's open email is an editable draft whose task links show as
 * `[Open task: <title>]` tokens. The real links are the task entries saved when that email was prepared, one per task in
 * the row's order, written the way the email writes them (taskAccessUrl: event, node, access). Tests that check the
 * address the app wrote read it from the recorded email or the Gmail draft instead.
 */
export async function draftTaskLinks(page: Page, recipientId: string): Promise<string[]> {
  const row = page.locator(`[data-testid="rq-person"][data-recipient="${recipientId}"]`)
  await expect(row.getByTestId("rq-draft-body")).toBeVisible()
  const nodes = await row.getByTestId("rq-person-task").evaluateAll(list => list.map(li => (li as HTMLElement).dataset.node!))
  const origin = new URL(page.url()).origin
  let links: string[] = []
  await expect.poll(async () => {
    const state = await savedDemo(page)
    links = nodes.map(nodeId => {
      const grant = [...(state.taskAccessGrants ?? [])].reverse().find(g => g.nodeId === nodeId && g.issuedOn === state.today)
      const eventId = state.events.find(e => e.id === state.nodes.find(n => n.id === nodeId)?.eventId)?.id
      const params = new URLSearchParams({ ...(eventId ? { event: eventId } : {}), node: nodeId, access: grant ? `${grant.id}.${grant.signature}` : "" })
      return grant ? `${origin}/#/events?${params}` : ""
    })
    return links.every(Boolean)
  }).toBe(true)
  return links
}

/** The open draft's body as the box shows it (task links as tokens). */
export const draftBody = (page: Page, recipientId: string) =>
  page.locator(`[data-testid="rq-person"][data-recipient="${recipientId}"]`).getByTestId("rq-draft-body")
