import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useStore } from "../data/store"
import { profilePatch, validateProfile } from "../data/settings"
import { ProfileForm } from "../components/SettingsForms"

export default function Join() {
  const { state } = useStore()
  const [params] = useSearchParams()
  const [selected, setSelected] = useState(state.people.some(p => p.id === params.get("person")) ? params.get("person")! : state.people.find(p => state.roles.find(r => r.id === p.roleId)?.fn !== "president")?.id ?? state.people[0].id)
  if (params.get("invite") !== state.org.inviteCode) return <main className="join-page"><section className="card form-stack"><h1>Check your setup invitation</h1><p>This local demo invitation has expired or belongs to a different browser. Open the current invitation from Settings.</p><Link to="/settings">Open Settings</Link></section></main>
  return <main className="join-page"><section className="card form-stack"><h1>Welcome to {state.org.name}</h1><p>Five quick questions. This is a same-browser demo with fictional officers; choosing a name does not verify a real identity.</p><label>Try setup as<select value={selected} onChange={e => setSelected(e.target.value)}>{state.people.map(p => <option key={p.id} value={p.id}>{p.name} · {state.roles.find(r => r.id === p.roleId)?.displayName}</option>)}</select></label><JoinForm key={selected} personId={selected} invite={state.org.inviteCode} /></section></main>
}
function JoinForm({ personId, invite }: { personId: string; invite: string }) {
  const { state, dispatch } = useStore()
  const person = state.people.find(p => p.id === personId)!
  const [draft, setDraft] = useState(() => structuredClone(profilePatch(person)))
  const [notice, setNotice] = useState("")
  const [saved, setSaved] = useState(false)
  if (saved) return <><h2>You're ready</h2><p>Your preferences and shared free times are saved. Task owners still confirm each task with “I've got it”.</p><Link className="btn btn-primary" to="/tasks" onClick={() => dispatch({ type: "setViewer", viewerId: personId })}>View my tasks as {draft.name}</Link><Link to="/settings">Back to Settings</Link></>
  return <form className="form-stack" onSubmit={e => { e.preventDefault(); const error = validateProfile(draft) ?? (state.people.some(p => p.id !== personId && p.name.toLowerCase() === draft.name.trim().toLowerCase()) ? "Choose a distinct fictional name." : null); if (error) { setNotice(error); return }; dispatch({ type: "saveProfile", personId, patch: draft, invite }); setSaved(true) }}><ProfileForm value={draft} roleName={state.roles.find(r => r.id === person.roleId)?.displayName ?? "Officer"} onChange={setDraft} /><button className="btn btn-primary">Save my setup</button>{notice && <p role="alert">{notice}</p>}</form>
}
