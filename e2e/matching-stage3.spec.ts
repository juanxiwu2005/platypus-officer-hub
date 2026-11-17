import { expect, test, type Page } from "@playwright/test"
import type { DemoState } from "../src/data/types"
import type { MatchingState } from "../src/matching/contracts"
import { seedDemo } from "../src/data/seed"
import { stage3Club, stage3Command, stage3References, STAGE3_EVENT_DATE } from "../src/matching/stage3Fixtures"
import { closeRail, noOverflow, viewAs } from "./helpers"
import { savedDemo } from "./demo-contract"

/** Inputs use only the repository's fictional club. Every endpoint is intercepted below. */
async function seed(page: Page, state: DemoState) {
  await page.addInitScript(value => {
    if (sessionStorage.getItem("matching-stage3-seeded")) return
    localStorage.setItem("platypus.v1.demo", JSON.stringify(value))
    sessionStorage.setItem("matching-stage3-seeded", "1")
  }, state)
}
async function open(page: Page, path: string) {
  await page.goto(`/#/${path}`)
  await closeRail(page)
  await expect(page.locator("main h1")).toBeVisible()
}
async function openNewEvent(page: Page, name: string) {
  await open(page, "events")
  await page.getByTestId("new-event").click()
  const form = page.getByTestId("plan-form")
  await form.getByLabel("Event name").fill(name)
  await form.getByLabel("Date", { exact: true }).fill(STAGE3_EVENT_DATE)
  await form.getByRole("button", { name: "Continue", exact: true }).click()
  return page.getByTestId("change-item").last()
}
async function eventTask(page: Page, eventName: string, stepKey: string) {
  const state = await savedDemo(page), event = state.events.find(e => e.name === eventName)
  return state.nodes.find(n => n.eventId === event?.id && n.stepKey === stepKey)
}
async function newTask(page: Page, title: string, responsibilityId: string | null, memberId: string | null, manualOverride = false) {
  await open(page, "tasks")
  await page.getByTestId("new-task").click()
  const form = page.getByTestId("new-task-form")
  await form.getByLabel("New task name", { exact: true }).fill(title)
  await form.getByLabel("Responsibility", { exact: true }).selectOption(responsibilityId ?? "")
  if (manualOverride) await form.getByLabel("Assign manually for this task", { exact: true }).check()
  await form.getByLabel("Assign one person", { exact: true }).selectOption(memberId ?? "")
  await form.getByRole("button", { name: "Add", exact: true }).click()
  await expect.poll(async () => (await savedDemo(page)).nodes.filter(n => n.title === title).length).toBe(1)
  return (await savedDemo(page)).nodes.find(n => n.title === title)!
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { message: "Offline integration check. Continue manually." } }))
  await page.route("**/api/health", route => route.fulfill({ json: { ok: true, configured: false, provider: null, model: null } }))
})

test("the real organization can enable matching and save its own library without changing old work", async ({ page }) => {
  await seed(page, seedDemo(undefined, "v2"))
  await open(page, "matching")
  // Existing legacy normalization is completed before the preservation checkpoint.
  await page.reload(); await closeRail(page)
  const before = await savedDemo(page)
  await page.getByRole("button", { name: "Enable responsibility matching", exact: true }).click()
  const library = page.locator("#matching-library")
  await library.getByRole("button", { name: "New responsibility", exact: true }).click()
  await library.getByLabel("Responsibility name", { exact: true }).fill("Robot inspection")
  await library.getByLabel("What does this responsibility cover?").fill("Inspect the demonstration robot.")
  await library.getByLabel("What should be delivered?").fill("A checked robot and inspection record.")
  await library.getByRole("button", { name: "Save draft", exact: true }).click()
  await library.getByRole("button", { name: "Confirm responsibility", exact: true }).click()
  const member = page.locator(".matching-member").filter({ has: page.locator("summary", { hasText: "Maya Chen" }) })
  await member.locator("summary").click()
  await member.getByLabel("Direct responsibility exception").selectOption("include")
  await member.getByRole("combobox", { name: "Availability", exact: true }).selectOption("available")
  await page.getByRole("combobox", { name: "Default person", exact: true }).selectOption("maya")
  await page.getByRole("button", { name: "Save default rule", exact: true }).click()
  await page.reload(); await closeRail(page)
  await expect(library.getByRole("button", { name: "Robot inspection Confirmed", exact: true })).toBeVisible()
  const after = await savedDemo(page)
  expect(after.org.settings.matchingMode).toBe("responsibilities")
  expect(after.nodes).toEqual(before.nodes)
  expect(after.people).toEqual(before.people)
  expect(after.roles).toEqual(before.roles)
  expect(after.matching!.assignments).toEqual([])
  expect(after.matching!.policies[0].primaryMemberId).toBe("maya")
  expect(await noOverflow(page)).toBeLessThanOrEqual(1)
})

test("a qualified standalone task is created once and still needs the selected member to claim it", async ({ page }) => {
  await seed(page, stage3Club())
  const node = await newTask(page, "Inspect the fictional room request", "fixture-space", "maya")
  expect(node).toMatchObject({ ownerId: "maya", status: "unclaimed", matching: { responsibilityId: "fixture-space" } })
  expect((await savedDemo(page)).matching!.assignments.filter(a => a.taskId === node.id)).toHaveLength(1)
  await viewAs(page, "maya")
  await page.goto(`/#/tasks?node=${encodeURIComponent(node.id)}`)
  await page.getByRole("button", { name: "I've got it", exact: true }).click()
  await expect.poll(async () => (await savedDemo(page)).nodes.find(n => n.id === node.id)?.status).toBe("accepted")
  await page.reload()
  const restored = await savedDemo(page)
  expect(restored.nodes.find(n => n.id === node.id)!.ownerId).toBe("maya")
  expect(restored.matching!.assignments.filter(a => a.taskId === node.id)).toHaveLength(1)
})

test("an explicit one-task assignment keeps the responsibility gap visible without granting a permanent qualification", async ({ page }) => {
  const state = stage3Club()
  await seed(page, state)
  const node = await newTask(page, "One-off demonstration errand", null, "sam", true)
  expect(node).toMatchObject({ ownerId: "sam", status: "unclaimed", matching: { responsibilityId: null, reason: "manual_override" } })
  const after = await savedDemo(page)
  expect(after.matchingContext!.overrides.at(-1)).toMatchObject({ taskId: node.id, memberId: "sam", responsibilityId: null })
  expect(after.matching!.memberResponsibilities).toEqual(state.matching!.memberResponsibilities)
})

test("an ordinary member's unclassified task stays unassigned instead of being silently given to them", async ({ page }) => {
  await seed(page, { ...stage3Club(), viewerId: "sam" })
  const node = await newTask(page, "Unclassified fictional process", null, null)
  expect(node).toMatchObject({ ownerId: null, status: "unclaimed", matching: { responsibilityId: null } })
  expect((await savedDemo(page)).matching!.assignments.some(a => a.taskId === node.id)).toBe(false)
})

test("event review confirms the displayed primary and creates an actual owner with a receipt", async ({ page }) => {
  await seed(page, stage3Club())
  const change = await openNewEvent(page, "Fictional primary demonstration")
  const assignments = change.getByTestId("matching-event-assignments")
  await expect(assignments.getByLabel("Assignee for Book Room & Layout", { exact: true })).toHaveValue("maya")
  await expect(assignments.getByLabel("Assignee for Event Plan", { exact: true })).toHaveValue("")
  await change.getByRole("button", { name: "Apply this change", exact: true }).click()
  await expect.poll(async () => (await eventTask(page, "Fictional primary demonstration", "venue"))?.ownerId).toBe("maya")
  const node = (await eventTask(page, "Fictional primary demonstration", "venue"))!
  expect(node.status).toBe("unclaimed")
  expect((await savedDemo(page)).matching!.assignments.find(a => a.taskId === node.id)).toMatchObject({ memberId: "maya", method: "default", status: "confirmed" })
})

test("an unavailable primary leaves the backup unconfirmed until the reviewer explicitly selects them", async ({ page }) => {
  const state = stage3References(stage3Club(), references => ({ ...references, members: references.members.map(m => m.id === "maya" ? { ...m, availability: "unavailable" } : m) }))
  await seed(page, state)
  const change = await openNewEvent(page, "Fictional backup demonstration")
  const owner = change.getByTestId("matching-event-assignments").getByLabel("Assignee for Book Room & Layout", { exact: true })
  await expect(owner).toHaveValue("")
  await owner.selectOption("jordan")
  await change.getByRole("button", { name: "Apply this change", exact: true }).click()
  await expect.poll(async () => (await eventTask(page, "Fictional backup demonstration", "venue"))?.ownerId).toBe("jordan")
  const node = (await eventTask(page, "Fictional backup demonstration", "venue"))!
  expect((await savedDemo(page)).matching!.assignments.find(a => a.taskId === node.id)?.method).toBe("backup")
})

test("with no available qualified member, event creation preserves an unassigned task instead of a president fallback", async ({ page }) => {
  let state = stage3References(stage3Club(), references => ({ ...references, members: references.members.map(m => m.id === "maya" || m.id === "jordan" ? { ...m, availability: "unavailable" } : m) }))
  state = stage3Command(state, { type: "memberBinding.upsert", value: { id: "fixture-fixture-space-sam", memberId: "sam", responsibilityId: "fixture-space", decision: "include", confirmed: false } })
  await seed(page, state)
  const change = await openNewEvent(page, "Fictional unavailable demonstration")
  await expect(change.getByTestId("matching-event-assignments").getByLabel("Assignee for Book Room & Layout", { exact: true })).toHaveValue("")
  await change.getByRole("button", { name: "Apply this change", exact: true }).click()
  await expect.poll(async () => !!await eventTask(page, "Fictional unavailable demonstration", "venue")).toBe(true)
  expect(await eventTask(page, "Fictional unavailable demonstration", "venue")).toMatchObject({ ownerId: null, status: "unclaimed", matching: { reason: "no_available_candidates" } })
})

test("pausing matching retains existing people, assignments and canonical configuration", async ({ page }) => {
  const state = stage3Club()
  await seed(page, state)
  await open(page, "matching")
  const before = await savedDemo(page)
  await page.getByRole("button", { name: "Pause responsibility matching", exact: true }).click()
  const after = await savedDemo(page)
  expect(after.org.settings.matchingMode).toBe("legacy")
  expect(after.matching).toEqual(before.matching)
  expect(after.nodes).toEqual(before.nodes)
  expect(after.people).toEqual(before.people)
})

test("a future matching subconfiguration survives opening the old task UI without resetting its team or history", async ({ page }) => {
  const original = stage3Club(), future = { schemaVersion: 99, fictionalFutureField: ["retained"] }
  await seed(page, { ...original, matching: future as unknown as MatchingState })
  await open(page, "tasks")
  const state = await savedDemo(page)
  expect(state.matching).toEqual(future)
  expect(state.people).toEqual(original.people)
  expect(state.events).toEqual(original.events)
  expect(state.nodes.map(n => ({ id: n.id, ownerId: n.ownerId, status: n.status }))).toEqual(original.nodes.map(n => ({ id: n.id, ownerId: n.ownerId, status: n.status })))
  expect(state.org.settings.matchingMode).toBe("responsibilities")
})
