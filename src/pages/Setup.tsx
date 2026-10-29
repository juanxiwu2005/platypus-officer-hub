import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { BUFFER_CHOICES, clubDraft, completeSetup, validateClub, validateGoals, validateProfile, validateRoles, validateWorkflow, validateWorkspace, type ClubDraft, type FirstEvent } from "../data/settings"
import { GoalsEditor, RolesEditor, WorkspaceEditor } from "../components/SettingsForms"
import { OrgChart } from "../components/setup/OrgChart"
import { WorkflowPanel } from "../components/setup/WorkflowPanel"
import { WorkflowChanges } from "../components/setup/WorkflowReview"
import type { StepTemplate } from "../data/types"
import { orgSteps } from "../engine/playbooks"
import { applyChanges, checkWorkflow, ownerOfStep, presetSteps, revertChange, withOwners, type Refusal, type WorkflowChange } from "../engine/workflow"
import { rolesForPrompt, sanitizeChanges, sanitizeOwners } from "../lib/workflowAi"
import { callRetry, whyFailed } from "../lib/aiRetry"
import { ConstitutionStep, type ConstitutionDoc } from "../components/setup/ConstitutionStep"
import { InviteLink } from "./Settings"
import { commandContext, humanEventDate, parseCommand, sanitizeOps, validDate } from "../lib/commands"
import { callApi } from "../lib/api"
import { fmtShort } from "../lib/dates"
import { Info } from "../components/ui"
import { fillEmails, orderRoles } from "../data/structure"
import { DUTY_BATCH, applyDuties, chunk, dutyItems, readLocally, relevantExcerpt, sanitizeDuties, sanitizeRead, structureFromRead, type ConstitutionRead } from "../lib/constitution"
import { deleteJson, loadJson, saveJson, saveLocalDoc } from "../lib/localDocs"

const STEPS = ["Your club", "Semester goals", "Officer roles", "Invite & workspace", "Event workflow", "First event"]
const DRAFT_ID = "setup-draft"
interface SavedDraft { v: 1; step: number; draft: ClubDraft; steps: StepTemplate[]; buffer: number; sentence: string; doc: ConstitutionDoc | null }
type Wf = { status: "idle" | "reading" | "ready"; applied: WorkflowChange[]; refused: Refusal[]; conflicts: { text: string; rules: string[] }[]; summary: string; note: string; retry: boolean }
const NO_WF: Wf = { status: "idle", applied: [], refused: [], conflicts: [], summary: "", note: "", retry: false }
type Reading = { status: "idle" } | { status: "reading" } | { status: "ready"; read: ConstitutionRead; note: string; retry: boolean; pending: number }
const TEMPLATE_NOTE = "No officer titles were found. These are standard departments and roles: edit them or add your own."

export default function Setup() {
  const { state, dispatch } = useStore()
  const { canNudge } = useViewer()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(() => clubDraft(state))
  const [inviteCode] = useState(() => crypto.randomUUID())
  const [sentence, setSentence] = useState("Plan Founder Dinner on Nov 19, 30 people, outside caterer, USG funding")
  const [event, setEvent] = useState<FirstEvent | null>(null)
  const [date, setDate] = useState("")
  const [source, setSource] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [buffer, setBuffer] = useState<number>((BUFFER_CHOICES as readonly number[]).includes(state.org.settings.clubBufferBusinessDays) ? state.org.settings.clubBufferBusinessDays : 3)
  const [doc, setDoc] = useState<ConstitutionDoc | null>(null)
  const [reading, setReading] = useState<Reading>({ status: "idle" })
  const [applied, setApplied] = useState(false)
  const touched = useRef(false)
  const missionTouched = useRef(false)
  const readFor = useRef("")
  const [steps, setSteps] = useState<StepTemplate[]>(() => withOwners(orgSteps(state), clubDraft(state).roles))
  const [wf, setWf] = useState<Wf>(NO_WF)
  const wfFor = useRef(""), wfTouched = useRef(false)
  // An unfinished setup is kept in this browser's database, so reloading (or signing in to the preview again) does not lose it.
  const [restorable, setRestorable] = useState<{ savedAt: string; value: SavedDraft } | null>(null)
  useEffect(() => { let on = true; void loadJson<SavedDraft>(DRAFT_ID).then(r => { if (on && r?.value?.v === 1 && Date.now() - Date.parse(r.savedAt) < 7 * 86_400_000) setRestorable(r) }); return () => { on = false } }, [])
  useEffect(() => {
    if (restorable || (step === 0 && !doc)) return
    const t = setTimeout(() => { void saveJson(DRAFT_ID, { v: 1, step, draft, steps, buffer, sentence, doc } satisfies SavedDraft) }, 700)
    return () => clearTimeout(t)
  }, [restorable, step, draft, steps, buffer, sentence, doc])
  const wfIssues = useMemo(() => checkWorkflow(steps, draft.roles, state), [steps, draft.roles, state])
  // The reading finishes while the president is on another step; apply it then, unless they already changed the structure.
  useEffect(() => {
    if (reading.status !== "ready" || applied || touched.current) return
    apply(reading.read)
  }, [reading, applied])
  if (!canNudge) return <section className="card"><h1>Club setup</h1><p>The president or vice president sets up the club. Your own preferences are in Settings.</p><Link to="/settings">My preferences</Link></section>

  function apply(read: ConstitutionRead) {
    setDraft(d => {
      const built = structureFromRead(read, { roles: d.roles, people: d.people })
      return { ...d, roles: built.roles, people: built.people, mission: read.source === "ai" && read.mission && !missionTouched.current ? read.mission : d.mission }
    })
    setApplied(true); touched.current = false
  }
  /**
   * Started by Continue on step 1: save the text in this browser's database and let the AI read it while the president fills in the goals.
   * Short requests one after another (a request may last only 30 seconds and the AI answers one at a time): first the structure, which
   * fills in the departments and roles at once, then the duties, six positions at a time, which replace standard text as they arrive.
   */
  async function startReading(d: ConstitutionDoc, again = false) {
    if (!again && readFor.current === d.checksum) return
    readFor.current = d.checksum; setApplied(false); setReading({ status: "reading" })
    void saveLocalDoc({ id: "constitution", kind: "constitution", fileName: d.fileName, text: d.text, checksum: d.checksum, savedAt: new Date().toISOString() })
    const current = () => readFor.current === d.checksum
    const done = (read: ConstitutionRead, note: string, retry: boolean) => current() && setReading({ status: "ready", read, note, retry, pending: 0 })
    if (!state.aiEnabled) { const r = readLocally(d.text); return done(r, r.source === "template" ? TEMPLATE_NOTE : "AI is off, so this was read in your browser. Check each line.", false) }
    const text = relevantExcerpt(d.text, 40_000)
    // Each short request may fail on its own (the AI is slow, or busy with someone else's request). It is tried again twice; a sign-in problem is not.
    const call = <T,>(body: Record<string, unknown>) => callRetry<T>("/setup/constitution", { text, ...body }, current)
    let read: ConstitutionRead
    try { read = sanitizeRead(await call<unknown>({ part: "structure" }), "ai"); if (!read.roles.length) throw new Error("No positions found") }
    catch (e) {
      const r = readLocally(d.text)
      return done(r, r.source === "template" ? TEMPLATE_NOTE : `AI could not read it${whyFailed(e)}, so this was read in your browser. Check each line.`, true)
    }
    const batches = chunk(dutyItems(read), DUTY_BATCH)
    if (!current()) return
    setReading({ status: "ready", read, note: "Suggested by AI. Reading each position's duties next.", retry: false, pending: batches.length })
    let missed = 0
    for (let i = 0; i < batches.length && current(); i++) {
      try {
        const reply = await call<{ items?: unknown }>({ part: "duties", items: batches[i] })
        const found = sanitizeDuties(reply, batches[i])
        if (found.size) setDraft(x => applyDuties(x, found))
      } catch { missed++ }
      setReading(r => r.status === "ready" ? { ...r, pending: batches.length - i - 1, note: batches.length - i - 1 > 0 ? `Suggested by AI. Reading duties: ${i + 1} of ${batches.length} parts done.` : r.note } : r)
    }
    done(read, missed ? "Suggested by AI. Some duties could not be read, so standard duties are filled in. Edit them." : "Suggested by AI from your constitution. Check each line.", missed > 0)
  }
  /**
   * Started by Continue on the workspace step: the AI compares the club's planning notes and files with the standard event workflow, then
   * suggests who should do each step from the roles' duties. Two short requests, one after another. The engine applies or refuses each
   * change (ASU rules are never changed) and the president sees every one.
   */
  async function startWorkflow(again = false) {
    const ws = draft.workspace, roles = draft.roles, notes = ws.planningNotes.trim()
    const files = ws.files.filter(f => f.text?.trim()).map(f => ({ name: f.name, text: f.text! }))
    const hasInput = files.length > 0 || (notes !== "" && notes !== state.org.workspace.planningNotes.trim())
    const key = JSON.stringify([notes, files.map(f => [f.name, f.text.length]), roles.map(r => [r.id, r.displayName, r.duties])])
    if (!again && wfFor.current === key) return
    wfFor.current = key; wfTouched.current = false
    const current = () => wfFor.current === key
    const base = presetSteps()
    setSteps(withOwners(base, roles))
    if (!state.aiEnabled) return setWf({ ...NO_WF, status: "ready", note: "AI is off, so this is the standard workflow. Edit it below." })
    setWf({ ...NO_WF, status: "reading" })
    let working = base, applied: WorkflowChange[] = [], refused: Refusal[] = [], conflicts: { text: string; rules: string[] }[] = [], summary = "", note = "", retry = false
    if (hasInput) {
      try {
        const reply = await callRetry<unknown>("/setup/workflow", { part: "changes", notes, files, roles: rolesForPrompt(roles) }, current)
        const read = sanitizeChanges(reply, base, roles), res = applyChanges(base, read.changes, roles)
        working = res.steps; applied = res.applied; refused = res.refused; conflicts = read.conflicts; summary = read.summary
        note = read.changes.length ? "Adapted from your planning notes and files. Check each change." : "Your planning notes and files match the standard workflow, so nothing changed."
      } catch (e) { retry = true; note = `AI could not read your notes and files${whyFailed(e)}, so this is the standard workflow.` }
    } else note = "No planning notes or files were added, so this is the standard workflow."
    if (!current()) return
    if (!wfTouched.current) setSteps(withOwners(working, roles))
    setWf({ status: "reading", applied, refused, conflicts, summary, note: `${note} Sharing the steps out to your officers…`, retry })
    try {
      const reply = await callRetry<unknown>("/setup/workflow", { part: "owners", steps: working.map(x => ({ key: x.key, title: x.title, standardOwner: ownerOfStep(x, roles)?.displayName ?? null })), roles: rolesForPrompt(roles) }, current)
      const chosen = sanitizeOwners(reply, working, roles)
      if (current() && !wfTouched.current) setSteps(withOwners(working, roles, chosen))
    } catch (e) { retry = true; note += ` AI could not share the steps out${whyFailed(e)}: each step goes to the officer for that kind of work.` }
    if (current()) setWf(w => ({ ...w, status: "ready", note, retry }))
  }
  const editSteps = (next: StepTemplate[]) => { wfTouched.current = true; setSteps(next) }

  const restore = () => {
    if (!restorable) return
    const v = restorable.value
    setDraft(v.draft); setSteps(v.steps); setBuffer(v.buffer); setSentence(v.sentence); setDoc(v.doc); setStep(Math.max(0, Math.min(v.step, 4)))
    touched.current = true; missionTouched.current = true; wfTouched.current = true; if (v.doc) readFor.current = v.doc.checksum
    setApplied(true); setRestorable(null)
  }
  const startOver = () => { void deleteJson(DRAFT_ID); setRestorable(null) }
  async function changeDoc(next: ConstitutionDoc | null) {
    setDoc(next); setNotice("")
    if (!next) { readFor.current = ""; setReading({ status: "idle" }); setApplied(false) }
  }
  const next = () => {
    let error: string | null = null
    if (step === 0) error = !draft.name.trim() ? "Give your fictional club a name." : null
    else if (step === 1) error = validateGoals(draft.goals) ?? (draft.mission.length > 300 ? "Keep the mission under 300 characters." : null)
    else if (step === 2) {
      const people = fillEmails(draft.people)
      error = validateRoles(draft.roles, people) ?? people.map(p => validateProfile({ ...p, asuId: p.asuId ?? "" })).find(Boolean) ?? (new Set(people.map(p => p.name.trim().toLowerCase())).size !== people.length ? "Each officer needs a different name." : null)
      if (!error) setDraft(d => ({ ...d, people }))
    } else if (step === 3) error = validateWorkspace(draft.workspace)
    else if (step === 4) error = validateWorkflow(steps, draft.roles)
    setNotice(error ?? "")
    if (error) return
    if (step === 0 && doc) void startReading(doc)
    if (step === 3) void startWorkflow()
    setStep(step + 1)
  }
  async function prepare() {
    setBusy(true); setNotice(""); setConfirmed(false)
    const ctx = commandContext({ ...state, people: draft.people, roles: draft.roles, events: [], nodes: [] })
    try {
      let ops = [] as ReturnType<typeof sanitizeOps>, label = "Local demo grammar · AI off"
      if (state.aiEnabled) {
        try { const result = await callApi<{ ops: unknown; source: string }>("/command", { sentence, context: ctx }); ops = sanitizeOps(result.ops, ctx); label = result.source === "ai" ? "AI draft · review below" : "Checked command grammar" }
        catch { ops = parseCommand(sentence, ctx); label = "Local demo fallback · server unavailable" }
      } else ops = parseCommand(sentence, ctx)
      if (ops.length !== 1 || ops[0].op !== "create_event") { setEvent(null); setNotice("Describe one event starting with Plan, then review its details."); return }
      setEvent(ops[0]); setDate(humanEventDate(sentence, state.today)); setSource(label)
    } finally { setBusy(false) }
  }
  const preview = event && validDate(date) && date >= state.today && !validateClub(draft) ? completeSetup(state, draft, event, date, inviteCode, undefined, undefined, steps) : null
  const eventPatch = (patch: Partial<FirstEvent>) => { if (event) setEvent({ ...event, ...patch }); setConfirmed(false) }
  const setStructure = (patch: Partial<ClubDraft>) => { touched.current = true; setDraft(d => ({ ...d, ...patch })) }
  const banner = reading.status === "reading"
    ? <p className="notice ai-note" role="status"><span className="spin" aria-hidden="true" />Reading your constitution. You can keep editing while you wait.</p>
    : reading.status === "ready"
      ? <p className="notice ai-note" role="status">{reading.pending > 0 && <span className="spin" aria-hidden="true" />}{reading.note}{reading.read.notes.length > 0 && <Info>{reading.read.notes.join(" ")}</Info>}{!applied && <button type="button" className="btn small" onClick={() => apply(reading.read)}>Use these suggestions</button>}{reading.retry && doc && state.aiEnabled && <button type="button" className="btn small" onClick={() => void startReading(doc, true)}>Try AI again</button>}</p>
      : doc === null ? <p className="small muted">No constitution added. Standard departments are shown. Go back to step 1 to add one, or edit them yourself.</p> : null
  return <><div className="page-head"><h1>Set up your fictional club</h1><p className="muted">Six steps. Nothing is saved until you approve the first workflow.</p></div>{restorable && <section className="notice ai-note" role="status" data-testid="setup-restore">You have an unfinished setup from {new Date(restorable.savedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.<button type="button" className="btn small" onClick={restore}>Restore it</button><button type="button" className="btn small" onClick={startOver}>Start over</button></section>}<ol className="setup-steps" aria-label="Setup progress">{STEPS.map((s, i) => <li key={s} aria-current={i === step ? "step" : undefined}>{i + 1} · {s}</li>)}</ol><section className="card form-stack" data-testid="setup-step"><header><h2>Step {step + 1} of 6 · {STEPS[step]}</h2><Link to="/settings" onClick={() => void deleteJson(DRAFT_ID)}>Cancel setup</Link></header>
    {step === 0 && <><div className="form-grid"><label>Club name<input value={draft.name} maxLength={80} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label>School<input readOnly value={state.org.school} /></label></div><ConstitutionStep doc={doc} onChange={changeDoc} /></>}
    {step === 1 && <>{banner}<label>Club mission<textarea rows={2} value={draft.mission} maxLength={300} onChange={e => { missionTouched.current = true; setDraft({ ...draft, mission: e.target.value }) }} /></label><p className="small muted">Choose two or three measurable goals. New workspace progress starts at zero.</p><GoalsEditor goals={draft.goals} onChange={goals => setDraft({ ...draft, goals })} /></>}
    {step === 2 && <>{banner}<p className="small muted">Fictional names only: example.org emails, 555-01xx phones and ASU IDs starting 9999. Leave a name empty for an open position.</p><RolesEditor roles={draft.roles} people={draft.people} editablePeople onChange={(roles, people) => setStructure({ roles: orderRoles(roles), people })} /><OrgChart roles={draft.roles} /><label>How many working days before the real deadline should your club finish?<select aria-label="Days before the real deadline" value={buffer} onChange={e => setBuffer(Number(e.target.value))}>{BUFFER_CHOICES.map(d => <option key={d} value={d}>{d} {d === 1 ? "day" : "days"} before</option>)}</select></label><p className="small muted">This becomes your club deadline. For example, with 3 days, a task that is officially due Friday is due Tuesday for your club.</p></>}
    {step === 3 && <><WorkspaceEditor value={draft.workspace} onChange={workspace => setDraft({ ...draft, workspace })} /><details><summary>Your invitation after setup</summary><p className="small muted">This invitation becomes active after you finish step 6.</p><code className="wrap-link">{`${window.location.origin}${window.location.pathname}#/join?invite=${inviteCode}`}</code></details></>}
    {step === 4 && <>
      {wf.status === "reading" ? <p className="notice ai-note" role="status"><span className="spin" aria-hidden="true" />{wf.note || "Comparing your planning notes and files with the standard workflow. You can start editing."}</p> : wf.note ? <p className="notice ai-note" role="status">{wf.note}{wf.retry && state.aiEnabled && <button type="button" className="btn small" onClick={() => void startWorkflow(true)}>Try AI again</button>}</p> : null}
      <p className="small muted">Every new event starts from this workflow. It begins with the standard one and changes to match your planning notes and files, so this is where your club's own way of working goes.</p>
      <WorkflowChanges applied={wf.applied} refused={wf.refused} conflicts={wf.conflicts} summary={wf.summary} steps={steps} roles={draft.roles} onRevert={c => { wfTouched.current = true; setSteps(x => revertChange(x, c)); setWf(w => ({ ...w, applied: w.applied.filter(a => a.id !== c.id) })) }} />
      <WorkflowPanel state={state} steps={steps} roles={draft.roles} issues={wfIssues} onChange={editSteps} />
      <div className="action-row"><button type="button" className="btn small" onClick={() => { wfTouched.current = true; setSteps(withOwners(presetSteps(), draft.roles)); setWf(w => ({ ...w, applied: [], refused: [], conflicts: [], summary: "" })) }}>Go back to the standard workflow</button></div>
    </>}
    {step === 5 && <><label>Your first event, in one sentence<textarea maxLength={1000} rows={3} value={sentence} onChange={e => { setSentence(e.target.value); setEvent(null); setConfirmed(false) }} /></label><button className="btn" disabled={busy || !sentence.trim()} onClick={prepare}>{busy ? "Preparing…" : "Prepare first workflow"}</button>{event && <><p className="small muted">{source}. Dates below come from your input and the rule book.</p><fieldset><legend>Review your event</legend><div className="form-grid"><label>Event name<input maxLength={80} value={event.name} onChange={e => eventPatch({ name: e.target.value })} /></label><label>Confirm event date<input type="date" min={state.today} value={date} onChange={e => { setDate(e.target.value); setConfirmed(false) }} /></label><label>Event type<select value={event.type} onChange={e => eventPatch({ type: e.target.value as FirstEvent["type"] })}>{["social", "speaker", "workshop", "meeting", "fundraiser", "offcampus"].map(t => <option key={t}>{t}</option>)}</select></label><label>Headcount<input type="number" min="1" max="5000" value={event.headcount} onChange={e => eventPatch({ headcount: Number(e.target.value) })} /></label><label>Venue<select value={event.venue} onChange={e => eventPatch({ venue: e.target.value as FirstEvent["venue"] })}><option value="campus">Campus</option><option value="offcampus">Off campus</option></select></label><label>Food<select value={event.food} onChange={e => eventPatch({ food: e.target.value as FirstEvent["food"] })}><option value="none">None</option><option value="dining">Sun Devil Dining</option><option value="offsite">Outside caterer</option><option value="onsite">Prepared on site</option><option value="tbd">Yes, decide how later</option></select></label><label>Funding<select value={event.funding} onChange={e => eventPatch({ funding: e.target.value as FirstEvent["funding"] })}>{["none", "usg", "college", "dues", "sponsor"].map(f => <option key={f}>{f}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={event.speaker} onChange={e => eventPatch({ speaker: e.target.checked })} />Includes a guest speaker</label></div></fieldset>{preview && preview !== state && <details open data-testid="setup-preview"><summary>{preview.nodes.length} steps · workflow preview</summary><p className="small muted">ASU deadlines remain fixed by rules. Steps may need attention if this event is too soon.</p><ul className="list">{preview.nodes.slice(0, 6).map(n => <li key={n.id}><span>{n.title}</span><span className="small muted">{draft.roles.find(r => r.fn === n.fn)?.displayName ?? n.fn} · due {n.clubDeadline ? fmtShort(n.clubDeadline) : "unscheduled"}</span></li>)}</ul></details>}<p className="notice">Finishing starts a new local demo workspace with these roles, goals and this event. It replaces existing fictional tasks, history and invitations. Cancel keeps your current workspace.</p><label className="check-label"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I reviewed this event and want to start this demo workspace.</label><button className="btn btn-primary" disabled={!confirmed || !preview || preview === state || !event.name.trim() || event.headcount < 1 || event.headcount > 5000} onClick={() => { const error = validateClub(draft); if (error) { setNotice(error); return }; void deleteJson(DRAFT_ID); dispatch({ type: "completeSetup", draft: { ...draft, people: fillEmails(draft.people) }, event, date, inviteCode, clubBufferBusinessDays: buffer, workflow: steps }); navigate("/events") }}>Approve & start workspace</button></>}</>}
    {notice && <p role="alert">{notice}</p>}<div className="action-row">{step > 0 && <button className="btn" onClick={() => { setStep(step - 1); setNotice(""); setConfirmed(false) }}>Back</button>}{step < 5 && <button className="btn btn-primary" onClick={next}>Continue</button>}</div>
  </section>{state.org.setupCompletedOn && <section className="card"><h2>Current workspace invitation</h2><InviteLink code={state.org.inviteCode} /></section>}</>
}
