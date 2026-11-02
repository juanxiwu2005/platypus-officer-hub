import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useStore } from "../data/store"
import { BUFFER_CHOICES, clubDraft, type ClubDraft, type FirstEvent } from "../data/settings"
import type { StepTemplate } from "../data/types"
import { orgSteps } from "../engine/playbooks"
import { withOwners } from "../engine/workflow"
import type { ConstitutionDoc } from "../components/setup/ConstitutionStep"
import type { ConstitutionRead } from "../lib/constitution"
import { deleteJson, loadJson, saveJson } from "../lib/localDocs"

/** The AI's reading of the constitution while the president keeps going. Same shapes as the classic setup page. */
export type Reading = { status: "idle" } | { status: "reading" } | { status: "ready"; read: ConstitutionRead; note: string; retry: boolean; pending: number }

/**
 * Everything the founder flow collects, in one place. It holds every piece of state the classic Setup page keeps, so a screen only reads and
 * writes this and never needs another field added (this file belongs to OB-01; later packages must not edit it).
 */
export interface OnboardingDraft {
  club: ClubDraft                 // name, mission, goals, roles, people, workspace links
  doc: ConstitutionDoc | null     // the constitution text (read in this browser)
  reading: Reading                // the AI reading it (not saved)
  applied: boolean                // the reading has been applied to roles
  structureTouched: boolean       // the president edited roles by hand: never overwrite them
  missionTouched: boolean
  steps: StepTemplate[]           // the club's event workflow
  workflowTouched: boolean
  buffer: number                  // working days before the real deadline
  sentence: string                // the first event, in one sentence
  event: FirstEvent | null        // the prepared first event
  date: string                    // the confirmed event date
  source: string                  // where the prepared event came from (shown to the president)
  confirmed: boolean
  inviteCode: string
  skipped: string[]               // optional steps the president skipped (shown as hollow dots, never nagged)
}
/** Saved copy: everything except the live AI reading. */
type Saved = Omit<OnboardingDraft, "reading">
interface DraftValue {
  draft: OnboardingDraft
  patch: (next: Partial<OnboardingDraft>) => void
  update: (fn: (d: OnboardingDraft) => OnboardingDraft) => void
  /** An unfinished walkthrough from the last 7 days, if any. */
  restorable: { savedAt: string } | null
  restore: () => void
  discard: () => void
  /** Delete the saved copy (after the workspace is created). */
  clear: () => void
}
const DRAFT_ID = "onboarding-draft"   // not the classic page's "setup-draft", so the two never overwrite each other
const WEEK = 7 * 86_400_000
const DraftContext = createContext<DraftValue | null>(null)

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const { state } = useStore()
  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    const club = clubDraft(state)
    return {
      club, doc: null, reading: { status: "idle" }, applied: false, structureTouched: false, missionTouched: false,
      steps: withOwners(orgSteps(state), club.roles), workflowTouched: false,
      buffer: (BUFFER_CHOICES as readonly number[]).includes(state.org.settings.clubBufferBusinessDays) ? state.org.settings.clubBufferBusinessDays : 3,
      sentence: "Plan Spring Kickoff Dinner on Apr 16, 60 people, outside caterer, USG funding", event: null, date: "", source: "", confirmed: false,
      inviteCode: crypto.randomUUID(), skipped: [],
    }
  })
  const [restorable, setRestorable] = useState<{ savedAt: string; value: Saved } | null>(null)
  const dirty = useRef(false)
  useEffect(() => { let on = true; void loadJson<Saved>(DRAFT_ID).then(r => { if (on && r?.value?.club && Date.now() - Date.parse(r.savedAt) < WEEK) setRestorable(r) }); return () => { on = false } }, [])
  useEffect(() => {
    if (!dirty.current || restorable) return
    const { reading: _reading, ...saved } = draft; void _reading
    const t = setTimeout(() => { void saveJson(DRAFT_ID, saved satisfies Saved) }, 700)
    return () => clearTimeout(t)
  }, [draft, restorable])
  const update = useCallback((fn: (d: OnboardingDraft) => OnboardingDraft) => { dirty.current = true; setDraft(fn) }, [])
  const patch = useCallback((next: Partial<OnboardingDraft>) => update(d => ({ ...d, ...next })), [update])
  const restore = useCallback(() => { setRestorable(r => { if (r) { dirty.current = true; setDraft(d => ({ ...d, ...r.value, reading: { status: "idle" } })) } return null }) }, [])
  const discard = useCallback(() => { void deleteJson(DRAFT_ID); setRestorable(null) }, [])
  const clear = useCallback(() => { dirty.current = false; void deleteJson(DRAFT_ID) }, [])
  const value = useMemo(() => ({ draft, patch, update, restorable: restorable ? { savedAt: restorable.savedAt } : null, restore, discard, clear }), [draft, patch, update, restorable, restore, discard, clear])
  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
}
export function useOnboardingDraft() { const value = useContext(DraftContext); if (!value) throw new Error("OnboardingDraftProvider is required"); return value }
