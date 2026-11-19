import { expect, type Page } from "@playwright/test"
import type { StepTemplate, WorkflowBranch } from "../src/data/types"
import { getWorkflowTemplates } from "../src/data/workflowTemplates"
import { closeRail } from "./helpers"

export const readWorkflowState = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!))
export async function savedWorkflow(page: Page): Promise<{ steps: StepTemplate[]; branches?: WorkflowBranch[]; teamMap?: { stepTeams: Record<string, string> } }> {
  const state = await readWorkflowState(page)
  const template = getWorkflowTemplates(state).find(item => item.id === "standard-event")
  return template?.draft ?? template?.versions.at(-1) ?? state.org.eventWorkflow
}
export const savedWorkflowStep = async (page: Page, key: string) => (await savedWorkflow(page))?.steps.find(step => step.key === key)

/** Settings now authors templates with explicit teams; actual-event metro gestures stay tested in Plan. */
export async function openWorkflow(page: Page) {
  await page.goto("/#/settings")
  await closeRail(page)
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  await expect(page.getByTestId("workflow-builder")).toBeVisible()
  expect((await readWorkflowState(page)).org.workflowTeams?.length).toBeGreaterThan(0)
  await openMenu(page, "More", "Apply role teams")
  await expect.poll(async () => Object.keys((await savedWorkflow(page))?.teamMap?.stepTeams ?? {}).length).toBeGreaterThan(0)
  await page.getByRole("button", { name: "Save draft", exact: true }).click()
  return page.getByTestId("workflow-settings")
}
export async function openWorkflowStep(page: Page, key: string) {
  await closeRail(page)
  await page.getByTestId(`workflow-task-${key}`).click()
  return page.getByTestId("workflow-builder-details")
}
export async function insertedKey(page: Page, before: string[]) {
  await expect.poll(async () => (await savedWorkflow(page)).steps.filter(step => !before.includes(step.key)).length).toBe(1)
  return (await savedWorkflow(page)).steps.find(step => !before.includes(step.key))!.key
}

export const menuTrigger = (page: Page, trigger: string) => page.getByTestId("workflow-settings").getByRole("button", { name: trigger, exact: true }).and(page.locator("[aria-haspopup=menu]"))
/** Header and toolbar actions live in disclosure menus ("New workflow", "More", "Add"); items are role="menuitem". */
export async function openMenu(page: Page, trigger: string, item: string) {
  const settings = page.getByTestId("workflow-settings")
  await menuTrigger(page, trigger).click()
  await settings.getByRole("menu").getByRole("menuitem", { name: item, exact: true }).click()
}
/** Each lane has a team pill ("<Team> · N steps, edit branch") with a stable testid. */
export const branchPill = (page: Page, branchId: string) => page.getByTestId(`workflow-branch-pill-${branchId}`)
export async function openBranch(page: Page, branchId: string) {
  await branchPill(page, branchId).click()
  return page.getByTestId("workflow-builder-details")
}
/** The canvas no longer has a team select: open the branch and choose its team in Details. */
export async function setBranchTeam(page: Page, branchId: string, teamId: string) {
  const details = await openBranch(page, branchId)
  await details.getByRole("combobox", { name: "Team", exact: true }).selectOption(teamId)
  return details
}
/** The selected value of a branch's Details "Team" select. */
export async function branchTeamValue(page: Page, branchId: string) {
  const details = await openBranch(page, branchId)
  return details.getByRole("combobox", { name: "Team", exact: true })
}
