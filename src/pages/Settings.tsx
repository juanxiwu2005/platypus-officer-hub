import { TASK_DUE_CHOICES } from "../engine/taskDates"
import { personalBuffer } from "../engine/schedule"
import { Fragment, useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { PageHead } from "../components/Page"
import { BoardSettingsPanel } from "../components/BoardSettings"
import { GoalsEditor, ProfileForm, RoleCard, WorkspaceEditor } from "../components/SettingsForms"
import { OrgChart } from "../components/setup/OrgChart"
import { MAX_ROLES, newRole, rederiveFn, withBelow } from "../data/structure"
import { WorkflowPanel } from "../components/setup/WorkflowPanel"
import { orgSteps } from "../engine/playbooks"
import { checkWorkflow, presetSteps, withOwners } from "../engine/workflow"
import type { StepTemplate } from "../data/types"
import { validateWorkflow } from "../data/settings"
import { clubDraft, profilePatch, validateClub, validateDefaults, validateProfile, type ClubDraft } from "../data/settings"
import type { OrgSettings, Person, Role } from "../data/types"
import { Empty, Info } from "../components/ui"
import { officers } from "../data/permissions"
import { ClosedRoles } from "./HandoffRoleChanges"
import { REMINDER_MODES, reminderModeTestId } from "../data/reminderMode"
import { onboardingCopy } from "../onboarding/copy"
import { isReminderRuntime } from "../reminders/runtime"

export function InviteLink({ code }: { code: string }) {
  const url = `${window.location.origin}${window.location.pathname}#/join?invite=${encodeURIComponent(code)}`
  const [copied, setCopied] = useState(false)
  return <div className="form-stack"><label>Officer setup link<input readOnly value={url} onFocus={e => e.target.select()} /></label><div className="action-row"><button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true) } catch { setCopied(false) } }}>{copied ? "Copied" : "Copy invite link"}</button><a className="btn" href={url}>Try officer setup</a><Info>Same-browser demo invitation: choose a fictional officer to try their setup.</Info></div></div>
}

type Tab = "club" | "roles" | "workflow" | "tasks" | "links" | "me" | "admin"
const TABS: { id: Tab; label: string; lead: boolean }[] = [
  { id: "club", label: "Club", lead: true }, { id: "roles", label: "Roles", lead: true }, { id: "workflow", label: "Workflow", lead: true }, { id: "tasks", label: "Tasks", lead: true }, { id: "links", label: "Links & files", lead: true },
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
        {active === "me" ? <MySettings /> : active === "admin" ? <Admin /> : active === "workflow" ? <WorkflowSettings /> : active === "tasks" ? <TaskSettings /> : <ClubSettings tab={active} />}
      </div>
    </div>
  </>
}

function TaskSettings() {
  return <section className="card form-stack" data-testid="task-settings"><BoardSettingsPanel /></section>
}

/** Debounced auto-save with a single Undo step. */
function useAutosave<T>(value: T, saved: T, valid: (v: T) => string | null, commit: (v: T) => void | boolean) {
  const { persistenceFailed } = useStore()
  const [status, setStatus] = useState<{ text: string; undo?: T; failed?: boolean } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (JSON.stringify(value) === JSON.stringify(saved)) return
    const error = valid(value)
    if (error) { setStatus({ text: error }); return }
    const before = saved
    const t = setTimeout(() => { setStatus(commit(value) === false ? { text: "Saving failed. Your changes are kept here.", failed: true } : { text: "Saved.", undo: before }) }, 500)
    return () => clearTimeout(t)
  }, [JSON.stringify(value), attempt])
  return { status: status?.undo !== undefined && persistenceFailed ? { ...status, text: "Saving failed. Changes are only on screen.", failed: true } : status, clear: () => setStatus(null), retry: () => setAttempt(n => n + 1) }
}

function ClubSettings({ tab }: { tab: "club" | "roles" | "links" }) {
  const { state, tryDispatch } = useStore()
  const [draft, setDraft] = useState(() => clubDraft(state))
  const [defaults, setDefaults] = useState(() => structuredClone(state.org.settings))
  const saved = { draft: clubDraft(state), defaults: state.org.settings }
  const { status, clear, retry } = useAutosave({ draft, defaults }, saved, v => validateClub(v.draft) ?? validateDefaults(v.defaults), v => tryDispatch({ type: "saveClubSettings", draft: v.draft, defaults: v.defaults }))
  const undo = (prev: { draft: ClubDraft; defaults: OrgSettings }) => { if (!tryDispatch({ type: "saveClubSettings", draft: prev.draft, defaults: prev.defaults })) return; setDraft(structuredClone(prev.draft)); setDefaults(structuredClone(prev.defaults)); clear() }
  const updatedPlan = isReminderRuntime(state.reminderRuntime) && state.reminderRuntime.version === 2
  const p = defaults.silenceProtocol
  // "Choose how reminders go out" on the reminder centre links here with ?reminders=1: open Tasks and events at the choice.
  const [params] = useSearchParams()
  const openReminders = tab === "club" && params.has("reminders")
  const reminderBox = useRef<HTMLFieldSetElement>(null)
  useEffect(() => { if (openReminders) reminderBox.current?.scrollIntoView({ block: "center" }) }, [openReminders])
  return <section className="card form-stack" data-testid="club-settings">
    {tab === "club" && <>
      <h2>Club</h2>
      <div className="form-grid"><label>Club name<input value={draft.name} maxLength={80} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label>School<input readOnly value={state.org.school} /></label></div>
      <label>Club mission<textarea maxLength={300} rows={2} value={draft.mission} onChange={e => setDraft({ ...draft, mission: e.target.value })} /></label>
      <details className="more"><summary>Semester goals</summary><GoalsEditor goals={draft.goals} progress onChange={goals => setDraft({ ...draft, goals })} /></details>
      <details className="more"><summary>Deadline and follow-up defaults</summary><p className="small muted">Legacy days retained; leadership days apply.</p><div className="form-grid"><label>Club buffer (working days)<input type="number" min="0" max="10" value={defaults.clubBufferBusinessDays} onChange={e => setDefaults({ ...defaults, clubBufferBusinessDays: Number(e.target.value) })} /></label><label>Reminder limit per task<input type="number" min="1" max="3" value={defaults.maxRemindersPerTask} onChange={e => setDefaults({ ...defaults, maxRemindersPerTask: Number(e.target.value) })} /></label>{["Legacy reminder 1 day", "Legacy reminder 2 day", "Private check day", "Temporary owner day", "Recovery day"].map((label, i) => <label key={label}>{label}<input type="number" min="1" max="30" disabled={updatedPlan && i < 2} value={[...p.nudgeDays, p.presidentDay, p.reassignDay, p.retroDay][i]} onChange={e => { const value = Number(e.target.value); const protocol = i < 2 ? { ...p, nudgeDays: p.nudgeDays.map((n, j) => i === j ? value : n) } : { ...p, [i === 2 ? "presidentDay" : i === 3 ? "reassignDay" : "retroDay"]: value }; setDefaults({ ...defaults, silenceProtocol: protocol }) }} /></label>)}</div></details>
      <details className="more" data-testid="tasks-events-settings" open={openReminders || undefined}><summary>Tasks and events</summary><div className="form-stack">
        {/* FB-8: the same three choices as the walkthrough's Reminders screen, same words. The demo never sends anything. */}
        <fieldset ref={reminderBox} data-testid="settings-reminder-mode"><legend className="small muted">{onboardingCopy.founder.reminders.title}</legend>
          {REMINDER_MODES.map(m => <label key={m} className="check-label"><input type="radio" name="reminder-mode" data-testid={`settings-${reminderModeTestId(m)}`} aria-describedby={defaults.reminderMode === m ? "settings-reminder-mode-body" : undefined} checked={defaults.reminderMode === m} onChange={() => setDefaults({ ...defaults, reminderMode: m })} />{onboardingCopy.founder.reminders.options[m].title}</label>)}
          {/* Only the chosen option's line, to stay inside the page's word budget (150 / 150). */}
          {defaults.reminderMode && <p id="settings-reminder-mode-body" className="small muted">{onboardingCopy.founder.reminders.options[defaults.reminderMode].body}</p>}
        </fieldset>
        <p className="small muted" data-testid="reminder-plan-settings">Checks: start, due, 3 days overdue. Waiting on asks your selected helper. Limit: {defaults.maxRemindersPerTask} per task and recipient; 6 per recipient in 7 days. <Link to="/">Review plan</Link></p>
        <label>Task length<select aria-label="Usual task length" value={defaults.taskDueDays ?? 5} onChange={e => setDefaults({ ...defaults, taskDueDays: Number(e.target.value) })}>{TASK_DUE_CHOICES.map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
        <p className="small muted">Task due follows this length; club buffer applies to ASU event deadlines.</p>
        <fieldset><legend className="small muted">Who can create events</legend>
          {([["leads", "President and VP"], ["chosen", "President, VP and officers I choose"], ["everyone", "Every officer"]] as const).map(([v, label]) => <label key={v} className="check-label"><input type="radio" name="event-creators" checked={(defaults.eventCreators ?? "leads") === v} onChange={() => setDefaults({ ...defaults, eventCreators: v })} />{label}</label>)}
          {defaults.eventCreators === "chosen" && <div className="form-stack">{officers(state).filter(p => !["president", "vice_president"].includes(state.roles.find(r => r.id === p.roleId)?.fn ?? "")).map(p => <label key={p.id} className="check-label"><input type="checkbox" checked={(defaults.eventCreatorIds ?? []).includes(p.id)} onChange={e => setDefaults({ ...defaults, eventCreatorIds: e.target.checked ? [...(defaults.eventCreatorIds ?? []), p.id] : (defaults.eventCreatorIds ?? []).filter(id => id !== p.id) })} />{p.name}</label>)}</div>}
        </fieldset>
      </div></details>
      <div className="action-row"><Link className="btn" to="/setup">Replay setup</Link></div>
    </>}
    {tab === "roles" && <>
      <h2>Roles</h2>
      <RolesTable roles={draft.roles} people={draft.people} onChange={(roles, people = draft.people) => setDraft({ ...draft, roles, people })} /><OrgChart roles={draft.roles} /><ClosedRoles />
      <details className="more"><summary>Invite officers</summary><InviteLink code={state.org.inviteCode} /></details>
    </>}
    {tab === "links" && <><h2>Links & files</h2><WorkspaceEditor value={draft.workspace} onChange={workspace => setDraft({ ...draft, workspace })} /></>}
    <SaveStatus status={status} onUndo={undo} onRetry={retry} />
  </section>
}

function SaveStatus<T>({ status, onUndo, onRetry }: { status: { text: string; undo?: T; failed?: boolean } | null; onUndo: (v: T) => void; onRetry?: () => void }) {
  if (!status) return null
  return <p role="status" className={`save-status ${status.undo && !status.failed ? "ok" : "err"}`}>{status.text}{status.failed && onRetry && <button type="button" className="link" onClick={onRetry}>Retry saving</button>}{status.undo !== undefined && <button type="button" className="link" onClick={() => onUndo(status.undo as T)}>Undo</button>}</p>
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
    <WorkflowPanel state={state} steps={steps} roles={state.roles} issues={issues} onChange={setSteps} />
    <div className="action-row"><button type="button" className="btn small" onClick={() => { dispatch({ type: "resetWorkflow" }); setSteps(withOwners(presetSteps(), state.roles)); clear() }}>Go back to the standard workflow</button></div>
    <SaveStatus status={status} onUndo={(prev: StepTemplate[]) => { dispatch({ type: "saveWorkflow", steps: prev }); setSteps(prev); clear() }} />
  </section>
}

function RolesTable({ roles, people, onChange }: { roles: Role[]; people: Person[]; onChange: (roles: Role[], people?: Person[]) => void }) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const change = (i: number, patch: Partial<Role>, reFn = false) => onChange(roles.map((r, j) => i === j ? (reFn ? rederiveFn(roles, { ...r, ...patch }) : { ...r, ...patch }) : r))
  const changePerson = (id: string, patch: Partial<Pick<Person, "name" | "email" | "phone" | "asuId">>) => onChange(roles, people.map(p => p.id === id ? { ...p, ...patch } : p))
  const copyEmails = async () => { try { await navigator.clipboard.writeText(roles.map(r => people.find(p => p.id === r.holderId)?.email ?? "").filter(Boolean).join(", ")); setCopied(true) } catch { setCopied(false) } }
  const addRole = () => { const role = newRole("New role", roles.find(r => r.fn === "president")?.id ?? null); onChange([...roles, role]); setExpanded(role.id) }
  const columnWidth = (values: string[], min: number, max: number) => `${Math.min(max, Math.max(min, ...values.map(value => value.length + 1)))}ch`
  const widths = {
    title: columnWidth(roles.map(r => r.displayName), 14, 28), reports: columnWidth(roles.map(r => roles.find(x => x.id === r.reportsToId)?.displayName ?? "Nobody (top)"), 13, 22),
    officer: columnWidth(roles.map(r => people.find(p => p.id === r.holderId)?.name ?? "Open position"), 14, 24), email: columnWidth(people.map(p => p.email), 18, 30), phone: columnWidth(people.map(p => p.phone), 14, 18), asu: "12ch",
  }
  return <div className="roles-manager">
    <div className="roles-actions"><p className="small muted">Select a role to view its full duties.</p><div className="action-row"><button type="button" className="btn small" onClick={copyEmails}>{copied ? "Emails copied" : "Copy all emails"}</button><button type="button" className={`btn small${editing ? " btn-primary" : ""}`} aria-pressed={editing} onClick={() => setEditing(value => !value)}>{editing ? "Done editing" : "Edit roles"}</button>{editing && roles.length < MAX_ROLES && <button type="button" className="btn small" onClick={addRole}>Add role</button>}</div></div>
    <div className="roles-table-wrap"><table className="tbl roles-table"><thead><tr><th>Title</th><th>Reports to</th><th>Officer</th><th>Email</th><th>Phone</th><th>ASU ID</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
      {roles.map((r, i) => {
        const person = people.find(p => p.id === r.holderId), open = expanded === r.id, boss = withBelow(roles, r.id)
        return <Fragment key={r.id}><tr className={open ? "is-open" : ""}>
          <td>{editing ? <input style={{ width: widths.title }} type="text" aria-label="Role title" value={r.displayName} maxLength={60} onChange={e => change(i, { displayName: e.target.value }, true)} /> : <span className="role-name" title={r.displayName}>{r.displayName}</span>}</td>
          <td>{editing ? <select style={{ width: widths.reports }} aria-label="Reports to" value={r.reportsToId ?? ""} onChange={e => change(i, { reportsToId: e.target.value || null })}><option value="">Nobody (top)</option>{roles.filter(x => !boss.has(x.id)).map(x => <option key={x.id} value={x.id}>{x.displayName}</option>)}</select> : <span className="role-value" title={roles.find(x => x.id === r.reportsToId)?.displayName ?? "Nobody (top)"}>{roles.find(x => x.id === r.reportsToId)?.displayName ?? "Nobody (top)"}</span>}</td>
          <td>{editing && person ? <input style={{ width: widths.officer }} type="text" aria-label="Officer name" value={person.name} maxLength={80} onChange={e => changePerson(person.id, { name: e.target.value })} /> : <span className="role-value" title={person?.name || "Open position"}>{person?.name || "Open position"}</span>}</td>
          <td>{editing && person ? <input style={{ width: widths.email }} type="email" aria-label="Officer email" value={person.email} maxLength={120} onChange={e => changePerson(person.id, { email: e.target.value })} /> : <span className="role-value" title={person?.email || "—"}>{person?.email || "—"}</span>}</td>
          <td>{editing && person ? <input style={{ width: widths.phone }} type="tel" aria-label="Officer phone" value={person.phone} maxLength={18} onChange={e => changePerson(person.id, { phone: e.target.value })} /> : <span className="role-value" title={person?.phone || "—"}>{person?.phone || "—"}</span>}</td>
          <td>{editing && person ? <input style={{ width: widths.asu }} type="text" inputMode="numeric" aria-label="Officer ASU ID" maxLength={10} value={person.asuId ?? ""} onChange={e => changePerson(person.id, { asuId: e.target.value.replace(/\D/g, "") })} /> : <span className="role-value" title={person?.asuId || "—"}>{person?.asuId || "—"}</span>}</td>
          <td className="role-actions-cell"><button type="button" className="btn small" aria-label={`Show duties for ${r.displayName}`} aria-expanded={open} onClick={() => setExpanded(open ? null : r.id)}>Duties</button>{editing && !person && r.fn !== "president" && <button type="button" className="btn small btn-quiet" aria-label={`Remove ${r.displayName}`} onClick={() => onChange(roles.filter(x => x.id !== r.id))}>Remove</button>}</td>
        </tr>{open && <tr className="role-detail"><td colSpan={7}><div><span className="cap">Duties</span>{editing ? <textarea aria-label="Role duties" rows={4} maxLength={400} value={r.duties ?? ""} onChange={e => change(i, { duties: e.target.value })} /> : <p>{r.duties?.trim() || "No duties written yet."}</p>}</div></td></tr>}</Fragment>
      })}
    </tbody></table></div>
  </div>
}

function MySettings() {
  const { state, dispatch, exportData } = useStore()
  const { person, role } = useViewer()
  return <section className="card form-stack" data-testid="my-settings"><MyForm key={person.id} />
    <details className="more"><summary>My planning buffer</summary>
      <p className="small">{personalBuffer(state, person).days} scheduling day(s) · only you see this. {personalBuffer(state, person).explanation}</p>
      <label className="check-label"><input type="checkbox" checked={person.retainBufferAtHandoff ?? false} onChange={e => dispatch({ type: "handoffAction", action: { kind: "retainBuffer", keep: e.target.checked } })} />Keep my personal buffer when I hand off ({role?.displayName})</label>
    </details>
    <div className="action-row"><button type="button" className="btn" data-testid="export-data" onClick={exportData}>Export my data</button><Info>Downloads a JSON file with your club data and a record of what you did, in order.</Info></div>
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
  return <section className="card form-stack">
    <h2>Admin</h2>
    <h3>Reported answers</h3>
    {state.feedback.length ? <ul className="inbox-list">{state.feedback.map(f => <li key={f.id}><span className="small">{f.text.slice(0, 160)}</span><span className="action-row"><span className="tag">{f.resolved ? "Reviewed" : "Needs review"}</span>{!f.resolved && <button className="btn small" onClick={() => dispatch({ type: "resolveReport", id: f.id })}>Mark reviewed</button>}</span></li>)}</ul> : <Empty>No reports yet.</Empty>}
  </section>
}
