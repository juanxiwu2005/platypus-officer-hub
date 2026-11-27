import { expect, type Page } from "@playwright/test"
import { closeRail } from "./helpers"

/** Create the handover through the shipped "+ New task" form (Assign to: Anyone), rather than injecting a historical seed. */
export async function createUnclaimedTask(page: Page, title: string) {
  await page.goto("/#/tasks")
  await closeRail(page)
  await page.getByTestId("new-task").click()
  const form = page.getByTestId("new-task-form")
  await form.getByLabel("New task name").fill(title)
  await form.getByLabel("Assign to").selectOption({ label: "Anyone (open)" })
  await form.getByRole("button", { name: "Add", exact: true }).click()
  await expect(page.getByTestId("new-task-form")).toHaveCount(0)
  await expect(page.getByTestId("my-tasks").getByRole("button", { name: title })).toBeVisible()
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
