import { Link } from "react-router-dom"
import { useStore } from "../data/store"

/** Private updates for the current viewer (shown from the bell in the top bar). */
export function PrivateInbox({ onPick }: { onPick?: () => void }) {
  const { state, dispatch } = useStore()
  const notices = state.notifications.filter(n => n.recipientId === state.viewerId).slice().reverse()
  return <section aria-label="Private inbox" data-testid="private-inbox" className="inbox">
    <header><b>Private updates</b><span className="small muted">{notices.filter(n => !n.read).length} unread</span></header>
    {notices.length ? <ul className="inbox-list">{notices.slice(0, 12).map(n => <li key={n.id} className={n.read ? "read" : ""}>
      {/* Cheers (R1): a cheer notice opens its card (F5), which only its sender and recipients can open. */}
      <Link to={n.kind === "cheer" && n.cheerId ? `/?cheer=${encodeURIComponent(n.cheerId)}` : `/tasks?node=${encodeURIComponent(n.nodeId)}`} data-testid={n.kind === "cheer" ? "inbox-cheer" : undefined} onClick={() => { if (!n.read) dispatch({ type: "markNoticeRead", id: n.id }); onPick?.() }}>{n.text}</Link>
      {!n.read && <button type="button" className="btn small btn-quiet" onClick={() => dispatch({ type: "markNoticeRead", id: n.id })}>Mark read</button>}
    </li>)}</ul> : <p className="small muted">Nothing new.</p>}
  </section>
}
