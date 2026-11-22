import type { OnboardingDraft } from "../draft"
import { ROLE_FUNCTIONS, validateGoals, validateProfile, validateWorkflow, validateWorkspace, type ClubDraft } from "../../data/settings"
import type { ConstitutionDoc } from "../../components/setup/ConstitutionStep"
import type { StepTemplate } from "../../data/types"

export interface LegacySetup {
  v: 1; step: number; draft: ClubDraft; steps: StepTemplate[]
  buffer: number; sentence: string; doc: ConstitutionDoc | null
}

/** Accept incomplete names/missions, but never pass an unreadable browser record into the shared screens. */
export function isLegacySetup(value: unknown): value is LegacySetup {
  try {
    const v = value as LegacySetup, c = v.draft
    return v.v === 1 && Number.isInteger(v.step) && typeof c.name === "string" && typeof c.mission === "string"
      && Array.isArray(c.roles) && c.roles.length > 0 && c.roles.every(r => ROLE_FUNCTIONS.some(f => f.value === r.fn) && typeof r.id === "string" && typeof r.displayName === "string" && (r.holderId === null || typeof r.holderId === "string") && (r.reportsToId == null || typeof r.reportsToId === "string") && (r.duties === undefined || typeof r.duties === "string"))
      && Array.isArray(c.people) && c.people.every(p => !validateProfile(p))
      && !validateGoals(c.goals) && !validateWorkspace(c.workspace) && !validateWorkflow(v.steps, c.roles)
      && [1, 2, 3, 5, 7].includes(v.buffer) && typeof v.sentence === "string"
      && (v.doc === null || (typeof v.doc.fileName === "string" && typeof v.doc.text === "string" && typeof v.doc.checksum === "string"))
  } catch { return false }
}

export function fromLegacySetup(base: OnboardingDraft, v: LegacySetup): OnboardingDraft {
  return {
    ...base, club: v.draft, steps: v.steps, buffer: v.buffer, sentence: v.sentence, doc: v.doc,
    reading: { status: "idle" }, applied: true, structureTouched: true, missionTouched: true, workflowTouched: true,
    // The old page never saved a prepared event. Review it again rather than inventing one.
    event: null, date: "", source: "", confirmed: false, reminderMode: null, skipped: [],
  }
}

/** Resume at the corresponding shared screen. Workspace/workflow fields remain in the draft. */
export const legacySetupPath = (step: number) => `/welcome/founder/${step <= 0 ? "name" : step === 1 ? "goals" : step === 2 ? "team" : "first-event"}`
