import { Coming, PageHead } from "../components/Page"

export default function Handoff() {
  return (
    <>
      <PageHead path="/handoff" lead="Every role keeps its playbook, contacts and history, so the next officer starts from week 3, not week 0." />
      <section className="card">
        <header><h2>Handoff season</h2><span className="tag">Not started</span></header>
        <p className="muted">Start a handoff season when officer elections are done. Each outgoing officer gets a short checklist; each incoming officer gets the role's playbook.</p>
      </section>
      <Coming wp="WP4" items={[
        "Handoff season with a checklist per role (Sun Devil Central officer list, bank signers, accounts)",
        "Per-role handbook built from the tasks that role owned",
        "Onboarding checklist for new officers",
      ]} />
    </>
  )
}
