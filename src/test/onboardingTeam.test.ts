import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { clubDraft, validateGoals } from "../data/settings"
import { MAX_ROLES } from "../data/structure"
import type { ConstitutionRead } from "../lib/constitution"
import { DEFAULT_ON, SUGGESTIONS, goalsError, goalsFrom, rowsFrom } from "../onboarding/founder/goals/suggestions"
import { addRole, applyReading, bossChoices, removeRole, renameRole, roleDepth, setDuties, setPersonName, setReportsTo, treeOrderRoles, validateTeam } from "../onboarding/founder/team/rows"

// OB-05: the pure parts of the Goals and Team screens. The screens themselves are in e2e/ob-05-goals-team.spec.ts.
const club = () => clubDraft(seedDemo("2026-10-22"))

describe("Goals suggestions", () => {
  it("start with the first two switched on, and the chosen goals pass the rule the rest of the app uses", () => {
    const rows = rowsFrom(club().goals)   // the demo's own goals are not ours, so we start from the suggestions
    expect(rows.filter(r => r.on)).toHaveLength(DEFAULT_ON)
    const goals = goalsFrom(rows)
    expect(validateGoals(goals)).toBeNull()
    expect(goals.every(g => g.current === 0)).toBe(true)
    expect(new Set(SUGGESTIONS.map(s => s.id)).size).toBe(SUGGESTIONS.length)
  })
  it("keeps editable choices when the screen is opened again", () => {
    const rows = rowsFrom(club().goals).map(r => ({ ...r, on: true, label: `${r.label} goal`, unit: `${r.unit} total`, target: r.target + 1 }))
    expect(rowsFrom(goalsFrom(rows))).toEqual(rows)
  })
  it("allows no goals, but requires a mission and valid selected goals", () => {
    const rows = rowsFrom(club().goals)
    expect(goalsError(rows, "Build a welcoming club.")).toBeNull()
    expect(goalsError(rows.map(r => ({ ...r, on: false })), "Build a welcoming club.")).toBeNull()
    expect(goalsError(rows, "")).not.toBeNull()
    expect(goalsError(rows.map(r => ({ ...r, target: 0 })), "Build a welcoming club.")).not.toBeNull()
    expect(goalsError(rows, "x".repeat(301))).not.toBeNull()
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
