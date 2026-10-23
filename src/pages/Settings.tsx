import { useStore } from "../data/store"
import { Coming, PageHead } from "../components/Page"

export default function Settings() {
  const { state } = useStore()
  const s = state.org.settings
  const rows: [string, string][] = [
    ["Club deadline buffer", `${s.clubBufferBusinessDays} business days before the official deadline`],
    ["Silence protocol", `Nudge on days ${s.silenceProtocol.nudgeDays.join(" and ")}, president on day ${s.silenceProtocol.presidentDay}, reassign on day ${s.silenceProtocol.reassignDay}, retro on day ${s.silenceProtocol.retroDay}`],
    ["Reminders per task", `At most ${s.maxRemindersPerTask}`],
    ["Sending", s.sendMode === "review" ? "AI drafts, a person sends" : "Automatic (email only)"],
    ["Quiet hours", `${s.quietHours.from}–${s.quietHours.to}`],
  ]
  return (
    <>
      <PageHead path="/settings" lead={`${state.org.name} · ${state.org.school}`} />
      <section className="card" aria-labelledby="set-h">
        <header><h2 id="set-h">Club defaults</h2><span className="small muted">Read-only in WP0</span></header>
        <ul className="list" data-testid="settings">
          {rows.map(([k, v]) => <li key={k}><span>{k}</span><span className="muted small" style={{ textAlign: "right" }}>{v}</span></li>)}
        </ul>
      </section>
      <Coming wp="WP4" items={["Edit these defaults", "Roles and who holds them", "Replay the setup wizard"]} />
    </>
  )
}
