import { expect, type Page } from "@playwright/test"
import { closeRail } from "./helpers"

/** Create the handover through the shipped board, rather than injecting a historical seed. */
export async function createUnclaimedTask(page: Page, title: string) {
  await page.goto("/#/tasks")
  await closeRail(page)
  const column = page.getByRole("region", { name: "Not claimed", exact: true })
  await column.getByRole("button", { name: "+ Add task", exact: true }).click()
  await column.getByRole("textbox", { name: "New task name", exact: true }).fill(title)
  await column.getByRole("button", { name: "Add", exact: true }).click()
  await expect(column.getByRole("button", { name: title })).toBeVisible()
  const task = await savedTask(page, title)
  expect([task.status, task.ownerId]).toEqual(["unclaimed", null])
  return task.id
}

/** Read persisted business results; never mutate the demo to make a test pass. */
export async function savedTask(page: Page, titleOrId: string) {
  return page.evaluate(value => {
    const state = JSON.parse(localStorage.getItem("platypus.v1.demo")!)
    return state.nodes.find((node: { id: string; title: string }) => node.id === value || node.title === value) as {
      id: string; title: string; ownerId: string | null; status: string; clubDeadline: string | null;
      officialDeadline: string | null; completedOn?: string; waitingOnPersonId?: string | null;
    }
  }, titleOrId)
}
