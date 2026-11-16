import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { clubDraft, validateClub, validateGoals } from "../data/settings"
import { MAX_ROLES } from "../data/structure"
import type { ConstitutionRead } from "../lib/constitution"
import { freshDraft } from "../onboarding/draft"
import { MAX_MISSION, missionError } from "../onboarding/founder/name/mission"
import { addAdvisor, addRole, applyReading, bossChoices, isAdvisor, removeRole, renameRole, roleDepth, setDuties, setPersonName, setReportsTo, treeOrderRoles, validateTeam } from "../onboarding/founder/team/rows"

// OB-05: the pure parts of the Team screen (and, since FB-2, the Name screen's mission). The screens themselves are in e2e/ob-04-*, e2e/ob-05-* and e2e/fb-02-*.
const club = () => clubDraft(seedDemo("2026-10-22"))

// FB-2: the Goals screen left the walkthrough (goals are set in Settings only); its mission moved to the Name screen with the same rule.
describe("Name screen mission", () => {
  it("is required, at most 300 characters, and passes the rule the rest of the app uses", () => {
    expect(missionError("Build a welcoming club.")).toBeNull()
    expect(missionError("")).toBe("Add a mission to continue.")
    expect(missionError("   ")).toBe("Add a mission to continue.")
    expect(missionError("x".repeat(300))).toBeNull()
    expect(missionError("x".repeat(301))).toBe("Keep the mission under 300 characters.")
    expect(validateClub({ ...club(), mission: "x".repeat(MAX_MISSION) })).toBeNull()
    expect(validateClub({ ...club(), mission: "" })).not.toBeNull()
  })
  it("a new walkthrough starts with no goals, and a club created with none is valid", () => {
    const d = freshDraft(seedDemo("2026-10-22"))
    expect(d.club.goals).toEqual([])
    expect(validateGoals(d.club.goals)).toBeNull()
  })
})

describe("Team rows", () => {
  it("the demo team passes the checks, and every person gets an example.org email", () => {
    const c = club()
    const checked = validateTeam(c)
    expect(checked.error).toBeNull()
    expect(checked.people.every(p => /@example\.org$/.test(p.email))).toBe(true)
  })
  it("renaming a role follows its title, but the president stays the president", () => {
    const c = club()
    expect(renameRole(c.roles, "r-fin", "Finance chair").find(r => r.id === "r-fin")?.fn).toBe("finance")
    expect(renameRole(c.roles, "r-pres", "Founder").find(r => r.id === "r-pres")?.fn).toBe("president")
    expect(renameRole(c.roles, "r-sec", "President").find(r => r.id === "r-sec")?.fn).not.toBe("president")
  })
  it("an empty name makes an open position; a new name gets a new demo email from its own name", () => {
    const c = club()
    const open = setPersonName(c.roles, c.people, "r-fin", "")
    expect(open.roles.find(r => r.id === "r-fin")?.holderId).toBeNull()
    expect(open.people.some(p => p.name === "Maya Chen")).toBe(false)
    const renamed = setPersonName(c.roles, c.people, "r-fin", "Dana Cole")
    const person = renamed.people.find(p => p.name === "Dana Cole")!
    expect(person.email).toBe("")
    expect(validateTeam({ roles: renamed.roles, people: renamed.people }).people.find(p => p.id === person.id)?.email).toBe("dana.cole@example.org")
    const filled = setPersonName(open.roles, open.people, "r-fin", "Lee Park")
    expect(filled.roles.find(r => r.id === "r-fin")?.holderId).toBe(filled.people.find(p => p.name === "Lee Park")?.id)
    // No contact details are collected: a person made here has no phone or ASU ID.
    expect(filled.people.find(p => p.name === "Lee Park")).toMatchObject({ phone: "", asuId: "" })
  })
  it("reporting lines cannot loop, and the list stays in order with heads first", () => {
    const c = club()
    const withBoss = setReportsTo(c.roles, "r-sec", "r-fin")
    expect(withBoss.find(r => r.id === "r-sec")?.reportsToId).toBe("r-fin")
    expect(withBoss.findIndex(r => r.id === "r-fin")).toBeLessThan(withBoss.findIndex(r => r.id === "r-sec"))
    expect(setReportsTo(withBoss, "r-fin", "r-sec")).toBe(withBoss)
    expect(bossChoices(withBoss, "r-fin").some(r => r.id === "r-sec")).toBe(false)
    expect(roleDepth(withBoss, "r-fin")).toBe(1)
    expect(roleDepth(withBoss, "r-sec")).toBe(2)
    const nested = setReportsTo(c.roles, "r-mkt", "r-fin")
    expect(nested.map(r => r.id)).toEqual(["r-pres", "r-fin", "r-mkt", "r-events", "r-sec"])
    expect(treeOrderRoles(nested)).toEqual(nested)
  })
  it("adds roles with different titles up to the limit, and never removes the president", () => {
    let c = club()
    let last = ""
    for (let i = 0; i < 3; i++) { const made = addRole(c.roles)!; c = { ...c, roles: made.roles }; last = made.id }
    expect(new Set(c.roles.map(r => r.displayName)).size).toBe(c.roles.length)
    expect(c.roles.find(r => r.id === last)?.reportsToId).toBe("r-pres")
    while (c.roles.length < MAX_ROLES) c = { ...c, roles: addRole(c.roles)!.roles }
    expect(addRole(c.roles)).toBeNull()
    expect(removeRole(c.roles, c.people, "r-pres").roles).toBe(c.roles)
    expect(removeRole(c.roles, c.people, last).roles.some(r => r.id === last)).toBe(false)
  })
  it("FB-2: Add advisor makes an \"Advisor\" (then \"Advisor 2\") that reports to nobody, is listed last, and passes the checks", () => {
    let c = club()
    const made = addAdvisor(c.roles)!
    c = { ...c, roles: made.roles }
    const adv = c.roles.find(r => r.id === made.id)!
    expect(adv).toMatchObject({ displayName: "Advisor", fn: "advisor", reportsToId: null, holderId: null })
    expect(adv.duties).toMatch(/Advises the club/)
    expect(c.roles.at(-1)!.id).toBe(made.id)
    expect(roleDepth(c.roles, made.id)).toBe(0)
    expect(validateTeam(c).error).toBeNull()
    const second = addAdvisor(c.roles)!
    expect(second.roles.find(r => r.id === second.id)?.displayName).toBe("Advisor 2")
    // A new role added after the advisor still reports to the president and is listed before the advisor.
    const role = addRole(c.roles)!
    expect(role.roles.at(-1)!.id).toBe(made.id)
    // Nobody can choose an advisor as their boss.
    expect(bossChoices(c.roles, "r-fin").some(r => r.id === made.id)).toBe(false)
    while (c.roles.length < MAX_ROLES) c = { ...c, roles: addRole(c.roles)!.roles }
    expect(addAdvisor(c.roles)).toBeNull()
  })
  it("FB-2: a role renamed into an advisor leaves the chain (its reports move up); renamed back, it reports to the president", () => {
    const c = club()
    const nested = setReportsTo(c.roles, "r-sec", "r-fin")
    const advised = renameRole(nested, "r-fin", "Faculty Advisor")
    expect(advised.find(r => r.id === "r-fin")).toMatchObject({ fn: "advisor", reportsToId: null })
    expect(advised.find(r => r.id === "r-sec")?.reportsToId).toBe("r-pres")
    expect(isAdvisor(advised.find(r => r.id === "r-fin")!)).toBe(true)
    expect(advised.map(r => r.id)).toEqual(nested.map(r => r.id))   // the row being typed in does not move
    const back = renameRole(advised, "r-fin", "Treasurer")
    expect(back.find(r => r.id === "r-fin")).toMatchObject({ fn: "finance", reportsToId: "r-pres" })
    const added = addAdvisor(c.roles)!
    expect(renameRole(added.roles, added.id, "Events chair").find(r => r.id === added.id)).toMatchObject({ fn: "programs", reportsToId: "r-pres" })
  })
  it("duties stop at the limit the rest of the app uses", () => {
    const c = club()
    expect(setDuties(c.roles, "r-fin", "x".repeat(900)).find(r => r.id === "r-fin")?.duties).toHaveLength(400)
  })
  it("Continue is stopped for a president with no name, two officers with one name, and two roles with one title", () => {
    const c = club()
    const noPresident = setPersonName(c.roles, c.people, "r-pres", "")
    expect(validateTeam(noPresident).error).toMatch(/president/i)
    const twin = setPersonName(c.roles, c.people, "r-fin", "alex rivera")
    expect(validateTeam(twin).error).not.toBeNull()
    expect(validateTeam({ people: c.people, roles: renameRole(c.roles, "r-sec", "Treasurer") }).error).not.toBeNull()
  })
  it("applies an AI reading the way the classic setup does, and keeps a mission the president typed", () => {
    const read: ConstitutionRead = { mission: "Teach founders.", source: "ai", notes: [], roles: [
      { title: "Chair", reportsTo: null, duties: "Leads.", isAdvisor: false }, { title: "Treasurer", reportsTo: "Chair", duties: "Keeps the budget.", isAdvisor: false }] }
    const c = club()
    const used = applyReading(c, read, false)
    expect(used.roles.map(r => r.displayName)).toEqual(expect.arrayContaining(["Chair", "Treasurer"]))
    expect(used.roles.filter(r => r.fn === "president")).toHaveLength(1)
    expect(used.mission).toBe("Teach founders.")
    expect(applyReading(c, read, true).mission).toBe(c.mission)
  })
})

// The guard that the Team screen asks for no contact details. A guard nobody has seen go red is not a guard, so it is checked against a violation.
const asksForContactDetails = (fields: { label: string; type: string }[]) => fields.filter(f => /e-?mail|phone|\btel\b|asu\s*id/i.test(f.label) || ["email", "tel"].includes(f.type))
describe("contact-detail guard", () => {
  it("passes the Team fields and goes red for an Email, Phone or ASU ID field", () => {
    expect(asksForContactDetails([{ label: "Role 1", type: "text" }, { label: "Person 1", type: "text" }])).toEqual([])
    expect(asksForContactDetails([{ label: "Role 1", type: "text" }, { label: "Email", type: "email" }])).toHaveLength(1)
    expect(asksForContactDetails([{ label: "Mobile", type: "tel" }])).toHaveLength(1)
    expect(asksForContactDetails([{ label: "ASU ID", type: "text" }])).toHaveLength(1)
  })
})
