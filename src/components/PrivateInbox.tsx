import { Link } from "react-router-dom"
import { useStore } from "../data/store"

export function PrivateInbox() {
  const { state, dispatch } = useStore()
  const notices = state.notifications.filter(n => n.recipientId === state.viewerId).slice().reverse()
  return <section className="card" aria-label="Private inbox" data-testid="private-inbox"><header><h2>Your private updates</h2><span className="small muted">{notices.filter(n => !n.read).length} unread</span></header>
    {notices.length ? <ul className="list">{notices.slice(0, 12).map(n => <li key={n.id}><div><Link to={`/tasks?node=${encodeURIComponent(n.nodeId)}`}>{n.text}</Link><p className="small muted">{n.createdOn} · {n.kind}</p></div>{!n.read && <button className="btn small" onClick={() => dispatch({ type: "markNoticeRead", id: n.id })}>Mark read</button>}</li>)}</ul> : <p className="small muted">No private updates for this view. Sources: task updates and the follow-up schedule.</p>}
  </section>
}
