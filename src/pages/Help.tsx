import { PageHead } from "../components/Page"
import { FORECAST_ASSUMPTIONS } from "../engine/forecast"
import { useStore } from "../data/store"

const STEPS: [string, string][] = [
  ["Tell it", "Open Ask Platypus on the right and describe what you need. To plan an event, it asks for five details in a short form."],
  ["Check it", "You see a change set: every step, owner and deadline. Nothing changes until you approve it."],
  ["Own it", "Each step has one owner, who claims it with “I've got it”, and one date, Due. Your club's Due comes before any ASU deadline, so there is room to slip."],
  ["Nudge it", "Reminders shows who should hear from you, who replied and who hasn't. Approve a written reminder in one click, or open it in WhatsApp, text or Gmail."],
  ["Hand it over", "When a role changes hands, a three-day plan shows the next officer what's urgent, who to meet and which tasks to accept."],
]

/** Everything the pages no longer explain in-line lives here (v1.1 text rule). */
export default function Help() {
  const { state } = useStore()
  return (
    <>
      <PageHead path="/help" />
      <section className="card" aria-labelledby="how-h">
        <header><h2 id="how-h">How it works</h2></header>
        <ol className="list">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="start">
              <span className="avatar">{i + 1}</span>
              <div><b>{t}.</b> <span className="muted">{d}</span></div>
            </li>
          ))}
        </ol>
      </section>
      <section className="card form-stack" aria-labelledby="read-h">
        <header><h2 id="read-h">Reading the screen</h2></header>
        <p><b>Look, rest, click.</b> Colour shows status. Rest the pointer on a dot or a ⓘ for a short explanation. Click anything to open its details on the right.</p>
        <p><b>Dates.</b> Dates come only from the rule engine: the ASU rule, the club buffer ({state.org.settings.clubBufferBusinessDays} business days), each officer's private buffer and busy weeks, and ASU holidays. Club work skips finals weeks and the break between semesters. AI never sets a date.</p>
        <p><b>Risk colours.</b></p>
        <ul className="small muted">{FORECAST_ASSUMPTIONS.map(a => <li key={a}>{a}</li>)}</ul>
        <p><b>Points and workload.</b> Finished steps earn points: light 1, medium 2, heavy 3, plus 1 if on time. Workload bands count open steps in the next 14 days with the same weights. Personal buffers never affect points.</p>
        <p><b>Funding timing.</b> USG food and service requests are due 10 business days before the event (R09); speaker requests 14 business days with a signed SAP (R10). From experience, allow 6–8 weeks end to end; this is not official guidance.</p>
      </section>
      <section className="card" aria-labelledby="demo-h">
        <header><h2 id="demo-h">About this demo</h2></header>
        <p className="muted">Everything here is fictional and stays in this browser. Use the Demo pill at the top to move the clock, replay setup or reset. Nothing is sent from this page. The earlier prototype is at <a href="/legacy/">/legacy/</a>.</p>
      </section>
    </>
  )
}
