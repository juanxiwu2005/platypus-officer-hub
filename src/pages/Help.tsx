import { PageHead } from "../components/Page"

const STEPS: [string, string][] = [
  ["Tell it", "Describe an event in one sentence. Platypus drafts the steps from the club playbook and ASU rules."],
  ["Check it", "You see a change set: every step, owner and deadline. Nothing changes until you approve it."],
  ["Own it", "Each step has one owner, who claims it with “I've got it”. Every step has three dates: official deadline, club deadline (3 business days earlier) and latest start."],
  ["Nudge it", "Today lists the few steps at risk. One tap opens a short, structured reminder in WhatsApp, text or Gmail. You send it."],
  ["Hand it over", "At the end of the term, each role's playbook, contacts and history pass to the next officer."],
]

export default function Help() {
  return (
    <>
      <PageHead path="/help" lead="Platypus helps a club president keep every event on time without chasing people one by one." />
      <section className="card" aria-labelledby="how-h">
        <header><h2 id="how-h">How it works</h2></header>
        <ol className="list">
          {STEPS.map(([t, d], i) => (
            <li key={t} style={{ justifyContent: "flex-start" }}>
              <span className="avatar">{i + 1}</span>
              <div><b>{t}.</b> <span className="muted">{d}</span></div>
            </li>
          ))}
        </ol>
      </section>
      <section className="card" aria-labelledby="demo-h">
        <header><h2 id="demo-h">About this demo</h2></header>
        <p className="muted">Everything here is fictional and stays in this browser. “Reset demo” restores the starting data. The earlier prototype is still available at <a href="/legacy/">/legacy/</a>.</p>
      </section>
    </>
  )
}
