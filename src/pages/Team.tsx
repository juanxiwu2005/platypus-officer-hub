import { useStore } from "../data/store"
import { Coming, PageHead } from "../components/Page"
import { initials, roleName } from "./helpers"

export default function Team() {
  const { state } = useStore()
  return (
    <>
      <PageHead path="/team" lead="Workload shows as light, balanced or heavy, never as hours." />
      <section className="card" aria-labelledby="off-h">
        <header><h2 id="off-h">Officers</h2></header>
        <ul className="list" data-testid="officers">
          {state.people.map(p => {
            const open = state.nodes.filter(n => n.ownerId === p.id && n.status !== "done").length
            return (
              <li key={p.id}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className="avatar">{initials(p.name)}</span>
                  <div>
                    <div>{p.name}</div>
                    <div className="small muted">{roleName(state, p.roleId)} · prefers {p.channels[0]} in the {p.remindAt}</div>
                  </div>
                </div>
                <span className="small muted num">{open} open</span>
              </li>
            )
          })}
        </ul>
      </section>
      <Coming wp="WP4" items={["Workload tiers per officer", "Contribution board and superstar of the week", "Meeting time finder from officers' free slots"]} />
    </>
  )
}
