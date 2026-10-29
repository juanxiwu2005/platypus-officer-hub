import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { BUFFER_CHOICES, clubDraft, completeSetup, validateClub, validateDepartments, validateGoals, validateProfile, validateRoles, validateWorkspace, type ClubDraft, type FirstEvent } from "../data/settings"
import { DepartmentsEditor, GoalsEditor, RolesEditor, WorkspaceEditor } from "../components/SettingsForms"
import { ConstitutionStep, type ConstitutionDoc } from "../components/setup/ConstitutionStep"
import { InviteLink } from "./Settings"
import { commandContext, humanEventDate, parseCommand, sanitizeOps, validDate } from "../lib/commands"
import { callApi } from "../lib/api"
import { fmtShort } from "../lib/dates"
import { Info } from "../components/ui"
import { fillEmails, orderRoles } from "../data/structure"
import { mergeReads, readLocally, relevantExcerpt, sanitizeRead, structureFromRead, type ConstitutionRead } from "../lib/constitution"
import { saveLocalDoc } from "../lib/localDocs"

const STEPS = ["Your club", "Semester goals", "Departments", "Officer roles", "Invite & workspace", "First event"]
type Reading = { status: "idle" } | { status: "reading" } | { status: "ready"; read: ConstitutionRead; note: string; retry: boolean }

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
  // The reading finishes while the president is on another step; apply it then, unless they already changed the structure.
  useEffect(() => {
    if (reading.status !== "ready" || applied || touched.current) return
    apply(reading.read)
  }, [reading, applied])
  if (!canNudge) return <section className="card"><h1>Club setup</h1><p>The president or vice president sets up the club. Your own preferences are in Settings.</p><Link to="/settings">My preferences</Link></section>

  function apply(read: ConstitutionRead) {
    setDraft(d => {
      const built = structureFromRead(read, { roles: d.roles, people: d.people })
      return { ...d, departments: built.departments, roles: built.roles, people: built.people, mission: read.source === "ai" && read.mission && !missionTouched.current ? read.mission : d.mission }
    })
    setApplied(true); touched.current = false
  }
  /**
   * Started by Continue on step 1: save the text in this browser's database and let the AI read it while the president fills in the goals.
   * Two short requests run side by side (structure, duties) because one long answer does not fit in the 30 seconds a request may last.
   */
  async function startReading(d: ConstitutionDoc, again = false) {
    if (!again && readFor.current === d.checksum) return
    readFor.current = d.checksum; setApplied(false); setReading({ status: "reading" })
    void saveLocalDoc({ id: "constitution", kind: "constitution", fileName: d.fileName, text: d.text, checksum: d.checksum, savedAt: new Date().toISOString() })
    let read: ConstitutionRead, note: string, retry = false
    if (state.aiEnabled) {
      const text = relevantExcerpt(d.text, 40_000)
      const ask = (part: "structure" | "duties") => callApi<unknown>("/setup/constitution", { text, part }, 45_000).then(r => sanitizeRead(r, "ai"))
      const [structure, duties] = await Promise.allSettled([ask("structure"), ask("duties")])
      if (structure.status === "fulfilled" && structure.value.roles.length) {
        read = mergeReads(structure.value, duties.status === "fulfilled" ? duties.value : null)
        note = duties.status === "fulfilled" ? "Suggested by AI from your constitution. Check each line." : "Suggested by AI. Duties could not be read, so standard duties are filled in. Edit them."
        retry = duties.status !== "fulfilled"
      } else {
        const why = structure.status === "rejected" && structure.reason instanceof Error && structure.reason.message ? ` (${structure.reason.message.replace(/\.$/, "").slice(0, 120)})` : ""
        read = readLocally(d.text); retry = true
        note = `AI could not read it${why}, so this was read in your browser. Check each line.`
      }
    } else { read = readLocally(d.text); note = "AI is off, so this was read in your browser. Check each line." }
    if (read.source === "template") note = "No officer titles were found. These are standard departments and roles: edit them or add your own."
    if (readFor.current === d.checksum) setReading({ status: "ready", read, note, retry })
  }
  async function changeDoc(next: ConstitutionDoc | null) {
    setDoc(next); setNotice("")
    if (!next) { readFor.current = ""; setReading({ status: "idle" }); setApplied(false) }
  }
  const next = () => {
    let error: string | null = null
    if (step === 0) error = !draft.name.trim() ? "Give your fictional club a name." : null
    else if (step === 1) error = validateGoals(draft.goals) ?? (draft.mission.length > 300 ? "Keep the mission under 300 characters." : null)
    else if (step === 2) error = validateDepartments(draft.departments)
    else if (step === 3) {
      const people = fillEmails(draft.people)
      error = validateRoles(draft.roles, people, draft.departments) ?? people.map(p => validateProfile({ ...p, asuId: p.asuId ?? "" })).find(Boolean) ?? (new Set(people.map(p => p.name.trim().toLowerCase())).size !== people.length ? "Each officer needs a different name." : null)
      if (!error) setDraft(d => ({ ...d, people }))
    } else error = validateWorkspace(draft.workspace)
    setNotice(error ?? "")
    if (error) return
    if (step === 0 && doc) void startReading(doc)
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
  const preview = event && validDate(date) && date >= state.today && !validateClub(draft) ? completeSetup(state, draft, event, date, inviteCode) : null
  const eventPatch = (patch: Partial<FirstEvent>) => { if (event) setEvent({ ...event, ...patch }); setConfirmed(false) }
  const setStructure = (patch: Partial<ClubDraft>) => { touched.current = true; setDraft(d => ({ ...d, ...patch })) }
  const banner = reading.status === "reading"
    ? <p className="notice ai-note" role="status"><span className="spin" aria-hidden="true" />Reading your constitution. You can keep editing while you wait.</p>
    : reading.status === "ready"
      ? <p className="notice ai-note" role="status">{reading.note}{reading.read.notes.length > 0 && <Info>{reading.read.notes.join(" ")}</Info>}{!applied && <button type="button" className="btn small" onClick={() => apply(reading.read)}>Use these suggestions</button>}{reading.retry && doc && state.aiEnabled && <button type="button" className="btn small" onClick={() => void startReading(doc, true)}>Try AI again</button>}</p>
      : doc === null ? <p className="small muted">No constitution added. Standard departments are shown. Go back to step 1 to add one, or edit them yourself.</p> : null
  return <><div className="page-head"><h1>Set up your fictional club</h1><p className="muted">Six steps. Nothing is saved until you approve the first workflow.</p></div><ol className="setup-steps" aria-label="Setup progress">{STEPS.map((s, i) => <li key={s} aria-current={i === step ? "step" : undefined}>{i + 1} · {s}</li>)}</ol><section className="card form-stack" data-testid="setup-step"><header><h2>Step {step + 1} of 6 · {STEPS[step]}</h2><Link to="/settings">Cancel setup</Link></header>
    {step === 0 && <><div className="form-grid"><label>Club name<input value={draft.name} maxLength={80} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label>School<input readOnly value={state.org.school} /></label></div><ConstitutionStep doc={doc} onChange={changeDoc} /></>}
    {step === 1 && <>{banner}<label>Club mission<textarea rows={2} value={draft.mission} maxLength={300} onChange={e => { missionTouched.current = true; setDraft({ ...draft, mission: e.target.value }) }} /></label><p className="small muted">Choose two or three measurable goals. New workspace progress starts at zero.</p><GoalsEditor goals={draft.goals} onChange={goals => setDraft({ ...draft, goals })} /></>}
    {step === 2 && <>{banner}<p className="small muted">Departments split the club's work. The duties you write here guide how tasks are shared out later.</p><DepartmentsEditor departments={draft.departments} roles={draft.roles} onChange={(departments, roles) => setStructure({ departments, roles })} /></>}
    {step === 3 && <>{banner}<p className="small muted">Fictional names only: example.org emails, 555-01xx phones and ASU IDs starting 9999. Leave a name empty for an open position.</p><RolesEditor roles={draft.roles} people={draft.people} departments={draft.departments} editablePeople onChange={(roles, people) => setStructure({ roles: orderRoles(roles), people })} /><label>How many working days before the real deadline should your club finish?<select aria-label="Days before the real deadline" value={buffer} onChange={e => setBuffer(Number(e.target.value))}>{BUFFER_CHOICES.map(d => <option key={d} value={d}>{d} {d === 1 ? "day" : "days"} before</option>)}</select></label><p className="small muted">This becomes your club deadline. For example, with 3 days, a task that is officially due Friday is due Tuesday for your club.</p></>}
    {step === 4 && <><WorkspaceEditor value={draft.workspace} onChange={workspace => setDraft({ ...draft, workspace })} /><details><summary>Your invitation after setup</summary><p className="small muted">This invitation becomes active after you finish step 6.</p><code className="wrap-link">{`${window.location.origin}${window.location.pathname}#/join?invite=${inviteCode}`}</code></details></>}
    {step === 5 && <><label>Your first event, in one sentence<textarea maxLength={1000} rows={3} value={sentence} onChange={e => { setSentence(e.target.value); setEvent(null); setConfirmed(false) }} /></label><button className="btn" disabled={busy || !sentence.trim()} onClick={prepare}>{busy ? "Preparing…" : "Prepare first workflow"}</button>{event && <><p className="small muted">{source}. Dates below come from your input and the rule book.</p><fieldset><legend>Review your event</legend><div className="form-grid"><label>Event name<input maxLength={80} value={event.name} onChange={e => eventPatch({ name: e.target.value })} /></label><label>Confirm event date<input type="date" min={state.today} value={date} onChange={e => { setDate(e.target.value); setConfirmed(false) }} /></label><label>Event type<select value={event.type} onChange={e => eventPatch({ type: e.target.value as FirstEvent["type"] })}>{["social", "speaker", "workshop", "meeting", "fundraiser", "offcampus"].map(t => <option key={t}>{t}</option>)}</select></label><label>Headcount<input type="number" min="1" max="5000" value={event.headcount} onChange={e => eventPatch({ headcount: Number(e.target.value) })} /></label><label>Venue<select value={event.venue} onChange={e => eventPatch({ venue: e.target.value as FirstEvent["venue"] })}><option value="campus">Campus</option><option value="offcampus">Off campus</option></select></label><label>Food<select value={event.food} onChange={e => eventPatch({ food: e.target.value as FirstEvent["food"] })}><option value="none">None</option><option value="dining">Sun Devil Dining</option><option value="offsite">Outside caterer</option><option value="onsite">Prepared on site</option><option value="tbd">Yes, decide how later</option></select></label><label>Funding<select value={event.funding} onChange={e => eventPatch({ funding: e.target.value as FirstEvent["funding"] })}>{["none", "usg", "college", "dues", "sponsor"].map(f => <option key={f}>{f}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={event.speaker} onChange={e => eventPatch({ speaker: e.target.checked })} />Includes a guest speaker</label></div></fieldset>{preview && preview !== state && <details open data-testid="setup-preview"><summary>{preview.nodes.length} steps · workflow preview</summary><p className="small muted">ASU deadlines remain fixed by rules. Steps may need attention if this event is too soon.</p><ul className="list">{preview.nodes.slice(0, 6).map(n => <li key={n.id}><span>{n.title}</span><span className="small muted">{draft.roles.find(r => r.fn === n.fn)?.displayName ?? n.fn} · due {n.clubDeadline ? fmtShort(n.clubDeadline) : "unscheduled"}</span></li>)}</ul></details>}<p className="notice">Finishing starts a new local demo workspace with these roles, goals and this event. It replaces existing fictional tasks, history and invitations. Cancel keeps your current workspace.</p><label className="check-label"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I reviewed this event and want to start this demo workspace.</label><button className="btn btn-primary" disabled={!confirmed || !preview || preview === state || !event.name.trim() || event.headcount < 1 || event.headcount > 5000} onClick={() => { const error = validateClub(draft); if (error) { setNotice(error); return }; dispatch({ type: "completeSetup", draft: { ...draft, people: fillEmails(draft.people) }, event, date, inviteCode, clubBufferBusinessDays: buffer }); navigate("/events") }}>Approve & start workspace</button></>}</>}
    {notice && <p role="alert">{notice}</p>}<div className="action-row">{step > 0 && <button className="btn" onClick={() => { setStep(step - 1); setNotice(""); setConfirmed(false) }}>Back</button>}{step < 5 && <button className="btn btn-primary" onClick={next}>Continue</button>}</div>
  </section>{state.org.setupCompletedOn && <section className="card"><h2>Current workspace invitation</h2><InviteLink code={state.org.inviteCode} /></section>}</>
}
