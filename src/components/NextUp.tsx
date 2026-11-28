import { useStore } from "../data/store"
import { canLead } from "../data/permissions"
import type { Schedule } from "../engine/schedule"
import type { Forecast } from "../engine/forecast"
import { fmtShort } from "../lib/dates"
import { isLate } from "../lib/taskDue"
import { nextUp } from "../lib/nextUp"
import { useRail } from "./rail/RailContext"
import { NodePill, firstNameOf } from "./ui"
import "../styles/s3-next-up.css"

/**
 * "Next up" under the event's flow (S3): who acts next and what will be late, at most five rows.
 * A row opens the step's details, like its dot. Remind opens the existing reminder draft (president and VP only).
 */
export function NextUp({ eventId, sched, forecast, onOpen }: { eventId: string; sched: Schedule; forecast: Forecast; onOpen: (nodeId: string) => void }) {
  const { state } = useStore()
  const rail = useRail()
  const rows = nextUp(state, sched, forecast, eventId)
  const lead = canLead(state)
  return <section className="card next-up" aria-labelledby="next-up-title" data-testid="next-up">
    <h3 id="next-up-title">Next up</h3>
    {rows.length ? <ol className="next-up-list">{rows.map(({ node, reason, club }) => {
      const owner = state.people.find(p => p.id === node.ownerId)
      return <li key={node.id} data-testid={`next-up-${node.id}`} data-reason={reason}>
        <button type="button" className="next-up-row" onClick={() => onOpen(node.id)}>
          <span className="next-up-name">{node.title}</span>
          <span className={`next-up-owner${owner ? "" : " muted"}`}>{firstNameOf(owner?.name)}</span>
          <span className={`small num nowrap${isLate(node, club, state.today) ? " late-text" : ""}`}>Due {fmtShort(club)}</span>
          {reason === "risk" ? <span className="tag late">At risk</span> : reason === "watch" ? <span className="tag warn">Watch</span> : <NodePill node={node} small />}
        </button>
        {lead && owner && owner.id !== state.viewerId && <button type="button" className="btn small" aria-label={`Remind ${firstNameOf(owner.name)} about ${node.title}`} onClick={() => rail.show({ kind: "nudge", id: node.id })}>Remind</button>}
      </li>
    })}</ol> : <p className="small muted" data-testid="next-up-empty">Nothing is late or due to start.</p>}
  </section>
}
