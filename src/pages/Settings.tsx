import { TASK_DUE_CHOICES } from "../engine/taskDates"
import { personalBuffer } from "../engine/schedule"
import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { downloadExport, useStore, useViewer } from "../data/store"
import { PageHead } from "../components/Page"
import { useRail } from "../components/rail/RailContext"
import { GoalsEditor, ProfileForm, RoleCard, WorkspaceEditor } from "../components/SettingsForms"
import { OrgChart } from "../components/setup/OrgChart"
import { rederiveFn, withBelow } from "../data/structure"
import { WorkflowEditor } from "../components/setup/WorkflowEditor"
import { WorkflowIssues } from "../components/setup/WorkflowReview"
import { orgSteps } from "../engine/playbooks"
import { checkWorkflow, presetSteps, withOwners } from "../engine/workflow"
import type { StepTemplate } from "../data/types"
import { validateWorkflow } from "../data/settings"
import { clubDraft, profilePatch, validateClub, validateDefaults, validateProfile, type ClubDraft } from "../data/settings"
import type { OrgSettings, Role } from "../data/types"
import { Empty, Info } from "../components/ui"

export function InviteLink({ code }: { code: string }) {
  const url = `${window.location.origin}${window.location.pathname}#/join?invite=${encodeURIComponent(code)}`
  const [copied, setCopied] = useState(false)
  return <div className="form-stack"><label>Officer setup link<input readOnly value={url} onFocus={e => e.target.select()} /></label><div className="action-row"><button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true) } catch { setCopied(false) } }}>{copied ? "Copied" : "Copy invite link"}</button><a className="btn" href={url}>Try officer setup</a><Info>Same-browser demo invitation: choose a fictional officer to try their setup.</Info></div></div>
}

type Tab = "club" | "roles" | "workflow" | "links" | "me" | "admin"
const TABS: { id: Tab; label: string; lead: boolean }[] = [
  { id: "club", label: "Club", lead: true }, { id: "roles", label: "Roles", lead: true }, { id: "workflow", label: "Workflow", lead: true }, { id: "links", label: "Links & files", lead: true },
  { id: "me", label: "My preferences", lead: false }, { id: "admin", label: "Admin", lead: true },
]

/** Settings in five small sections; every change saves itself, with Undo (decision 5). */
export default function Settings() {
  const { canNudge } = useViewer()
  const tabs = TABS.filter(t => canNudge || !t.lead)
  const [tab, setTab] = useState<Tab>(canNudge ? "club" : "me")
  const active = tabs.some(t => t.id === tab) ? tab : "me"
  return <>
    <PageHead path="/settings" />
    <div className="settings">
      <nav className="settings-nav" aria-label="Settings sections">{tabs.map(t => <button key={t.id} type="button" aria-current={active === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>{t.label}</button>)}</nav>
      <div className="settings-body">
        {active === "me" ? <MySettings /> : active === "admin" ? <Admin /> : active === "workflow" ? <WorkflowSettings /> : <ClubSettings tab={active} />}
      </div>
    </div>
  </>
}

/** Debounced auto-save with a single Undo step. */
function useAutosave<T>(value: T, saved: T, valid: (v: T) => string | null, commit: (v: T) => void) {
  const [status, setStatus] = useState<{ text: string; undo?: T } | null>(null)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (JSON.stringify(value) === JSON.stringify(saved)) return
    const error = valid(value)
    if (error) { setStatus({ text: error }); return }
    const before = saved
    const t = setTimeout(() => { commit(value); setStatus({ text: "Saved.", undo: before }) }, 500)
    return () => clearTimeout(t)
  }, [JSON.stringify(value)])
  return { status, clear: () => setStatus(null) }
}

function ClubSettings({ tab }: { tab: "club" | "roles" | "links" }) {
  const { state, dispatch } = useStore()
  const [draft, setDraft] = useState(() => clubDraft(state))
  const [defaults, setDefaults] = useState(() => structuredClone(state.org.settings))
  const saved = { draft: clubDraft(state), defaults: state.org.settings }
  const { status, clear } = useAutosave({ draft, defaults }, saved, v => validateClub(v.draft) ?? validateDefaults(v.defaults), v => dispatch({ type: "saveClubSettings", draft: v.draft, defaults: v.defaults }))
  const undo = (prev: { draft: ClubDraft; defaults: OrgSettings }) => { dispatch({ type: "saveClubSettings", draft: prev.draft, defaults: prev.defaults }); setDraft(structuredClone(prev.draft)); setDefaults(structuredClone(prev.defaults)); clear() }
  const p = defaults.silenceProtocol
  return <section className="card form-stack" data-testid="club-settings">
    {tab === "club" && <>
      <h2>Club</h2>
      <div className="form-grid"><label>Club name<input value={draft.name} maxLength={80} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label>School<input readOnly value={state.org.school} /></label></div>
      <label>Club mission<textarea maxLength={300} rows={2} value={draft.mission} onChange={e => setDraft({ ...draft, mission: e.target.value })} /></label>
      <details className="more"><summary>Semester goals</summary><GoalsEditor goals={draft.goals} progress onChange={goals => setDraft({ ...draft, goals })} /></details>
      <details className="more"><summary>Deadline and follow-up defaults</summary><div className="form-grid"><label>Club buffer (working days)<input type="number" min="0" max="10" value={defaults.clubBufferBusinessDays} onChange={e => setDefaults({ ...defaults, clubBufferBusinessDays: Number(e.target.value) })} /></label><label>Reminder limit per task<input type="number" min="1" max="3" value={defaults.maxRemindersPerTask} onChange={e => setDefaults({ ...defaults, maxRemindersPerTask: Number(e.target.value) })} /></label>{["Reminder 1 day", "Reminder 2 day", "Private check day", "Temporary owner day", "Recovery day"].map((label, i) => <label key={label}>{label}<input type="number" min="1" max="30" value={[...p.nudgeDays, p.presidentDay, p.reassignDay, p.retroDay][i]} onChange={e => { const value = Number(e.target.value); const protocol = i < 2 ? { ...p, nudgeDays: p.nudgeDays.map((n, j) => i === j ? value : n) } : { ...p, [i === 2 ? "presidentDay" : i === 3 ? "reassignDay" : "retroDay"]: value }; setDefaults({ ...defaults, silenceProtocol: protocol }) }} /></label>)}</div></details>
      <details className="more" data-testid="tasks-events-settings"><summary>Tasks and events</summary><div className="form-stack">
        <label>When you assign a task, you expect it finished within<select aria-label="Usual task length" value={defaults.taskDueDays ?? 5} onChange={e => setDefaults({ ...defaults, taskDueDays: Number(e.target.value) })}>{TASK_DUE_CHOICES.map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
        <p className="small muted">New tasks start with that due date, shown as a real date. Anyone can pick another.</p>
        <fieldset><legend className="small muted">Who can create events</legend>
          {([["leads", "President and VP"], ["chosen", "President, VP and officers I choose"], ["everyone", "Every officer"]] as const).map(([v, label]) => <label key={v} className="check-label"><input type="radio" name="event-creators" checked={(defaults.eventCreators ?? "leads") === v} onChange={() => setDefaults({ ...defaults, eventCreators: v })} />{label}</label>)}
          {defaults.eventCreators === "chosen" && <div className="form-stack">{state.people.filter(p => !["president", "vice_president"].includes(state.roles.find(r => r.id === p.roleId)?.fn ?? "")).map(p => <label key={p.id} className="check-label"><input type="checkbox" checked={(defaults.eventCreatorIds ?? []).includes(p.id)} onChange={e => setDefaults({ ...defaults, eventCreatorIds: e.target.checked ? [...(defaults.eventCreatorIds ?? []), p.id] : (defaults.eventCreatorIds ?? []).filter(id => id !== p.id) })} />{p.name}</label>)}</div>}
        </fieldset>
        <p className="small muted">Tasks are open to everyone: for yourself or for anyone else.</p>
      </div></details>
      <div className="action-row"><Link className="btn" to="/setup">Replay setup</Link></div>
    </>}
    {tab === "roles" && <>
      <h2>Roles</h2>
      <RolesTable roles={draft.roles} onChange={roles => setDraft({ ...draft, roles })} /><OrgChart roles={draft.roles} />
      <details className="more"><summary>Invite officers</summary><InviteLink code={state.org.inviteCode} /></details>
    </>}
    {tab === "links" && <><h2>Links & files</h2><WorkspaceEditor value={draft.workspace} onChange={workspace => setDraft({ ...draft, workspace })} /></>}
    <SaveStatus status={status} onUndo={undo} />
  </section>
}

function SaveStatus<T>({ status, onUndo }: { status: { text: string; undo?: T } | null; onUndo: (v: T) => void }) {
  if (!status) return null
  return <p role="status" className={`save-status ${status.undo ? "ok" : "err"}`}>{status.text}{status.undo !== undefined && <button type="button" className="link" onClick={() => onUndo(status.undo as T)}>Undo</button>}</p>
}

/** The club's event workflow, after setup: the same edit module. New events start from it; events already made keep their steps. */
function WorkflowSettings() {
  const { state, dispatch } = useStore()
  const saved = withOwners(orgSteps(state), state.roles)
  const [steps, setSteps] = useState<StepTemplate[]>(saved)
  const { status, clear } = useAutosave(steps, saved, v => validateWorkflow(v, state.roles), v => dispatch({ type: "saveWorkflow", steps: v }))
  const issues = checkWorkflow(steps, state.roles, state)
  return <section className="card form-stack" data-testid="workflow-settings">
    <h2>Event workflow</h2>
    <p className="small muted">New events start from this workflow. {state.org.eventWorkflow?.summary ?? "It is the standard workflow."} Events you already made keep their own steps.</p>
    <WorkflowIssues issues={issues} />
    <WorkflowEditor steps={steps} roles={state.roles} onChange={setSteps} />
    <div className="action-row"><button type="button" className="btn small" onClick={() => { dispatch({ type: "resetWorkflow" }); setSteps(withOwners(presetSteps(), state.roles)); clear() }}>Go back to the standard workflow</button></div>
    <SaveStatus status={status} onUndo={(prev: StepTemplate[]) => { dispatch({ type: "saveWorkflow", steps: prev }); setSteps(prev); clear() }} />
  </section>
}

function RolesTable({ roles, onChange }: { roles: Role[]; onChange: (r: Role[]) => void }) {
  const { state } = useStore()
  const change = (i: number, patch: Partial<Role>, reFn = false) => onChange(roles.map((r, j) => i === j ? (reFn ? rederiveFn(roles, { ...r, ...patch }) : { ...r, ...patch }) : r))
  return <div className="tbl-wrap"><table className="tbl goal-tbl"><thead><tr><th>Title</th><th>Reports to</th><th>Officer</th><th>Duties</th></tr></thead><tbody>
    {roles.map((r, i) => <tr key={r.id}>
      <td><input type="text" aria-label="Role title" value={r.displayName} maxLength={60} onChange={e => change(i, { displayName: e.target.value }, true)} /></td>
      <td><select aria-label="Reports to" value={r.reportsToId ?? ""} onChange={e => change(i, { reportsToId: e.target.value || null })}><option value="">Nobody (top)</option>{roles.filter(x => !withBelow(roles, r.id).has(x.id)).map(x => <option key={x.id} value={x.id}>{x.displayName}</option>)}</select></td>
      <td>{state.people.find(p => p.id === r.holderId)?.name ?? "Open position"}</td>
      <td><textarea aria-label="Role duties" rows={2} maxLength={400} value={r.duties ?? ""} onChange={e => change(i, { duties: e.target.value })} /></td>
    </tr>)}
  </tbody></table></div>
}

function MySettings() {
  const { state, dispatch, log } = useStore()
  const { person, role } = useViewer()
  return <section className="card form-stack" data-testid="my-settings"><MyForm key={person.id} />
    <details className="more"><summary>My planning buffer</summary>
      <p className="small">{personalBuffer(state, person).days} scheduling day(s) · only you see this. {personalBuffer(state, person).explanation}</p>
      <label className="check-label"><input type="checkbox" checked={person.retainBufferAtHandoff ?? false} onChange={e => dispatch({ type: "handoffAction", action: { kind: "retainBuffer", keep: e.target.checked } })} />Keep my personal buffer when I hand off ({role?.displayName})</label>
    </details>
    <div className="action-row"><button type="button" className="btn" data-testid="export-data" onClick={() => downloadExport(state, log)}>Export my data</button><Info>Downloads a JSON file with your club data and a record of what you did, in order.</Info></div>
  </section>
}
function MyForm() {
  const { state, dispatch } = useStore()
  const { person, role } = useViewer()
  const [draft, setDraft] = useState(() => structuredClone(profilePatch(person)))
  const { status, clear } = useAutosave(draft, profilePatch(person), d => validateProfile(d) ?? (state.people.some(p => p.id !== person.id && p.name.toLowerCase() === d.name.trim().toLowerCase()) ? "Choose a distinct fictional name." : null), d => dispatch({ type: "saveProfile", personId: person.id, patch: d }))
  return <><h2>My preferences</h2><RoleCard state={state} personId={person.id} /><ProfileForm value={draft} roleName={role?.displayName ?? "Officer"} onChange={setDraft} /><SaveStatus status={status} onUndo={(prev: typeof draft) => { dispatch({ type: "saveProfile", personId: person.id, patch: prev }); setDraft(structuredClone(prev)); clear() }} /></>
}

function Admin() {
  const { state, dispatch } = useStore()
  const rail = useRail()
  return <section className="card form-stack">
    <h2>Admin</h2>
    <div className="action-row"><button type="button" className="btn" onClick={() => rail.show({ kind: "board" })}>Customize the task board</button></div>
    <h3>Reported answers</h3>
    {state.feedback.length ? <ul className="inbox-list">{state.feedback.map(f => <li key={f.id}><span className="small">{f.text.slice(0, 160)}</span><span className="action-row"><span className="tag">{f.resolved ? "Reviewed" : "Needs review"}</span>{!f.resolved && <button className="btn small" onClick={() => dispatch({ type: "resolveReport", id: f.id })}>Mark reviewed</button>}</span></li>)}</ul> : <Empty>No reports yet.</Empty>}
  </section>
}
