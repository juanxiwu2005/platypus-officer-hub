import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { clubDraft, completeSetup, validateClub, validateGoals, validateRoles, validateWorkspace, type FirstEvent } from "../data/settings"
import { GoalsEditor, RolesEditor, WorkspaceEditor } from "../components/SettingsForms"
import { InviteLink } from "./Settings"
import { commandContext, humanEventDate, parseCommand, sanitizeOps, validDate } from "../lib/commands"
import { callApi } from "../lib/api"
import { fmtShort } from "../lib/dates"

const STEPS = ["Your club", "Semester goals", "Officer roles", "Invite & workspace", "First event"]
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
  if (!canNudge) return <section className="card"><h1>Club setup</h1><p>The president or vice president sets up the club. Your own preferences are in Settings.</p><Link to="/settings">My preferences</Link></section>
  const next = () => {
    const error = step === 0 ? (!draft.name.trim() ? "Give your fictional club a name." : null) : step === 1 ? validateGoals(draft.goals) : step === 2 ? validateRoles(draft.roles, draft.people) : validateWorkspace(draft.workspace)
    setNotice(error ?? ""); if (!error) setStep(step + 1)
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
  return <><div className="page-head"><h1>Set up your fictional club</h1><p className="muted">Five steps. Nothing is saved until you approve the first workflow.</p></div><ol className="setup-steps" aria-label="Setup progress">{STEPS.map((s, i) => <li key={s} aria-current={i === step ? "step" : undefined}>{i + 1} · {s}</li>)}</ol><section className="card form-stack" data-testid="setup-step"><header><h2>Step {step + 1} of 5 · {STEPS[step]}</h2><Link to="/settings">Cancel setup</Link></header>
    {step === 0 && <><label>Club name<input value={draft.name} maxLength={80} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label>School<input readOnly value={state.org.school} /></label><label>Club mission<textarea value={draft.mission} maxLength={300} onChange={e => setDraft({ ...draft, mission: e.target.value })} /></label><p className="small muted">Fictional demonstration only. Keep research and participant information out of this workspace.</p></>}
    {step === 1 && <><p>Choose two or three measurable goals. New workspace progress starts at zero.</p><GoalsEditor goals={draft.goals} onChange={goals => setDraft({ ...draft, goals })} /></>}
    {step === 2 && <RolesEditor roles={draft.roles} people={draft.people} editablePeople onChange={(roles, people) => setDraft({ ...draft, roles, people })} />}
    {step === 3 && <><WorkspaceEditor value={draft.workspace} onChange={workspace => setDraft({ ...draft, workspace })} /><details><summary>Your invitation after setup</summary><p className="small muted">This invitation becomes active after you finish step 5.</p><code className="wrap-link">{`${window.location.origin}${window.location.pathname}#/join?invite=${inviteCode}`}</code></details></>}
    {step === 4 && <><label>Your first event, in one sentence<textarea maxLength={1000} rows={3} value={sentence} onChange={e => { setSentence(e.target.value); setEvent(null); setConfirmed(false) }} /></label><button className="btn" disabled={busy || !sentence.trim()} onClick={prepare}>{busy ? "Preparing…" : "Prepare first workflow"}</button>{event && <><p className="small muted">{source}. Dates below come from your input and the rule book.</p><fieldset><legend>Review your event</legend><div className="form-grid"><label>Event name<input maxLength={80} value={event.name} onChange={e => eventPatch({ name: e.target.value })} /></label><label>Confirm event date<input type="date" min={state.today} value={date} onChange={e => { setDate(e.target.value); setConfirmed(false) }} /></label><label>Event type<select value={event.type} onChange={e => eventPatch({ type: e.target.value as FirstEvent["type"] })}>{["social", "speaker", "workshop", "meeting", "fundraiser", "offcampus"].map(t => <option key={t}>{t}</option>)}</select></label><label>Headcount<input type="number" min="1" max="5000" value={event.headcount} onChange={e => eventPatch({ headcount: Number(e.target.value) })} /></label><label>Venue<select value={event.venue} onChange={e => eventPatch({ venue: e.target.value as FirstEvent["venue"] })}><option value="campus">Campus</option><option value="offcampus">Off campus</option></select></label><label>Food<select value={event.food} onChange={e => eventPatch({ food: e.target.value as FirstEvent["food"] })}><option value="none">None</option><option value="dining">Sun Devil Dining</option><option value="offsite">Outside caterer</option><option value="onsite">Prepared on site</option></select></label><label>Funding<select value={event.funding} onChange={e => eventPatch({ funding: e.target.value as FirstEvent["funding"] })}>{["none", "usg", "college", "dues", "sponsor"].map(f => <option key={f}>{f}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={event.speaker} onChange={e => eventPatch({ speaker: e.target.checked })} />Includes a guest speaker</label></div></fieldset>{preview && preview !== state && <details open data-testid="setup-preview"><summary>{preview.nodes.length} steps · workflow preview</summary><p className="small muted">ASU deadlines remain fixed by rules. Steps may need attention if this event is too soon.</p><ul className="list">{preview.nodes.slice(0, 6).map(n => <li key={n.id}><span>{n.title}</span><span className="small muted">{draft.roles.find(r => r.fn === n.fn)?.displayName ?? n.fn} · due {n.clubDeadline ? fmtShort(n.clubDeadline) : "unscheduled"}</span></li>)}</ul></details>}<p className="notice">Finishing starts a new local demo workspace with these roles, goals and this event. It replaces existing fictional tasks, history and invitations. Cancel keeps your current workspace.</p><label className="check-label"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I reviewed this event and want to start this demo workspace.</label><button className="btn btn-primary" disabled={!confirmed || !preview || preview === state || !event.name.trim() || event.headcount < 1 || event.headcount > 5000} onClick={() => { const error = validateClub(draft); if (error) { setNotice(error); return }; dispatch({ type: "completeSetup", draft, event, date, inviteCode }); navigate("/events") }}>Approve & start workspace</button></>}</>}
    {notice && <p role="alert">{notice}</p>}<div className="action-row">{step > 0 && <button className="btn" onClick={() => { setStep(step - 1); setNotice(""); setConfirmed(false) }}>Back</button>}{step < 4 && <button className="btn btn-primary" onClick={next}>Continue</button>}</div>
  </section>{state.org.setupCompletedOn && <section className="card"><h2>Current workspace invitation</h2><InviteLink code={state.org.inviteCode} /></section>}</>
}
