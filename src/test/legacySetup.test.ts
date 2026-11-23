import { describe, expect, it } from "vitest"
import { seedDemo } from "../data/seed"
import { clubDraft } from "../data/settings"
import { freshDraft } from "../onboarding/draft"
import { fromLegacySetup, isLegacySetup, legacySetupPath, type LegacySetup } from "../onboarding/gate/legacySetup"

const state = seedDemo("2026-10-22")
const legacy = (): LegacySetup => ({ v: 1, step: 2, draft: clubDraft(state), steps: freshDraft(state).steps, buffer: 5, sentence: "Plan dinner", doc: { fileName: "fictional.txt", text: "The president leads.", checksum: "fictional" } })
describe("legacy setup continuation", () => {
  it("retains entered duties, contact fields, workspace, workflow, buffer and constitution without re-reading", () => {
    const old = legacy(); old.draft.roles[0].duties = "My edited duties"
    const next = fromLegacySetup(freshDraft(state), old)
    expect(next.club).toEqual(old.draft)
    expect(next.doc).toEqual(old.doc)
    expect(next.steps).toEqual(old.steps)
    expect(next).toMatchObject({ applied: true, structureTouched: true, workflowTouched: true, missionTouched: true, buffer: 5, sentence: "Plan dinner", event: null })
  })
  it.each([[0, "name"], [1, "goals"], [2, "team"], [3, "first-event"], [4, "first-event"], [5, "first-event"]])("maps legacy step %s to the shared %s screen", (step, screen) => {
    expect(legacySetupPath(Number(step))).toBe(`/welcome/founder/${screen}`)
  })
  it("accepts a valid unfinished record and rejects unreadable records without mutating the source", () => {
    const old = legacy(); old.draft.name = ""; old.draft.mission = ""
    expect(isLegacySetup(old)).toBe(true)
    for (const bad of [null, {}, { ...old, v: 8 }, { ...old, steps: null }, { ...old, draft: { ...old.draft, roles: [null] } }]) expect(isLegacySetup(bad)).toBe(false)
    expect(old.draft.name).toBe("")
  })
})
