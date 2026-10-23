import { Link } from "react-router-dom"
import { Coming, PageHead } from "../components/Page"
import { useStore } from "../data/store"
import { ROLE_FUNCTIONS } from "../data/settings"

export default function Handoff() {
  const { state } = useStore()
  return <><PageHead path="/handoff" lead="Each role keeps its responsibilities together for the next officer." /><section className="card form-stack" data-testid="role-handbooks"><header><h2>Role handbook outlines</h2><span className="tag">From current roles and tasks</span></header><p className="small muted">Role titles follow Settings. Full handbook drafting and handoff season arrive in WP5.</p>{state.roles.map(r => { const nodes = state.nodes.filter(n => state.people.find(p => p.id === n.ownerId)?.roleId === r.id || (!n.ownerId && n.fn === r.fn)); return <details key={r.id}><summary>{r.displayName} handbook</summary><p className="small muted">Function: {ROLE_FUNCTIONS.find(f => f.value === r.fn)?.label} · {state.people.find(p => p.id === r.holderId)?.name ?? "No officer assigned"}</p>{nodes.length ? <ul>{nodes.map(n => <li key={n.id}><Link to={`/tasks?node=${encodeURIComponent(n.id)}`}>{n.title}</Link><p className="small muted">{n.why} · Source: {n.source}</p></li>)}</ul> : <p>No owned steps yet.</p>}</details> })}</section><Coming wp="WP5" items={["Handoff season and checklists", "Full role handbook drafts and incoming officer onboarding"]} /></>
}
