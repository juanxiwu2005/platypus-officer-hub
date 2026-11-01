import { describe, expect, it } from "vitest"
import { seedDemo, SCHEMA_VERSION } from "../data/seed"
import { RULES } from "../data/rules"
import { computeForecast } from "../engine/forecast"

describe("demo seed", () => {
  const s = seedDemo("2026-10-22", "v2")

  it("uses the current schema version and a fixed today", () => {
    expect(s.schemaVersion).toBe(SCHEMA_VERSION)
    expect(s.today).toBe("2026-10-22")
  })

  it("shows three upcoming, controllable event states in the v2 demo", () => {
    const demo = seedDemo(undefined, "v2")
    const forecast = computeForecast(demo)
    const byId = (id: string) => demo.nodes.filter(node => node.eventId === id)

    expect(demo.events.map(event => event.date)).toEqual(["2027-03-25", "2027-03-18", "2026-12-03"])
    expect(demo.events.every(event => event.date > demo.today)).toBe(true)
    expect(Object.values(forecast.events).every(event => event.color === "green")).toBe(true)
    expect(byId("e-founder").filter(node => node.status === "done")).toHaveLength(26)
    expect(byId("e-night").filter(node => ["waiting", "blocked", "in_progress"].includes(node.status))).toHaveLength(3)
    expect(byId("e-speaker").filter(node => ["waiting", "blocked", "in_progress"].includes(node.status))).toHaveLength(0)
  })

  it("every person holds a real role and every role holder exists", () => {
    const roleIds = new Set(s.roles.map(r => r.id))
    const personIds = new Set(s.people.map(p => p.id))
    for (const p of s.people) expect(roleIds.has(p.roleId)).toBe(true)
    for (const r of s.roles) if (r.holderId) expect(personIds.has(r.holderId)).toBe(true)
    expect(personIds.has(s.viewerId)).toBe(true)
  })

  it("every node has at most one owner who exists; only unclaimed nodes may lack an owner", () => {
    const personIds = new Set(s.people.map(p => p.id))
    for (const n of s.nodes) {
      if (n.ownerId) expect(personIds.has(n.ownerId)).toBe(true)
      if (n.ownerId === null) expect(n.status).toBe("unclaimed")
    }
  })

  it("every node has dates from the rule engine", () => {
    const invalid: string[] = []
    for (const n of s.nodes) {
      expect(n.latestStart).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(n.clubDeadline).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      if (n.latestStart! > n.clubDeadline!) invalid.push(n.id)
    }
    expect(invalid).toEqual([])
  })

  it("contributions point at real nodes", () => {
    const nodeIds = new Set(s.nodes.map(n => n.id))
    for (const c of s.contributions) expect(nodeIds.has(c.nodeId)).toBe(true)
  })

  it("dependencies, events and rules referenced by nodes exist", () => {
    const nodeIds = new Set(s.nodes.map(n => n.id))
    const eventIds = new Set(s.events.map(e => e.id))
    const ruleIds = new Set(RULES.map(r => r.id))
    for (const n of s.nodes) {
      for (const d of n.dependsOn) expect(nodeIds.has(d)).toBe(true)
      if (n.eventId) expect(eventIds.has(n.eventId)).toBe(true)
      for (const r of n.ruleIds) expect(ruleIds.has(r)).toBe(true)
    }
  })

  it("node ids are unique", () => {
    expect(new Set(s.nodes.map(n => n.id)).size).toBe(s.nodes.length)
  })

  it("contains only fictional example.org emails", () => {
    for (const p of s.people) expect(p.email.endsWith("@example.org")).toBe(true)
  })

  it("rule book has R01–R16 with sources", () => {
    expect(RULES.map(r => r.id)).toEqual(Array.from({ length: 16 }, (_, i) => `R${String(i + 1).padStart(2, "0")}`))
    for (const r of RULES) expect(r.sources.length).toBeGreaterThan(0)
  })
})
