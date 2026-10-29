import { expect, test } from "@playwright/test"

// Event workflow (setup): the club's planning notes and files are compared with the standard workflow; the president reviews, edits and saves it; new events use it.
const CHANGES = {
  part: "changes", summary: "Your notes add a permission step and a longer flyer step.",
  changes: [
    { op: "add", key: "permission", title: "Collect permission forms", phase: "prepare", days: 2, waitsFor: ["approve"], before: ["review"], owner: "Secretary", why: "Members under 18 need forms.", evidence: "We always collect permission forms" },
    { op: "update", key: "flyer", title: "Design the flyer in Canva", days: 4, owner: "Marketing lead", why: "Design takes longer.", evidence: "flyer design takes four days" },
    { op: "remove", key: "foodex", why: "We never use outside caterers", evidence: "we only order from Sun Devil Dining" },
  ],
  conflicts: [{ text: "Running a raffle at events would break the ASU rule on raffles.", rules: ["R15"] }],
}
const OWNERS = { part: "owners", owners: [{ key: "budget", role: "Treasurer" }, { key: "permission", role: "Secretary" }, { key: "flyer", role: "Marketing lead" }] }

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", r => r.fulfill({ json: { ok: true, configured: true, provider: "mock", model: "mock" } }))
  await page.route("**/api/command", r => r.fulfill({ status: 503, json: { message: "Local demo" } }))
})

test("planning notes and files adapt the standard workflow: changes shown, ASU rules kept, conflicts caught, owners shared out, and new events use it", async ({ page }) => {
  const bodies: Record<string, unknown>[] = []
  await page.route("**/api/setup/workflow", async r => {
    const body = r.request().postDataJSON(); bodies.push(body)
    await new Promise(res => setTimeout(res, 500))
    await r.fulfill({ json: { ...(body.part === "owners" ? OWNERS : CHANGES), model: "mock", provider: "mock" } })
  })
  await page.goto("/#/setup")
  const step = page.getByTestId("setup-step")
  for (let i = 0; i < 3; i++) await step.getByRole("button", { name: "Continue", exact: true }).click()           // club, goals, roles
  await expect(step.getByRole("heading", { level: 2 })).toHaveText("Step 4 of 6 · Invite & workspace")
  await step.getByLabel("Planning notes (how your club runs events)").fill("Before the event we collect permission forms. Flyer design takes four days in Canva.")
  await step.getByLabel("Fictional planning files", { exact: true }).setInputFiles({ name: "event-flow.txt", mimeType: "text/plain", buffer: Buffer.from("Our event flow: approve the plan, collect permission forms, design the flyer in Canva, run the event. Call Sam at 480-555-0100.") })
  await expect(step).toContainText("words read")                                                                  // the file's text was read in the browser
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByRole("heading", { level: 2 })).toHaveText("Step 5 of 6 · Event workflow")
  await expect(step.getByRole("status").first()).toContainText("Comparing your planning notes and files")
  await expect(step.getByTestId("workflow-changes")).toBeVisible()
  await expect(step.getByRole("status").first()).toContainText("Adapted from your planning notes and files")
  await expect(step.getByRole("status").first()).not.toContainText("Sharing the steps out")
  // What went to the AI: the notes and the file's text (phone number hidden), the roles with duties; never the steps (the server has its own copy) or personal details.
  const asked = bodies.find(b => b.part === "changes")!
  expect(Object.keys(asked).sort()).toEqual(["files", "notes", "part", "roles"])
  expect(JSON.stringify(asked)).not.toMatch(/555-0100|@example\.org|9999000/); expect(JSON.stringify(asked)).toContain("permission forms")
  expect(bodies.map(b => b.part)).toEqual(["changes", "owners"])
  // The changes: applied ones with their source and an Undo, refused ones with the rule, and what the AI noticed.
  const list = step.getByTestId("workflow-changes")
  await expect(list.getByTestId("wf-applied")).toHaveCount(2)
  await expect(list.getByTestId("wf-applied").first()).toContainText("Collect permission forms")
  await expect(list.getByTestId("wf-refused")).toContainText("Submit the Food Exception Request")
  await expect(list.getByTestId("wf-refused")).toContainText("ASU rule R06")
  await expect(list.getByTestId("wf-conflict")).toContainText("raffle")
  // The edit module shows the new step, the renamed one, and who does each step.
  const editor = step.getByTestId("workflow-editor")
  await expect(editor.getByLabel("Step title: permission")).toHaveValue("Collect permission forms")
  await expect(editor.getByLabel("Owner: Collect permission forms")).toHaveValue("r-sec")
  await expect(editor.getByLabel("Step title: flyer")).toHaveValue("Design the flyer in Canva")
  await expect(editor.getByLabel("Days of work: Design the flyer in Canva")).toHaveValue("4")
  await expect(editor.getByTestId("wf-step-foodex")).toContainText("ASU R06")
  // Undo one change: the flyer goes back to the standard step.
  await list.getByRole("button", { name: "Undo: Changed Design the flyer in Canva" }).click()
  await expect(editor.getByLabel("Step title: flyer")).toHaveValue("Finish the event flyer")
  await expect(list.getByTestId("wf-applied")).toHaveCount(1)
  // A change that breaks an ASU rule must be fixed before moving on: take away what the speaker request waits for.
  await editor.getByTestId("wf-step-usgspeaker").getByRole("button", { name: /no longer waits for Get the speaker's signed SAP agreement/ }).click()
  await expect(step.getByTestId("wf-blocked")).toContainText("must wait for")
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByRole("alert")).toContainText("must wait for")
  await expect(step.getByRole("heading", { level: 2 })).toHaveText("Step 5 of 6 · Event workflow")
  await editor.getByTestId("wf-step-usgspeaker").getByLabel("Add a step that Submit the USG speaker request waits for").selectOption({ label: "Get the speaker's signed SAP agreement" })
  await expect(step.getByTestId("wf-blocked")).toHaveCount(0)
  // The club's own step, by hand.
  await editor.getByText("Add a step of your own", { exact: true }).click()
  await editor.getByLabel("Step", { exact: true }).fill("Photo release check")
  await editor.getByRole("button", { name: "Add step", exact: true }).click()
  await expect(editor.getByLabel("Step title: photo-release-check")).toHaveValue("Photo release check")
  await step.getByRole("button", { name: "Continue", exact: true }).click()
  await step.getByRole("button", { name: "Prepare first workflow", exact: true }).click()
  await expect(page.getByTestId("setup-preview")).toBeVisible()
  await step.getByRole("checkbox", { name: "I reviewed this event and want to start this demo workspace." }).check()
  await step.getByRole("button", { name: "Approve & start workspace", exact: true }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Events")

  const saved = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("platypus.v1.demo")!); const roleName = (id: string) => s.roles.find((r: { id: string }) => r.id === id)?.displayName
    const steps = s.org.eventWorkflow.steps as { key: string; ownerRoleId: string; custom?: boolean; dependsOn: string[] }[]
    return { summary: s.org.eventWorkflow.summary, permission: steps.find(x => x.key === "permission"), owners: Object.fromEntries(steps.map(x => [x.key, roleName(x.ownerRoleId)])), foodex: steps.some(x => x.key === "foodex"), nodes: s.nodes.filter((n: { eventId: string }) => n.eventId === "setup-event-dfs").map((n: { stepKey: string; title: string; ownerId: string }) => [n.stepKey, n.ownerId]) } })
  expect(saved.summary).toBe("Standard workflow, 2 added.")
  expect(saved.foodex).toBe(true)                                                          // the rule step stayed
  expect(saved.owners).toMatchObject({ permission: "Secretary", budget: "Treasurer", flyer: "Marketing lead", "photo-release-check": "Events lead" })
  expect(saved.nodes).toContainEqual(["permission", "priya"])                              // the first event was built from the club's workflow

  // After setup: the same editor in Settings → Workflow, and the saved steps are what new events start from.
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Workflow", exact: true }).click()
  const settings = page.getByTestId("workflow-settings")
  await expect(settings).toContainText("Standard workflow, 2 added.")
  await expect(settings.getByLabel("Step title: permission")).toHaveValue("Collect permission forms")
  await settings.getByLabel("Days of work: Collect permission forms").fill("3")
  await expect(settings.getByRole("status").last()).toContainText("Saved")
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).org.eventWorkflow.steps.find((x: { key: string }) => x.key === "permission").estDays)).toBe(3)
  await settings.getByRole("button", { name: "Go back to the standard workflow" }).click()
  await expect(settings.getByLabel("Step title: permission")).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("platypus.v1.demo")!).org.eventWorkflow)).toBeUndefined()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
})

test("with no planning notes or files, and with the AI down, the standard workflow is shown, owners follow the kind of work, and Try AI again works", async ({ page }) => {
  let owners = 0
  await page.route("**/api/setup/workflow", r => { const part = r.request().postDataJSON().part; if (part === "owners" && ++owners <= 3) return r.fulfill({ status: 504, json: { message: "The AI took too long to answer." } }); return r.fulfill({ json: { ...OWNERS, model: "mock", provider: "mock" } }) })
  await page.goto("/#/setup")
  const step = page.getByTestId("setup-step")
  for (let i = 0; i < 4; i++) await step.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(step.getByRole("heading", { level: 2 })).toHaveText("Step 5 of 6 · Event workflow")
  await expect(step.getByRole("status").first()).toContainText("No planning notes or files were added", { timeout: 15000 })
  await expect(step.getByRole("status").first()).toContainText("could not share the steps out")
  await expect(step.getByTestId("workflow-changes")).toHaveCount(0)
  await expect(step.getByTestId("workflow-ok")).toBeVisible()
  await expect(step.getByTestId("workflow-editor").getByLabel("Owner: Build the budget and choose the funding source")).toHaveValue(/fin/)
  await step.getByRole("button", { name: "Try AI again" }).click()
  await expect(step.getByRole("status").first()).not.toContainText("could not", { timeout: 15000 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
})
