import { useState } from "react"
import { Link } from "react-router-dom"
import { useStore, useViewer } from "../data/store"
import { PageHead } from "../components/Page"
import { GoalsEditor, ProfileForm, RolesEditor, WorkspaceEditor } from "../components/SettingsForms"
import { clubDraft, profilePatch, validateClub, validateDefaults, validateProfile } from "../data/settings"

export function InviteLink({ code }: { code: string }) {
  const url = `${window.location.origin}${window.location.pathname}#/join?invite=${encodeURIComponent(code)}`
  const [copied, setCopied] = useState(false)
  return <div className="form-stack"><p className="small muted">Same-browser demo invitation. Choose a fictional officer to try their setup. Real accounts and cross-device invitations arrive later.</p><label>Officer setup link<input readOnly value={url} onFocus={e => e.target.select()} /></label><div className="action-row"><button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true) } catch { setCopied(false) } }}>{copied ? "Copied" : "Copy invite link"}</button><a className="btn" href={url}>Try officer setup</a></div></div>
}

export default function Settings() {
  const { state } = useStore()
  const { person, canNudge } = useViewer()
  return <><PageHead path="/settings" lead="Change club defaults and your own preferences. Everything in this demo stays in this browser." />{canNudge && <ClubSettings key={state.org.inviteCode} />}<section className="card"><header><h2>My preferences</h2><span className="tag">{person.name}</span></header><p className="small muted">Only your own private planning settings appear here. Use fictional information.</p><MySettings key={person.id} /></section></>
}
function ClubSettings() {
  const { state, dispatch } = useStore()
  const [draft, setDraft] = useState(() => clubDraft(state))
  const [defaults, setDefaults] = useState(() => structuredClone(state.org.settings))
  const [notice, setNotice] = useState("")
  const p = defaults.silenceProtocol
  return <form className="card form-stack" data-testid="club-settings" onSubmit={e => { e.preventDefault(); const error = validateClub(draft) ?? validateDefaults(defaults); if (error) { setNotice(error); return }; dispatch({ type: "saveClubSettings", draft, defaults }); setNotice("Club settings saved. Roles and schedules are updated.") }}><header><h2>Club settings</h2><Link className="btn" to="/setup">Replay setup</Link></header><div className="form-grid"><label>Club name<input value={draft.name} maxLength={80} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label><label>School<input readOnly value={state.org.school} /></label></div><label>Club mission<textarea maxLength={300} value={draft.mission} onChange={e => setDraft({ ...draft, mission: e.target.value })} /></label><details><summary>Semester goals</summary><GoalsEditor goals={draft.goals} progress onChange={goals => setDraft({ ...draft, goals })} /></details><details open><summary>Roles and standard functions</summary><RolesEditor roles={draft.roles} people={draft.people} onChange={(roles, people) => setDraft({ ...draft, roles, people })} /></details><details><summary>Workspace links and planning files</summary><WorkspaceEditor value={draft.workspace} onChange={workspace => setDraft({ ...draft, workspace })} /></details><details><summary>Deadline and follow-up defaults</summary><div className="form-grid"><label>Club buffer (working days)<input type="number" min="0" max="10" value={defaults.clubBufferBusinessDays} onChange={e => setDefaults({ ...defaults, clubBufferBusinessDays: Number(e.target.value) })} /></label><label>Reminder limit per task<input type="number" min="1" max="3" value={defaults.maxRemindersPerTask} onChange={e => setDefaults({ ...defaults, maxRemindersPerTask: Number(e.target.value) })} /></label>{["Reminder 1 day", "Reminder 2 day", "Private check day", "Temporary owner day", "Recovery day"].map((label, i) => <label key={label}>{label}<input type="number" min="1" max="30" value={[...p.nudgeDays, p.presidentDay, p.reassignDay, p.retroDay][i]} onChange={e => { const value = Number(e.target.value); const protocol = i < 2 ? { ...p, nudgeDays: p.nudgeDays.map((n, j) => i === j ? value : n) } : { ...p, [i === 2 ? "presidentDay" : i === 3 ? "reassignDay" : "retroDay"]: value }; setDefaults({ ...defaults, silenceProtocol: protocol }) }} /></label>)}</div><p className="small muted">AI drafts; a person reviews and sends. Quiet hours stay 10 pm–8 am. At most six reminders per person per week.</p></details><div className="action-row"><button className="btn btn-primary">Save club settings</button><button type="button" className="btn" onClick={() => { setDraft(clubDraft(state)); setDefaults(structuredClone(state.org.settings)); setNotice("Unsaved edits discarded.") }}>Discard edits</button></div>{notice && <p role="status">{notice}</p>}<details><summary>Invite officers</summary><InviteLink code={state.org.inviteCode} /></details></form>
}
function MySettings() {
  const { state, dispatch } = useStore()
  const { person, role } = useViewer()
  const [draft, setDraft] = useState(() => structuredClone(profilePatch(person)))
  const [notice, setNotice] = useState("")
  return <form className="form-stack" data-testid="my-settings" onSubmit={e => { e.preventDefault(); const error = validateProfile(draft) ?? (state.people.some(p => p.id !== person.id && p.name.toLowerCase() === draft.name.trim().toLowerCase()) ? "Choose a distinct fictional name." : null); if (error) { setNotice(error); return }; dispatch({ type: "saveProfile", personId: person.id, patch: draft }); setNotice("My preferences saved. Scheduling and meeting times are updated.") }}><ProfileForm value={draft} roleName={role?.displayName ?? "Officer"} onChange={setDraft} /><div className="action-row"><button className="btn btn-primary">Save my preferences</button><button type="button" className="btn" onClick={() => { setDraft(structuredClone(profilePatch(person))); setNotice("Unsaved edits discarded.") }}>Discard my edits</button></div>{notice && <p role="status">{notice}</p>}</form>
}
