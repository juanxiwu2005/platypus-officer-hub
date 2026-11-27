import { useStore } from "../../data/store"
import { weeklyLine } from "../../data/cheerViews"
import { useRail } from "../rail/RailContext"
import { firstName, fullName, joinNames } from "./shared"
import "../../styles/ch-01-cheers.css"

/**
 * F7 (R1): the president's and VP's weekly line on the Reminders home, Monday to Wednesday (`weeklyLine` decides).
 * The names come from the activity record (finished tasks with details), never from anyone's cheers.
 * "Thank them" and the close button both put it away for the week. Loaded lazily by `WeeklyLine`.
 */
export default function WeeklyLineStrip() {
  const { state, tryDispatch } = useStore()
  const rail = useRail()
  const line = weeklyLine(state, state.viewerId)
  if (!line || !line.personIds.length) return null
  const dismiss = () => tryDispatch({ type: "cheerAction", action: { kind: "dismissWeeklyLine" } })
  return <section className="card ch-strip" aria-label="This week" data-testid="cheer-weekly">
    <span className="ch-banner-icon" aria-hidden="true">🙌</span>
    <p><b>This week:</b> {joinNames(line.personIds.map(id => firstName(fullName(state, id))))} delivered on time with details.</p>
    <span className="ch-strip-act">
      <button type="button" className="btn small" data-testid="cheer-weekly-thank" onClick={() => { rail.show({ kind: "cheer", toIds: line.personIds }); dismiss() }}>Thank them</button>
      <button type="button" className="btn btn-quiet icon-btn" aria-label="Close this week's line" data-testid="cheer-weekly-close" onClick={dismiss}>✕</button>
    </span>
  </section>
}
