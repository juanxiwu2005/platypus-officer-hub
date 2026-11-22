import { describe, expect, it, vi } from "vitest"
import { seedDemo } from "../data/seed"
import { clubDraft, completeSetup, resetWorkflow, saveWorkflow, validateWorkflow } from "../data/settings"
import { newObjects } from "../data/changeReview"
import { EVENT_STEPS, buildEventNodes, orgSteps } from "../engine/playbooks"
import { applyChanges, checkWorkflow, describeWorkflow, isLocked, presetSteps, revertChange, withOwners, type WorkflowChange } from "../engine/workflow"
import { sanitizeOps } from "../lib/commands"

const base = seedDemo()
const ch = (c: Partial<WorkflowChange> & Pick<WorkflowChange, "op" | "key">): WorkflowChange => ({ id: "c" + Math.random(), title: c.key, patch: {}, evidence: "", ...c })
const roleId = (t: string) => base.roles.find(r => r.displayName === t)!.id

describe("org workflow · applying changes", () => {
  it("adds a step of the club's own after the steps it names, owned by a role, with club timing as days (never a date)", () => {
    const r = applyChanges(presetSteps(), [ch({ op: "add", key: "permission", title: "Collect permission forms", patch: { phase: "prepare", estDays: 2, dependsOn: ["plan"], ownerRoleId: roleId("Secretary"), daysBefore: 10 }, beforeKeys: ["finalcheck"] })], base.roles)
    const s = r.steps.find(x => x.key === "permission")!
    expect(r.applied).toHaveLength(1)
    expect(s).toMatchObject({ custom: true, phase: "prepare", estDays: 2, dependsOn: ["plan"], ownerRoleId: roleId("Secretary"), fn: "secretary", anchor: { kind: "target", days: 10, unit: "calendar" } })
    expect(r.steps.find(x => x.key === "finalcheck")!.dependsOn).toContain("permission")
    expect(JSON.stringify(s)).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })
  it("changes a step's title, days, order and owner, and keeps ASU deadlines", () => {
    const r = applyChanges(presetSteps(), [ch({ op: "update", key: "contentCreation", patch: { title: "Design the flyer in Canva", estDays: 4, dependsOn: ["marketingNeeds", "budget"], ownerRoleId: roleId("Marketing lead") } }), ch({ op: "update", key: "registry", patch: { estDays: 3, ownerRoleId: roleId("Secretary") } })], base.roles)
    expect(r.refused).toEqual([])
    expect(r.steps.find(x => x.key === "contentCreation")).toMatchObject({ title: "Design the flyer in Canva", estDays: 4, dependsOn: ["marketingNeeds", "budget"] })
    const reg = r.steps.find(x => x.key === "registry")!
    expect(reg).toMatchObject({ estDays: 3, ownerRoleId: roleId("Secretary") }); expect(reg.anchor).toEqual(EVENT_STEPS.find(x => x.key === "registry")!.anchor)
  })
  it("refuses what ASU rules do not allow, and says why", () => {
    const r = applyChanges(presetSteps(), [
      ch({ op: "remove", key: "foodCompliance" }), ch({ op: "update", key: "registry", patch: { phase: "run" } }), ch({ op: "update", key: "purchaseRequest", patch: { daysBefore: 3 } }),
      ch({ op: "update", key: "nope", patch: { estDays: 2 } }), ch({ op: "update", key: "plan", patch: { dependsOn: ["backup"] } }),
    ], base.roles)
    expect(r.applied).toEqual([])
    expect(r.refused.map(x => x.reason)).toEqual([expect.stringMatching(/ASU rule R06/), expect.stringMatching(/R01/), expect.stringMatching(/R09/), "That step is not in the workflow.", "That would make a step wait for itself."])
    expect(r.steps).toEqual(presetSteps())
  })
  it("removing a step the club does not use lets later steps wait for what it waited for; locked steps are never removed", () => {
    const r = applyChanges(presetSteps(), [ch({ op: "remove", key: "partnerReview" }), ch({ op: "remove", key: "promotionItems" })], base.roles)
    expect(r.steps.some(x => x.key === "partnerReview")).toBe(false)
    expect(r.steps.find(x => x.key === "parking")!.dependsOn).toEqual(expect.arrayContaining(["travel"])); expect(r.steps.find(x => x.key === "parking")!.dependsOn).not.toContain("partnerReview")
    expect(r.steps.some(x => x.key === "promotionItems")).toBe(true)
    expect(r.refused[0].reason).toMatch(/required organization/)
    expect(isLocked(EVENT_STEPS.find(x => x.key === "purchaseRequest")!)).toBe(true); expect(isLocked(EVENT_STEPS.find(x => x.key === "promotionItems")!)).toBe(false)
  })
  it("each change can be undone on its own", () => {
    const changes = [ch({ op: "add", key: "permission", title: "Collect permission forms", patch: { dependsOn: ["plan"] }, beforeKeys: ["finalcheck"] }), ch({ op: "update", key: "contentCreation", patch: { title: "Design the flyer", estDays: 5 } }), ch({ op: "remove", key: "partnerReview" })]
    const r = applyChanges(presetSteps(), changes, base.roles)
    expect(r.applied).toHaveLength(3)
    let steps = revertChange(r.steps, r.applied[2]); expect(steps.some(x => x.key === "partnerReview")).toBe(true); expect(steps.find(x => x.key === "parking")!.dependsOn).toContain("partnerReview")
    steps = revertChange(steps, r.applied[1]); expect(steps.find(x => x.key === "contentCreation")).toMatchObject({ title: EVENT_STEPS.find(x => x.key === "contentCreation")!.title, estDays: EVENT_STEPS.find(x => x.key === "contentCreation")!.estDays })
    steps = revertChange(steps, r.applied[0]); expect(steps.some(x => x.key === "permission")).toBe(false); expect(steps.find(x => x.key === "finalcheck")!.dependsOn).not.toContain("permission")
    expect(describeWorkflow(presetSteps())).toBe("The standard workflow.")
    expect(describeWorkflow(r.steps)).toBe("Standard workflow, 1 added, 2 changed, 1 removed.")
  })
})

describe("org workflow · checks against ASU rules (the engine's, not the AI's)", () => {
  it("the standard workflow has nothing to fix", () => {
    expect(checkWorkflow(presetSteps(), base.roles, base).filter(i => i.level === "blocked")).toEqual([])
  })
  it("blocks a missing rule step, a changed rule deadline, a lost rule order, a loop and a dangling link", () => {
    const steps = presetSteps()
    expect(checkWorkflow(steps.filter(s => s.key !== "foodCompliance"), base.roles).map(i => i.text).join("\n")).toMatch(/Food Exception Permit” is missing.*R06/)
    expect(checkWorkflow(steps.map(s => s.key === "purchaseRequest" ? { ...s, anchor: { kind: "target" as const, days: 3, unit: "calendar" as const, label: "x" } } : s), base.roles).some(i => i.level === "blocked" && /R09/.test(i.text))).toBe(true)
    expect(checkWorkflow(steps.map(s => s.key === "purchaseRequest" ? { ...s, dependsOn: ["budget"] } : s), base.roles).some(i => i.level === "blocked" && /Budget Approval/.test(i.text))).toBe(true)
    expect(checkWorkflow(steps.map(s => s.key === "plan" ? { ...s, dependsOn: ["backup"] } : s), base.roles).some(i => i.level === "blocked" && /waits for itself/.test(i.text))).toBe(true)
    expect(checkWorkflow(steps.map(s => s.key === "contentCreation" ? { ...s, dependsOn: ["ghost"] } : s), base.roles).some(i => i.level === "blocked" && /not in the workflow/.test(i.text))).toBe(true)
  })
  it("warns when a step goes to the advisor, and when the club's timing would make a sample event miss a deadline", () => {
    const advisorRole = { id: "r-adv", displayName: "Club Advisor", fn: "advisor" as const, holderId: null }
    const roles = [...base.roles, advisorRole]
    expect(checkWorkflow(presetSteps().map(s => s.key === "contentCreation" ? { ...s, ownerRoleId: "r-adv" } : s), roles).some(i => i.level === "warning" && /advisor/.test(i.text))).toBe(true)
    // FB-6: a calibrated step is dated from its own timing, so effort alone no longer moves the plan. A club timing one day
    // before the event for Quote Gather does: the funding chain after it must finish later, past the R09 purchase deadline.
    const slow = presetSteps().map(s => s.key === "quotes" ? { ...s, anchor: { kind: "target" as const, days: 1, unit: "calendar" as const, label: "Club timing from your planning notes" } } : s)
    const issues = checkWorkflow(slow, base.roles, base)
    expect(issues.some(i => i.level === "warning" && /would miss a deadline/.test(i.text))).toBe(true)
    expect(issues.some(i => i.level === "blocked")).toBe(false)
  })
  it("validateWorkflow refuses broken or blocked workflows", () => {
    expect(validateWorkflow(presetSteps(), base.roles)).toBeNull()
    expect(validateWorkflow([], base.roles)).toBeTruthy()
    expect(validateWorkflow(presetSteps().filter(s => s.key !== "purchaseRequest"), base.roles)).toMatch(/missing/)
    expect(validateWorkflow(presetSteps().map(s => s.key === "contentCreation" ? { ...s, estDays: 99 } : s), base.roles)).toBeTruthy()
  })
})

describe("org workflow · every new event uses it", () => {
  const custom = () => {
    const r = applyChanges(presetSteps(), [ch({ op: "add", key: "permission", title: "Collect permission forms", patch: { dependsOn: ["plan"], ownerRoleId: roleId("Secretary"), estDays: 2 }, beforeKeys: ["finalcheck"] }), ch({ op: "update", key: "contentCreation", patch: { ownerRoleId: roleId("Marketing lead") } })], base.roles)
    return withOwners(r.steps, base.roles)
  }
  const event = { id: "e-x", name: "X", date: "2026-12-03", type: "social" as const, headcount: 30, venue: "campus" as const, food: "offsite" as const, funding: "usg" as const, speaker: false, goalId: null, playbookId: "seo-event" }
  it("buildEventNodes gives each step to its chosen role's officer, including steps the club added", () => {
    const nodes = buildEventNodes(event, base.roles, { steps: custom() })
    expect(nodes.find(n => n.stepKey === "permission")).toMatchObject({ title: "Collect permission forms", ownerId: "priya", fn: "secretary", dependsOn: ["e-x:plan"] })
    expect(nodes.find(n => n.stepKey === "finalcheck")!.dependsOn).toContain("e-x:permission")
    expect(nodes.find(n => n.stepKey === "contentCreation")!.ownerId).toBe("sam")
    expect(buildEventNodes(event, base.roles).some(n => n.stepKey === "permission")).toBe(false)           // the standard workflow is unchanged
  })
  it("setup saves the workflow, builds the first event from it, and refuses one that breaks an ASU rule", () => {
    const d = clubDraft(base), code = crypto.randomUUID()
    const ev = { op: "create_event" as const, name: "Founder Dinner", type: "social" as const, headcount: 30, venue: "campus" as const, food: "offsite" as const, funding: "usg" as const, speaker: false }
    const next = completeSetup(base, d, ev, "2026-11-19", code, undefined, undefined, custom())
    expect(next.org.eventWorkflow?.summary).toBe("Standard workflow, 1 added.")
    expect(next.nodes.some(n => n.stepKey === "permission" && n.ownerId === "priya")).toBe(true)
    expect(completeSetup(base, d, ev, "2026-11-19", code, undefined, undefined, presetSteps().filter(s => s.key !== "purchaseRequest"))).toBe(base)
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
    expect(saveWorkflow(base, presetSteps().filter(s => s.key !== "purchaseRequest"))).toBe(base)
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
    const out = callRetry("/setup/constitution", {}).catch(e => e)
    await vi.runAllTimersAsync()
    const e = await out
    expect(calls).toBe(1); expect(e).toBeInstanceOf(ApiError); expect((e as InstanceType<typeof ApiError>).status).toBe(401)
    expect(whyFailed(e)).toMatch(/sign-in for this preview has expired.*setup is kept/)
    calls = 0
    vi.stubGlobal("fetch", vi.fn(async () => { calls++; return new Response(JSON.stringify({ message: "The AI took too long to answer." }), { status: 504 }) }))
    const slow = callRetry("/setup/constitution", {}).catch(x => x)
    await vi.runAllTimersAsync()
    expect(calls).toBe(3); expect(whyFailed(await slow)).toBe(" (The AI took too long to answer)")
    vi.useRealTimers(); vi.unstubAllGlobals()
  })
})
