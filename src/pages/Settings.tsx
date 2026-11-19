import { TASK_DUE_CHOICES } from "../engine/taskDates"
import { personalBuffer } from "../engine/schedule"
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { PageHead } from "../components/Page"
import { BoardSettingsPanel } from "../components/BoardSettings"
import { GoalsEditor, ProfileForm, RoleCard, WorkspaceEditor } from "../components/SettingsForms"
import { RolesTeams } from "../components/settings/RolesTeams"
import { SettingsNavContext, isSettingsTab, type SettingsTab } from "../components/settings/settingsNav"
import { WorkflowPanel } from "../components/setup/WorkflowPanel"
import { orgSteps } from "../engine/playbooks"
import { checkWorkflow, presetSteps, withOwners } from "../engine/workflow"
import type { StepTemplate, WorkflowBranch } from "../data/types"
import { validateWorkflow } from "../data/settings"
import { clubDraft, profilePatch, validateClub, validateDefaults, validateProfile, type ClubDraft } from "../data/settings"
import type { OrgSettings } from "../data/types"
import { Empty, Info } from "../components/ui"
import { officers } from "../data/permissions"
import { ClosedRoles } from "./HandoffRoleChanges"
import { REMINDER_MODES, reminderModeTestId } from "../data/reminderMode"
import { onboardingCopy } from "../onboarding/copy"
import { isReminderRuntime } from "../reminders/runtime"

const WorkflowLibrary = lazy(() => import("../components/workflowLibrary/WorkflowLibrary"))

export function InviteLink({ code }: { code: string }) {
  const url = `${window.location.origin}${window.location.pathname}#/join?invite=${encodeURIComponent(code)}`
  const [copied, setCopied] = useState(false)
  return <div className="form-stack"><label>Officer setup link<input readOnly value={url} onFocus={e => e.target.select()} /></label><div className="action-row"><button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true) } catch { setCopied(false) } }}>{copied ? "Copied" : "Copy invite link"}</button><a className="btn" href={url}>Try officer setup</a><Info>Same-browser demo invitation: choose a fictional officer to try their setup.</Info></div></div>
}

type Tab = SettingsTab
const TABS: { id: Tab; label: string; lead: boolean }[] = [
  { id: "club", label: "Club", lead: true }, { id: "roles", label: "Roles & teams", lead: true }, { id: "workflow", label: "Workflow", lead: true }, { id: "tasks", label: "Tasks", lead: true }, { id: "links", label: "Links & files", lead: true },
  { id: "me", label: "My preferences", lead: false }, { id: "admin", label: "Admin", lead: true },
]

/** Settings in five small sections; every change saves itself, with Undo (decision 5). */
export default function Settings() {
  const { canNudge } = useViewer()
  const tabs = TABS.filter(t => canNudge || !t.lead)
  // A section can be opened by link (#/settings?tab=roles) or by another section (Roles & teams ↔ Workflow).
  const [params, setParams] = useSearchParams()
  const linked = params.get("tab")
  const [tab, setTab] = useState<Tab>(() => isSettingsTab(linked) ? linked : canNudge ? "club" : "me")
  useEffect(() => { if (isSettingsTab(linked)) setTab(linked) }, [linked])
  const go = useCallback((next: Tab) => {
    setTab(next)
    if (params.has("tab")) setParams(current => { const copy = new URLSearchParams(current); copy.delete("tab"); return copy }, { replace: true })
  }, [params, setParams])
  const active = tabs.some(t => t.id === tab) ? tab : "me"
  return <SettingsNavContext.Provider value={go}>
    <PageHead path="/settings" />
    <div className="settings">
      <nav className="settings-nav" aria-label="Settings sections">{tabs.map(t => <button key={t.id} type="button" aria-current={active === t.id ? "page" : undefined} onClick={() => go(t.id)}>{t.label}</button>)}</nav>
      <div className="settings-body">
        {active === "me" ? <MySettings /> : active === "admin" ? <Admin /> : active === "workflow" ? <Suspense fallback={<p>Loading workflows…</p>}><WorkflowLibrary /></Suspense> : active === "tasks" ? <TaskSettings /> : <ClubSettings tab={active} />}
      </div>
    </div>
  </SettingsNavContext.Provider>
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
  const saveStatus = <SaveStatus status={status} onUndo={undo} onRetry={retry} />
  // Roles & teams: the chart (or contact list) card with its inspector, then closed roles and invitations as before.
  if (tab === "roles") return <div className="form-stack" data-testid="club-settings">
    <RolesTeams roles={draft.roles} people={draft.people} onChange={(roles, people = draft.people) => setDraft({ ...draft, roles, people })} status={saveStatus} />
    <section className="card form-stack rt-after" aria-label="Closed roles and invitations"><ClosedRoles />
      <details className="more"><summary>Invite officers</summary><InviteLink code={state.org.inviteCode} /></details>
    </section>
  </div>
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
        <p className="small muted" data-testid="reminder-plan-settings">Checks: start, due, 3 days overdue; {defaults.maxRemindersPerTask} per task and recipient{defaults.maxRemindersPerTask === 3 ? "; one extra no-reply follow-up" : ""}. Per person: 6/week, 2/day; ordinary: 4/week, 1/day. <Link to="/">Review plan</Link></p>
        <label>Task length<select aria-label="Usual task length" value={defaults.taskDueDays ?? 5} onChange={e => setDefaults({ ...defaults, taskDueDays: Number(e.target.value) })}>{TASK_DUE_CHOICES.map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
        <p className="small muted">Task due follows this length; club buffer applies to ASU event deadlines.</p>
        <fieldset><legend className="small muted">Who can create events</legend>
          {([["leads", "President and VP"], ["chosen", "President, VP and officers I choose"], ["everyone", "Every officer"]] as const).map(([v, label]) => <label key={v} className="check-label"><input type="radio" name="event-creators" checked={(defaults.eventCreators ?? "leads") === v} onChange={() => setDefaults({ ...defaults, eventCreators: v })} />{label}</label>)}
          {defaults.eventCreators === "chosen" && <div className="form-stack">{officers(state).filter(p => !["president", "vice_president"].includes(state.roles.find(r => r.id === p.roleId)?.fn ?? "")).map(p => <label key={p.id} className="check-label"><input type="checkbox" checked={(defaults.eventCreatorIds ?? []).includes(p.id)} onChange={e => setDefaults({ ...defaults, eventCreatorIds: e.target.checked ? [...(defaults.eventCreatorIds ?? []), p.id] : (defaults.eventCreatorIds ?? []).filter(id => id !== p.id) })} />{p.name}</label>)}</div>}
        </fieldset>
      </div></details>
      <div className="action-row"><Link className="btn" to="/welcome/setup">Replay setup</Link></div>
    </>}
    {tab === "links" && <><h2>Links & files</h2><WorkspaceEditor value={draft.workspace} onChange={workspace => setDraft({ ...draft, workspace })} /></>}
    {saveStatus}
  </section>
}

function SaveStatus<T>({ status, onUndo, onRetry }: { status: { text: string; undo?: T; failed?: boolean } | null; onUndo: (v: T) => void; onRetry?: () => void }) {
  if (!status) return null
  return <p role="status" className={`save-status ${status.undo && !status.failed ? "ok" : "err"}`}>{status.text}{status.failed && onRetry && <button type="button" className="link" onClick={onRetry}>Retry saving</button>}{status.undo !== undefined && <button type="button" className="link" onClick={() => onUndo(status.undo as T)}>Undo</button>}</p>
}

/** The club's event workflow, after setup: the same edit module. New events start from it; events already made keep their steps. */
export function WorkflowSettings() {
  const { state, tryDispatch } = useStore()
  const saved = { steps: withOwners(orgSteps(state), state.roles), branches: state.org.eventWorkflow?.branches }
  const [draft, setDraft] = useState<{ steps: StepTemplate[]; branches?: WorkflowBranch[] }>(saved)
  const changeWorkflow = useCallback((steps: StepTemplate[], branches?: WorkflowBranch[]) => setDraft(previous => ({ steps, branches: branches ?? previous.branches })), [])
  const { status, clear, retry } = useAutosave(draft, saved, v => validateWorkflow(v.steps, state.roles, v.branches), v => tryDispatch({ type: "saveWorkflow", steps: v.steps, branches: v.branches }))
  const issues = checkWorkflow(draft.steps, state.roles, state, draft.branches)
  return <section className="card form-stack" data-testid="workflow-settings">
    <h2>Event workflow</h2>
    <p className="small muted">New events start from this workflow. {state.org.eventWorkflow?.summary ?? "It is the standard workflow."} Events you already made keep their own steps.</p>
    <WorkflowPanel state={state} steps={draft.steps} branches={draft.branches} roles={state.roles} issues={issues} onChange={changeWorkflow} />
    <div className="action-row"><button type="button" className="btn small" onClick={() => { if (!tryDispatch({ type: "resetWorkflow" })) return; setDraft({ steps: withOwners(presetSteps(), state.roles) }); clear() }}>Go back to the standard workflow</button></div>
    <SaveStatus status={status} onRetry={retry} onUndo={(prev: typeof draft) => { const previous = { ...prev, branches: prev.branches ?? [] }; if (!tryDispatch({ type: "saveWorkflow", steps: previous.steps, branches: previous.branches })) return; setDraft(structuredClone(previous)); clear() }} />
  </section>
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
