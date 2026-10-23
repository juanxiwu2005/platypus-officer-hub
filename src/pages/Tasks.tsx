import { useStore, useViewer } from "../data/store"
import { Coming, PageHead } from "../components/Page"
import { fmtShort } from "../lib/dates"
import { statusOf } from "./helpers"

export default function Tasks() {
  const { state } = useStore()
  const { person } = useViewer()
  const mine = state.nodes.filter(n => n.ownerId === person.id && n.status !== "done")
  const unclaimed = state.nodes.filter(n => n.status === "unclaimed" && !n.ownerId)
  return (
    <>
      <PageHead path="/tasks" lead="Your own tasks first. Every task has exactly one owner." />
      <section className="card" aria-labelledby="mine-h">
        <header><h2 id="mine-h">Mine</h2><span className="small muted">{mine.length} open</span></header>
        <ul className="list" data-testid="my-tasks">
          {mine.map(n => (
            <li key={n.id}>
              <div>
                <div>{n.title}</div>
                <div className="small muted">{n.latestStart ? `start by ${fmtShort(n.latestStart)}` : ""}{n.clubDeadline ? ` · club deadline ${fmtShort(n.clubDeadline)}` : ""}</div>
              </div>
              <span className={`tag ${statusOf(n).tone}`}>{statusOf(n).text}</span>
            </li>
          ))}
          {mine.length === 0 && <li className="muted">Nothing open. Nice.</li>}
        </ul>
      </section>
      {unclaimed.length > 0 && (
        <section className="card" aria-labelledby="unclaimed-h">
          <header><h2 id="unclaimed-h">Nobody has claimed these</h2></header>
          <ul className="list">
            {unclaimed.map(n => <li key={n.id}><span>{n.title}</span><span className="tag late">No owner</span></li>)}
          </ul>
        </section>
      )}
      <Coming wp="WP3" items={[
        "Board by status, or a Gantt view",
        "Claim handshake: a task is handed over only when the owner taps “I've got it”",
        "Four one-tap statuses from the message: Done, Waiting on…, Need help, Need more time (with current draft)",
        "Nudge button on the task itself (replaces “Ready to send”)",
        "Silence protocol with a simulated clock",
      ]} />
    </>
  )
}
