import { useStore } from "../data/store"
import { Coming, PageHead } from "../components/Page"
import { fmtLong } from "../lib/dates"
import { personName, STATUS_LABEL } from "./helpers"

export default function Events() {
  const { state } = useStore()
  return (
    <>
      <PageHead path="/events" lead="Each event becomes a flow: one owner per step, three deadlines, and who is waiting on whom." />
      {state.events.map(ev => {
        const nodes = state.nodes.filter(n => n.eventId === ev.id)
        return (
          <section key={ev.id} className="card" aria-label={ev.name}>
            <header>
              <h2>{ev.name}</h2>
              <span className="small muted">{fmtLong(ev.date)} · about {ev.headcount} people</span>
            </header>
            {nodes.length === 0 ? (
              <p className="muted small">No steps yet. In WP1 Platypus builds them from the playbook.</p>
            ) : (
              <ul className="list">
                {nodes.map(n => (
                  <li key={n.id}>
                    <div>
                      <div>{n.title}</div>
                      <div className="small muted">{personName(state, n.ownerId)}{n.ruleIds.length ? ` · ${n.ruleIds.join(", ")}` : ""}</div>
                    </div>
                    <span className={`tag ${STATUS_LABEL[n.status].tone}`}>{STATUS_LABEL[n.status].text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
      <Coming wp="WP1" items={[
        "Swimlane flow chart by role, built from the OA101 / OA102 / OA201 playbooks",
        "Click a step to edit owner, three deadlines, RACI, the why, and links",
        "Change a date and every step downstream is rescheduled and rule-checked",
        "Gantt view",
      ]} />
    </>
  )
}
