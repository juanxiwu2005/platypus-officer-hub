import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useLocation } from "react-router-dom"
import { useStore } from "../data/store"
import { stepAt } from "./engine/flows"
import { BUFFER_CHOICES, clubDraft, type ClubDraft, type FirstEvent } from "../data/settings"
import type { DemoState, StepTemplate } from "../data/types"
import { orgSteps } from "../engine/playbooks"
import { withOwners } from "../engine/workflow"
import type { ConstitutionDoc } from "../components/setup/ConstitutionStep"
import type { ConstitutionRead } from "../lib/constitution"
import { deleteJson, loadJson, saveJson } from "../lib/localDocs"

/** The AI's reading of the constitution while the president keeps going. Same shapes as the classic setup page. */
export type Reading = { status: "idle" } | { status: "reading" } | { status: "ready"; read: ConstitutionRead; note: string; retry: boolean; pending: number }

/**
 * Everything the founder flow collects, in one place. It holds every piece of state the classic Setup page keeps, so a screen only reads and
 * writes this and never needs another field added.
 */
export interface OnboardingDraft {
  club: ClubDraft                 // name, mission, goals, roles, people, workspace links
  doc: ConstitutionDoc | null     // the constitution text (read in this browser)
  reading: Reading                // the AI reading it (saved only once it has finished)
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
/** Saved copy: everything except a reading still in progress, tagged with the tab's walkthrough it belongs to. */
type Saved = Omit<OnboardingDraft, "reading"> & { tab: string; reading?: Reading }
interface DraftValue {
  draft: OnboardingDraft
  patch: (next: Partial<OnboardingDraft>) => void
  update: (fn: (d: OnboardingDraft) => OnboardingDraft) => void
  /** A new attempt (study link, Start walkthrough, Replay, a Test button): a fresh draft, and the saved copy of the last one is gone. */
  reset: () => void
  /** The walkthrough is over (Start workspace, Keep current demo, Exit): delete the saved copy and save nothing more until the next reset. */
  clear: () => void
}
const DRAFT_ID = "onboarding-draft"                   // not the classic page's "setup-draft", so the two never overwrite each other
const TAB_KEY = "platypus.v1.onboarding.draft"        // sessionStorage: which saved draft belongs to this tab's current walkthrough
const WEEK = 7 * 86_400_000
const SAVE_DELAY = 250
const LOAD_LIMIT = 1500                               // a browser database that never answers must not hold the walkthrough back
const DraftContext = createContext<DraftValue | null>(null)

const readTab = () => { try { return window.sessionStorage.getItem(TAB_KEY) } catch { return null } }
const writeTab = (id: string | null) => { try { if (id) window.sessionStorage.setItem(TAB_KEY, id); else window.sessionStorage.removeItem(TAB_KEY) } catch { /* storage blocked: a reload starts over */ } }
const newTab = () => { const id = crypto.randomUUID(); writeTab(id); return id }

/**
 * A new walkthrough's draft. It keeps what a real tool would start with (the standard officer roles with fictional sample officers, the club's
 * workflow and buffer) and leaves empty what only the president can say: the club name, the mission, the goals and the first event.
 */
export function freshDraft(state: DemoState): OnboardingDraft {
  const base = clubDraft(state)
  const club: ClubDraft = { ...base, name: "", mission: "", goals: [], workspace: { ...base.workspace, planningNotes: "", files: [] } }
  return {
    club, doc: null, reading: { status: "idle" }, applied: false, structureTouched: false, missionTouched: false,
    steps: withOwners(orgSteps(state), club.roles), workflowTouched: false,
    buffer: (BUFFER_CHOICES as readonly number[]).includes(state.org.settings.clubBufferBusinessDays) ? state.org.settings.clubBufferBusinessDays : 3,
    sentence: "", event: null, date: "", source: "", confirmed: false,
    inviteCode: crypto.randomUUID(), skipped: [],
  }
}

/**
 * Holds the founder draft and keeps a copy in this browser (IndexedDB) so a reload, or a phone reloading the tab after switching apps, comes back
 * to the same screen with everything typed so far. Only the copy saved by this tab's current walkthrough is restored (sessionStorage says which):
 * a new attempt, another tab or a finished walkthrough never brings an old draft back. The screens are shown once the saved copy has been read,
 * so each screen starts from the restored draft.
 */
export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const { state } = useStore()
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])
  const [draft, setDraft] = useState<OnboardingDraft>(() => freshDraft(state))
  // Only a flow screen waits for the saved copy. The welcome page and the doors that begin an attempt (start, test) show at once: they start fresh anyway.
  const { pathname } = useLocation()
  const [ready, setReady] = useState(() => !stepAt(pathname))
  const wasReset = useRef(false)
  const latest = useRef(draft)
  const dirty = useRef(false)
  const closed = useRef(false)                         // after clear(): nothing is saved again until reset()
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null)   // the save that is waiting; clear() cancels it so it cannot bring the draft back

  useEffect(() => {
    let on = true
    const tab = readTab()
    const give = setTimeout(() => { if (on) setReady(true) }, LOAD_LIMIT)
    void loadJson<Saved>(DRAFT_ID).then(r => {
      if (!on) return
      const v = r?.value
      if (r && tab && v?.tab === tab && v.club && Date.now() - Date.parse(r.savedAt) < WEEK && !dirty.current && !wasReset.current) {
        const { tab: _tab, reading, ...rest } = v; void _tab
        setDraft(d => ({ ...d, ...rest, reading: reading?.status === "ready" ? reading : { status: "idle" } }))
      }
      setReady(true)
    })
    return () => { on = false; clearTimeout(give) }
  }, [])

  const save = useCallback(() => {
    if (pending.current) { clearTimeout(pending.current); pending.current = null }
    if (!dirty.current || closed.current) return
    const tab = readTab() ?? newTab()
    const { reading, ...rest } = latest.current
    // A reading still in progress is not kept: after a reload the shell starts it again (useResumeReading).
    void saveJson(DRAFT_ID, { ...rest, tab, ...(reading.status === "ready" && reading.pending === 0 ? { reading } : {}) } satisfies Saved)
  }, [])
  useEffect(() => {
    latest.current = draft
    if (!dirty.current || closed.current) return
    pending.current = setTimeout(save, SAVE_DELAY)
    return () => { if (pending.current) { clearTimeout(pending.current); pending.current = null } }
  }, [draft, save])
  // A phone hides the page before it may throw it away: save at once then, and when the page or the walkthrough is left.
  useEffect(() => {
    const hidden = () => { if (document.visibilityState === "hidden") save() }
    document.addEventListener("visibilitychange", hidden)
    window.addEventListener("pagehide", save)
    return () => { document.removeEventListener("visibilitychange", hidden); window.removeEventListener("pagehide", save); save() }
  }, [save])

  const update = useCallback((fn: (d: OnboardingDraft) => OnboardingDraft) => { dirty.current = true; setDraft(fn) }, [])
  const patch = useCallback((next: Partial<OnboardingDraft>) => update(d => ({ ...d, ...next })), [update])
  const clear = useCallback(() => {
    closed.current = true; dirty.current = false
    if (pending.current) { clearTimeout(pending.current); pending.current = null }
    // Forget the tab's walkthrough first: a save already on its way can then never be restored, whatever order the browser database runs in (OB-09 race).
    writeTab(null)
    void deleteJson(DRAFT_ID)
  }, [])
  const reset = useCallback(() => {
    if (pending.current) { clearTimeout(pending.current); pending.current = null }
    closed.current = false; dirty.current = false; wasReset.current = true
    newTab()
    void deleteJson(DRAFT_ID)
    setDraft(freshDraft(stateRef.current))
  }, [])
  const value = useMemo(() => ({ draft, patch, update, reset, clear }), [draft, patch, update, reset, clear])
  return <DraftContext.Provider value={value}>{ready ? children : null}</DraftContext.Provider>
}
export function useOnboardingDraft() { const value = useContext(DraftContext); if (!value) throw new Error("OnboardingDraftProvider is required"); return value }
