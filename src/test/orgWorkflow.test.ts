import { afterEach, describe, expect, it, vi } from "vitest"
const chat = vi.hoisted(() => vi.fn())
vi.mock("../../netlify/lib/ai.mts", async importOriginal => ({ ...await importOriginal<object>(), chatJSON: chat }))
vi.mock("@netlify/blobs", () => ({ getStore: vi.fn(() => { throw new Error("storage touched") }) }))
import { getStore } from "@netlify/blobs"
import workflowFn from "../../netlify/functions/workflow.mts"
import { resetRateLimit } from "../../netlify/lib/http.mts"
import { seedDemo } from "../data/seed"
import { clubDraft, completeSetup, resetWorkflow, saveWorkflow, validateWorkflow } from "../data/settings"
import { newObjects } from "../data/changeReview"
import { EVENT_STEPS, buildEventNodes, orgSteps } from "../engine/playbooks"
import { applyChanges, checkWorkflow, describeWorkflow, isLocked, ownerOfStep, presetSteps, revertChange, withOwners, type WorkflowChange } from "../engine/workflow"
import { changesToWire, rolesForPrompt, sanitizeChanges, sanitizeOwners, stepsForPrompt } from "../lib/workflowAi"
import { sanitizeOps } from "../lib/commands"

const base = seedDemo()
afterEach(() => { chat.mockReset(); resetRateLimit(); vi.mocked(getStore).mockClear() })
const post = (body: unknown) => workflowFn(new Request("https://example.org/api/setup/workflow", { method: "POST", body: JSON.stringify(body) }))
const ch = (c: Partial<WorkflowChange> & Pick<WorkflowChange, "op" | "key">): WorkflowChange => ({ id: "c" + Math.random(), title: c.key, patch: {}, evidence: "", ...c })
const roleId = (t: string) => base.roles.find(r => r.displayName === t)!.id

describe("org workflow · applying changes", () => {
  it("adds a step of the club's own after the steps it names, owned by a role, with club timing as days (never a date)", () => {
    const r = applyChanges(presetSteps(), [ch({ op: "add", key: "permission", title: "Collect permission forms", patch: { phase: "prepare", estDays: 2, dependsOn: ["approve"], ownerRoleId: roleId("Secretary"), daysBefore: 10 }, beforeKeys: ["review"] })], base.roles)
    const s = r.steps.find(x => x.key === "permission")!
    expect(r.applied).toHaveLength(1)
    expect(s).toMatchObject({ custom: true, phase: "prepare", estDays: 2, dependsOn: ["approve"], ownerRoleId: roleId("Secretary"), fn: "secretary", anchor: { kind: "target", days: 10, unit: "calendar" } })
    expect(r.steps.find(x => x.key === "review")!.dependsOn).toContain("permission")
    expect(JSON.stringify(s)).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })
  it("changes a step's title, days, order and owner, and keeps ASU deadlines", () => {
    const r = applyChanges(presetSteps(), [ch({ op: "update", key: "flyer", patch: { title: "Design the flyer in Canva", estDays: 4, dependsOn: ["approve", "budget"], ownerRoleId: roleId("Marketing lead") } }), ch({ op: "update", key: "registry", patch: { estDays: 3, ownerRoleId: roleId("Secretary") } })], base.roles)
    expect(r.refused).toEqual([])
    expect(r.steps.find(x => x.key === "flyer")).toMatchObject({ title: "Design the flyer in Canva", estDays: 4, dependsOn: ["approve", "budget"] })
    const reg = r.steps.find(x => x.key === "registry")!
    expect(reg).toMatchObject({ estDays: 3, ownerRoleId: roleId("Secretary") }); expect(reg.anchor).toEqual(EVENT_STEPS.find(x => x.key === "registry")!.anchor)
  })
  it("refuses what ASU rules do not allow, and says why", () => {
    const r = applyChanges(presetSteps(), [
      ch({ op: "remove", key: "foodex" }), ch({ op: "update", key: "venue", patch: { phase: "run" } }), ch({ op: "update", key: "usg", patch: { daysBefore: 3 } }),
      ch({ op: "update", key: "nope", patch: { estDays: 2 } }), ch({ op: "update", key: "approve", patch: { dependsOn: ["registry"] } }),
    ], base.roles)
    expect(r.applied).toEqual([])
    expect(r.refused.map(x => x.reason)).toEqual([expect.stringMatching(/ASU rule R06/), expect.stringMatching(/R03/), expect.stringMatching(/R09/), "That step is not in the workflow.", "That would make a step wait for itself."])
    expect(r.steps).toEqual(presetSteps())
  })
  it("removing a step the club does not use lets later steps wait for what it waited for; locked steps are never removed", () => {
    const r = applyChanges(presetSteps(), [ch({ op: "remove", key: "mktneeds" })], base.roles)
    expect(r.steps.some(x => x.key === "mktneeds")).toBe(false)
    expect(r.steps.find(x => x.key === "budget")!.dependsOn).toEqual(expect.arrayContaining(["draft"])); expect(r.steps.find(x => x.key === "budget")!.dependsOn).not.toContain("mktneeds")
    expect(isLocked(EVENT_STEPS.find(x => x.key === "usg")!)).toBe(true); expect(isLocked(EVENT_STEPS.find(x => x.key === "mktneeds")!)).toBe(false)
  })
  it("each change can be undone on its own", () => {
    const changes = [ch({ op: "add", key: "permission", title: "Collect permission forms", patch: { dependsOn: ["approve"] }, beforeKeys: ["review"] }), ch({ op: "update", key: "flyer", patch: { title: "Design the flyer", estDays: 5 } }), ch({ op: "remove", key: "mktneeds" })]
    const r = applyChanges(presetSteps(), changes, base.roles)
    expect(r.applied).toHaveLength(3)
    let steps = revertChange(r.steps, r.applied[2]); expect(steps.some(x => x.key === "mktneeds")).toBe(true); expect(steps.find(x => x.key === "budget")!.dependsOn).toContain("mktneeds")
    steps = revertChange(steps, r.applied[1]); expect(steps.find(x => x.key === "flyer")).toMatchObject({ title: EVENT_STEPS.find(x => x.key === "flyer")!.title, estDays: 2 })
    steps = revertChange(steps, r.applied[0]); expect(steps.some(x => x.key === "permission")).toBe(false); expect(steps.find(x => x.key === "review")!.dependsOn).not.toContain("permission")
    expect(describeWorkflow(presetSteps())).toBe("The standard workflow.")
    expect(describeWorkflow(r.steps)).toBe("Standard workflow, 1 added, 1 changed, 1 removed.")
  })
})

describe("org workflow · checks against ASU rules (the engine's, not the AI's)", () => {
  it("the standard workflow has nothing to fix", () => {
    expect(checkWorkflow(presetSteps(), base.roles, base).filter(i => i.level === "blocked")).toEqual([])
  })
  it("blocks a missing rule step, a changed rule deadline, a lost rule order, a loop and a dangling link", () => {
    const steps = presetSteps()
    expect(checkWorkflow(steps.filter(s => s.key !== "foodex"), base.roles).map(i => i.text).join("\n")).toMatch(/Submit the Food Exception Request” is missing.*R06/)
    expect(checkWorkflow(steps.map(s => s.key === "usg" ? { ...s, anchor: { kind: "target" as const, days: 3, unit: "calendar" as const, label: "x" } } : s), base.roles).some(i => i.level === "blocked" && /R09/.test(i.text))).toBe(true)
    expect(checkWorkflow(steps.map(s => s.key === "usgspeaker" ? { ...s, dependsOn: ["budget"] } : s), base.roles).some(i => i.level === "blocked" && /signed SAP|SAP agreement/.test(i.text))).toBe(true)
    expect(checkWorkflow(steps.map(s => s.key === "approve" ? { ...s, dependsOn: ["registry"] } : s), base.roles).some(i => i.level === "blocked" && /waits for itself/.test(i.text))).toBe(true)
    expect(checkWorkflow(steps.map(s => s.key === "flyer" ? { ...s, dependsOn: ["ghost"] } : s), base.roles).some(i => i.level === "blocked" && /not in the workflow/.test(i.text))).toBe(true)
  })
  it("warns when a step goes to the advisor, and when the club's timing would make a sample event miss a deadline", () => {
    const advisorRole = { id: "r-adv", displayName: "Club Advisor", fn: "advisor" as const, holderId: null }
    const roles = [...base.roles, advisorRole]
    expect(checkWorkflow(presetSteps().map(s => s.key === "flyer" ? { ...s, ownerRoleId: "r-adv" } : s), roles).some(i => i.level === "warning" && /advisor/.test(i.text))).toBe(true)
    const slow = presetSteps().map(s => s.key === "budget" ? { ...s, estDays: 30 } : s)
    const issues = checkWorkflow(slow, base.roles, base)
    expect(issues.some(i => i.level === "warning" && /would miss a deadline/.test(i.text))).toBe(true)
    expect(issues.some(i => i.level === "blocked")).toBe(false)
  })
  it("validateWorkflow refuses broken or blocked workflows", () => {
    expect(validateWorkflow(presetSteps(), base.roles)).toBeNull()
    expect(validateWorkflow([], base.roles)).toBeTruthy()
    expect(validateWorkflow(presetSteps().filter(s => s.key !== "usg"), base.roles)).toMatch(/missing/)
    expect(validateWorkflow(presetSteps().map(s => s.key === "flyer" ? { ...s, estDays: 99 } : s), base.roles)).toBeTruthy()
  })
})

describe("org workflow · cleaning the AI's reply", () => {
  const steps = presetSteps()
  const raw = {
    summary: "Your notes add a permission step. Due 2099-01-01.",
    changes: [
      { op: "add", key: "Permission Forms!", title: "Collect permission forms", phase: "prepare", days: 2, waitsFor: ["approve", "ghost"], before: ["review"], owner: "secretary", daysBefore: 10, why: "Needed by Dec 5.", evidence: "We always collect permission forms" },
      { op: "update", key: "flyer", title: "Design the flyer", days: 99, owner: "Nobody", phase: "weird", evil: "x" },
      { op: "update", key: "ghost", days: 1 }, { op: "update", key: "flyer" }, { op: "delete", key: "flyer" },
      { op: "remove", key: "mktneeds", why: "We skip it" },
      ...Array.from({ length: 20 }, (_, i) => ({ op: "add", title: `Extra ${i}` })),
    ],
    conflicts: [{ text: "Raffles are not allowed.", rules: ["R15", "R99"] }, { text: "" }],
  }
  it("keeps only known steps, roles, phases and fields; clamps days; strips dates; caps the count", () => {
    const r = sanitizeChanges(raw, steps, base.roles)
    expect(r.changes.length).toBeLessThanOrEqual(10)
    expect(r.changes[0]).toMatchObject({ op: "add", key: "permission-forms", title: "Collect permission forms", beforeKeys: ["review"], patch: { phase: "prepare", estDays: 2, dependsOn: ["approve"], ownerRoleId: roleId("Secretary"), daysBefore: 10 } })
    expect(r.changes[0].patch.why).not.toMatch(/Dec/)
    expect(r.changes[1]).toMatchObject({ op: "update", key: "flyer", patch: { title: "Design the flyer", estDays: 30 } }); expect(r.changes[1].patch.ownerRoleId).toBeUndefined(); expect(r.changes[1].patch.phase).toBeUndefined()
    expect(r.changes.find(c => c.key === "mktneeds")).toMatchObject({ op: "remove" })
    expect(r.changes.some(c => c.key === "ghost")).toBe(false)
    expect(r.summary).not.toMatch(/2099/); expect(r.conflicts).toEqual([{ text: "Raffles are not allowed.", rules: ["R15"] }])
    expect(JSON.stringify(r)).not.toMatch(/evil/)
  })
  it("survives the round trip through the server (clean, write out, clean again with the browser's own roles)", () => {
    const once = sanitizeChanges(raw, steps, base.roles)
    const twice = sanitizeChanges({ changes: changesToWire(once.changes, base.roles) }, steps, base.roles)
    expect(twice.changes.map(c => [c.op, c.key, c.patch])).toEqual(once.changes.map(c => [c.op, c.key, c.patch]))
  })
  it("owners: only known steps and roles, never the advisor", () => {
    const roles = [...base.roles, { id: "r-adv", displayName: "Club Advisor", fn: "advisor" as const, holderId: null }]
    const o = sanitizeOwners({ owners: [{ key: "flyer", role: "marketing lead" }, { key: "budget", role: "Club Advisor" }, { key: "ghost", role: "Treasurer" }, { key: "flyer", role: "Treasurer" }] }, steps, roles)
    expect(o).toEqual({ flyer: roleId("Marketing lead") })
    const owned = withOwners(steps, roles, o)
    expect(owned.find(s => s.key === "flyer")).toMatchObject({ ownerRoleId: roleId("Marketing lead"), fn: "marketing" })
    expect(owned.find(s => s.key === "usg")!.ownerRoleId).toBe(roleId("Treasurer"))                   // everyone else follows the kind of work
    expect(owned.every(s => ownerOfStep(s, roles)?.fn !== "advisor")).toBe(true)
  })
  it("what the AI is shown marks locked steps, leaves out the advisor and has no personal details", () => {
    const shown = stepsForPrompt(steps)
    expect(shown.find(s => s.key === "foodex")).toMatchObject({ locked: true, rules: ["R06"] }); expect(shown.find(s => s.key === "flyer")!.locked).toBe(true)  // R11
    expect(shown.find(s => s.key === "mktneeds")!.locked).toBe(false)
    expect(rolesForPrompt([...base.roles, { id: "a", displayName: "Club Advisor", fn: "advisor", holderId: null }]).map(r => r.title)).not.toContain("Club Advisor")
    expect(JSON.stringify(rolesForPrompt(base.roles))).not.toMatch(/@|555|9999/)
  })
})

describe("org workflow · the endpoint", () => {
  const roles = [{ title: "Treasurer", duties: "Keeps the budget." }, { title: "Secretary", duties: "Keeps records." }]
  it("compares the notes and files with the server's own standard steps, sends no personal details, and re-checks the reply", async () => {
    chat.mockResolvedValueOnce({ data: { summary: "One new step.", changes: [{ op: "add", key: "permission", title: "Collect permission forms", phase: "prepare", days: 2, waitsFor: ["approve"], owner: "Secretary", evidence: "permission forms" }, { op: "update", key: "ghost", days: 3 }], conflicts: [{ text: "Raffles are not allowed.", rules: ["R15"] }], evil: 1 }, model: "mock", provider: "mock" })
    const r = await (await post({ part: "changes", notes: "We collect permission forms. Call Sam at 480-555-0100 or sam@example.org", files: [{ name: "flow.pdf", text: "Step 1: Approve. Step 2: collect permission forms. " + "x ".repeat(30000) }], roles, steps: [{ key: "evil" }] })).json()
    const sent = JSON.parse(chat.mock.calls[0][0].user)
    expect(chat.mock.calls[0][0].task).toBe("workflow_read"); expect(chat.mock.calls[0][0].timeoutMs).toBeLessThanOrEqual(22_000)
    expect(sent.steps.map((s: { key: string }) => s.key)).toEqual(EVENT_STEPS.map(s => s.key))        // the server's copy, not the browser's
    expect(JSON.stringify(sent)).not.toMatch(/sam@example|555-0100/); expect(sent.files[0].text.length).toBeLessThanOrEqual(12_000)
    expect(sent.ruleBook.map((x: { id: string }) => x.id)).toContain("R15")
    expect(r.changes).toHaveLength(1); expect(r.changes[0]).toMatchObject({ op: "add", key: "permission", owner: "Secretary" }); expect(r.evil).toBeUndefined(); expect(r.conflicts).toEqual([{ text: "Raffles are not allowed.", rules: ["R15"] }])
    expect(getStore).not.toHaveBeenCalled()
  })
  it("shares steps out to the roles' duties", async () => {
    chat.mockResolvedValueOnce({ data: { owners: [{ key: "budget", role: "Treasurer" }, { key: "ghost", role: "Treasurer" }, { key: "flyer", role: "Nobody" }] }, model: "mock", provider: "mock" })
    const r = await (await post({ part: "owners", steps: [{ key: "budget", title: "Build the budget", standardOwner: "Treasurer" }, { key: "flyer", title: "Finish the flyer" }], roles })).json()
    expect(chat.mock.calls[0][0].system).toMatch(/Never choose the advisor/)
    expect(r.owners).toEqual([{ key: "budget", role: "Treasurer" }]); expect(getStore).not.toHaveBeenCalled()
  })
  it("refuses empty input without calling the model", async () => {
    expect((await post({ part: "changes", notes: "  ", files: [], roles })).status).toBe(400)
    expect((await post({ part: "changes", notes: "x" })).status).toBe(400)
    expect((await post({ part: "owners", steps: [], roles })).status).toBe(400)
    expect(chat).not.toHaveBeenCalled()
  })
})

describe("org workflow · every new event uses it", () => {
  const custom = () => {
    const r = applyChanges(presetSteps(), [ch({ op: "add", key: "permission", title: "Collect permission forms", patch: { dependsOn: ["approve"], ownerRoleId: roleId("Secretary"), estDays: 2 }, beforeKeys: ["review"] }), ch({ op: "update", key: "flyer", patch: { ownerRoleId: roleId("Marketing lead") } })], base.roles)
    return withOwners(r.steps, base.roles)
  }
  const event = { id: "e-x", name: "X", date: "2026-12-03", type: "social" as const, headcount: 30, venue: "campus" as const, food: "offsite" as const, funding: "usg" as const, speaker: false, goalId: null, playbookId: "seo-event" }
  it("buildEventNodes gives each step to its chosen role's officer, including steps the club added", () => {
    const nodes = buildEventNodes(event, base.roles, { steps: custom() })
    expect(nodes.find(n => n.stepKey === "permission")).toMatchObject({ title: "Collect permission forms", ownerId: "priya", fn: "secretary", dependsOn: ["e-x:approve"] })
    expect(nodes.find(n => n.stepKey === "review")!.dependsOn).toContain("e-x:permission")
    expect(nodes.find(n => n.stepKey === "flyer")!.ownerId).toBe("sam")
    expect(buildEventNodes(event, base.roles).some(n => n.stepKey === "permission")).toBe(false)           // the standard workflow is unchanged
  })
  it("setup saves the workflow, builds the first event from it, and refuses one that breaks an ASU rule", () => {
    const d = clubDraft(base), code = crypto.randomUUID()
    const ev = { op: "create_event" as const, name: "Founder Dinner", type: "social" as const, headcount: 30, venue: "campus" as const, food: "offsite" as const, funding: "usg" as const, speaker: false }
    const next = completeSetup(base, d, ev, "2026-11-19", code, undefined, undefined, custom())
    expect(next.org.eventWorkflow?.summary).toBe("Standard workflow, 1 added.")
    expect(next.nodes.some(n => n.stepKey === "permission" && n.ownerId === "priya")).toBe(true)
    expect(completeSetup(base, d, ev, "2026-11-19", code, undefined, undefined, presetSteps().filter(s => s.key !== "usg"))).toBe(base)
    expect(completeSetup(base, d, ev, "2026-11-19", code).org.eventWorkflow).toBeUndefined()
  })
  it("later events (made by the president or the assistant) are built from the saved workflow", () => {
    const saved = saveWorkflow(base, custom())
    expect(saved.org.eventWorkflow!.steps.some(s => s.key === "permission")).toBe(true)
    expect(orgSteps(saved).some(s => s.key === "permission")).toBe(true)
    const created = newObjects(saved, sanitizeOps([{ op: "create_event", name: "Next", type: "social", headcount: 20, venue: "campus", food: "none", funding: "none", speaker: false }], saved)[0], "e-new", { date: "2027-02-10" })
    expect(created.nodes!.some(n => n.stepKey === "permission" && n.eventId === "e-new")).toBe(true)
    expect(saved.nodes.filter(n => n.eventId === "e-night")).toEqual(base.nodes.filter(n => n.eventId === "e-night"))   // events already made keep their steps
    expect(saveWorkflow({ ...base, viewerId: "maya" }, custom())).toEqual({ ...base, viewerId: "maya" })               // only the president and vice president
    expect(saveWorkflow(base, presetSteps().filter(s => s.key !== "usg"))).toBe(base)
    expect(resetWorkflow(saved).org.eventWorkflow).toBeUndefined()
  })
})

describe("org workflow · readable role names", () => {
  it("short role names lead with the area, and identical ones keep their full title", async () => {
    const { roleShort, roleLabels } = await import("../data/structure")
    expect(roleShort("Vice President of Outreach")).toBe("Outreach (VP)")
    expect(roleShort("Vice President of Professional Development")).toBe("Professional Development (VP)")
    expect(roleShort("Executive Vice President")).toBe("Executive Vice President")
    expect(roleShort("Director of Marketing")).toBe("Marketing (Dir.)"); expect(roleShort("Marketing Associate")).toBe("Marketing Associate"); expect(roleShort("Treasurer")).toBe("Treasurer")
    const r = (id: string, t: string) => ({ id, displayName: t, fn: "programs" as const, holderId: null })
    const labels = roleLabels([r("a", "Vice President of Outreach"), r("b", "VP of Outreach"), r("c", "Director of Finance")])
    expect(labels.get("a")).toBe("Vice President of Outreach"); expect(labels.get("b")).toBe("VP of Outreach"); expect(labels.get("c")).toBe("Finance (Dir.)")
  })
})

describe("AI requests · a signed-out preview is explained, not retried", () => {
  it("401 and 403 stop at once with a plain message; other failures are tried three times", async () => {
    const { callRetry, whyFailed } = await import("../lib/aiRetry")
    const { ApiError } = await import("../lib/api")
    vi.useFakeTimers()
    let calls = 0
    vi.stubGlobal("fetch", vi.fn(async () => { calls++; return new Response("<html>Login Redirect</html>", { status: 401 }) }))
    const out = callRetry("/setup/workflow", {}).catch(e => e)
    await vi.runAllTimersAsync()
    const e = await out
    expect(calls).toBe(1); expect(e).toBeInstanceOf(ApiError); expect((e as InstanceType<typeof ApiError>).status).toBe(401)
    expect(whyFailed(e)).toMatch(/sign-in for this preview has expired.*setup is kept/)
    calls = 0
    vi.stubGlobal("fetch", vi.fn(async () => { calls++; return new Response(JSON.stringify({ message: "The AI took too long to answer." }), { status: 504 }) }))
    const slow = callRetry("/setup/workflow", {}).catch(x => x)
    await vi.runAllTimersAsync()
    expect(calls).toBe(3); expect(whyFailed(await slow)).toBe(" (The AI took too long to answer)")
    vi.useRealTimers(); vi.unstubAllGlobals()
  })
})
