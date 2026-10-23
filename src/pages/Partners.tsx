import { useStore } from "../data/store"
import { Coming, PageHead } from "../components/Page"
import { daysBetween } from "../lib/dates"
import { roleName } from "./helpers"

export default function Partners() {
  const { state } = useStore()
  return (
    <>
      <PageHead path="/partners" lead="Speakers, vendors and sponsors belong to the club, not to one officer's phone." />
      <section className="card" aria-labelledby="ct-h">
        <header><h2 id="ct-h">Contacts</h2></header>
        <ul className="list" data-testid="contacts">
          {state.contacts.map(c => {
            const since = c.lastContact ? daysBetween(c.lastContact, state.today) : null
            const due = since !== null && since >= c.cadenceDays
            return (
              <li key={c.id}>
                <div>
                  <div>{c.name}</div>
                  <div className="small muted">{c.relation} · {c.organization} · owner: {roleName(state, c.ownerRoleId)}</div>
                </div>
                <span className={`tag ${due ? "warn" : ""}`}>{since === null ? "Never contacted" : due ? `${since} days, due for a touch` : `${since} days ago`}</span>
              </li>
            )
          })}
        </ul>
      </section>
      <Coming wp="WP4" items={["Contact cadence reminders", "Relationship history linked to events", "Hand contacts over with the role"]} />
    </>
  )
}
