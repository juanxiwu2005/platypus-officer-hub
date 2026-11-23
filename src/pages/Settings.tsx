import { TASK_DUE_CHOICES } from "../engine/taskDates"
import { personalBuffer } from "../engine/schedule"
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { PageHead } from "../components/Page"
import { RoleCard } from "../components/SettingsForms"
import { MyPreferencesForm } from "../components/settings/MyPreferencesForm"
import { RolesTeams } from "../components/settings/RolesTeams"
import { SettingsNavContext, linkedSettingsTab, type SettingsTab } from "../components/settings/settingsNav"
import { clubDraft, profilePatch, validateClub, validateDefaults, validateProfile, type ClubDraft } from "../data/settings"
import type { OrgSettings } from "../data/types"
import { Empty, Info } from "../components/ui"
import { officers } from "../data/permissions"
import { ClosedRoles } from "./HandoffRoleChanges"
import { REMINDER_MODE_COPY, REMINDER_MODES, reminderModeTestId } from "../data/reminderMode"
import { PERSON_WEEKLY_EMAIL_LIMIT } from "../reminders/policy"

const WorkflowLibrary = lazy(() => import("../components/workflowLibrary/WorkflowLibrary"))

export function InviteLink({ code }: { code: string }) {
  const url = `${window.location.origin}${window.location.pathname}#/join?invite=${encodeURIComponent(code)}`
  const [copied, setCopied] = useState(false)
  return <div className="form-stack"><label>Officer setup link<input readOnly value={url} onFocus={e => e.target.select()} /></label><div className="action-row"><button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true) } catch { setCopied(false) } }}>{copied ? "Copied" : "Copy invite link"}</button><a className="btn" href={url}>Try officer setup</a><Info>Same-browser demo invitation: choose a fictional officer to try their setup.</Info></div></div>
}

type Tab = SettingsTab
const TABS: { id: Tab; label: string; lead: boolean }[] = [
  { id: "club", label: "Club", lead: true }, { id: "roles", label: "Roles & teams", lead: true }, { id: "workflow", label: "Workflow", lead: true },
  { id: "me", label: "My preferences", lead: false }, { id: "admin", label: "Admin", lead: true },
]

/** Settings in five small sections; every change saves itself, with Undo (decision 5). */
export default function Settings() {
  const { canNudge } = useViewer()
  const tabs = TABS.filter(t => canNudge || !t.lead)
  // A section can be opened by link (#/settings?tab=roles) or by another section (Roles & teams ↔ Workflow).
  const [params, setParams] = useSearchParams()
  const linked = linkedSettingsTab(params.get("tab"))
  const [tab, setTab] = useState<Tab>(() => linked ?? (canNudge ? "club" : "me"))
  useEffect(() => { if (linked) setTab(linked) }, [linked])
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
        {active === "me" ? <MySettings /> : active === "admin" ? <Admin /> : active === "workflow" ? <Suspense fallback={<p>Loading workflows…</p>}><WorkflowLibrary /></Suspense> : <ClubSettings tab={active} />}
      </div>
    </div>
  </SettingsNavContext.Provider>
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

function ClubSettings({ tab }: { tab: "club" | "roles" }) {
  const { state, tryDispatch } = useStore()
  const [draft, setDraft] = useState(() => clubDraft(state))
  const [defaults, setDefaults] = useState(() => structuredClone(state.org.settings))
  const saved = { draft: clubDraft(state), defaults: state.org.settings }
  const { status, clear, retry } = useAutosave({ draft, defaults }, saved, v => validateClub(v.draft) ?? validateDefaults(v.defaults), v => tryDispatch({ type: "saveClubSettings", draft: v.draft, defaults: v.defaults }))
  const undo = (prev: { draft: ClubDraft; defaults: OrgSettings }) => { if (!tryDispatch({ type: "saveClubSettings", draft: prev.draft, defaults: prev.defaults })) return; setDraft(structuredClone(prev.draft)); setDefaults(structuredClone(prev.defaults)); clear() }
  const p = defaults.silenceProtocol
  // "Choose how reminders go out" on the reminder centre links here with ?reminders=1: scroll to the choice.
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
      {/* The one field left from the former Links & files tab: the AI reads it as context. Links and files stay stored, no longer edited here. */}
      <label>Planning notes<textarea maxLength={2000} rows={3} value={draft.workspace.planningNotes} onChange={e => setDraft({ ...draft, workspace: { ...draft.workspace, planningNotes: e.target.value } })} /></label>
      {/* FB-8: the three sending choices. The demo never sends anything. An old save without a choice shows none ticked. */}
      <fieldset ref={reminderBox} data-testid="settings-reminder-mode"><legend className="small muted">{REMINDER_MODE_COPY.title}</legend>
        {REMINDER_MODES.map(m => <label key={m} className="check-label"><input type="radio" name="reminder-mode" data-testid={`settings-${reminderModeTestId(m)}`} aria-describedby={defaults.reminderMode === m ? "settings-reminder-mode-body" : undefined} checked={defaults.reminderMode === m} onChange={() => setDefaults({ ...defaults, reminderMode: m })} />{REMINDER_MODE_COPY.options[m].title}</label>)}
        {/* Only the chosen option's line, to stay inside the page's word budget. */}
        {defaults.reminderMode && <p id="settings-reminder-mode-body" className="small muted">{REMINDER_MODE_COPY.options[defaults.reminderMode].body}</p>}
      </fieldset>
      <p className="small muted" data-testid="reminder-plan-settings">At most {PERSON_WEEKLY_EMAIL_LIMIT} reminders per person a week. <Link to="/">Review plan</Link></p>
      <label>Club buffer (working days)<input type="number" min="0" max="10" value={defaults.clubBufferBusinessDays} onChange={e => setDefaults({ ...defaults, clubBufferBusinessDays: Number(e.target.value) })} /></label>
      {/* Rarely changed numbers and the event-creator choice, behind one disclosure. */}
      <details className="more" data-testid="tasks-events-settings"><summary>More</summary><div className="form-stack">
        <div className="form-grid">
          <label>Task length<select aria-label="Usual task length" value={defaults.taskDueDays ?? 5} onChange={e => setDefaults({ ...defaults, taskDueDays: Number(e.target.value) })}>{TASK_DUE_CHOICES.map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
          <label>Reminder limit per task<input type="number" min="1" max="3" value={defaults.maxRemindersPerTask} onChange={e => setDefaults({ ...defaults, maxRemindersPerTask: Number(e.target.value) })} /></label>
          {(["presidentDay", "reassignDay", "retroDay"] as const).map((key, i) => <label key={key}>{["Private check day", "Temporary owner day", "Recovery day"][i]}<input type="number" min="1" max="30" value={p[key]} onChange={e => setDefaults({ ...defaults, silenceProtocol: { ...p, [key]: Number(e.target.value) } })} /></label>)}
        </div>
        <fieldset><legend className="small muted">Who can create events</legend>
          {([["leads", "President and VP"], ["chosen", "President, VP and officers I choose"], ["everyone", "Every officer"]] as const).map(([v, label]) => <label key={v} className="check-label"><input type="radio" name="event-creators" checked={(defaults.eventCreators ?? "leads") === v} onChange={() => setDefaults({ ...defaults, eventCreators: v })} />{label}</label>)}
          {defaults.eventCreators === "chosen" && <div className="form-stack">{officers(state).filter(p => !["president", "vice_president"].includes(state.roles.find(r => r.id === p.roleId)?.fn ?? "")).map(p => <label key={p.id} className="check-label"><input type="checkbox" checked={(defaults.eventCreatorIds ?? []).includes(p.id)} onChange={e => setDefaults({ ...defaults, eventCreatorIds: e.target.checked ? [...(defaults.eventCreatorIds ?? []), p.id] : (defaults.eventCreatorIds ?? []).filter(id => id !== p.id) })} />{p.name}</label>)}</div>}
        </fieldset>
      </div></details>
      <div className="action-row"><Link className="btn" to="/welcome/setup">Replay setup</Link></div>
    </>}
    {saveStatus}
  </section>
}

function SaveStatus<T>({ status, onUndo, onRetry }: { status: { text: string; undo?: T; failed?: boolean } | null; onUndo: (v: T) => void; onRetry?: () => void }) {
  if (!status) return null
  return <p role="status" className={`save-status ${status.undo && !status.failed ? "ok" : "err"}`}>{status.text}{status.failed && onRetry && <button type="button" className="link" onClick={onRetry}>Retry saving</button>}{status.undo !== undefined && <button type="button" className="link" onClick={() => onUndo(status.undo as T)}>Undo</button>}</p>
}

function MySettings() {
  const { state, dispatch, exportData } = useStore()
  const { person, role } = useViewer()
  const bufferDays = personalBuffer(state, person).days   // the engine's number; only this officer sees it
  return <section className="card form-stack" data-testid="my-settings"><MyForm key={person.id} />
    <details className="more"><summary>My planning buffer</summary>
      <p className="small" data-testid="my-buffer">Private: {bufferDays} extra {bufferDays === 1 ? "day" : "days"}.</p>
      <label className="check-label"><input type="checkbox" checked={person.retainBufferAtHandoff ?? false} onChange={e => dispatch({ type: "handoffAction", action: { kind: "retainBuffer", keep: e.target.checked } })} />Keep my personal buffer when I hand off ({role?.displayName})</label>
    </details>
    <div className="action-row"><button type="button" className="btn" data-testid="export-data" onClick={exportData}>Export my data</button><Info>Downloads a JSON file with your club data and a record of what you did, in order.</Info></div>
  </section>
}
function MyForm() {
  const { state, dispatch } = useStore()
  const { person } = useViewer()
  const [draft, setDraft] = useState(() => structuredClone(profilePatch(person)))
  const { status, clear } = useAutosave(draft, profilePatch(person), d => validateProfile(d) ?? (state.people.some(p => p.id !== person.id && p.name.toLowerCase() === d.name.trim().toLowerCase()) ? "Choose a distinct fictional name." : null), d => dispatch({ type: "saveProfile", personId: person.id, patch: d }))
  return <><h2>My preferences</h2><RoleCard state={state} personId={person.id} /><MyPreferencesForm value={draft} onChange={setDraft} /><SaveStatus status={status} onUndo={(prev: typeof draft) => { dispatch({ type: "saveProfile", personId: person.id, patch: prev }); setDraft(structuredClone(prev)); clear() }} /></>
}

function Admin() {
  const { state, dispatch } = useStore()
  return <section className="card form-stack">
    <h2>Admin</h2>
    <h3>Reported answers</h3>
    {state.feedback.length ? <ul className="inbox-list">{state.feedback.map(f => <li key={f.id}><span className="small">{f.text.slice(0, 160)}</span><span className="action-row"><span className="tag">{f.resolved ? "Reviewed" : "Needs review"}</span>{!f.resolved && <button className="btn small" onClick={() => dispatch({ type: "resolveReport", id: f.id })}>Mark reviewed</button>}</span></li>)}</ul> : <Empty>No reports yet.</Empty>}
  </section>
}
