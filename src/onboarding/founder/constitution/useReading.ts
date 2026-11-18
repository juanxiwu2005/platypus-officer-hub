import { useCallback, useEffect, useRef } from "react"
import { useStore } from "../../../data/store"
import type { ConstitutionDoc } from "../../../components/setup/ConstitutionStep"
import { callRetry } from "../../../lib/aiRetry"
import { DUTY_BATCH, applyDuties, chunk, dutyItems, readLocally, relevantExcerpt, sanitizeDuties, sanitizeRead, structureFromRead, type ConstitutionRead } from "../../../lib/constitution"
import { saveLocalDoc } from "../../../lib/localDocs"
import { useOnboardingDraft, type OnboardingDraft } from "../../draft"
import { onboardingCopy } from "../../copy"

const text = onboardingCopy.founder.constitution
type Update = (fn: (d: OnboardingDraft) => OnboardingDraft) => void

/**
 * The AI reads the constitution in the background while the president keeps going: first part=structure (departments, roles, who reports to whom),
 * then part=duties, six positions at a time. The results are written into the shared founder draft used by every setup entry.
 *
 * WHY THIS IS NOT A COMPONENT'S STATE: the job has to keep running after the president leaves the Constitution screen. This package may not edit the
 * draft provider or the shell, so the job lives here at module level, keyed by the document checksum, and writes through `sink`, the provider's stable
 * `update` function that the screen hands over (`bindDraft`).
 * LIMITS (also in docs/onboarding-redesign/reports/OB-04.md):
 *  - The sink is the provider of the last Constitution screen that was shown. The job only ever runs inside a walkthrough that has shown that screen.
 *  - If the walkthrough is left (Save & exit) the provider is gone: the writes are ignored by React and the job simply ends. Nothing is kept.
 *  - Every write checks that the draft still holds the same document (by checksum), so a job can never write into another document's draft.
 *  - Reloading the page loses a job in progress; the draft keeps the document and the shell starts the job again (useResumeReading).
 */
let sink: Update | null = null
let active = ""   // checksum of the document being read now; "" = nothing wanted
export const bindDraft = (update: Update) => { sink = update }
export const stopReading = () => { active = "" }
export const readingFor = () => active

const write = (checksum: string, fn: (d: OnboardingDraft) => OnboardingDraft) => sink?.(d => d.doc?.checksum === checksum ? fn(d) : d)

/** Put a reading onto the club's roles, unless the president already edited them or an earlier reading was applied (then the Team screen offers "Use these suggestions"). */
export function applyRead(d: OnboardingDraft, read: ConstitutionRead): OnboardingDraft {
  if (d.applied || d.structureTouched) return d
  const built = structureFromRead(read, { roles: d.club.roles, people: d.club.people })
  return { ...d, applied: true, club: { ...d.club, roles: built.roles, people: built.people, mission: read.source === "ai" && read.mission && !d.missionTouched ? read.mission : d.club.mission } }
}

export interface ReadOptions { aiEnabled: boolean; again?: boolean }
/** Start reading `doc`. Resolves when the job ends. Does nothing if this document is already being read (unless `again`). */
export async function runReading(doc: ConstitutionDoc, { aiEnabled, again = false }: ReadOptions): Promise<void> {
  const sum = doc.checksum
  if (!again && active === sum) return
  active = sum
  const current = () => active === sum
  write(sum, d => ({ ...d, applied: false, reading: { status: "reading" } }))
  void saveLocalDoc({ id: "constitution", kind: "constitution", fileName: doc.fileName, text: doc.text, checksum: sum, savedAt: new Date().toISOString() })
  const done = (read: ConstitutionRead, note: string, retry: boolean) => { if (current()) write(sum, d => applyRead({ ...d, reading: { status: "ready", read, note, retry, pending: 0 } }, read)) }
  if (!aiEnabled) { const r = readLocally(doc.text); return done(r, r.source === "template" ? text.noTitles : text.aiOff, false) }
  const excerpt = relevantExcerpt(doc.text, 40_000)
  const call = <T,>(body: Record<string, unknown>) => callRetry<T>("/setup/constitution", { text: excerpt, ...body }, current)
  let read: ConstitutionRead
  try { read = sanitizeRead(await call<unknown>({ part: "structure" }), "ai"); if (!read.roles.length) throw new Error("No positions found") }
  catch {
    // The reason (a status code, a sign-in message) stays out of the screen; the president only needs to know what happened and what to do.
    const r = readLocally(doc.text)
    return done(r, r.source === "template" ? text.noTitles : text.aiFailed, true)
  }
  if (!current()) return
  const batches = chunk(dutyItems(read), DUTY_BATCH)
  write(sum, d => applyRead({ ...d, reading: { status: "ready", read, note: text.suggested, retry: false, pending: batches.length } }, read))
  let missed = 0
  for (let i = 0; i < batches.length && current(); i++) {
    try {
      const found = sanitizeDuties(await call<{ items?: unknown }>({ part: "duties", items: batches[i] }), batches[i])
      if (found.size && current()) write(sum, d => ({ ...d, club: applyDuties(d.club, found) }))
    } catch { missed++ }
    const left = batches.length - i - 1
    if (current()) write(sum, d => d.reading.status === "ready" ? { ...d, reading: { ...d.reading, pending: left } } : d)
  }
  if (current()) done(read, missed ? text.suggestedGaps : text.suggested, missed > 0)
}

/**
 * For the walkthrough shell: a reload in the middle of a reading keeps the document but not the job, so the job starts again once, when the shell
 * first shows the restored draft. A finished reading is restored as it was and is not read again.
 */
export function useResumeReading(paused = false) {
  const { update, draft } = useOnboardingDraft()
  const { state } = useStore()
  const tried = useRef(false)
  useEffect(() => {
    if (paused || tried.current) return
    tried.current = true
    if (!draft.doc || draft.reading.status !== "idle" || draft.applied) return
    bindDraft(update)
    void runReading(draft.doc, { aiEnabled: state.aiEnabled })
  }, [paused, draft.doc, draft.reading.status, draft.applied, update, state.aiEnabled])
}

/** For the Constitution screen: hands the draft's update function to the job, and gives the screen start and stop. */
export function useReading() {
  const { update, draft } = useOnboardingDraft()
  const { state } = useStore()
  const idle = draft.reading.status === "idle"
  // A fresh walkthrough (nothing read yet) must not inherit a job from an earlier one.
  useEffect(() => { bindDraft(update); if (idle) stopReading() }, [update])
  const start = useCallback((doc: ConstitutionDoc, again = false) => { bindDraft(update); return runReading(doc, { aiEnabled: state.aiEnabled, again }) }, [update, state.aiEnabled])
  return { start, stop: stopReading }
}
